import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readJSON,makeProject,deduplicate,validateProjects,writeJSON} from './data.mjs';
export async function collectYouTube(key, year, apiFetch=fetch) {
  if (!key) throw Error('YOUTUBE_API_KEY Secret을 등록해야 동기화할 수 있습니다. 기존 데이터는 유지됩니다.');
  async function api(resource, params) {
    const url=new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    for(const [k,v] of Object.entries({...params,key}))url.searchParams.set(k,v);
    let response;
    try{response=await apiFetch(url,{signal:AbortSignal.timeout(30000)})}catch{throw Error(`YouTube ${resource} 연결 실패. 기존 데이터 보존.`)}
    if(!response.ok)throw Error(`YouTube ${resource} HTTP ${response.status}. API 활성화·키 제한·할당량을 확인하세요.`);
    const data=await response.json();if(!Array.isArray(data.items))throw Error(`YouTube ${resource}: 불완전한 응답`);return data;
  }
  const config=readJSON('site.config.json');
  const channels=await api('channels',{part:'snippet,contentDetails',forHandle:config.youtubeHandle});
  const channel=channels.items[0];if(!channel?.contentDetails?.relatedPlaylists?.uploads || channel.id!==config.channelId)throw Error('채널 확인 실패');
  const ids=[];const tokens=new Set();let token='',pages=0;
  do {
    const data=await api('playlistItems',{part:'snippet,contentDetails,status',playlistId:channel.contentDetails.relatedPlaylists.uploads,maxResults:'50',...(token?{pageToken:token}:{})});
    pages++;for(const item of data.items)if(item.contentDetails?.videoId)ids.push(item.contentDetails.videoId);
    token=data.nextPageToken || '';if(token){if(tokens.has(token))throw Error('중복 페이지 토큰');tokens.add(token)}
  } while(token);
  if(!ids.length)throw Error('빈 업로드 목록. 기존 데이터 보존.');
  const raw=[];const unique=[...new Set(ids)];
  for(let start=0;start<unique.length;start+=50){
    const data=await api('videos',{part:'snippet,contentDetails,status',id:unique.slice(start,start+50).join(',')});
    for(const v of data.items){if(v.status?.privacyStatus!=='public'||new Date(v.snippet.publishedAt).getUTCFullYear()!==year)continue;
      raw.push({videoId:v.id,title:v.snippet.title,description:v.snippet.description,publishedAt:v.snippet.publishedAt,duration:v.contentDetails.duration,thumbnail:`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,url:`https://www.youtube.com/watch?v=${v.id}`,channelId:v.snippet.channelId,embeddable:v.status.embeddable,source:'YouTube Data API v3: channels / playlistItems / videos',collectedAt:new Date().toISOString()});
    }
  }
  if(!raw.length)throw Error(`빈 ${year} 응답. 기존 JSON을 덮어쓰지 않습니다.`);
  raw.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  return {raw,pages,totalPublicUploadIds:unique.length};
}
export function saveSnapshot(year,result) {
  const rawPath=`data/youtube-raw-${year}.json`;
  const old=fs.existsSync(rawPath)?readJSON(rawPath):[];
  const missing=old.filter(v=>!result.raw.some(x=>x.videoId===v.videoId));
  if(missing.length)throw Error(`${missing.length}개의 기존 영상이 응답에서 누락되었습니다. 공개 상태를 수동 확인하세요. 기존 데이터 보존.`);
  const decisions=readJSON('data/dedupe-decisions.json'),overrides=readJSON('data/overrides.json');
  const next=deduplicate(result.raw.map(v=>makeProject(v,year,overrides[v.videoId])),decisions);
  const errors=validateProjects(next.projects,year);if(errors.length)throw Error(errors.join('\n'));
  const priorReview=fs.existsSync('data/dedupe-review.json')?readJSON('data/dedupe-review.json').filter(x=>x.year!==year):[];
  const files=new Map([
    [rawPath,result.raw],[`data/projects-${year}.json`,next.projects],
    [`data/duplicates-${year}.json`,next.duplicates],
    [`data/dedupe-report-${year}.json`,{year,before:result.raw.length,after:next.projects.length,duplicates:next.duplicates.map(p=>({videoId:p.id,title:p.title,publishedAt:p.publishedAt,duplicateOf:p.duplicateOf,reason:p.reason}))}],
    ['data/dedupe-review.json',[...priorReview,...next.review.map(x=>({...x,year}))]],
    [`data/sync-audit-${year}.json`,{method:'YouTube Data API v3',collectedAt:new Date().toISOString(),playlistPages:result.pages,listedUploads:result.totalPublicUploadIds,yearVideos:result.raw.length}],
  ]);
  // Complete API acquisition, transformation and validation precede every file mutation.
  const backups=new Map([...files.keys()].map(f=>[f,fs.existsSync(f)?fs.readFileSync(f):null]));
  try{for(const [f,d] of files)writeJSON(f+'.tmp',d);for(const f of files.keys())fs.renameSync(f+'.tmp',f)}
  catch(error){for(const [f,backup] of backups){if(backup)fs.writeFileSync(f,backup);else if(fs.existsSync(f))fs.unlinkSync(f)}throw error}
  finally{for(const f of files.keys())if(fs.existsSync(f+'.tmp'))fs.unlinkSync(f+'.tmp')}
  console.log(`${year}: ${result.raw.length} videos → ${next.projects.length} projects, ${next.review.length} review candidates`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const year=Number(process.env.EXHIBITION_YEAR||process.argv[2]||new Date().getUTCFullYear());
  if(!Number.isInteger(year)||year<2026||year>2100)throw Error('Invalid exhibition year');
  const result=await collectYouTube(process.env.YOUTUBE_API_KEY,year);saveSnapshot(year,result);
}
