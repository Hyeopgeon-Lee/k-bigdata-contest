import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadYears,readJSON} from './data.mjs';
import {parseSitemap,durationSeconds,projectPath} from './seo.mjs';

export const decode=s=>String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>entity[0]==='#'?String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity.toLowerCase()]));
const normalize=s=>decode(s).replace(/\s+/g,' ').trim();
export function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3])]))}
export function meta(html,name){return [...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0])).find(a=>a.name===name||a.property===name)?.content||''}
export function canonicalOf(html){return [...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).find(a=>a.rel==='canonical')?.href||''}
export function schemaOf(html){return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>attrs(m[1]).type==='application/ld+json').flatMap(m=>{const d=JSON.parse(m[2]);return d['@graph']||[d]})}
export const textOf=html=>normalize(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' '));
export function localLinks(html,url){return [...html.matchAll(/<a\b[^>]*>/gi)].map(m=>attrs(m[0]).href).filter(Boolean).map(h=>{try{const u=new URL(h,url);u.hash='';u.search='';if(!u.pathname.endsWith('/')&&!path.posix.extname(u.pathname))u.pathname+='/';return u.href}catch{return ''}}).filter(h=>h.startsWith(new URL(url).origin+'/'))}

export function auditSEO({config,years,sitemapXml,videoSitemapXml,robots,pages}){
  const errors=[];const expect=(condition,message)=>{if(!condition)errors.push(message)};
  const site=parseSitemap(sitemapXml),videos=parseSitemap(videoSitemapXml,{video:true});
  const all=years.flatMap(y=>y.projects),urlFor=p=>config.url+projectPath(p);
  const indexed=new Map(site.map(e=>[e.loc,e]));const videoEntries=new Map(videos.map(e=>[e.loc,e]));
  const expected=new Set([config.url+'/',config.url+'/about-data/',...years.map(y=>`${config.url}/${y.year}/`),...all.map(urlFor)]);
  expect(indexed.size===expected.size,`Sitemap URL count: expected ${expected.size}, found ${indexed.size}`);
  for(const u of expected)expect(indexed.has(u),`Sitemap missing ${u}`);
  expect(videos.length===all.length,`Video sitemap count: expected ${all.length}, found ${videos.length}`);
  expect(/User-agent:\s*\*/i.test(robots)&&/Allow:\s*\//i.test(robots),'robots must allow all crawlers');
  expect(!/^Disallow:\s*\S/m.test(robots),'robots contains a disallow rule');
  for(const name of ['sitemap.xml','video-sitemap.xml'])expect(robots.includes(`Sitemap: ${config.url}/${name}`),`robots missing ${name}`);
  const titles=new Set(),descriptions=new Set(),canonicals=new Set(),slugs=new Set(),ids=new Set();
  for(const entry of site){
    const u=new URL(entry.loc);expect(u.origin===config.url&&!u.search&&!u.hash,`Noncanonical sitemap URL ${entry.loc}`);
    expect(pages.has(entry.loc),`Sitemap URL has no HTML page: ${entry.loc}`);
    if(entry.lastmod)expect(Number.isFinite(Date.parse(entry.lastmod)),`Invalid lastmod ${entry.loc}`);
    const page=pages.get(entry.loc);if(!page)continue;
    expect(page.status===200,`HTTP ${page.status}: ${entry.loc}`);
    expect(!/noindex|nofollow|none\b/i.test(page.xRobotsTag||''),`X-Robots-Tag blocks ${entry.loc}`);
    expect(canonicalOf(page.html)===entry.loc,`Canonical disagrees with sitemap ${entry.loc}`);
    const directives=meta(page.html,'robots').toLowerCase().split(',').map(s=>s.trim());
    expect(directives.includes('index')&&directives.includes('follow')&&!directives.includes('noindex')&&!directives.includes('nofollow'),`robots index/follow missing ${entry.loc}`);
    for(const link of localLinks(page.html,entry.loc))expect(pages.has(link),`Broken internal HTML link ${entry.loc} → ${link}`);
  }
  for(const p of all){
    const url=urlFor(p),page=pages.get(url);if(!page)continue;const html=page.html;
    const title=decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');const description=meta(html,'description'),canonical=canonicalOf(html);
    expect(title.includes(p.title)&&title.includes(`${p.year} 프로젝트작품전시회`)&&title.includes(config.department),`Missing unique exhibition title ${url}`);
    expect(!titles.has(title),`Duplicate title ${url}`);titles.add(title);
    expect(description.length>=30&&description.length<=220&&description.includes(p.title)&&description.includes(config.school)&&description.includes(config.department),`Incomplete/coherent description ${url}`);
    expect(!descriptions.has(description),`Duplicate description ${url}`);descriptions.add(description);
    expect(!canonicals.has(canonical),`Duplicate canonical ${url}`);canonicals.add(canonical);
    expect(!slugs.has(`${p.year}/${p.slug}`),`Duplicate slug ${url}`);slugs.add(`${p.year}/${p.slug}`);
    expect(!ids.has(p.youtubeVideoId),`Duplicate YouTube ID ${url}`);ids.add(p.youtubeVideoId);
    const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];expect(textOf(h1||'')===p.title,`Missing H1/project name ${url}`);
    const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
    const visible=main.replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi,'');const text=textOf(visible);
    expect(text.includes(p.title)&&text.includes(normalize(p.summary)),`Project introduction absent from initial HTML ${url}`);
    expect(text.includes(normalize(p.description||p.summary)),`Development description absent from visible initial HTML ${url}`);
    for(const student of p.students)expect(text.includes(student),`Missing developer ${url}`);
    for(const technology of p.techStack)expect(text.includes(technology),`Technology hidden/missing: ${technology} ${url}`);
    const renderedDate=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(p.publishedAt));
    expect(text.includes(normalize(renderedDate)),`Publication date missing ${url}`);
    expect(main.includes(p.youtubeUrl),`Original YouTube link missing ${url}`);
    for(const key of ['og:title','og:description','og:image','twitter:card','twitter:title','twitter:description','twitter:image'])expect(Boolean(meta(html,key)),`Missing ${key} ${url}`);
    expect(meta(html,'og:title')===title&&meta(html,'og:description')===description&&meta(html,'og:image')===p.thumbnail,`Open Graph metadata mismatch ${url}`);
    let schema=[];try{schema=schemaOf(html)}catch(error){expect(false,`Invalid JSON-LD ${url}: ${error.message}`)}
    const v=schema.find(s=>s['@type']==='VideoObject'),b=schema.find(s=>s['@type']==='BreadcrumbList'),w=schema.find(s=>s['@type']==='WebPage');
    expect(Boolean(v&&b&&w),`Missing VideoObject/BreadcrumbList/WebPage ${url}`);
    if(v){for(const key of ['name','description','thumbnailUrl','uploadDate','duration','embedUrl'])expect(Boolean(v[key]),`VideoObject missing ${key} ${url}`);
      expect(v.name===p.title&&v.description===p.summary&&v.uploadDate===p.publishedAt&&v.duration===p.duration&&v.embedUrl===p.embedUrl&&v.thumbnailUrl.includes(p.thumbnail),`VideoObject source mismatch ${url}`);
      expect(v.url===canonical&&v.publisher?.name===`${config.school} ${config.department}`,`VideoObject URL/publisher mismatch ${url}`);
    }
    if(b)expect(b.itemListElement.at(-1).item===canonical,`Breadcrumb canonical mismatch ${url}`);
    if(w)expect(w.url===canonical&&w.mainEntity?.['@id']===v?.['@id']&&w.breadcrumb?.['@id']===b?.['@id'],`WebPage references mismatch ${url}`);
    const ve=videoEntries.get(url)?.['video:video'];expect(Boolean(ve),`Video sitemap missing ${url}`);
    if(ve){for(const [field,value] of Object.entries({'video:thumbnail_loc':p.thumbnail,'video:title':p.title,'video:description':p.summary,'video:player_loc':p.embedUrl,'video:publication_date':p.publishedAt,'video:duration':String(durationSeconds(p.duration))}))expect(String(ve[field])===value,`Video sitemap ${field} source mismatch ${url}`)}
    const links=localLinks(main,url);expect(links.includes(`${config.url}/${p.year}/`)&&links.includes(config.url+'/'),`Missing exhibition/year backlinks ${url}`);
    expect(links.some(h=>h!==url&&h.includes(`/${p.year}/projects/`)),`Missing related-project HTML link ${url}`);
    expect(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(textOf(main))&&!/\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/.test(textOf(main))&&!/학번\s*[:：]?\s*\d+/.test(textOf(main)),`Personal identifiers in public HTML ${url}`);
  }
  for(const y of years)for(const route of [`/${y.year}/`,...(y===years[0]?['/']:[])]){
    const url=config.url+route,html=pages.get(url)?.html||'';const collection=schemaOf(html).find(s=>s['@type']==='CollectionPage');const list=collection?.mainEntity;
    expect(list?.['@type']==='ItemList'&&list.numberOfItems===y.projects.length&&list.itemListElement.length===y.projects.length,`Collection/ItemList count mismatch ${url}`);
    if(list)for(let i=0;i<y.projects.length;i++){const p=y.projects[i],item=list.itemListElement[i];expect(item.position===i+1&&item.name===p.title&&item.url===urlFor(p),`ItemList content mismatch ${url}`);expect(localLinks(html,url).includes(urlFor(p)),`Year listing missing regular HTML link ${urlFor(p)}`)}
  }
  // Traverse real <a> links from the homepage, excluding JSON-LD and data-* attributes.
  const visited=new Set(),queue=[config.url+'/'];while(queue.length){const url=queue.shift();if(visited.has(url)||!pages.has(url))continue;visited.add(url);queue.push(...localLinks(pages.get(url).html,url).filter(h=>!visited.has(h)))}
  for(const p of all)expect(visited.has(urlFor(p)),`Orphan project page ${urlFor(p)}`);
  if(errors.length)throw Error(`SEO validation failed (${errors.length}):\n${errors.join('\n')}`);
  return {sitemapUrls:site.length,videoEntries:videos.length,projects:all.length,uniqueTitles:titles.size,uniqueDescriptions:descriptions.size,videoObjects:all.length,orphanPages:0};
}
export async function checkSEO({live=false,root='dist'}={}){
  const config=readJSON('site.config.json'),years=loadYears();
  const get=async file=>live?(await fetch(config.url+'/'+file,{signal:AbortSignal.timeout(30000)})):null;
  async function content(file){if(!live)return fs.readFileSync(path.join(root,file),'utf8');const r=await get(file);if(r.status!==200)throw Error(`HTTP ${r.status}: ${file}`);return r.text()}
  const [sitemapXml,videoSitemapXml,robots]=await Promise.all(['sitemap.xml','video-sitemap.xml','robots.txt'].map(content));
  const entries=parseSitemap(sitemapXml),pages=new Map();
  for(let i=0;i<entries.length;i+=4)await Promise.all(entries.slice(i,i+4).map(async ({loc})=>{
    if(live){const r=await fetch(loc,{signal:AbortSignal.timeout(30000)});pages.set(loc,{html:await r.text(),status:r.status,xRobotsTag:r.headers.get('x-robots-tag')})}
    else {const route=new URL(loc).pathname;const file=path.join(root,route,'index.html');if(fs.existsSync(file))pages.set(loc,{html:fs.readFileSync(file,'utf8'),status:200})}
  }));
  return auditSEO({config,years,sitemapXml,videoSitemapXml,robots,pages});
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log('SEO PASS',JSON.stringify(await checkSEO({live:process.argv.includes('--live')})));
