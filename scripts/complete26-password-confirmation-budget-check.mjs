// Actual provider methods + actual transport; virtual monotonic time, no network.
// --before-stdin reads the unchanged provider baseline, never another checkout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createSingleFlight, readBrowserServerSession, requestConfirmedBrowserSignOut,
  resolveBrowserSignOutDisposition } from '../src/lib/auth/browser-session-transport.ts';

const before = process.argv.includes('--before-stdin');
const source = readFileSync(before ? 0 : new URL('../components/auth/auth-provider.tsx', import.meta.url), 'utf8');
const part = (start, end) => {
  const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
  assert(a>=0 && b>a, 'Actual provider extraction seam'); return source.slice(a,b);
};
const implementation = stripTypeScriptTypes(
  part('function createAnonymousSession()', 'export function AuthProvider') +
  part('  function isCurrentSessionRead(', '  useEffect(() =>') +
  part('  async function signInWithPassword(', '  async function signInWithPhone(') +
  part('  function signOut()', '  const value: AuthContextValue'));
let checks=0, networkCalls=0;
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const originals={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,
  performance:Object.getOwnPropertyDescriptor(globalThis,'performance'),fetch:globalThis.fetch};
globalThis.fetch=async()=>{networkCalls++;throw Error('Network forbidden');};

async function withClock(test) {
  let now=0, id=0; const timers=new Map();
  globalThis.setTimeout=(fn,ms=0)=>{const key=++id;timers.set(key,{at:now+ms,fn});return key;};
  globalThis.clearTimeout=key=>timers.delete(key);
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
  const clock={sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),jump:ms=>{now+=ms;},
    async advance(ms){const end=now+ms;await flush();for(;;){
      const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();
    }now=end;await flush();}};
  try {await test(clock);} finally {
    globalThis.setTimeout=originals.setTimeout;globalThis.clearTimeout=originals.clearTimeout;
    Object.defineProperty(globalThis,'performance',originals.performance);
  }
}

function harness(clock) {
  const s={client:null,writes:[],sdkCalls:0,reads:0,logoutCalls:0,server:'A',sdkId:'A',
    fetchDelay:0,bodyDelay:0,parseJump:0,logoutDelay:0,unavailable:false,budgets:[],signals:[],onSdk:async()=>{}};
  const fetcher=async(path,init)=>{
    s.signals.push(init.signal);
    if(path==='/api/auth/logout') {s.logoutCalls++;await clock.sleep(s.logoutDelay);s.server=null;return Response.json({ok:true,status:'signed_out'});}
    eq(path,'/api/auth/session');s.reads++;const id=s.server, unavailable=s.unavailable;
    const fd=s.fetchDelay,bd=s.bodyDelay,pj=s.parseJump;
    // Deliberately ignore abort: the transport must still settle and suppress late work.
    if(fd)await clock.sleep(fd);
    return {ok:!unavailable,json:async()=>{if(bd)await clock.sleep(bd);if(pj)clock.jump(pj);
      return id?{isAuthenticated:true,user:{id}}:{isAuthenticated:false,sessionStatus:'session_missing'};}};
  };
  const deps={authStatus:{effectiveMode:'supabase_auth'},authEpochRef:{current:0},refreshSequenceRef:{current:0},
    logoutPendingRef:{current:false},passwordIdentityRef:{current:null},sessionRefreshRef:{current:null},
    setSession:v=>{s.client=v.user?.id??null;s.writes.push(s.client);},setIsSessionResolved:()=>{},
    mergeLocalProfileIntoUser:u=>u,loadBrowserUserProfile:async u=>u,isMockDemoSessionActive:()=>false,
    clearMockDemoSession:()=>{},clearLocalUserProfile:()=>{},clearBrowserDemoStorage:()=>{},demoUser:{id:'demo'},
    isPasswordOnlyAuthEnabled:()=>true,loadSupabaseBrowserClient:async()=>({auth:{signInWithPassword:async()=>{
      s.sdkCalls++;await s.onSdk();return {data:{user:{id:s.sdkId}},error:null};}}}),
    readBrowserServerSession:(unused,timeout)=>{eq(unused,undefined);s.budgets.push(timeout??10_000);return readBrowserServerSession(fetcher,timeout);},
    requestConfirmedBrowserSignOut:()=>requestConfirmedBrowserSignOut(fetcher),resolveBrowserSignOutDisposition,
    signOutSingleFlightRef:{current:createSingleFlight()}};
  const api=new Function(...Object.keys(deps),`${implementation};return {refreshSession,signInWithPassword,signOut};`)(...Object.values(deps));
  return {s,deps,api,login:()=>api.signInWithPassword('synthetic@example.invalid','synthetic-password')};
}

