import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadYears,readJSON} from '../scripts/data.mjs';
import {auditSEO,checkSEO} from '../scripts/check-seo.mjs';
import {parseSitemap,projectChangeDates,durationSeconds} from '../scripts/seo.mjs';

const config=readJSON('site.config.json'),years=loadYears();
const sitemapXml=fs.readFileSync('dist/sitemap.xml','utf8');
const videoSitemapXml=fs.readFileSync('dist/video-sitemap.xml','utf8');
function fixture(){return {config,years,sitemapXml,videoSitemapXml,robots:fs.readFileSync('dist/robots.txt','utf8'),pages:new Map(parseSitemap(sitemapXml).map(({loc})=>[loc,{status:200,xRobotsTag:'',html:fs.readFileSync('dist'+new URL(loc).pathname+'index.html','utf8')}]))}}
const projectURL=config.url+'/2026/projects/k-stock-compass/';
test('all 18 projects have searchable initial HTML, valid schemas, unique metadata and no orphan pages',async()=>{
  const result=await checkSEO();assert.deepEqual(result,{sitemapUrls:21,videoEntries:18,projects:18,uniqueTitles:18,uniqueDescriptions:18,videoObjects:18,orphanPages:0});
});
test('SEO gate rejects noindex and blocked response headers',()=>{
  let f=fixture();f.pages.get(projectURL).html=f.pages.get(projectURL).html.replace('index, follow,','noindex, follow,');assert.throws(()=>auditSEO(f),/robots index\/follow missing/);
  f=fixture();f.pages.get(projectURL).xRobotsTag='noindex';assert.throws(()=>auditSEO(f),/X-Robots-Tag blocks/);
});
test('SEO gate rejects missing visible technology, incorrect canonical and missing pages',()=>{
  let f=fixture();f.pages.get(projectURL).html=f.pages.get(projectURL).html.replaceAll('Spring Boot','Invisible');assert.throws(()=>auditSEO(f),/Technology|VideoObject description/);
  f=fixture();f.pages.get(projectURL).html=f.pages.get(projectURL).html.replace('<link rel="canonical" href="'+projectURL,'<link rel="canonical" href="https://portfolio.k-bigdata.kr/');assert.throws(()=>auditSEO(f),/canonical/);
  f=fixture();f.pages.delete(projectURL);assert.throws(()=>auditSEO(f),/no HTML page/);
});
test('sitemap XML parser rejects malformed, duplicate and empty documents and decodes escaped text',()=>{
  assert.throws(()=>parseSitemap(sitemapXml.replace('</urlset>','')),/Invalid sitemap XML/);
  const entry=sitemapXml.match(/<url>[\s\S]*?<\/url>/)[0];assert.throws(()=>parseSitemap(sitemapXml.replace('</urlset>',entry+'</urlset>')),/Duplicate/);
  assert.throws(()=>parseSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'),/0 URLs/);
  const escaped='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://example.org/</loc><video:video><video:title>A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;</video:title></video:video></url></urlset>';
  assert.equal(parseSitemap(escaped,{video:true})[0]['video:video']['video:title'],`A & B <C> "D" 'E'`);
});
test('video duration requires a real ISO 8601 duration within sitemap limits',()=>{
  assert.equal(durationSeconds('PT1H2M3S'),3723);assert.throws(()=>durationSeconds('unknown'));assert.throws(()=>durationSeconds('PT0S'));assert.throws(()=>durationSeconds('PT9H'));
});
test('lastmod tracks content changes and ignores acquisition timestamps',()=>{
  const p=years[0].projects[0];
  const dates=projectChangeDates([{date:'2026-09-01T00:00:00Z',projects:[p]},{date:'2026-09-02T00:00:00Z',projects:[{...p,source:{collectedAt:'2026-09-02'}}]}]);
  assert.equal(dates.get(p.id),'2026-09-01T00:00:00Z');
  const changed=projectChangeDates([{date:'2026-09-01T00:00:00Z',projects:[p]},{date:'2026-09-03T00:00:00Z',projects:[{...p,summary:p.summary+' 실제 수정'}]}]);assert.equal(changed.get(p.id),'2026-09-03T00:00:00Z');
});

