import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicate,validateProjects,readJSON,publicText,makeProject} from '../scripts/data.mjs';
import {collectYouTube,saveSnapshot} from '../scripts/sync-youtube.mjs';
const sample=readJSON('data/projects-2026.json')[0];
test('all real project data validates',()=>assert.deepEqual(validateProjects(readJSON('data/projects-2026.json'),2026),[]));
test('same project reupload keeps latest, retains old record',()=>{
 const old={...sample,id:'old',publishedAt:'2026-01-01T00:00:00Z'};
 const result=deduplicate([old,sample]);assert.equal(result.projects.length,1);assert.equal(result.projects[0].id,sample.id);assert.equal(result.duplicates[0].duplicateOf,sample.id);
});
test('same title but different students is a review candidate, never auto merged',()=>{
 const other={...sample,id:'other',students:['홍길동']};const result=deduplicate([sample,other]);assert.equal(result.projects.length,2);assert.equal(result.review.length,1);
});
test('confirmed team uploads merge students and choose latest',()=>{
 const older={...sample,id:'old',students:['홍길동'],publishedAt:'2026-01-01T00:00:00Z'};
 const result=deduplicate([older,sample],{groups:[{videoIds:['old',sample.id],reason:'confirmed team'}]});assert.equal(result.projects.length,1);assert.ok(result.projects[0].students.includes('홍길동'));
});
test('same student with a different project is retained and flagged',()=>{const result=deduplicate([sample,{...sample,id:'other',title:'다른 작품'}]);assert.equal(result.projects.length,2);assert.equal(result.review.length,1)});
test('duplicate slug, wrong year and bad date fail validation',()=>{
 assert.ok(validateProjects([sample,{...sample,id:'other',youtubeVideoId:'abcdefghijk'}],2026).some(x=>x.includes('slug')));
 assert.ok(validateProjects([{...sample,publishedAt:'bad'}],2026).some(x=>x.includes('year')));
 assert.ok(validateProjects([{...sample,year:2027}],2026).some(x=>x.includes('year')));
});
test('private identifiers are removed from public text',()=>assert.equal(publicText('이메일 abc@example.com 전화 010-1234-5678 학번: 20260123'),'이메일 [이메일 비공개] 전화 [연락처 비공개] [학번 비공개]'));
test('source fields and public students survive transformation',()=>{const raw=readJSON('data/youtube-raw-2026.json')[0];const p=makeProject(raw,2026);assert.equal(p.students[0],'유영상');assert.ok(p.originalDescription.includes('K-Stock'));assert.equal(p.source.url,raw.url)});
test('API key missing fails before network request',async()=>{let calls=0;await assert.rejects(collectYouTube('',2026,()=>{calls++}),/YOUTUBE_API_KEY/);assert.equal(calls,0)});
test('empty API snapshot never overwrites existing JSON',()=>{const before=JSON.stringify(readJSON('data/youtube-raw-2026.json'));assert.throws(()=>saveSnapshot(2026,{raw:[]}),/누락/);assert.equal(JSON.stringify(readJSON('data/youtube-raw-2026.json')),before)});
test('complete playlist pagination uses actual video publication time and duration',async()=>{
 let playlistCalls=0;
 const fake=async url=>{let data;if(url.pathname.endsWith('/channels'))data={items:[{id:'UCmzyR9BA0gHRM58o8SjdYjw',contentDetails:{relatedPlaylists:{uploads:'uploads'}}}]};
 else if(url.pathname.endsWith('/playlistItems')){playlistCalls++;data=url.searchParams.has('pageToken')?{items:[{contentDetails:{videoId:'abcdefghijk'}}]}:{items:[{contentDetails:{videoId:'12345678901'}}],nextPageToken:'next'}}
 else data={items:[{id:'12345678901',snippet:{title:'new',description:'real',publishedAt:'2026-01-01T00:00:00Z'},status:{privacyStatus:'public',embeddable:true},contentDetails:{duration:'PT2M'}},{id:'abcdefghijk',snippet:{publishedAt:'2025-12-31T23:59:59Z'},status:{privacyStatus:'public'},contentDetails:{duration:'PT1M'}}]};
 return {ok:true,json:async()=>data}};
 const result=await collectYouTube('fake',2026,fake);assert.equal(playlistCalls,2);assert.equal(result.raw.length,1);assert.equal(result.raw[0].duration,'PT2M');
});
