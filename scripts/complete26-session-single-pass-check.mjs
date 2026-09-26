// Offline execution of the real middleware, session route, request context,
// SSR cookie adapter and browser transport with synthetic dependency seams.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const baseline=process.argv.includes('--baseline');
const requireLocal=createRequire(join(root,'package.json'));
const ts=requireLocal('typescript');
const userId='11111111-1111-4111-8111-111111111111';
const wrongId='22222222-2222-4222-8222-222222222222';
const cookieName='sb-fixture-auth-token';
const realFetch=globalThis.fetch,realPerformance=globalThis.performance,realInfo=console.info;
globalThis.fetch=async()=>{throw Error('Live network forbidden');};
let checks=0;
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};

function harness(scenario='valid',initialCookie='valid'){
  const state={scenario,clock:0,phase:'none',calls:[],browserCookie:initialCookie,routeSetCookies:[],middlewareSetCookies:[],timing:[],lastResponse:null};
  const delay=async(ms)=>{state.clock+=ms;await Promise.resolve();};
  const makeRequest=(path='/api/auth/session',method='GET',authorization=null)=>{
    const url=`https://example.invalid${path}`;
    const headers=new Headers();if(state.browserCookie)headers.set('cookie',`${cookieName}=${state.browserCookie}`);
    if(authorization)headers.set('authorization',authorization);
    const jar={getAll:()=>state.browserCookie?[{name:cookieName,value:state.browserCookie}]:[],set:(name,value)=>{
      assert.equal(name,cookieName);state.browserCookie=value;headers.set('cookie',`${name}=${value}`);
    }};
    return {url,nextUrl:new URL(url),method,headers,cookies:jar};
  };
  const mocks={
    'next/server':{NextResponse:{
      next:()=>({kind:'next',cookies:{set:(name,value,options)=>state.middlewareSetCookies.push({name,value,options})}}),
      json:(body,init={})=>{
        const headers=new Headers(init.headers);
        for(const c of state.routeSetCookies)headers.append('set-cookie',`${c.name}=${c.value}; Path=/; HttpOnly`);
        return new Response(JSON.stringify(body),{status:init.status??200,headers});
      }
    }},
    'next/headers':{cookies:async()=>({getAll:()=>state.currentRequest.cookies.getAll(),set:(name,value,options)=>{
      state.routeSetCookies.push({name,value,options});state.currentRequest.cookies.set(name,value);
    }})},
    '@supabase/ssr':{createServerClient:(_url,_key,{cookies})=>({
      auth:{
        getClaims:async()=>{
          state.calls.push(`${state.phase}:claims`);
          await delay(state.phase==='middleware'?5579:2881);
          const token=cookies.getAll().find(c=>c.name===cookieName)?.value;
          if(!token||state.scenario==='invalid_claims')return {data:{claims:null},error:{code:'synthetic_invalid_claims'}};
          if(token==='expired')cookies.setAll([{name:cookieName,value:'fresh',options:{httpOnly:true,path:'/'}}]);
          return {data:{claims:{sub:state.scenario==='wrong_claims'?wrongId:userId,is_anonymous:state.scenario==='anonymous'}},error:null};
        },
        getUser:async()=>{state.calls.push(`${state.phase}:user`);await delay(3318);
          if(state.scenario==='user_missing'||state.scenario==='user_error')return {data:{user:null},error:state.scenario==='user_error'?{code:'synthetic_user_unavailable'}:null};
          return {data:{user:{id:userId,is_anonymous:state.scenario==='anonymous',email:'fixture@example.invalid',phone:null}},error:null};}
      },
      schema:name=>{assert.equal(name,'api');return {rpc:fn=>{
        assert.equal(fn,'current_profile');return {maybeSingle:async()=>{
          state.calls.push(`${state.phase}:profile`);await delay(768);
          if(state.scenario==='profile_dependency')return {data:null,error:{code:'synthetic_unavailable'}};
          if(state.scenario==='profile_missing')return {data:null,error:null};
          return {data:{id:'33333333-3333-4333-8333-333333333333',auth_user_id:userId,email:'fixture@example.invalid',full_name:'Fixture User',status:state.scenario==='profile_inactive'?'inactive':'active',identity_kind:'user'},error:null};
        }};
      }};}
    })},
    '@/src/lib/supabase/config':{getSupabaseUrl:()=> 'https://fixture.invalid',getSupabasePublishableKey:()=> 'synthetic-publishable'},
    '@/src/lib/auth/auth-mode':{getEffectiveAuthMode:()=> 'supabase_auth',getAuthModeStatus:()=>({effectiveMode:'supabase_auth',requestedMode:'supabase_auth',label:'Supabase Auth',caveat:'fixture'})},
    '@/src/lib/platform/enforcement-config':{getEnforcementConfig:()=>({accessEnforcementMode:'hard',allowDemoPublic:false})},
    '@/src/lib/auth/demo-session':{demoUser:{id:'demo'},demoOrganization:null,demoProjectRole:null,createDemoProjectMembership:()=>null},
    '@/src/lib/auth/profile-preferences':{readGeoAIUserProfile:(_metadata,fallback)=>({fullName:fallback.fullName})},
    '@/src/lib/prototype/source-request-deadline':{pointObjectRequestAuthDeadlineSignal:()=>undefined},
    '@/src/lib/supabase/point-object-source-middleware-auth-deadline':{pointObjectSourceMiddlewareRoute:()=>null,createPointObjectSourceMiddlewareAuthDeadline:()=>{throw Error('Unexpected source route');},isPointObjectSourceMiddlewareAuthDeadlineError:()=>false}
  };
  const cache=new Map();
  const load=(file)=>{
    if(cache.has(file))return cache.get(file).exports;
    const source=baseline&&file===join(root,'src/lib/supabase/update-session.ts')
      ? execFileSync('/usr/bin/git',['show','642a3858ee2aaa375e750d75a062f37a2c1937c0:src/lib/supabase/update-session.ts'],{cwd:root,encoding:'utf8',timeout:10000})
      : readFileSync(file,'utf8');
    const compiled=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const module={exports:{}};cache.set(file,module);
    const localRequire=specifier=>{
      if(Object.hasOwn(mocks,specifier))return mocks[specifier];
      if(specifier.startsWith('@/'))return load(join(root,specifier.slice(2))+'.ts');
      if(specifier.startsWith('.'))return load(resolve(dirname(file),specifier)+'.ts');
      throw Error(`Unreviewed dependency: ${specifier}`);
    };
    new Function('require','module','exports',compiled)(localRequire,module,module.exports);
    return module.exports;
  };
  const middleware=load(join(root,'src/lib/supabase/update-session.ts')).updateSupabaseSession;
  const route=load(join(root,'app/api/auth/session/route.ts')).GET;
  const browser=load(join(root,'src/lib/auth/browser-session-transport.ts')).readBrowserServerSession;
  async function fetcher(_input,_init){
    const request=makeRequest();state.currentRequest=request;state.routeSetCookies=[];state.middlewareSetCookies=[];
    state.phase='middleware';await middleware(request);
    state.phase='route';const response=await route(request);state.lastResponse=response.clone();
    for(const c of [...state.middlewareSetCookies,...state.routeSetCookies])state.browserCookie=c.value;
    return response;
  }
  async function session(){
    const previous=globalThis.performance;
    Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>state.clock}});
    try{return await browser(fetcher);}finally{Object.defineProperty(globalThis,'performance',{configurable:true,value:previous});}
  }
  async function middlewareOnly(path,method){
    const request=makeRequest(path,method);state.currentRequest=request;state.phase='middleware';await middleware(request);
  }
  async function routeOnlyWithBearer(){
    const request=makeRequest('/api/auth/session','GET','Bearer synthetic');state.currentRequest=request;state.phase='middleware';await middleware(request);
    state.phase='route';return route(request);
  }
  return {state,session,middlewareOnly,routeOnlyWithBearer};
}

