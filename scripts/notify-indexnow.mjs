import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readJSON} from './data.mjs';
import {parseSitemap} from './seo.mjs';

export function createPayload(config,xml){
  const {key,endpoint}=config.indexNow||{};
  if(!/^[a-zA-Z0-9-]{8,128}$/.test(key||''))throw Error('Invalid IndexNow key');
  if(endpoint!=='https://api.indexnow.org/indexnow')throw Error('Unexpected IndexNow endpoint');
  const base=new URL(config.url);
  if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash)throw Error('Invalid site origin');
  const urlList=parseSitemap(xml).map(e=>e.loc);
  for(const loc of urlList){const u=new URL(loc);if(u.origin!==base.origin||u.search||u.hash)throw Error(`Invalid IndexNow URL: ${loc}`)}
  if(urlList.length>10000)throw Error('IndexNow URL batch exceeds 10000');
  return {host:base.host,key,keyLocation:`${base.origin}/${key}.txt`,urlList};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const retryable=status=>status===429||status>=500;
export async function notifyIndexNow({config,xml,request=fetch,wait=sleep,keyAttempts=18,submitAttempts=6}){
  const expected=createPayload(config,xml);
  let verified=false;
  for(let attempt=1;attempt<=keyAttempts;attempt++){
    try{
      const r=await request(expected.keyLocation,{signal:AbortSignal.timeout(30000),cache:'no-store'});
      if(r.status===200&&(await r.text())===expected.key){verified=true;break}
      if(r.status>=400&&r.status<500&&r.status!==404&&!retryable(r.status))throw Object.assign(Error(`Key HTTP ${r.status}`),{fatal:true});
    }catch(error){if(error.fatal)throw error}
    if(attempt<keyAttempts)await wait(10000);
  }
  if(!verified)throw Error('IndexNow public key verification failed');
  // Read the deployed sitemap; require the published and built URL sets to agree.
  let published;
  for(let attempt=1;attempt<=keyAttempts;attempt++){
    try{
      const r=await request(config.url+'/sitemap.xml',{signal:AbortSignal.timeout(30000),cache:'no-store'});
      if(r.status===200){
        const payload=createPayload(config,await r.text());
        if(JSON.stringify([...payload.urlList].sort())===JSON.stringify([...expected.urlList].sort())){published=payload;break}
      }else if(r.status>=400&&r.status<500&&r.status!==404&&!retryable(r.status))throw Object.assign(Error(`Sitemap HTTP ${r.status}`),{fatal:true});
    }catch(error){if(error.fatal)throw error}
    if(attempt<keyAttempts)await wait(10000);
  }
  if(!published)throw Error('Published sitemap verification failed');
  for(let attempt=1;attempt<=submitAttempts;attempt++){
    let r;
    try{r=await request(config.indexNow.endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(published),signal:AbortSignal.timeout(30000)})}
    catch(error){if(attempt===submitAttempts)throw error;await wait(attempt*10000);continue}
    const response=await r.text();
    if(r.status===200||r.status===202)return {status:r.status,urlCount:published.urlList.length,keyLocation:published.keyLocation,urlList:published.urlList,response,accepted:true,indexingConfirmed:false};
    if(!retryable(r.status))throw Error(`IndexNow HTTP ${r.status}: ${response}`);
    if(attempt===submitAttempts)throw Error(`IndexNow retry limit: HTTP ${r.status}`);
    await wait(attempt*10000);
  }
  throw Error('IndexNow submission failed');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const config=readJSON('site.config.json');
  try{
    const result=await notifyIndexNow({config,xml:fs.readFileSync('dist/sitemap.xml','utf8')});
    fs.writeFileSync('indexnow-result.json',JSON.stringify(result,null,2)+'\n');
    console.log(`IndexNow accepted ${result.urlCount} URLs (HTTP ${result.status}); acceptance does not confirm indexing.`);
  }catch(error){fs.writeFileSync('indexnow-result.json',JSON.stringify({accepted:false,error:error.message},null,2)+'\n');throw error}
}
