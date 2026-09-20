import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const Module=require('node:module');
const originalLoad=Module._load;
let persona='authorized';
let calls=[];
const userId='00000000-0000-4000-8000-000000000001';
const profileId='00000000-0000-4000-8000-000000000002';
const otherId='00000000-0000-4000-8000-000000000009';
const fakeClient={
  auth:{
    getClaims:async()=>({data:{claims:['missing','expired'].includes(persona)?null:{sub:userId,is_anonymous:persona==='anonymous'}},error:['missing','expired'].includes(persona)?{code:persona}:null}),
    getUser:async()=>({data:{user:{id:persona==='subject_mismatch'?otherId:userId,is_anonymous:persona==='anonymous'}},error:null})
  },
  schema(name){assert.equal(name,'api');return {rpc(name,args){
    calls.push(name);
    if(name==='current_profile')return {maybeSingle:async()=>({data:{id:profileId,auth_user_id:userId,status:persona==='inactive'?'inactive':'active',identity_kind:'user',email:null,full_name:null},error:null})};
    if(name==='current_project_access')return {maybeSingle:async()=>({data:persona==='nonmember'?null:{profile_id:persona==='other_user'?otherId:profileId,project_id:'00000000-0000-4000-8000-000000000003',organization_id:'00000000-0000-4000-8000-000000000004',project_key:args.target_project_key,project_status:'demo',project_role:persona==='viewer'?'viewer':'analyst',project_membership_status:'active'},error:null})};
    if(persona==='rls_denied')return Promise.resolve({data:null,error:{code:'42501'}});
    if(name==='list_point_object_analysis_runs')return Promise.resolve({data:[{run_key:'synthetic-owner-only'}],error:null});
    if(name==='list_point_object_project_artifacts')return Promise.resolve({data:[],error:null});
    if(name==='upsert_point_object_analysis_run')return Promise.resolve({data:{run_key:args.target_run_key},error:null});
    throw Error(`Unexpected RPC ${name}`);
  }};}
};
Module._load=function(name,parent,isMain){
  if(name==='server-only')return {};
  if(name.endsWith('/src/lib/supabase/ssr-server'))return {createRequestScopedSupabaseClient:async()=>fakeClient};
  if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
  if(name==='next/navigation')return {redirect:url=>{throw Error(`REDIRECT:${url}`);}};
  return originalLoad.call(this,name,parent,isMain);
};
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(readFileSync(filename,'utf8').replace(/(["'])@\/([^"']+)\1/g,(_all,_quote,path)=>JSON.stringify(new URL(`../${path}`,import.meta.url).pathname)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const gate=require('../src/lib/prototype/point-object-persistence-gate.ts');
const runtime=require('../src/lib/prototype/point-object-runtime-policy.ts');
const auth=require('../src/lib/auth/auth-mode.ts');
const page=require('../src/lib/auth/require-pilot-page-identity.ts');
const cloudRepo=require('../src/lib/prototype/point-object-cloud-repository.ts');
const analysis=require('../app/api/prototype/point-to-object/analysis-runs/route.ts');
const cloud=require('../app/api/prototype/point-to-object/project-artifacts/route.ts');
const envKeys=['VERCEL_ENV','GEOAI_RUNTIME_TARGET','NEXT_PUBLIC_AUTH_MODE','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE','GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI','GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE','GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI','GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE','GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE','GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY','GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY'];
const prior=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
const valid={VERCEL_ENV:'production',NEXT_PUBLIC_AUTH_MODE:'supabase_auth',NEXT_PUBLIC_SUPABASE_URL:'https://pphdqkurxneyagvnnjdt.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:['sb','publishable','synthetic_offline_fixture'].join('_'),GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE:'true',GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI:'true',GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE:'true',GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY:'synthetic-production-scope'};
function configure(values){for(const key of envKeys)delete process.env[key];Object.assign(process.env,values);}
const policy=env=>runtime.resolvePointObjectRuntimePolicy(env,{openAiKeyConfigured:true,generalUpstreamEnabled:true});
const origin='https://geoai-mvp.vercel.app';
const request=(path,method='GET',body,extra={})=>new Request(`${origin}/api/prototype/point-to-object/${path}`,{method,headers:{origin,host:'geoai-mvp.vercel.app','sec-fetch-site':'same-origin','content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
const input={projectKey:'synthetic-production-scope',selectedName:'Synthetic regression object',selectedType:'building',selectedPoint:{longitude:55.27,latitude:25.2},resultJson:{fixture:true},sourceLineage:[]};
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('No hosted network permitted in this synthetic auth regression');};
try {
  configure(valid);
  assert.equal(gate.getPointObjectPersistenceGate().enabled,true);
  assert.equal(policy(valid).surface.enabled,true);
  assert.equal(policy(valid).ai.enabled,true);
  assert.equal(runtime.resolvePointObjectRuntimePolicy(valid,{openAiKeyConfigured:false,generalUpstreamEnabled:true}).ai.enabled,false,'missing provider key cannot be bypassed by general gate');
  assert.equal(auth.getEffectiveAuthMode(),'supabase_auth');
  assert.equal(cloudRepo.getPointObjectCloudProjectKey(),'synthetic-production-scope');
  assert.equal(cloudRepo.getPointObjectCloudStorageMode(),'authenticated_supabase_production');
  for(const [key,value] of [
    ['NEXT_PUBLIC_AUTH_MODE',undefined],['NEXT_PUBLIC_AUTH_MODE','demo_public'],['NEXT_PUBLIC_AUTH_MODE','disabled'],['NEXT_PUBLIC_AUTH_MODE','bogus'],
    ['NEXT_PUBLIC_SUPABASE_URL',undefined],['NEXT_PUBLIC_SUPABASE_URL','https://bkmfcjzalcvdsdvyxpgi.supabase.co'],['NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321'],['NEXT_PUBLIC_SUPABASE_URL','https://pphdqkurxneyagvnnjdt.supabase.co.evil.test'],['NEXT_PUBLIC_SUPABASE_URL','https://pphdqkurxneyagvnnjdt.supabase.co/wrong'],['NEXT_PUBLIC_SUPABASE_URL','https://user@pphdqkurxneyagvnnjdt.supabase.co'],['NEXT_PUBLIC_SUPABASE_URL','https://pphdqkurxneyagvnnjdt.supabase.co/?wrong=1'],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',undefined],['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',['sb','secret','synthetic_not_a_real_secret'].join('_')],['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','legacy.jwt.fixture']
  ]){
    const env={...valid,[key]:value};configure(Object.fromEntries(Object.entries(env).filter(([,v])=>v!==undefined)));
    assert.equal(gate.getPointObjectPersistenceGate().enabled,false,`${key} must fail closed`);
    assert.equal(policy(env).surface.enabled,false);assert.equal(policy(env).ai.enabled,false);
    assert.equal(auth.getEffectiveAuthMode(),'disabled');
    await assert.rejects(page.requirePilotPageIdentity('/projects'),/REDIRECT:\/login/);
    assert.equal((await cloud.GET(request('project-artifacts'))).status,503);
  }
  for(const flag of [undefined,'false','1','yes','enabled']){
    const env={...valid};delete env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE;
    if(flag!==undefined)env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE=flag;
    env.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE='true';configure(env);
    assert.equal(gate.getPointObjectPersistenceGate().enabled,false,'Preview cannot activate Production');
  }
  configure({...valid,GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY:'',GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY:'preview-only'});
  assert.equal(cloudRepo.getPointObjectCloudProjectKey(),null,'no Preview scope fallback');
  assert.equal((await cloud.GET(request('project-artifacts'))).status,503);
  for(const env of [{VERCEL_ENV:'preview',GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE:'true'},{GEOAI_RUNTIME_TARGET:'self_hosted_candidate',GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE:'true'}]){configure(env);assert.equal(gate.getPointObjectPersistenceGate().enabled,true);assert.equal(auth.getRequestedAuthMode(),'demo_public');}
  configure({VERCEL_ENV:'preview',GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE:'true'});assert.equal(gate.getPointObjectPersistenceGate().enabled,false);
  configure(valid);
  for(const [who,status] of [['missing',401],['expired',401],['anonymous',403],['subject_mismatch',401],['inactive',403],['nonmember',403],['other_user',403]]){
    persona=who;calls=[];
    assert.equal((await cloud.GET(request('project-artifacts'))).status,status,who);
    assert.equal((await analysis.POST(request('analysis-runs','POST',input))).status,status,who);
    assert.ok(!calls.some(name=>name.startsWith('list_point_')||name.startsWith('upsert_')||name.startsWith('put_')),'denied identity cannot reach data RPC');
  }
  persona='missing';await assert.rejects(page.requirePilotPageIdentity('/projects'),/REDIRECT:\/login/);
  persona='authorized';await page.requirePilotPageIdentity('/projects');
  const listed=await cloud.GET(request('project-artifacts'));
  assert.equal(listed.status,200);assert.match(listed.headers.get('cache-control'),/private, no-store/);
  assert.equal((await listed.json()).storageMode,'authenticated_supabase_production');
  assert.equal((await analysis.POST(request('analysis-runs','POST',input))).status,201,'legitimate authenticated member of a demo project can persist own result');
  assert.equal((await analysis.GET(request('analysis-runs?projectKey=synthetic-production-scope'))).status,200);
  assert.equal((await cloud.GET(request('project-artifacts','GET',undefined,{authorization:'Bearer synthetic-denied'}))).status,401);
  assert.equal((await analysis.POST(request('analysis-runs','POST',input,{origin:'https://other.example.test'}))).status,403);
  persona='viewer';assert.equal((await analysis.POST(request('analysis-runs','POST',input))).status,403);
  persona='rls_denied';assert.equal((await analysis.POST(request('analysis-runs','POST',input))).status,403,'database ownership denial must not become success');
  assert.match(readFileSync(new URL('../src/lib/supabase/config.ts',import.meta.url),'utf8'),/requestScopedSupabaseRepositoriesEnabled: boolean = false/);
  for(const file of ['20260904065018_point_object_analysis_persistence_v1.sql','20260918203424_point_object_project_artifacts_v1.sql'])assert.match(readFileSync(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'),/created_by = (geoai_private\.current_profile_id\(\)|actor_profile_id)/,'SQL ownership constraint remains present; hosted enforcement still requires physical acceptance');
  console.log('quality20-production-gate PASS: environment/config negatives; real page/API/auth/repository code with synthetic SSR boundary; no hosted calls.');
} finally {
  configure(Object.fromEntries(Object.entries(prior).filter(([,value])=>value!==undefined)));
  globalThis.fetch=originalFetch;Module._load=originalLoad;
}