try{
  console.info=line=>{try{const event=JSON.parse(line);if(event.event==='auth_session_stage')timing.push(event);}catch{}};
  const timing=[];
  const success=harness();
  if(baseline){
    equal((await success.session()).status,'unavailable','the original duplicate path misses the unchanged browser deadline');
    equal(success.state.calls,['middleware:claims','route:claims','route:user','route:profile']);
    equal(success.state.clock,12546);
    console.log(JSON.stringify({status:'EXPECTED_BASELINE_TIMEOUT',checks,networkCalls:0,browserDeadlineMs:10000,baselineClockMs:success.state.clock}));
    process.exit(0);
  }
  equal((await success.session()).status,'authenticated','a verified server session reaches the browser');
  equal(success.state.calls,['route:claims','route:user','route:profile'],'one authoritative route verification');
  assert(success.state.clock<10000);checks++;
  equal(success.state.lastResponse.headers.get('cache-control'),'private, no-store, max-age=0');
  for(const scenario of ['invalid_claims','user_missing','user_error','wrong_claims','anonymous','profile_missing','profile_inactive','profile_dependency']){
    const h=harness(scenario);equal((await h.session()).status,'unavailable',scenario);
    const body=await h.state.lastResponse.json();equal(body.isAuthenticated,false,scenario);equal(body.user,null,scenario);
    equal(h.state.calls[0],'route:claims',scenario);
    if(scenario==='invalid_claims')equal(h.state.calls,['route:claims'],scenario);
    if(['user_missing','user_error','wrong_claims','anonymous'].includes(scenario))equal(h.state.calls,['route:claims','route:user'],scenario);
  }
  const noCookie=harness('valid',null);equal((await noCookie.session()).status,'anonymous','missing cookie stays anonymous');
  equal(noCookie.state.calls,['route:claims']);
  const bearer=harness();const denied=await bearer.routeOnlyWithBearer();
  equal((await denied.json()).sessionStatus,'unsupported_bearer_transport');equal(bearer.state.calls,[],'bearer cannot invoke identity dependencies');
  const sibling=harness();await sibling.middlewareOnly('/api/projects','GET');equal(sibling.state.calls,['middleware:claims'],'sibling GET still checks claims');
  const nonGet=harness();await nonGet.middlewareOnly('/api/auth/session','POST');equal(nonGet.state.calls,['middleware:claims'],'non-GET session still checks claims');
  const head=harness();await head.middlewareOnly('/api/auth/session','HEAD');equal(head.state.calls,['middleware:claims'],'HEAD session still checks claims');
  for(const path of ['/api/auth/session/','/api/auth/sessions','/x/api/auth/session']){
    const near=harness();await near.middlewareOnly(path,'GET');equal(near.state.calls,['middleware:claims'],`near-match ${path} still checks claims`);
  }
  const cookie=harness('valid','expired');equal((await cookie.session()).status,'authenticated');
  equal(cookie.state.browserCookie,'fresh','route refreshed cookie reaches browser');
  assert(cookie.state.lastResponse.headers.get('set-cookie')?.includes(`${cookieName}=fresh`));checks++;
  equal((await cookie.session()).status,'authenticated','next request uses refreshed cookie');
  equal(cookie.state.calls,['route:claims','route:user','route:profile','route:claims','route:user','route:profile']);
  assert(timing.every(e=>!JSON.stringify(e).includes('fixture@example.invalid')));checks++;
  console.log(JSON.stringify({status:'PASS',checks,networkCalls:0,operationalWrites:0,browserDeadlineMs:10000,verifiedClockMs:success.state.clock,expiredCookieRoundTrip:true}));
}finally{globalThis.fetch=realFetch;Object.defineProperty(globalThis,'performance',{configurable:true,value:realPerformance});console.info=realInfo;}
