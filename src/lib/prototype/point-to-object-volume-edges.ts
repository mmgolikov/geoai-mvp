import type { MultiPolygon, Polygon, Position } from "geojson";
import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";

export type EdgeVolume = { geometry: Polygon | MultiPolygon; heightM: number; baseM: number };
type Point3 = [number, number, number];
const CIRCUMFERENCE_M = 40_075_016.68557849;
const PROJECTIONS = new WeakMap<MapLibreMap, number[]>();
const EDGES = new WeakMap<MapLibreMap, Map<string, { set: (volumes: EdgeVolume[]) => void }>>();

function mercator(position: Position, altitudeM: number): Point3 {
  const latitude = position[1] * Math.PI / 180;
  return [(position[0] + 180) / 360,
    (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2,
    altitudeM / (CIRCUMFERENCE_M * Math.cos(latitude))];
}

/** Roofs and verticals from known heights only. No inferred floors or geometry. */
export function volumeEdgeSegments(volumes: EdgeVolume[]): Point3[] {
  const segments: Point3[] = [];
  let positions = 0;
  for (const volume of volumes) {
    if (!Number.isFinite(volume.heightM) || !Number.isFinite(volume.baseM) || volume.baseM < 0 || volume.heightM <= volume.baseM) continue;
    const polygons = volume.geometry.type === "Polygon" ? [volume.geometry.coordinates] : volume.geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) {
      positions += ring.length;
      if (positions > 5_000) return [];
      if (ring.length < 4 || ring.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[1]) >= 85)) return [];
      for (let i = 0; i < ring.length - 1; i++) {
        segments.push(mercator(ring[i], volume.heightM), mercator(ring[i + 1], volume.heightM));
        segments.push(mercator(ring[i], volume.baseM), mercator(ring[i], volume.heightM));
      }
    }
  }
  return segments;
}

/** Uses the actual last rendered public custom-layer matrix, not map internals.
 * Picking a roof/wall may differ from the click's ground unprojection. */
export function projectRenderedVolumePoint(map: MapLibreMap, position: Position, altitudeM: number): Position | null {
  const matrix = PROJECTIONS.get(map);
  if (!matrix || !Number.isFinite(position[0]) || !Number.isFinite(position[1]) || Math.abs(position[1]) >= 85 || !Number.isFinite(altitudeM)) return null;
  const p = mercator(position, altitudeM);
  const clip = [0, 1, 2, 3].map(row => matrix[row] * p[0] + matrix[row + 4] * p[1] + matrix[row + 8] * p[2] + matrix[row + 12]);
  if (clip.some(value => !Number.isFinite(value)) || clip[3] <= 0) return null;
  return [(clip[0] / clip[3] + 1) * map.getCanvas().clientWidth / 2,
    (1 - clip[1] / clip[3]) * map.getCanvas().clientHeight / 2];
}

/** Custom layers share MapLibre's GL context. Set premultiplied blending and
 * read-only depth explicitly, then restore every state changed by this draw. */
