import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import ts from "typescript";

// Bounded source and synthetic renderer contracts, not browser/GPU acceptance.
// No HTTP, provider calls, storage writes, regenerated AOI or saved-state edits.
registerHooks({ resolve(s,c,next) {
  if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) {
    try { return next(s+".ts",c); } catch { /* canonical resolution below */ }
  }
  return next(s,c);
} });
let networkCalls=0;
globalThis.fetch=()=>{networkCalls++;throw Error("Network forbidden in final UI contract");};
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sha=s=>createHash("sha256").update(s).digest("hex");
const parse=(p,kind=ts.ScriptKind.TSX)=>ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,kind);
const find=(node,predicate)=>{
  if(predicate(node))return node;
  let found;ts.forEachChild(node,child=>{found??=find(child,predicate);});return found;
};
const property=(node,name)=>node.properties.find(p=>p.name?.getText().replaceAll('"','')===name)?.initializer;
const attr=(node,name)=>node.attributes.properties.find(p=>p.name?.getText()===name)?.initializer;
const text=node=>node?.getText();
const appearance=await import("../src/lib/prototype/point-to-object-create-appearance.ts");
const {ensureVolumeEdgeLayer,setVolumeEdges}=await import("../src/lib/prototype/point-to-object-volume-edges.ts");
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const workspace=parse("components/point-to-object/live-object-map.tsx");
const result=parse("components/point-to-object/create-result-preview-3d.tsx");
function paint(ast,id) {
  const layer=find(ast,n=>ts.isCallExpression(n)&&text(n.expression)==="map.addLayer"&&
    ts.isObjectLiteralExpression(n.arguments[0])&&text(property(n.arguments[0],"id"))===id);
  assert.ok(layer,"Required existing volume layer is installed");
  return property(layer.arguments[0],"paint");
}
check("shared exact selected teal/opacity",()=>{
  assert.equal(appearance.conceptVolumeColor,"#087f8c");assert.equal(appearance.conceptVolumeOpacity,0.5);
  const selected=paint(workspace,"HIGHLIGHT_VOLUME_LAYER_ID");
  assert.equal(JSON.parse(text(property(selected,"fill-extrusion-color"))),appearance.conceptVolumeColor);
  assert.equal(Number(text(property(selected,"fill-extrusion-opacity"))),appearance.conceptVolumeOpacity);
});
for(const [name,ast,id] of [["workspace",workspace,"CONCEPT_VOLUME_LAYER_ID"],["result map/model A/B",result,'"create-result-preview-volumes"']]) {
  check(name+" uses shared 3D presentation and saved heights",()=>{
    const p=paint(ast,id);
    assert.equal(text(property(p,"fill-extrusion-color")),"conceptVolumeColor");
    assert.equal(text(property(p,"fill-extrusion-opacity")),"conceptVolumeOpacity");
    assert.deepEqual(JSON.parse(text(property(p,"fill-extrusion-height"))),["get","heightM"]);
    assert.deepEqual(JSON.parse(text(property(p,"fill-extrusion-base"))),["get","baseM"]);
  });
}
check("programme finish data unchanged",()=>{
  const ast=parse("src/lib/prototype/point-to-object-create-appearance.ts",ts.ScriptKind.TS);
  const finishes=ast.statements.find(n=>n.getText().startsWith("const FINISHES:"));
  assert.equal(sha(finishes.getText()),"873b46d2aa3a3b539eb1d32d43300f4e0d8bec468b5b2b4ef34213b6f5b94132");
  const textures=new Set();
  for(const id of ["residential_mixed_use","commercial_hub","civic_green","residential_quarter","hospitality_recreation"])
    for(const variant of ["A","B"])textures.add(sha(appearance.conceptSurfaceImage(id,variant).data));
  assert.equal(textures.size,10);
});
check("workspace edge layer bound to gated concept volume",()=>{
  assert.match(read("components/point-to-object/live-object-map.tsx"),/ensureVolumeEdgeLayer\(map, CONCEPT_EDGE_LAYER_ID, CONCEPT_VOLUME_LAYER_ID\)/);
});

// Exercise the existing helper's real render gates with a synthetic GL surface.
// This does not establish GPU rendering, contrast or native browser parity.
let draws=0,pitch=55,visibility="visible",volumePresent=true;
const layers=new Map();
const map={getLayer:id=>id==="volume"?(volumePresent?{id}:undefined):layers.get(id),
  getLayoutProperty:()=>visibility,getZoom:()=>16,getPitch:()=>pitch,
  addLayer:layer=>layers.set(layer.id,layer),triggerRepaint:()=>{}};
