import {loadYears,validateProjects,readJSON} from './data.mjs';
const years=loadYears();if(!years.length)throw Error('연도 데이터 없음');
for(const {year,projects} of years){const errors=validateProjects(projects,year);if(errors.length)throw Error(errors.join('\n'));console.log(`${year}: ${projects.length} projects validated`)}
for(const r of readJSON('data/dedupe-review.json'))console.warn('중복 검토 후보:',r.videoIds.join(', '),r.reason);
