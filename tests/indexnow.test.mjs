import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readJSON} from '../scripts/data.mjs';
import {createPayload,notifyIndexNow} from '../scripts/notify-indexnow.mjs';
const config=readJSON('site.config.json'),xml=fs.readFileSync('dist/sitemap.xml','utf8');
const response=(status,text='')=>({status,text:async()=>text});
function fake({keys=[200],posts=[200],keyText=config.indexNow.key}={}){
  const calls=[],delays=[];let ki=0,pi=0;
  return {calls,delays,request:async(url,options)=>{
    calls.push({url,options});if(options?.method==='POST')return response(posts[Math.min(pi++,posts.length-1)]);
    if(url.endsWith('/sitemap.xml'))return response(200,xml);
    return response(keys[Math.min(ki++,keys.length-1)],keyText);
  },wait:async ms=>delays.push(ms)};
}
test('public key file contains exactly the configured key and all 21 URLs form the payload',()=>{
  assert.equal(fs.readFileSync(`dist/${config.indexNow.key}.txt`,'utf8'),config.indexNow.key);
  const p=createPayload(config,xml);assert.equal(p.host,'contest.k-bigdata.kr');assert.equal(p.urlList.length,21);assert.equal(p.keyLocation,config.url+'/'+config.indexNow.key+'.txt');
});
for(const status of [200,202])test(`IndexNow HTTP ${status} is accepted without claiming indexing`,async()=>{
  const f=fake({posts:[status]});const r=await notifyIndexNow({config,xml,...f});assert.equal(r.status,status);assert.equal(r.indexingConfirmed,false);assert.equal(JSON.parse(f.calls.find(c=>c.options?.method==='POST').options.body).urlList.length,21);
});
test('deployment propagation, rate limits and server errors retry then succeed',async()=>{
  const f=fake({keys:[404,503,200],posts:[429,500,202]});assert.equal((await notifyIndexNow({config,xml,...f})).status,202);assert.equal(f.delays.length,4);
});
test('nonretryable 4xx fails immediately',async()=>{
  const f=fake({posts:[403]});await assert.rejects(()=>notifyIndexNow({config,xml,...f}),/HTTP 403/);assert.equal(f.delays.length,0);
});
test('wrong key, exhausted retries and empty sitemap fail',async()=>{
  await assert.rejects(()=>notifyIndexNow({config,xml,...fake({keyText:'wrong'}),keyAttempts:2}),/key verification failed/);
  await assert.rejects(()=>notifyIndexNow({config,xml,...fake({posts:[500]}),submitAttempts:2}),/retry limit/);
  assert.throws(()=>createPayload(config,'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>'),/0 URLs/);
});
test('foreign-host URLs cannot be submitted',()=>{
  assert.throws(()=>createPayload(config,xml.replace(config.url+'/2026/', 'https://example.org/2026/')),/Invalid IndexNow URL/);
});
