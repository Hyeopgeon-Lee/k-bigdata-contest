import fs from 'node:fs';
import {readJSON, writeJSON, makeProject, deduplicate, validateProjects} from './data.mjs';
const overrides=readJSON('data/overrides.json');const decisions=readJSON('data/dedupe-decisions.json');
const allReview=[];
for (const file of fs.readdirSync('data').filter(f=>/^youtube-raw-\d{4}\.json$/.test(f))) {
  const year=Number(file.match(/\d{4}/)[0]);const raw=readJSON(`data/${file}`);
  if(!raw.length)throw Error(`빈 원본 데이터: ${year}`);
  const result=deduplicate(raw.map(v=>makeProject(v,year,overrides[v.videoId])),decisions);
  const errors=validateProjects(result.projects,year);if(errors.length)throw Error(errors.join('\n'));
  writeJSON(`data/projects-${year}.json`,result.projects);
  writeJSON(`data/dedupe-report-${year}.json`,{year,before:raw.length,after:result.projects.length,duplicates:result.duplicates.map(p=>({videoId:p.id,title:p.title,publishedAt:p.publishedAt,duplicateOf:p.duplicateOf,reason:p.reason})),note:decisions.note});
  writeJSON(`data/duplicates-${year}.json`,result.duplicates);allReview.push(...result.review.map(r=>({...r,year})));
  console.log(`${year}: ${raw.length} videos → ${result.projects.length} projects; ${result.review.length} review candidates`);
}
writeJSON('data/dedupe-review.json',allReview);
