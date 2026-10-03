import {execFileSync} from 'node:child_process';
import {XMLParser, XMLValidator} from 'fast-xml-parser';

export const SITEMAP_NS='http://www.sitemaps.org/schemas/sitemap/0.9';
export const VIDEO_NS='http://www.google.com/schemas/sitemap-video/1.1';
export const projectPath=p=>`/${p.year}/projects/${p.slug}/`;
export function durationSeconds(duration){
  const match=duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if(!match)throw Error(`Invalid duration: ${duration}`);
  const seconds=Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0);
  if(!Number.isInteger(seconds)||seconds<1||seconds>28800)throw Error(`Video sitemap duration out of range: ${duration}`);
  return seconds;
}
export function projectDescription(p,config){
  const summary=p.summary.replace(/[.。!?]+$/,'');
  const technology=p.techStack.slice(0,4).join('·');
  // Complete editorial summary and identifying context; never slice a sentence mid-word.
  return `${p.title}: ${summary}. ${technology?technology+' 기반. ':''}${config.school} ${config.department} 학생 프로젝트.`;
}
export function projectSchema(p,config){
  const url=config.url+projectPath(p);
  return [
    {'@type':'WebPage','@id':url+'#webpage',url,name:p.title,description:p.summary,inLanguage:'ko-KR',mainEntity:{'@id':url+'#video'},breadcrumb:{'@id':url+'#breadcrumb'}},
    {'@type':'VideoObject','@id':url+'#video',name:p.title,description:p.summary,thumbnailUrl:[p.thumbnail],uploadDate:p.publishedAt,duration:p.duration,embedUrl:p.embedUrl,url,inLanguage:'ko',publisher:{'@type':'Organization',name:`${config.school} ${config.department}`},mainEntityOfPage:{'@id':url+'#webpage'}},
    {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[{'@type':'ListItem',position:1,name:'프로젝트작품전시회',item:config.url+'/'},{'@type':'ListItem',position:2,name:`${p.year} 작품`,item:`${config.url}/${p.year}/`},{'@type':'ListItem',position:3,name:p.title,item:url}]},
  ];
}
export function parseSitemap(xml,{video=false}={}){
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Sitemap must not contain DTD/entities');
  const valid=XMLValidator.validate(xml);if(valid!==true)throw Error(`Invalid sitemap XML: ${valid.err.msg}`);
  const root=new XMLParser({ignoreAttributes:false,parseTagValue:false,isArray:(_name,jpath)=>jpath==='urlset.url'}).parse(xml).urlset;
  if(!root||root['@_xmlns']!==SITEMAP_NS)throw Error('Invalid sitemap namespace/urlset');
  if(video&&root['@_xmlns:video']!==VIDEO_NS)throw Error('Invalid video sitemap namespace');
  const entries=root.url||[];
  if(!entries.length)throw Error('Sitemap has 0 URLs');
  for(const entry of entries)if(typeof entry.loc!=='string'||!entry.loc)throw Error('Missing sitemap loc');
  const urls=entries.map(e=>e.loc);if(new Set(urls).size!==urls.length)throw Error('Duplicate sitemap URL');
  return entries;
}
function git(args){try{return execFileSync('git',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024}).trim()}catch{return ''}}
export function latestTimestamp(values){const valid=values.filter(v=>v&&Number.isFinite(Date.parse(v)));return valid.length?valid.reduce((a,b)=>Date.parse(a)>Date.parse(b)?a:b):null}
export function contentSignature(project){
  // Acquisition time/method changes do not imply a change to the public page.
  const {source,...content}=project;return JSON.stringify(content);
}
export function projectChangeDates(history){
  const signatures=new Map(),dates=new Map();
  for(const {date,projects} of history)for(const p of projects){const signature=contentSignature(p);if(signatures.get(p.id)!==signature){dates.set(p.id,date);signatures.set(p.id,signature)}}
  return dates;
}
export function buildLastmod(years){
  const shared=git(['log','-1','--format=%cI','--','scripts/build.mjs','scripts/seo.mjs','scripts/data.mjs','site.config.json','public/assets/app.js','public/assets/styles.css']);
  const result=new Map();
  for(const {year,projects} of years){
    const file=`data/projects-${year}.json`;
    const history=git(['log','--reverse','--format=%H%x09%cI','--',file]).split('\n').filter(Boolean).flatMap(line=>{
      const [sha,date]=line.split('\t');try{return [{date,projects:JSON.parse(git(['show',`${sha}:${file}`]))}]}catch{return []}
    });
    const dates=projectChangeDates(history);
    const sourceDate=git(['log','-1','--format=%cI','--',file,`data/youtube-raw-${year}.json`]);
    // Related-project cards also depend on the year's public dataset.
    const yearDate=latestTimestamp([shared,...dates.values()]);
    for(const p of projects)result.set(projectPath(p),latestTimestamp([p.updatedAt,dates.get(p.id)||sourceDate,yearDate]));
    result.set(`/${year}/`,yearDate||sourceDate||null);
  }
  result.set('/',result.get(`/${years[0].year}/`)||shared||null);
  result.set('/about-data/',shared||null);
  return result;
}
