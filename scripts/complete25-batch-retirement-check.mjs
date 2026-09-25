import assert from "node:assert/strict";
import { retirePersona } from "./sprint10-hosted-auth-probe.mjs";

// Real retirement implementation with fake SDK/fetch only. Original access
// tokens represent four-hour-old expired JWTs; no network dispatcher is used.
const userId="11111111-1111-4111-8111-111111111111";
const differentId="22222222-2222-4222-8222-222222222222";
const now=Date.now();const config={batch:{},supabaseUrl:"https://pphdqkurxneyagvnnjdt.supabase.co",publishableKey:"OFFLINE"};
const user={id:userId,email:"geoai-offline@example.invalid"};
let cases=0;
const originalFetch=globalThis.fetch;
try{
  for(const fault of [null,"reauth_denied","wrong_user","wrong_session_user","wrong_email","expired_new","short_new","same_refresh","missing_token","get_user_denied","get_user_mismatch","global_401","new_refresh_accepted","new_refresh_429","stale_401"]){
    let banned=false,signIns=0,globalRevokes=0;const refreshes=[],stages=[],accessUses=[];
    const persona={lane:"A",userId,profileId:userId,email:user.email,password:"OFFLINE_PASSWORD",createAttempted:true,credentialsCleared:false,
      sessions:[{label:"primary",accessToken:"EXPIRED_PRIMARY",refreshToken:"ORIGINAL_PRIMARY_REFRESH"},
        {label:"secondary",accessToken:"EXPIRED_SECONDARY",refreshToken:"ORIGINAL_SECONDARY_REFRESH"}],
      cleanup:{serverGlobalRevokeConfirmed:false,refreshTokensRejected:0,banned:false,passwordRejected:false,currentProfileEmpty:false,finalBanReadback:false}};
    globalThis.fetch=async(input,init)=>{
      assert.equal(String(input),`${config.supabaseUrl}/auth/v1/logout?scope=global`);assert.equal(init.method,"POST");globalRevokes++;
      accessUses.push(init.headers.Authorization);
      const fresh=init.headers.Authorization==="Bearer FRESH_RETIREMENT_ACCESS";
      return new Response(null,{status:fresh&&fault!=="global_401"?204:401});
    };
    const createClient=(_url,_key,options)=>({auth:{
      async signInWithPassword(input){signIns++;assert.equal(input.email,user.email);assert.equal(input.password,persona.password);
        if(banned)return {data:{session:null},error:{code:"user_banned",status:400}};
        if(fault==="reauth_denied")return {data:{session:null},error:{code:"invalid_credentials",status:400}};
        return {data:{user:{...user,...(fault==="wrong_user"?{id:differentId}:{}),...(fault==="wrong_email"?{email:"other@example.invalid"}:{})},session:{
          user:{id:fault==="wrong_session_user"?differentId:userId},access_token:fault==="missing_token"?null:"FRESH_RETIREMENT_ACCESS",refresh_token:fault==="same_refresh"?"ORIGINAL_PRIMARY_REFRESH":"FRESH_RETIREMENT_REFRESH",
          expires_at:Math.floor(now/1000)+(fault==="expired_new"?-1:fault==="short_new"?60:3600)}},error:null};
      },
      async getUser(token){assert.equal(token,"FRESH_RETIREMENT_ACCESS");return fault==="get_user_denied"?{error:{code:"bad_jwt",status:401},data:{user:null}}:
        {error:null,data:{user:{id:fault==="get_user_mismatch"?differentId:userId}}};},
      async refreshSession({refresh_token}){refreshes.push(refresh_token);
        if(refresh_token==="FRESH_RETIREMENT_REFRESH"&&fault==="new_refresh_accepted")return {data:{session:{access_token:"UNEXPECTED"}},error:null};
        if(refresh_token==="FRESH_RETIREMENT_REFRESH"&&fault==="new_refresh_429")return {data:{session:null},error:{code:"over_request_rate_limit",status:429}};
        return {data:{session:null},error:{code:"refresh_token_not_found",status:400}};
      }},schema(name){assert.equal(name,"api");return {async rpc(name){assert.equal(name,"current_profile");
        accessUses.push(options.global.headers.Authorization);
        const fresh=options.global.headers.Authorization==="Bearer FRESH_RETIREMENT_ACCESS";
        return fresh&&fault!=="stale_401"?{status:200,data:[],error:null}:{status:401,data:null,error:{code:"PGRST303",status:401}};}};}});
    const admin={auth:{admin:{async updateUserById(id,body){assert.equal(id,userId);assert.deepEqual(body,{ban_duration:"876000h"});banned=true;
      return {data:{user:{id,banned_until:new Date(now+86400000).toISOString()}},error:null};},
      async getUserById(id){assert.equal(id,userId);return {data:{user:{id,banned_until:new Date(now+86400000).toISOString()}},error:null};}}}};
    const failures=await retirePersona(createClient,admin,null,config,persona,{onStage:s=>stages.push(s)});
    assert.equal(banned,true,fault??"success");assert.equal(signIns,2,"one reauth and one post-ban denial, never retry");assert.equal(globalRevokes,1);
    assert.deepEqual(refreshes.slice(0,2),["ORIGINAL_PRIMARY_REFRESH","ORIGINAL_SECONDARY_REFRESH"]);
    assert.equal(persona.cleanup.refreshTokensRejected,2);assert.equal(persona.credentialsCleared,true);assert.equal(persona.password,null);assert.equal(persona.batchRetirementSession??null,null);
    assert(stages.includes("retired_user_readback"));assert(!JSON.stringify(failures).includes("FRESH_RETIREMENT_ACCESS"));
    if(!fault){assert.equal(failures.length,0);assert.equal(persona.batchRetirementSessionVerified,true);assert.equal(persona.batchRetirementRefreshRejected,true);
      assert.equal(persona.cleanup.serverGlobalRevokeConfirmed,true);assert.equal(persona.cleanup.currentProfileEmpty,true);assert.equal(refreshes.length,3);}
    else assert(failures.length>0,fault);
    if(["new_refresh_accepted","new_refresh_429"].includes(fault))assert.equal(persona.batchRetirementRefreshRejected,false);
    if(fault==="global_401")assert.equal(persona.cleanup.serverGlobalRevokeConfirmed,false);
    if(fault==="stale_401")assert.equal(persona.cleanup.currentProfileEmpty,false);
    if(["get_user_mismatch","get_user_denied","wrong_user","wrong_session_user","wrong_email"].includes(fault)){
      assert.equal(persona.cleanup.serverGlobalRevokeConfirmed,false);assert.equal(refreshes.length,2);assert.equal(persona.batchRetirementIdentityVerified,false);
      assert.deepEqual(accessUses,["Bearer EXPIRED_PRIMARY","Bearer EXPIRED_PRIMARY"]);
    }
    if(["short_new","expired_new","same_refresh"].includes(fault)){assert.equal(refreshes.length,3);assert.equal(persona.cleanup.serverGlobalRevokeConfirmed,true);assert.equal(persona.batchRetirementSessionVerified,false);}
    cases++;
  }
}finally{globalThis.fetch=originalFetch;}
console.log(JSON.stringify({status:"PASS",scope:"offline actual retirement with expired original JWTs",cases,retainedOriginalRefreshProofs:2,additionalFreshRefreshProofs:1,realCalls:0}));
