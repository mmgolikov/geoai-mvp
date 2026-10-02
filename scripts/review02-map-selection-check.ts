import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import type { MultiPolygon, Polygon } from "geojson";
registerHooks({ resolve(s, c, next) { if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch {} } return next(s, c); } });
const { pointObjectRenderedTileMemberAt, pointObjectTilePolygonMemberAt } = await import("../src/lib/prototype/point-to-object-map-selection");
const { volumeEdgeSegments, withVolumeEdgeRenderState } = await import("../src/lib/prototype/point-to-object-volume-edges");
const box = (x: number, y: number): Polygon => ({type:"Polygon",coordinates:[[[x,y],[x+0.0004,y],[x+0.0004,y+0.0004],[x,y+0.0004],[x,y]]]});
const a = box(55.28,25.2), b=box(55.28,25.2012);
const relation: MultiPolygon={type:"MultiPolygon",coordinates:[a.coordinates,b.coordinates]};
// Synthetic affine camera: a roof click unprojects onto ground outside the
// selected member (and may even land over a sibling). No map/source calls.
const project = (p: number[], h: number) => [p[0]*10000, p[1]*10000-h*0.2];
const roofClick=project([55.2802,25.2014],36);
assert.equal(pointObjectTilePolygonMemberAt(relation,[55.2802,25.2014-36*0.2/10000]),null);
assert.deepEqual(pointObjectRenderedTileMemberAt(relation,roofClick,36,0,project),b);
assert.deepEqual(pointObjectRenderedTileMemberAt(relation,project([55.2802,25.2001],18),36,0,project),a,"Unique wall resolves same source member");
assert.equal(pointObjectRenderedTileMemberAt(relation,[0,0],36,0,project),null,"No nearest neighbour fallback");
assert.equal(pointObjectRenderedTileMemberAt(relation,roofClick,0,0,project),null,"Unknown/nonpositive height has no invented volume");
assert.equal(pointObjectRenderedTileMemberAt(relation,roofClick,36,0,()=>null),null,"Projection unavailable fails closed");
assert.equal(pointObjectRenderedTileMemberAt({type:"MultiPolygon",coordinates:[b.coordinates,b.coordinates]},roofClick,36,0,project),null,"Overlapping members remain ambiguous");
const withHole: Polygon={type:"Polygon",coordinates:[b.coordinates[0],[[55.2801,25.2013],[55.2803,25.2013],[55.2803,25.2015],[55.2801,25.2015],[55.2801,25.2013]]]};
assert.equal(pointObjectRenderedTileMemberAt({type:"MultiPolygon",coordinates:[withHole.coordinates]},roofClick,36,36-0.01,project),null,"Courtyard is not a roof");
assert.equal(volumeEdgeSegments([{geometry:a,heightM:42,baseM:4}]).length,16,"Four roof edges + four verticals");
assert.equal(volumeEdgeSegments([{geometry:a,heightM:0,baseM:0}]).length,0);
assert.equal(volumeEdgeSegments([{geometry:a,heightM:NaN,baseM:0}]).length,0);
assert.equal(volumeEdgeSegments([{geometry:withHole,heightM:36,baseM:0}]).length,32,"Hole rings preserved");
// Non-default incoming state makes restoration meaningful, including on throw.
for (const throws of [false, true]) {
  const gl = Object.fromEntries(["DEPTH_TEST","BLEND","DEPTH_WRITEMASK","DEPTH_FUNC","BLEND_EQUATION_RGB","BLEND_EQUATION_ALPHA","BLEND_SRC_RGB","BLEND_DST_RGB","BLEND_SRC_ALPHA","BLEND_DST_ALPHA","LINE_WIDTH","CURRENT_PROGRAM","VERTEX_ARRAY_BINDING","ARRAY_BUFFER_BINDING","ARRAY_BUFFER","LEQUAL","FUNC_ADD","ONE","ONE_MINUS_SRC_ALPHA"].map((key,i)=>[key,i+1])) as unknown as WebGL2RenderingContext;
  const values = new Map<number, unknown>([
    [gl.DEPTH_WRITEMASK,true],[gl.DEPTH_FUNC,121],[gl.BLEND_EQUATION_RGB,122],[gl.BLEND_EQUATION_ALPHA,123],
    [gl.BLEND_SRC_RGB,124],[gl.BLEND_DST_RGB,125],[gl.BLEND_SRC_ALPHA,126],[gl.BLEND_DST_ALPHA,127],
    [gl.LINE_WIDTH,2],[gl.CURRENT_PROGRAM,{program:"original"}],[gl.VERTEX_ARRAY_BINDING,{vao:"original"}],[gl.ARRAY_BUFFER_BINDING,{buffer:"original"}]
  ]);
  const enabled = new Set<number>();
  Object.assign(gl, {
    getParameter:(key:number)=>values.get(key),isEnabled:(key:number)=>enabled.has(key),
    enable:(key:number)=>enabled.add(key),disable:(key:number)=>enabled.delete(key),
    depthMask:(value:boolean)=>values.set(gl.DEPTH_WRITEMASK,value),depthFunc:(value:number)=>values.set(gl.DEPTH_FUNC,value),
    blendEquationSeparate:(rgb:number,alpha:number)=>{values.set(gl.BLEND_EQUATION_RGB,rgb);values.set(gl.BLEND_EQUATION_ALPHA,alpha);},
    blendFuncSeparate:(sr:number,dr:number,sa:number,da:number)=>{values.set(gl.BLEND_SRC_RGB,sr);values.set(gl.BLEND_DST_RGB,dr);values.set(gl.BLEND_SRC_ALPHA,sa);values.set(gl.BLEND_DST_ALPHA,da);},
    lineWidth:(v:number)=>values.set(gl.LINE_WIDTH,v),useProgram:(v:unknown)=>values.set(gl.CURRENT_PROGRAM,v),
    bindVertexArray:(v:unknown)=>values.set(gl.VERTEX_ARRAY_BINDING,v),bindBuffer:(_target:number,v:unknown)=>values.set(gl.ARRAY_BUFFER_BINDING,v)
  });
  const before = new Map(values);
  const draw = () => {
    assert.ok(enabled.has(gl.DEPTH_TEST) && enabled.has(gl.BLEND));
    assert.equal(values.get(gl.DEPTH_WRITEMASK),false);
    assert.equal(values.get(gl.BLEND_SRC_RGB),gl.ONE);
    assert.equal(values.get(gl.BLEND_DST_RGB),gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(null);gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
    if (throws) throw new Error("Synthetic draw failure");
  };
  if (throws) assert.throws(()=>withVolumeEdgeRenderState(gl,draw),/Synthetic draw failure/);
  else withVolumeEdgeRenderState(gl,draw);
  assert.deepEqual(values,before,"Every changed shared GL state is restored");
  assert.equal(enabled.size,0);
}
console.log(JSON.stringify({status:"PASS",selectionAndGeometryChecks:12,glStateRestoreCases:2,networkCalls:0,scope:"synthetic rendered-member selection, known-height edges and GL restoration"}));
