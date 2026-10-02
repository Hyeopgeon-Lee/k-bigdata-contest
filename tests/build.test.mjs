import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {readJSON} from '../scripts/data.mjs';
execFileSync(process.execPath,['scripts/build.mjs']);
const projects=readJSON('data/projects-2026.json');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)])}
test('all internal HTML links, assets, metadata and JSON-LD resolve',()=>{
  for(const file of files('dist').filter(f=>f.endsWith('.html'))){
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/<html lang="ko">/);assert.match(html,/<meta name="description"/);
    assert.match(html,/<link rel="canonical" href="https:\/\/contest.k-bigdata.kr\//);
    assert.match(html,/<meta property="og:image"/);
    for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=match[1].split(/[?#]/)[0];if(!url||/^https?:|^mailto:|^data:/.test(url))continue;
      let target=path.resolve(path.dirname(file),url);if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');assert.ok(fs.existsSync(target),`${file} → ${url}`);
    }
    for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]));
  }
});
test('all project content exists in initial HTML with a VideoObject',()=>{
 for(const p of projects){const html=fs.readFileSync(`dist/2026/projects/${p.slug}/index.html`,'utf8');assert.ok(html.includes(p.title));assert.ok(html.includes(p.students[0]));assert.match(html,/"@type":"VideoObject"/);assert.ok(html.includes(p.embedUrl));assert.ok(!html.includes('<iframe'));}
});
test('sitemaps contain every canonical project and valid escaped descriptions',()=>{
 const site=fs.readFileSync('dist/sitemap.xml','utf8'),video=fs.readFileSync('dist/video-sitemap.xml','utf8');
 for(const p of projects){assert.ok(site.includes(`/2026/projects/${p.slug}/`));assert.ok(video.includes(`/2026/projects/${p.slug}/`))}
 assert.equal((video.match(/<video:video>/g)||[]).length,projects.length);assert.equal(fs.readFileSync('dist/CNAME','utf8').trim(),'contest.k-bigdata.kr');assert.match(fs.readFileSync('dist/robots.txt','utf8'),/video-sitemap.xml/);
});