try {
  for(const delay of [24_000,25_000]) for(const phase of ['fetch','body']) await withClock(async clock=>{
    const h=harness(clock);h.s[phase==='fetch'?'fetchDelay':'bodyDelay']=delay;
    const pending=h.login();await flush();eq(h.s.client,null);await clock.advance(delay);
    eq((await pending).ok,!before,`${phase} ${delay} ms confirmation`);
    eq(h.s.client,before?null:'A');eq(h.s.sdkCalls,1);eq(h.s.reads,1);
    eq(h.s.budgets,[before?10_000:30_000]);
  });
  if(!before){
    for(const phase of ['fetch','body','combined','parse']) await withClock(async clock=>{
      const h=harness(clock);
      if(phase==='fetch')h.s.fetchDelay=30_001;
      if(phase==='body')h.s.bodyDelay=30_001;
      if(phase==='combined'){h.s.fetchDelay=20_000;h.s.bodyDelay=10_001;}
      if(phase==='parse')h.s.parseJump=30_001;
      const pending=h.login();await clock.advance(30_000);
      const result=await pending;eq(result.ok,false);eq(result.message.includes('reload the page'),true);
      eq(h.s.client,null);eq(h.s.sdkCalls,1);eq(h.s.reads,1);eq(h.s.signals[0].aborted,true);
      await clock.advance(1_000);eq(h.s.client,null,'No late timeout resurrection');
    });
    for(const mode of ['wrong_uuid','anonymous','unavailable'])await withClock(async clock=>{
      const h=harness(clock);h.s.fetchDelay=25_000;
      if(mode==='wrong_uuid')h.s.server='B';if(mode==='anonymous')h.s.server=null;if(mode==='unavailable')h.s.unavailable=true;
      const p=h.login();await clock.advance(25_000);eq((await p).ok,false,mode);eq(h.s.client,null);eq(h.s.sdkCalls,1);
    });
    await withClock(async clock=>{
      const h=harness(clock);h.s.fetchDelay=25_000;
      h.s.onSdk=async()=>{eq(await h.api.refreshSession(),false);eq(h.s.reads,0);};
      const p=h.login();await flush();const event=h.api.refreshSession();
      eq(h.s.reads,1);await clock.advance(25_000);eq((await p).ok,true);eq(await event,true);eq(h.s.reads,1);
      h.s.fetchDelay=10_001;const background=h.api.refreshSession();await clock.advance(10_000);
      eq(await background,false);eq(h.s.budgets,[30_000,10_000]);eq(h.s.client,'A','Keep previously verified identity, not late data');
    });
    for(const end of ['logout','unmount','new_identity'])await withClock(async clock=>{
      const h=harness(clock);h.s.fetchDelay=25_000;const old=h.login();await flush();
      if(end==='logout'){const logout=h.api.signOut();await clock.advance(0);eq((await logout).ok,true);}
      if(end==='unmount'){h.deps.authEpochRef.current++;h.deps.refreshSequenceRef.current++;}
      if(end==='new_identity'){h.s.fetchDelay=0;h.s.server='B';h.s.sdkId='B';eq((await h.login()).ok,true);}
      const writes=[...h.s.writes];await clock.advance(25_000);eq((await old).ok,false);eq(h.s.writes,writes,end);
    });
    await withClock(async clock=>{
      const h=harness(clock);h.s.logoutDelay=10_001;h.s.fetchDelay=10_001;
      const logout=h.api.signOut();await clock.advance(10_000);eq(h.s.signals[0].aborted,true,'Logout still 10 seconds');
      eq(h.s.budgets,[10_000],'Logout reconciliation does not inherit 30 seconds');
      await clock.advance(10_000);eq((await logout).ok,false);eq(h.s.client,null);eq(h.s.logoutCalls,1);
    });
  }
  eq(networkCalls,0);
  console.log(JSON.stringify({status:before?'EXPECTED_BASELINE_PREMATURE_TIMEOUT':'PASS',checks,networkCalls,
    scope:'actual extracted provider + unchanged transport, synthetic monotonic clock; not hosted/browser acceptance'}));
} finally {globalThis.fetch=originals.fetch;}
