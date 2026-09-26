// Executes the actual provider lifecycle with synthetic dependencies only.
// --before-stdin accepts the unchanged baseline provider source on stdin.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createSingleFlight, readBrowserServerSession, requestConfirmedBrowserSignOut,
  resolveBrowserSignOutDisposition } from '../src/lib/auth/browser-session-transport.ts';

const before = process.argv.includes('--before-stdin');
const source = readFileSync(before ? 0 : new URL('../components/auth/auth-provider.tsx', import.meta.url), 'utf8');
function part(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, 'Exact real-provider seam must exist');
  return source.slice(a, b);
}
const implementation = stripTypeScriptTypes(
  part('function createAnonymousSession()', 'export function AuthProvider') +
  part('  function isCurrentSessionRead(', '  useEffect(() =>') +
  part('  async function signInWithPassword(', '  async function signInWithPhone(') +
  part('  function signOut()', '  const value: AuthContextValue'));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
let checks=0, networkCalls=0;
globalThis.fetch = async () => { networkCalls++; throw Error('Live network forbidden'); };
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

function harness() {
  const state = { client:null, writes:[], resolved:false, sdkCalls:0, reads:0, server:'A',
    sdkId:'A', sdkError:null, unavailable:false, read:async()=>{}, sdk:async()=>{}, profile:async user=>user };
  const fetcher = async (path) => {
    if (path === '/api/auth/logout') { state.server=null; return Response.json({ok:true,status:'signed_out'}); }
    assert.equal(path, '/api/auth/session'); state.reads++;
    const captured=state.server; await state.read(captured);
    if (state.unavailable) return Response.json({}, {status:503});
    return Response.json(captured ? {isAuthenticated:true,user:{id:captured}} :
      {isAuthenticated:false,sessionStatus:'session_missing'});
  };
  const deps = {
    authStatus:{effectiveMode:'supabase_auth'}, authEpochRef:{current:0}, refreshSequenceRef:{current:0},
    logoutPendingRef:{current:false}, passwordIdentityRef:{current:null}, sessionRefreshRef:{current:null},
    setSession:value=>{state.client=value.user?.id??null;state.writes.push(state.client);},
    setIsSessionResolved:value=>{state.resolved=value;},
    mergeLocalProfileIntoUser:user=>user, loadBrowserUserProfile:user=>state.profile(user),
    isMockDemoSessionActive:()=>false, clearMockDemoSession:()=>{},clearLocalUserProfile:()=>{},clearBrowserDemoStorage:()=>{},
    demoUser:{id:'demo'},isPasswordOnlyAuthEnabled:()=>true,
    loadSupabaseBrowserClient:async()=>({auth:{signInWithPassword:async()=>{
      state.sdkCalls++; await state.sdk();
      return {data:state.sdkId?{user:{id:state.sdkId}}:null,error:state.sdkError};
    }}}),
    readBrowserServerSession:()=>readBrowserServerSession(fetcher),
    requestConfirmedBrowserSignOut:()=>requestConfirmedBrowserSignOut(fetcher),resolveBrowserSignOutDisposition,
    signOutSingleFlightRef:{current:createSingleFlight()}
  };
  const api=new Function(...Object.keys(deps), `${implementation};return {refreshSession,signInWithPassword,signOut};`)(...Object.values(deps));
  const login=()=>api.signInWithPassword('synthetic@example.invalid','synthetic-not-a-real-password');
  const unmount=()=>{deps.authEpochRef.current++;deps.refreshSequenceRef.current++;};
  return {state,api,login,unmount,deps};
}

// Two fail-before/pass-after regressions, without relying on text matching.
{
  const h=harness();h.state.unavailable=true;
  const result=await h.login();
  eq(result.ok,before,'A successful token exchange alone is not a confirmed product login');
  eq(h.state.client,null);eq(h.state.sdkCalls,1);eq(h.state.reads,1);
  if(!before) eq(result.message.includes('reload the page to verify the existing session'),true);
}
{
  const h=harness(),gate=deferred(),entered=deferred();
  h.state.profile=async user=>{entered.resolve();await gate.promise;return {...user,name:'optional'};};
  let settled=false;const login=h.login().then(result=>{settled=true;return result;});
  await entered.promise;await flush();
  eq(h.state.client,before?null:'A','Verified identity must not wait for optional profile');
  eq(settled,!before,'Login must not wait for optional profile');
  gate.resolve();eq((await login).ok,true);await flush();eq(h.state.client,'A');
}
if(before){eq(networkCalls,0);console.log(JSON.stringify({status:'EXPECTED_BASELINE_DEFECTS_REPRODUCED',checks,networkCalls}));process.exit(0);}

