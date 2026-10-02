import fs from 'node:fs';
export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
export const clean = value => (value || '').replace(/[ \t]+/g, ' ').trim();
export const publicText = value => value.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[이메일 비공개]').replace(/\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/g, '[연락처 비공개]').replace(/(?:학번\s*[:：]?\s*)\d+/g, '[학번 비공개]');
export function section(description, label) {
  const re = new RegExp('(?:^|\\n)[❍○●\\s-]*' + label + '\\s*[:：]?\\s*([\\s\\S]*?)(?=\\n\\s*[❍○●]|$)', 'i');
  return clean(description.match(re)?.[1] || '');
}
const technologyRules = [
  ['Spring Boot', /spring\s*boot|spirng\s*boot/i], ['React', /\bReact\b/i], ['FastAPI', /FastAPI/i], ['Flask', /Flask/i],
  ['Gemini', /Gemini/i], ['OpenAI', /OpenAI/i], ['HyperCLOVA X', /HyperCLOVA/i], ['PyTorch', /PyTorch/i], ['TensorFlow', /TensorFlow/i], ['CLIP', /\bCLIP\b/i], ['KoELECTRA', /KoELECTRA/i],
  ['Java', /\bJava(?:\s|,|$)/i], ['Python', /Python/i], ['TypeScript', /TypeScript/i], ['JavaScript', /JavaScript/i],
  ['MariaDB', /MariaDB/i], ['MongoDB', /MongoDB/i], ['Redis', /Redis/i], ['Pinecone', /Pinecone/i],
  ['AWS', /\bAWS\b|Amazon Web Services|Amazon S3/i], ['GCP', /\bGCP\b|Google Cloud Platform/i], ['Naver Cloud', /Naver Cloud|네이버\s*클라우드|\bNCP\b/i], ['Oracle Cloud', /Oracle Cloud/i],
  ['Docker', /Docker/i], ['Nginx', /Nginx/i], ['Thymeleaf', /Thymeleaf/i], ['MyBatis', /MyBatis/i], ['JPA', /\bJPA\b/i],
  ['WebSocket', /WebSocket/i], ['JWT', /\bJWT\b/i], ['OpenCV', /OpenCV/i], ['MediaPipe', /MediaPipe/i], ['GitHub Actions', /GitHub Actions/i],
];
export function makeProject(v, year, override = {}) {
  const description = publicText(v.description || '');
  const title = section(description, '제목').split('\n')[0] || v.title.replace(/^.*?졸업작품\s*[-–:]\s*/, '').trim();
  const developer = description.match(/개발자\s*[:：]?\s*\n?\s*([^\n❍]+)/)?.[1] || '';
  const students = clean(developer).split(/[,·/]|\s+및\s+/).filter(s => /^[가-힣]{2,5}$/.test(s.trim())).map(s=>s.trim());
  let introduction = section(description, '설명');
  if (!introduction) {
    introduction = description.replace(/^[\s\S]*?제목\s*[:：]?[^\n]*\n/, '').split(/\n\s*(?:기술스택|❍\s*적용|❍\s*주요 구현|적용기술)/)[0].replace(/^\s*❍\s*/, '').trim();
  }
  const summary = introduction.replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0].slice(0, 180) || '프로젝트 소개 영상과 공개 설명을 확인해 보세요.';
  const features = (section(description, '주요 구현 기능') || '').split('\n').map(s=>s.replace(/^\s*[-▸]\s*/, '').trim()).filter(Boolean);
  const techStack = technologyRules.filter(([,re])=>re.test(description)).map(([name])=>name);
  const categories = ['Web', ...( /AI|인공지능|생성형|Gemini|OpenAI/i.test(introduction) ? ['AI'] : [])];
  return {
    id: v.videoId, year, slug: `video-${v.videoId.toLowerCase()}`, title, originalTitle: v.title,
    students, teamName: '', summary, problem: '', solution: '', features, techStack, categories,
    youtubeVideoId: v.videoId, youtubeUrl: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.videoId}`, thumbnail: v.thumbnail,
    publishedAt: new Date(v.publishedAt).toISOString(), duration: v.duration,
    description: introduction, originalDescription: description,
    source: { url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`, collectedAt: v.collectedAt, method: v.source, summaryBasis: '공개 YouTube 설명에 근거한 요약' },
    featured: false, duplicateOf: null, ...override,
  };
}
export const normalize = s => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
export function deduplicate(projects, decisions = {groups: []}) {
  const ordered = [...projects].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const duplicates = [], review = [], chosen = [];
  for (const p of ordered) {
    const approvedGroup = decisions.groups.find(g=>g.videoIds.includes(p.id));
    const representative = chosen.find(q => {
      if (approvedGroup?.videoIds.includes(q.id)) return true;
      // Only fully identical title, identified students, and original description are automatically merged.
      return p.students.length > 0 && normalize(p.title) === normalize(q.title)
        && [...p.students].sort().join('|') === [...q.students].sort().join('|')
        && p.originalDescription.trim() === q.originalDescription.trim();
    });
    if (representative) {
      representative.students = [...new Set([...representative.students, ...p.students])];
      duplicates.push({...p, duplicateOf: representative.id, reason: approvedGroup?.reason || '학생·프로젝트명·원본 설명이 모두 일치; 최신 공개 영상 선택'});
    } else {
      for (const q of chosen) if (normalize(p.title) === normalize(q.title) || p.students.some(s=>q.students.includes(s))) review.push({videoIds: [q.id,p.id],reason:'동일 제목 또는 학생명: 프로젝트 내용 수동 비교 필요',status:'pending'});
      chosen.push(p);
    }
  }
  return {projects: chosen, duplicates, review};
}
export function validateProjects(projects, year) {
  const errors = [], ids = new Set(), slugs = new Set();
  for (const p of projects) {
    const prefix = `${p.id || '(id 없음)'}: `;
    for (const key of ['id','title','slug','youtubeVideoId','publishedAt','thumbnail','duration']) if (!p[key]) errors.push(prefix+key+' 없음');
    if (ids.has(p.youtubeVideoId)) errors.push(prefix+'duplicate videoId'); ids.add(p.youtubeVideoId);
    if (slugs.has(p.slug)) errors.push(prefix+'duplicate slug'); slugs.add(p.slug);
    if (!/^[a-z0-9-]+$/.test(p.slug)) errors.push(prefix+'invalid slug');
    if (!/^[\w-]{11}$/.test(p.youtubeVideoId)) errors.push(prefix+'invalid videoId');
    if (p.year !== year || !Number.isFinite(Date.parse(p.publishedAt)) || new Date(p.publishedAt).getUTCFullYear() !== year) errors.push(prefix+'잘못된 year/publishedAt');
    for (const k of ['students','features','techStack','categories']) if (!Array.isArray(p[k])) errors.push(prefix+k+' 배열 필요');
    if (!/^https:\/\/i\.ytimg\.com\//.test(p.thumbnail)) errors.push(prefix+'invalid thumbnail');
    if (!/^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/.test(p.duration)) errors.push(prefix+'invalid duration');
  }
  return errors;
}
export function loadYears() {
  return fs.readdirSync('data').filter(f=>/^projects-\d{4}\.json$/.test(f)).map(f=>({year:Number(f.match(/\d{4}/)[0]), projects:readJSON(`data/${f}`)})).sort((a,b)=>b.year-a.year);
}
