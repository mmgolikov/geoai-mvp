import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { observeLogin, parseLoginDiagnostic, classifyLoginSession, loginHttpClass, LOGIN_SESSION_STATUSES } from './complete26-login-diagnostic.mjs';
import { encodeLiveJourneyDiagnostic, findLiveJourneyDiagnostic } from './sprint10-live-journey-diagnostics.mjs';
import { classifyLiveJourneyReport } from './sprint10-live-journey-run.mjs';
globalThis.fetch = () => { throw Error('Offline only.'); };
let checks = 0;
const eq = (a,b) => { assert.deepEqual(a,b); checks++; };
const rejects = fn => { assert.throws(fn); checks++; };
const secret = 'PRIVATE_password_token_email@example.invalid';
const valid = {stage:'submit_redirect',errorClass:'timeout',network:[],overflow:false,session:null};
eq(loginHttpClass(100),'informational');
// Fails before: legacy strict transport cannot preserve a safe login substage.
const legacy = {primaryStatus:'failed',primaryStage:'auth_login',cleanupStage:'logout_session_precheck',completedSteps:['anonymous_protection','exact_preview']};
eq(findLiveJourneyDiagnostic(encodeLiveJourneyDiagnostic({...legacy,authLogin:valid})).authLogin,valid);
eq(Object.hasOwn(findLiveJourneyDiagnostic(encodeLiveJourneyDiagnostic(legacy)),'authLogin'),false);
const diagnosticReport={errors:[{message:encodeLiveJourneyDiagnostic({...legacy,authLogin:valid})}]};
const classified=classifyLiveJourneyReport(diagnosticReport,1,{scope:'quality20-analyse',host:'preview.invalid',commit:'a'.repeat(40)},[]);
eq(classified.receipt.status,'FAIL_CLEANUP');eq(classified.receipt.diagnostic.authLogin,valid);
eq(classified.receipt.stage,'logout_session_precheck');
for (const key of ['password','headers','url','body','error','userId']) rejects(()=>parseLoginDiagnostic({...valid,[key]:secret}));
for (const key of ['stage','errorClass','overflow','network','session']) rejects(()=>parseLoginDiagnostic({...valid,[key]:secret}));
for (const status of LOGIN_SESSION_STATUSES) eq(classifyLoginSession({status:200,sessionStatus:status,noStore:true,bodyRecord:true,accepted:false}).sessionStatus,status);
eq(classifyLoginSession({status:200,sessionStatus:secret,noStore:true,bodyRecord:true,accepted:false}).sessionStatus,'unrecognized');
const request = (url,method='POST') => ({url:()=>url,method:()=>method,headers:()=>{throw Error('No headers');},postData:()=>{throw Error('No credentials');}});
const response = (url,status,method) => ({request:()=>request(url,method),status:()=>status,body:()=>{throw Error('No body');},json:()=>{throw Error('No body');}});
const page = new EventEmitter();
const observer=observeLogin(page,'https://preview.invalid','https://auth.invalid');
for(const status of [200,302,400,401,403,429,500]) page.emit('response',response(`https://auth.invalid/auth/v1/token?grant_type=password&secret=${secret}`,status));
page.emit('requestfailed',request('https://preview.invalid/api/auth/session','GET'));
page.emit('response',response('https://auth.invalid/auth/v1/token',200));
const output=observer.failure(new Error(secret));eq(output.network.length,8);eq(output.overflow,true);eq(JSON.stringify(output).includes(secret),false);
eq(output.network.map(x=>x.outcome),['success','redirect','client_error','unauthorized','forbidden','rate_limited','server_error','network_failed']);
observer.stop();eq(page.listenerCount('response'),0);eq(page.listenerCount('requestfailed'),0);
page.emit('response',response('https://auth.invalid/auth/v1/token',401));eq(observer.failure(Error(secret)).network,output.network);
eq(Buffer.byteLength(JSON.stringify(output))<=1600,true);
for(const bad of [NaN,0,99,600,'200',null]) rejects(()=>parseLoginDiagnostic({...valid,network:[{path:'/auth/v1/token',method:'POST',status:bad,outcome:'success'}]}));
for(const mutation of [{path:'/auth/v1/token?secret=x'},{method:'DELETE'},{outcome:secret},{headers:secret}]) rejects(()=>parseLoginDiagnostic({...valid,network:[{path:'/auth/v1/token',method:'POST',status:200,outcome:'success',...mutation}]}));
rejects(()=>parseLoginDiagnostic({...valid,network:Array(9).fill({path:'/auth/v1/token',method:'POST',status:200,outcome:'success'})}));
rejects(()=>parseLoginDiagnostic({...valid,session:{status:200,sessionStatus:'session_missing',classification:'malformed',userId:secret}}));
for(const classification of ['accepted','malformed','cache_policy_failure','identity_or_auth_mismatch']) rejects(()=>parseLoginDiagnostic({...valid,stage:'session_assert',session:{status:401,sessionStatus:'session_missing',classification}}));
rejects(()=>parseLoginDiagnostic({...valid,stage:'session_assert',session:{status:200,sessionStatus:'session_missing',classification:'accepted'}}));
rejects(()=>encodeLiveJourneyDiagnostic({...legacy,primaryStage:'analyse_paid_output_invalid',authLogin:valid}));
const ignoredPage=new EventEmitter(),ignored=observeLogin(ignoredPage,'https://preview.invalid','https://auth.invalid');
for(const url of ['https://evil.invalid/auth/v1/token','https://auth.invalid/auth/v1/user','https://auth.invalid/auth/v1/token/','https://auth.invalid/auth/v1/token#private','not a URL',`https://${secret}@auth.invalid/auth/v1/token`]) ignoredPage.emit('response',response(url,401));
ignoredPage.emit('response',response('https://auth.invalid/auth/v1/token',200,'GET'));
eq(ignored.failure(Error(secret)).network,[]);ignored.stop();