for(const mode of ['anonymous','unavailable','wrong_uuid','missing_sdk_uuid','sdk_error']){
  const h=harness();
  if(mode==='anonymous')h.state.server=null;
  if(mode==='unavailable')h.state.unavailable=true;
  if(mode==='wrong_uuid')h.state.server='B';
  if(mode==='missing_sdk_uuid')h.state.sdkId=null;
  if(mode==='sdk_error')h.state.sdkError={code:'synthetic_rejection'};
  eq((await h.login()).ok,false,mode);eq(h.state.client,null,mode);eq(h.state.sdkCalls,1,'Never retry password');
  eq(h.deps.passwordIdentityRef.current,null,'Pending login identity always released');
}
// A SIGNED_IN event before the SDK promise resolves must neither deadlock nor
// publish a different cookie identity before the expected UUID is available.
{
  const h=harness();h.state.sdk=async()=>{await h.api.refreshSession();eq(h.state.reads,0);eq(h.state.client,null);};
  eq((await h.login()).ok,true);eq(h.state.client,'A');eq(h.state.sdkCalls,1);eq(h.state.reads,1);
}
// Concurrent event/focus reads during confirmation join the same bounded read.
{
  const h=harness(),entered=deferred(),gate=deferred();h.state.read=async()=>{entered.resolve();await gate.promise;};
  const login=h.login();await entered.promise;const other=h.api.refreshSession();
  eq(h.state.reads,1);gate.resolve();eq((await login).ok,true);eq(await other,true);eq(h.state.client,'A');eq(h.state.sdkCalls,1);
}
for(const end of ['logout','unmount','new_identity']){
  const h=harness(),gate=deferred(),entered=deferred();
  h.state.profile=async user=>{if(user.id==='A'){entered.resolve();await gate.promise;}return {...user,name:'late'};};
  const login=h.login();await entered.promise;eq((await login).ok,true);eq(h.state.client,'A');
  if(end==='logout')eq((await h.api.signOut()).ok,true);
  if(end==='unmount')h.unmount();
  if(end==='new_identity'){h.state.sdkId='B';h.state.server='B';eq((await h.login()).ok,true);}
  const writes=[...h.state.writes];gate.resolve();await flush();eq(h.state.writes,writes,'Late enrichment cannot replace newer identity');
}
for(const end of ['logout','unmount','new_identity']){
  const h=harness(),gate=deferred(),entered=deferred();
  h.state.read=async id=>{if(id==='A'){entered.resolve();await gate.promise;}};
  const old=h.login();await entered.promise;
  if(end==='logout')eq((await h.api.signOut()).ok,true);
  if(end==='unmount')h.unmount();
  if(end==='new_identity'){h.state.server='B';h.state.sdkId='B';eq((await h.login()).ok,true);}
  const writes=[...h.state.writes];gate.resolve();eq((await old).ok,false);await flush();eq(h.state.writes,writes);
}
// Ordinary background reads still obey latest-read-wins, rather than caching.
{
  const h=harness(),gate=deferred(),entered=deferred();h.state.read=async id=>{if(id==='A'){entered.resolve();await gate.promise;}};
  const old=h.api.refreshSession();await entered.promise;h.state.server='B';await h.api.refreshSession();
  eq(h.state.client,'B');const writes=[...h.state.writes];gate.resolve();await old;await flush();eq(h.state.writes,writes);
}
for(const profile of [async()=>{throw Error('optional failed');},async()=>({id:'B',name:'wrong'})]){
  const h=harness();h.state.profile=profile;eq((await h.login()).ok,true);await flush();eq(h.state.client,'A');eq(h.state.writes,['A']);
}
{
  const h=harness();h.state.unavailable=true;eq((await h.login()).ok,false);
  h.state.unavailable=false;await h.api.refreshSession();eq(h.state.client,'A');eq(h.state.sdkCalls,1,'Later explicit server read does not resend password');
}
eq(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls,scope:'actual provider lifecycle with synthetic dependencies; no hosted/browser acceptance'}));