export function withVolumeEdgeRenderState(gl: WebGL2RenderingContext, draw: () => void): void {
  const previous = {
    depth: gl.isEnabled(gl.DEPTH_TEST), blend: gl.isEnabled(gl.BLEND),
    depthMask: gl.getParameter(gl.DEPTH_WRITEMASK) as boolean,
    depthFunc: gl.getParameter(gl.DEPTH_FUNC) as number,
    rgbEquation: gl.getParameter(gl.BLEND_EQUATION_RGB) as number,
    alphaEquation: gl.getParameter(gl.BLEND_EQUATION_ALPHA) as number,
    srcRgb: gl.getParameter(gl.BLEND_SRC_RGB) as number, dstRgb: gl.getParameter(gl.BLEND_DST_RGB) as number,
    srcAlpha: gl.getParameter(gl.BLEND_SRC_ALPHA) as number, dstAlpha: gl.getParameter(gl.BLEND_DST_ALPHA) as number,
    lineWidth: gl.getParameter(gl.LINE_WIDTH) as number,
    program: gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null,
    vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null,
    buffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null
  };
  try {
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.lineWidth(1);
    draw();
  } finally {
    gl.depthMask(previous.depthMask); gl.depthFunc(previous.depthFunc);
    if (previous.depth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    if (previous.blend) gl.enable(gl.BLEND); else gl.disable(gl.BLEND);
    gl.blendEquationSeparate(previous.rgbEquation, previous.alphaEquation);
    gl.blendFuncSeparate(previous.srcRgb, previous.dstRgb, previous.srcAlpha, previous.dstAlpha);
    gl.lineWidth(previous.lineWidth); gl.useProgram(previous.program);
    gl.bindVertexArray(previous.vao); gl.bindBuffer(gl.ARRAY_BUFFER, previous.buffer);
  }
}

/** One-pixel depth-tested edges. No opaque second volume or dependency. */
export function ensureVolumeEdgeLayer(map: MapLibreMap, id: string, volumeLayerId: string, minimumZoom = 0) {
  if (map.getLayer(id)) return;
  let volumes: EdgeVolume[] = [], dirty = true, vertexCount = 0, origin: Point3 = [0, 0, 0];
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, vao: WebGLVertexArrayObject | null = null;
  let matrixUniform: WebGLUniformLocation | null = null;
  const entry = { set: (next: EdgeVolume[]) => { volumes = next; dirty = true; map.triggerRepaint(); } };
  const entries = EDGES.get(map) ?? new Map();
  entries.set(id, entry); EDGES.set(map, entries);
  const layer: CustomLayerInterface = {
    id, type: "custom", renderingMode: "3d",
    onAdd(_map, gl) {
      const compile = (kind: number, source: string) => {
        const shader = gl.createShader(kind);
        if (!shader) return null;
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, "#version 300 es\nin vec3 a_position; uniform mat4 u_matrix; void main(){gl_Position=u_matrix*vec4(a_position,1.0);}");
      const fragment = compile(gl.FRAGMENT_SHADER, "#version 300 es\nprecision mediump float; out vec4 color; void main(){color=vec4(0.022,0.299,0.329,0.6);}");
      program = gl.createProgram();
      if (!program || !vertex || !fragment) {
        if (vertex) gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment);
        if (program) gl.deleteProgram(program); program = null; return;
      }
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); program = null; return; }
      matrixUniform = gl.getUniformLocation(program, "u_matrix");
      buffer = gl.createBuffer(); vao = gl.createVertexArray();
      const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null;
      const previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(previousVao); gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
    },
    render(gl, options) {
      // getProjection() may be null when the style uses implicit Mercator.
      // The public render input always identifies the active shader projection.
      if (options.shaderData.variantName !== "mercator") { PROJECTIONS.delete(map); return; }
      const matrix = Array.from(options.defaultProjectionData.mainMatrix);
      PROJECTIONS.set(map, matrix);
      if (!program || !buffer || !vao || map.getZoom() < minimumZoom || map.getPitch() === 0 ||
          !map.getLayer(volumeLayerId) || map.getLayoutProperty(volumeLayerId, "visibility") === "none") return;
      if (dirty) {
        const vertices = volumeEdgeSegments(volumes);
        origin = vertices[0] ?? [0, 0, 0]; vertexCount = vertices.length;
        const relative = new Float32Array(vertices.flatMap(p => p.map((v, axis) => v - origin[axis])));
        const previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, relative, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer); dirty = false;
      }
      if (!vertexCount) return;
      // Translate in double precision before sending local vertices to the GPU.
      // Global Float32 mercator positions otherwise lose sub-metre edges.
      const translated = new Float32Array(matrix);
      for (let row = 0; row < 4; row++) translated[row + 12] = matrix[row] * origin[0] + matrix[row + 4] * origin[1] + matrix[row + 8] * origin[2] + matrix[row + 12];
      withVolumeEdgeRenderState(gl, () => {
        gl.useProgram(program); gl.bindVertexArray(vao); gl.uniformMatrix4fv(matrixUniform, false, translated);
        gl.drawArrays(gl.LINES, 0, vertexCount);
      });
    },
    onRemove(_map, gl) {
      if (buffer) gl.deleteBuffer(buffer); if (vao) gl.deleteVertexArray(vao); if (program) gl.deleteProgram(program);
      if (entries.get(id) === entry) entries.delete(id);
      PROJECTIONS.delete(map);
    }
  };
  map.addLayer(layer);
}

export function setVolumeEdges(map: MapLibreMap, id: string, volumes: EdgeVolume[]) {
  EDGES.get(map)?.get(id)?.set(volumes);
}