// Execute the actual harness login function with an inert fake page, not a copy.
const source=readFileSync(new URL('../tests/e2e/sprint10-live-journey.spec.ts',import.meta.url),'utf8');
const loginSource=source.slice(source.indexOf('async function login('),source.indexOf('\nasync function browserSessionState('));
const body=stripTypeScriptTypes(loginSource,{mode:'transform'});
const guard=(condition)=>{if(!condition)throw Error(secret);};
const expect=()=>({toBeVisible:async()=>{}});
const login=Function('observeLogin','expect','guard','EXACT_DEVELOPMENT_PROJECT_REF','LOGIN_SESSION_STATUSES',`${body};return login;`)(observeLogin,expect,guard,'fixture',LOGIN_SESSION_STATUSES);
for(const failure of ['navigation','form_visible','credentials_fill','submit_redirect','session_fetch','session_assert',null]){
  const fake=new EventEmitter();let calls=0,captured=null;
  const fail=stage=>{if(failure===stage){const error=Error(secret);error.name='TimeoutError';throw error;}};
  fake.goto=async()=>fail('navigation');
  fake.locator=()=>({fill:async()=>fail('credentials_fill')});
  fake.getByLabel=fake.locator;
  fake.getByRole=(role)=> role==='heading'?{marker:true}:{click:async()=>{calls++;fake.emit('response',response('https://fixture.supabase.co/auth/v1/token?grant_type=password',200));}};
  fake.waitForURL=async()=>fail('submit_redirect');
  fake.evaluate=async()=>{fail('session_fetch');return {status:200,noStore:true,bodyRecord:true,sessionStatus:'supabase_user_with_profile',accepted:failure!=='session_assert'};};
  const actual=Function('observeLogin','expect','guard','EXACT_DEVELOPMENT_PROJECT_REF','LOGIN_SESSION_STATUSES',`${body};return login;`)(observeLogin,()=>({toBeVisible:async()=>fail('form_visible')}),guard,'fixture',LOGIN_SESSION_STATUSES);
  let thrown=false;try{await actual(fake,{origin:'https://preview.invalid',email:secret,password:secret,userId:secret},value=>{captured=value;});}catch{thrown=true;}
  eq(thrown,failure!==null);eq(captured?.stage??null,failure);eq(fake.listenerCount('response'),0);eq(fake.listenerCount('requestfailed'),0);
  eq(calls<=1,true);eq(JSON.stringify(captured).includes(secret),false);
  if(captured)eq(captured.errorClass,failure==='session_assert'?'assertion_or_operation_failed':'timeout');
}
eq(typeof login,'function');
// Exercise the actual page.evaluate callback in memory: same identity assertions,
// no-store and auth/demo flags must all remain strict, with no additional request.
const good={isAuthenticated:true,supabaseAuthenticated:true,isDemo:false,sessionStatus:'supabase_user_with_profile',user:{id:secret,isDemoUser:false},supabaseUser:{id:secret}};
const variants=[good,null,[],{...good,user:{id:'wrong',isDemoUser:false}},{...good,supabaseUser:{id:'wrong'}},{...good,isDemo:true},{...good,user:{id:secret,isDemoUser:true}},{...good,isAuthenticated:false},{...good,supabaseAuthenticated:false},{...good,sessionStatus:secret}];
for(const [index,payload] of variants.entries()){
  const fake=new EventEmitter();let captured=null,fetches=0,projected=null;
  fake.goto=async()=>{};fake.locator=()=>({fill:async()=>{}});fake.getByLabel=fake.locator;
  fake.getByRole=()=>({click:async()=>{}});fake.waitForURL=async()=>{};
  globalThis.fetch=async(path,options)=>{fetches++;eq(path,'/api/auth/session');eq(options,{method:'GET',credentials:'same-origin',cache:'no-store'});return {status:200,headers:{get:()=> 'private, no-store'},json:async()=>payload};};
  fake.evaluate=async(fn,arg)=>{projected=await fn(arg);return projected;};
  let thrown=false;try{await login(fake,{origin:'https://preview.invalid',email:secret,password:secret,userId:secret},v=>{captured=v;});}catch{thrown=true;}
  eq(thrown,index!==0);eq(fetches,1);eq(JSON.stringify(projected).includes(secret),false);eq(JSON.stringify(captured).includes(secret),false);
  eq(fake.eventNames(),[]);
  if(index!==0)eq(captured.session.classification,index===1||index===2?'malformed':'identity_or_auth_mismatch');
}
for(const input of [
  {status:401,noStore:true,bodyRecord:true,accepted:false,sessionStatus:'session_missing'},
  {status:200,noStore:false,bodyRecord:true,accepted:true,sessionStatus:'supabase_user_with_profile'},
  {status:200,noStore:true,bodyRecord:false,accepted:false,sessionStatus:'unrecognized'}
])eq(classifyLoginSession(input).classification,input.status===401?'http_failure':!input.noStore?'cache_policy_failure':'malformed');
globalThis.fetch=()=>{throw Error('Offline only.');};
console.log(`PASS ${checks} bounded login diagnostic checks; network=0, browser=0, real Auth=0.`);