const gl=new Proxy({}, {get(_target,key){
  if(typeof key==="string" && /^[A-Z_]+$/.test(key))return key;
  if(key==="drawArrays")return ()=>draws++;
  if(["createShader","createProgram","createBuffer","createVertexArray","getUniformLocation"].includes(key))return ()=>({});
  if(["getShaderParameter","getProgramParameter"].includes(key))return ()=>true;
  if(key==="getAttribLocation")return ()=>0;
  if(key==="getParameter")return ()=>null;
  if(key==="isEnabled")return ()=>false;
  return ()=>{};
} });
const coordinates=[[[55.27,25.20],[55.271,25.20],[55.271,25.201],[55.27,25.201],[55.27,25.20]]];
const volumes=[{geometry:{type:"Polygon",coordinates},heightM:24,baseM:0}];
const before=JSON.stringify(volumes);
ensureVolumeEdgeLayer(map,"edges","volume");
const edge=layers.get("edges");edge.onAdd(map,gl);
const render=()=>edge.render(gl,{shaderData:{variantName:"mercator"},defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}});
setVolumeEdges(map,"edges",volumes);
check("visible 3D edges draw",()=>{render();assert.equal(draws,1);});
check("hidden/conflicted/not-ready volume emits no edges",()=>{visibility="none";render();assert.equal(draws,1);});
check("2D/pitch zero emits no edges",()=>{visibility="visible";pitch=0;render();assert.equal(draws,1);});
check("missing/style-replaced volume emits no edges",()=>{pitch=55;volumePresent=false;render();assert.equal(draws,1);});
check("ready volume resumes without geometry mutation",()=>{volumePresent=true;render();assert.equal(draws,2);assert.equal(JSON.stringify(volumes),before);});
check("reset removes stale edges",()=>{setVolumeEdges(map,"edges",[]);render();assert.equal(draws,2);});
check("style reload recreates same saved edges",()=>{
  edge.onRemove(map,gl);layers.delete("edges");ensureVolumeEdgeLayer(map,"edges","volume");
  layers.get("edges").onAdd(map,gl);setVolumeEdges(map,"edges",volumes);
  layers.get("edges").render(gl,{shaderData:{variantName:"mercator"},defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}});
  assert.equal(draws,3);assert.equal(JSON.stringify(volumes),before);
});

const client=parse("components/point-to-object/prototype-client-v5.tsx");
const city=find(client,n=>ts.isJsxOpeningElement(n)&&text(attr(n,"data-testid"))==='"point-object-city-select"');
assert.ok(city);
const label=city.parent.parent.openingElement;
function assertCityHitbox(labelClass,wrapperClass,selectClass) {
  assert.doesNotMatch(labelClass,/(?:^|\s)(?:p|px|py|pl|pr|pt|pb)-/);
  assert.match(wrapperClass,/\bh-11\b/);assert.match(wrapperClass,/w-\[94px\]/);
  assert.match(selectClass,/\bh-11\b/);assert.match(selectClass,/\bpl-3\b/);assert.match(selectClass,/\brounded-xl\b/);
  assert.doesNotMatch(selectClass,/focus(?:-visible|-within)?:ring/);
  assert.ok(labelClass.includes("[&:has(select:focus-visible)]:ring-2"));
}
check("City padding is inside full native select; rounded keyboard-only focus",()=>{
  assert.equal(label.tagName.getText(),"label");
  assertCityHitbox(JSON.parse(text(attr(label,"className"))),JSON.parse(text(attr(city,"wrapperClassName"))),JSON.parse(text(attr(city,"className"))));
});
check("dead outer padding negative fixture fails",()=>assert.throws(()=>assertCityHitbox("px-3","h-11 w-[94px]","h-11 pl-3 rounded-xl")));
check("inset control focus negative fixture fails",()=>assert.throws(()=>assertCityHitbox("[&:has(select:focus-visible)]:ring-2","h-11 w-[94px]","h-11 pl-3 rounded-xl focus-visible:ring-2")));
check("native one-change handler; no synthetic picker click",()=>{
  assert.match(text(attr(city,"onChange")),/^\{\(event\) => changeMarket\(event.target.value as LiveMapLocationKey\)\}$/);
  for(const node of [city,label])for(const event of ["onClick","onPointerDown","onMouseDown"])assert.equal(attr(node,event),undefined);
});
check("shared ReliableSelect and pointer-transparent chevron unchanged",()=>{
  const shared=read("components/point-to-object/reliable-select.tsx");
  assert.equal(sha(shared),"d46300a03a3d7cd2cedb0bffad0cb2d0eae0fe505aec36c109f888e548ddcdfd");
  assert.match(shared,/pointer-events-none/);
});
check("CI keeps export and UI checks fail-closed",()=>{
  const ci=read(".github/workflows/geoai-quality-gate.yml");
  assert.match(ci,/set -euo pipefail\n\s+node scripts\/review02-verification-export-check.mjs[^\n]*\n\s+node scripts\/review02-final-ui-check.mjs/);
});
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:"PASS",checks:checks.length,names:checks,networkCalls,scope:"source/synthetic renderer only; protected Preview desktop/mobile EN/RU hitbox/focus/GPU QA pending"}));
