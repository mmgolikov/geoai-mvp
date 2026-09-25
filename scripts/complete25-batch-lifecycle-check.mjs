import assert from "node:assert/strict";
import { runHostedProbe, runReviewedComplete25Batch } from "./sprint10-hosted-auth-probe.mjs";
// Fake transport only: no SDK, filesystem ledger, runtime environment or service calls.
const commit="a".repeat(40),runId="0123456789abcdef01",host="geoai-offline-batch.vercel.app";
const ids=["11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222"];
const batch={ledgerId:"5aa405b3-bbda-48aa-aeea-ca3357be4042",previewHost:host,previewUrl:`https://${host}`,scope:"complete25-batch"};
const config={expectedCommitSha:commit,projectRef:"pphdqkurxneyagvnnjdt",supabaseUrl:"https://pphdqkurxneyagvnnjdt.supabase.co",
  adminSecretKey:"OFFLINE_ADMIN_SENTINEL",batch,liveJourney:{...batch,checkpointPath:"unused"}};
let lifecycleCases=0,childChecks=0;
for(const fault of [null,"claim","A_create","B_create","A_auth","B_auth","anonymous","preview","batch_throw","batch_fail","A_retire","checkpoint"]){
  const counts={create:0,retire:0,batch:0,claim:0};let terminal;
  await runHostedProbe({env:{},gitHead:commit,config,runId,createClient:()=>({}),emitReceipt:r=>{terminal=r;},setExitCode:()=>{},operations:{
    writeCheckpoint(_p,input){if(fault==="checkpoint"&&input.state==="active")throw Error("OFFLINE");},
    claimComplete25Batch(){counts.claim++;if(fault==="claim")throw Error("OFFLINE");},
    async createPersona(_a,_c,_f,p,{onUuidKnown}){counts.create++;if(fault===`${p.lane}_create`)throw Error("OFFLINE");
      p.userId=ids[p.lane==="A"?0:1];p.createOutcomeUnknown=false;onUuidKnown(p);},
    async authenticatePersona(_a,_c,p){if(fault===`${p.lane}_auth`)throw Error("OFFLINE");
      p.profileId=p.userId;p.auth=Object.fromEntries(Object.keys(p.auth).map(k=>[k,true]));
      p.sessions=Array.from({length:2},()=>({accessToken:"OFFLINE_ACCESS",refreshToken:"OFFLINE_REFRESH"}));},
    async verifyAnonymousDenial(){if(fault==="anonymous")throw Error("OFFLINE");},
    runExistingPreviewHarness(){if(fault==="preview")throw Error("OFFLINE");return "passed_existing_reviewed_runner";},
    async runReviewedComplete25Batch(c,personas,r,{invocationState}){
      counts.batch++;if(fault==="batch_throw")throw Error("OFFLINE");
      if(fault==="batch_fail")return {status:"FAIL",stage:"batch_stopped"};
      let spawned=0;const acquisition={caseId:"A01-Q",planSha256:"b".repeat(64)};
      const descriptor={scope:"quality20-acquire",quality20:null,acquisition,quality20Environment:{GEOAI_QUALITY20_ACQUISITION_PLAN_PATH:"OFFLINE_PLAN"}};
      const seamOptions={invocationState,env:{PATH:"/offline",NODE_OPTIONS:"DANGEROUS",GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY:"OFFLINE_ADMIN_SENTINEL",
        GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY:"OFFLINE_PUBLIC_SENTINEL",UNRELATED_SECRET:"OFFLINE_SECRET",GEOAI_E2E_BASE_URL:`https://${host}`},
        coordinator:async(_b,child)=>{for(let i=0;i<85;i++)assert.equal((await child(descriptor)).status,"ACQUIRED_NOT_ANALYSED");return {status:"PASS",caseCount:58,cloudPersistenceAccepted:false};},
        spawn(executable,args,options){spawned++;assert.equal(args.length,1);assert(args[0].endsWith("/scripts/sprint10-live-journey-run.mjs"));
          assert.equal(options.env.GEOAI_SPRINT10_LIVE_USER_ID,ids[0]);assert.equal(options.env.GEOAI_SPRINT10_LIVE_EMAIL,personas[0].email);
          for(const name of ["NODE_OPTIONS","GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY","GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY","UNRELATED_SECRET"])assert.equal(options.env[name],undefined);
          assert(!JSON.stringify(options.env).includes("OFFLINE_ADMIN_SENTINEL"));childChecks++;
          return {status:0,stdout:JSON.stringify({status:"ACQUIRED_NOT_ANALYSED",scope:descriptor.scope,previewHost:host,commit,browserLocalPersistenceOnly:true,receipts:[],quality20:{caseId:acquisition.caseId,manifestSha256:acquisition.planSha256,depth:null,observations:[]}})};
        }};
      const result=await runReviewedComplete25Batch(c,personas,r,seamOptions);assert.equal(spawned,85);
      await assert.rejects(()=>runReviewedComplete25Batch(c,personas,r,seamOptions),/fresh active/);
      return result;
    },
    async retirePersona(_cl,_ad,_fetch,_co,p){counts.retire++;if(fault===`${p.lane}_retire`)throw Error("OFFLINE");
      p.credentialsCleared=true;p.password=null;p.sessions=[];
      p.cleanup={serverGlobalRevokeConfirmed:true,refreshTokensRejected:2,banned:true,passwordRejected:true,currentProfileEmpty:true,finalBanReadback:true};return [];}
  }});
  assert.equal(counts.retire,2,fault??"success");assert(counts.create<=2);assert(counts.batch<=1);assert.equal(counts.claim,1);
  assert.equal(terminal.status,fault===null?"PASS":["A_create","B_create","A_retire","checkpoint"].includes(fault)?"FAIL_ACTION_REQUIRED":"FAIL",fault??"success");
  assert.equal(terminal.schemaVersion,"geoai.complete25.hosted-batch-receipt.v1");
  assert(!JSON.stringify(terminal).includes("OFFLINE_ADMIN_SENTINEL"));assert(!JSON.stringify(terminal).includes("OFFLINE_ACCESS"));
  if(!fault)assert.equal(counts.create,2);if(fault==="claim")assert.equal(counts.create,0);
  lifecycleCases++;
}
console.log(JSON.stringify({status:"PASS",scope:"offline two-persona lifecycle",lifecycleCases,strictChildEnvironmentChecks:childChecks,realCalls:0}));
