import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAuthSessionTiming } from '../src/lib/auth/session-timing.ts';

globalThis.fetch = async () => { throw new Error('Network forbidden'); };
const id = '01234567-89ab-4cde-8f01-234567890abc';
const request = new Request('https://example.invalid/api/auth/session', {
  headers: {cookie: 'PRIVATE_COOKIE', authorization: 'PRIVATE_TOKEN'}
});
let time = 0;
const events = [];
const measure = createAuthSessionTiming(request, id, e => events.push(e), () => time);
const secretResponse = { user: 'PRIVATE_USER', access_token: 'PRIVATE_TOKEN' };
assert.equal(await measure('claims', async () => { time += 25; return secretResponse; }), secretResponse);
assert.deepEqual(events.map(e => [e.stage,e.phase,e.elapsedMs]), [['claims','start',0],['claims','finish',25]]);
const secretError = new Error('PRIVATE_ERROR');
await assert.rejects(measure('user', async () => { time += 15; throw secretError; }), e => e === secretError);
assert.equal(events.at(-1).phase, 'error');
assert.equal(events.at(-1).elapsedMs, 15);
assert(!JSON.stringify(events).includes('PRIVATE_'));
assert(events.every(e => Object.keys(e).sort().join(',') === 'elapsedMs,event,phase,requestId,stage'));
for (const [r, rid] of [[undefined,id],[new Request('https://example.invalid/api/projects'),id],
  [request,'PRIVATE_INVALID_ID']]) {
  const unexpected = [];
  assert.equal(await createAuthSessionTiming(r,rid,e=>unexpected.push(e))('profile',async()=>secretResponse),secretResponse);
  assert.equal(unexpected.length,0);
}
assert.equal(await createAuthSessionTiming(request,id,()=>{throw secretError;})('profile',async()=>secretResponse),secretResponse);
let release;
const pending = measure('profile', () => new Promise(resolve => { release = resolve; }));
assert.equal(events.at(-1).phase,'start');
time += 5000; release(secretResponse);
assert.equal(await pending,secretResponse);
assert.equal(events.at(-1).elapsedMs,5000);
const context = readFileSync(new URL('../src/lib/auth/request-context.ts',import.meta.url),'utf8');
const middleware = readFileSync(new URL('../src/lib/supabase/update-session.ts',import.meta.url),'utf8');
for(const stage of ['claims','user','profile']) assert(context.includes(`measureSessionStage("${stage}"`));
assert(middleware.includes('request.method === "GET" && request.nextUrl.pathname === "/api/auth/session"'));
assert(!middleware.includes('measureSessionStage("middleware_claims"'));
console.log('PASS session timing: stage duration, original result/error, privacy, disabled paths, logging failure and wiring; no network.');
