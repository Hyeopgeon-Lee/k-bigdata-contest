# 2026 프로젝트작품전시회

한국폴리텍대학 서울강서캠퍼스 **빅데이터소프트웨어공학과**의 학생 프로젝트 전시관입니다. 공개 YouTube 영상과 개발 설명을 작품별 독립 HTML 페이지로 제공하며, 기업 관계자·예비 지원자·학부모가 로그인 없이 열람할 수 있습니다.

- 운영 주소: https://contest.k-bigdata.kr/
- 원본 채널: https://www.youtube.com/@kopo-poly
- 학과 소개: https://ai.k-bigdata.kr/
- 저장소: https://github.com/Hyeopgeon-Lee/k-bigdata-contest

## 최초 조사 결과 (2026-10-02, 한국시간)

| 항목 | 결과 |
|---|---:|
| 공개 채널 동영상 목록 확인 | 341개, 12페이지 모두 확인 |
| 실제 공개일이 2026년인 영상 | 18개 |
| 중복 처리 전 | 18개 |
| 확정 중복 | 0개 |
| 최종 작품 / 상세 페이지 | 18개 / 18개 |
| 설명에 공개된 참여 학생 | 18명 |

2026년 영상 18개는 공개 개발자명과 내용이 서로 다릅니다. **STOCK**은 물류 재고 관리이고 **K-Stock Compass**는 주식 재무 분석으로, 제목 일부가 비슷해도 별개입니다. 2025년 **Weatify**와 2026년 **Weatify**는 공개 연도가 달라 올해 중복 집계에 포함하지 않습니다.

API 키 없이 첫 데이터를 구축하기 위해 공개 채널 목록의 모든 다음 페이지를 조사하고, 연도 경계 부근을 포함한 영상의 YouTube watch-page 공개 메타데이터에서 실제 공개일·전체 설명·영상 길이를 확보했습니다. 검색 결과만으로 작품을 선정하지 않았습니다. 오래된 영상까지 전부 상세 조회하는 과정에서는 YouTube의 요청 제한이 발생했지만, 2026년 18개 원본 정보와 연도 경계 검증은 확보된 상태였습니다. 최초 조사는 공개 웹 메타데이터 기준이며, API 키 등록 후 공식 API로 재검증할 수 있습니다. 공개 목록에서 접근할 수 없는 비공개·삭제 영상은 조사 대상에 포함할 수 없습니다.

증거 파일: `data/channel-inventory.json`, `data/sync-audit-2026.json`, `data/youtube-raw-2026.json`, `data/dedupe-report-2026.json`. 상대 날짜는 목록 검토 자료이고 전시 연도는 실제 공개일(UTC)로 결정합니다. 화면에 표시하는 날짜는 Asia/Seoul입니다.

## 기능과 기술 구조

- Node.js 22 이상의 기본 모듈만 사용하는 정적 HTML 생성기. 런타임 서버·DB·로그인 없이 GitHub Pages에서 동작합니다.
- 네이비·블루 계열 전시 UI, 실제 영상 썸네일, 최신순 소개 작품, 실제 데이터로 계산한 통계.
- 프로젝트명·학생·팀·설명·기술·분야 검색, 연도 링크, 분야/기술 필터, 최신순/제목순 정렬. 검색 상태를 URL에 보존합니다.
- 독립 작품 URL, 공개 설명 기반 소개·사용 기술·원본 설명·관련 작품.
- 상세 페이지에서 클릭할 때만 개인정보 보호 강화 YouTube 플레이어 로드. 원본 영상 링크 상시 제공.
- 모든 핵심 작품 정보가 최초 HTML에 존재. JavaScript 없이도 작품 열람과 페이지 이동 가능.
- 모바일 메뉴, 키보드 포커스·Escape 닫기·본문 건너뛰기·검색 결과 읽기·동작 줄이기 지원.
- 썸네일 지연 로딩, 크기 예약, responsive srcset, 로드 실패 fallback.
- 연도별 데이터 추가만으로 목록/상세 페이지 확장.
- canonical, 고유 title/description, Open Graph, Twitter Card, VideoObject, CollectionPage/ItemList, BreadcrumbList, 일반/동영상 사이트맵, robots.txt.
- 자산과 내부 링크는 상대 경로. 운영 도메인·GitHub 저장소 하위 경로·별도 미러 호스트에서 자산 경로가 깨지지 않습니다. canonical은 운영 주소로 통일합니다.

```
data/
  channel-inventory.json        # 최초 전체 공개 목록 조사
  youtube-raw-2026.json         # 실제 YouTube 원본 정보
  projects-2026.json            # 검증된 전시 데이터
  overrides.json               # 편집한 소개·슬러그·분야·대표 여부
  dedupe-decisions.json         # 사람이 확인한 같은 프로젝트 그룹
  dedupe-report-2026.json       # 전후 집계·통합 이유
  duplicates-2026.json          # 이전 중복 영상의 전체 레코드 보존
  dedupe-review.json            # 확실하지 않은 후보
  sync-audit-2026.json          # 조사 방식·페이지 수 기록
scripts/
  data.mjs                     # 변환·중복 처리·검증
  prepare-data.mjs              # 원본 + 수동 편집 → 전시 데이터
  validate.mjs                 # 빌드 전 검증
  build.mjs                    # 정적 HTML/SEO/Sitemap 생성
  sync-youtube.mjs              # 공식 YouTube API 전체 페이지 동기화
  serve.mjs                    # 로컬 미리보기
public/assets/                 # CSS / 브라우저 JS / 아이콘
tests/                         # 데이터 안전성·중복·SEO·내부 경로 테스트
.github/workflows/             # 배포 / 동기화 / PR 검증
site.config.json               # 학과·채널·canonical·검색 소유권 설정
CNAME
dist/                          # 생성 결과 (Git에 추가하지 않음)
```

## 로컬 실행과 빌드

```sh
npm ci
npm run validate
npm test
npm run build
npm run dev
```

브라우저에서 http://127.0.0.1:4321 을 엽니다. 다른 포트를 사용하려면 `PORT` 환경변수를 지정합니다. 외부 패키지 설치 의존성이 없습니다. `npm test`는 생성 HTML도 검증하므로 dist를 재생성합니다.

## GitHub Pages 배포

1. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. main에 변경을 push하면 `deploy.yml`이 `npm ci → 검증 → 테스트 → 빌드 → Pages artifact → 배포`를 수행합니다.
3. Actions에서 **Deploy exhibition to GitHub Pages** 완료 상태와 `github-pages` 배포 URL을 확인합니다.
4. `/`, `/2026/`, 작품 URL, 사이트맵을 직접 열어 확인합니다.

빈 저장소에서 처음 공개하는 서비스이므로 main이 배포 기준입니다. PR에서는 `check.yml`이 콘텐츠·내부 링크·빌드를 검사합니다. 배포 작업에는 contents:read, pages:write, id-token:write 권한만 필요합니다.

## Custom Domain과 다른 주소

`CNAME` 파일을 빌드 결과 루트로 복사하며 내용은 `contest.k-bigdata.kr`입니다. Cafe24 DNS의 해당 CNAME이 `Hyeopgeon-Lee.github.io`를 가리켜야 합니다. GitHub Pages 설정에서도 Custom domain을 `contest.k-bigdata.kr`로 저장하고 DNS 확인 후 **Enforce HTTPS**를 활성화합니다. CNAME 파일만으로 GitHub Pages 설정이 자동 완료되지는 않습니다.

GitHub Pages는 한 사이트에 하나의 공식 custom domain을 지원합니다. 기본 GitHub Pages 주소는 custom domain으로 리디렉션될 수 있습니다. 추가 별칭 도메인마다 DNS·HTTPS·리디렉션 또는 별도 정적 미러 호스팅 설정이 필요합니다. 소스는 상대 자산 경로로 여러 호스트에서 사용할 수 있지만, DNS가 없는 임의 도메인을 자동 연결할 수는 없습니다. 색인 URL은 `https://contest.k-bigdata.kr` 하나로 통일합니다.

## YouTube Data API 자동 갱신

1. Google Cloud Console에서 프로젝트를 만들고 **YouTube Data API v3**를 활성화합니다.
2. API 키를 생성하고 사용 가능 API를 YouTube Data API v3로 제한합니다. GitHub Actions 서버용 키에는 브라우저 HTTP referrer 제한을 사용하지 않습니다.
3. 저장소 **Settings → Secrets and variables → Actions → New repository secret**에서 이름 **`YOUTUBE_API_KEY`**로 등록합니다. 키를 소스·README·공개 JSON에 넣지 않습니다.
4. **Actions → Sync public YouTube projects → Run workflow → year=2026**으로 실행합니다.

공식 흐름은 `channels.list(forHandle) → uploads playlist → playlistItems.list의 모든 nextPageToken → videos.list(snippet,contentDetails,status)`입니다. 영상 공개일, 전체 설명, ISO 8601 duration, 공개 상태를 조회합니다. 키가 없어도 사이트 빌드·배포와 기존 JSON 데이터는 정상 동작합니다.

일정은 매주 월요일 **06:17 한국시간**(일요일 21:17 UTC)입니다. 수동 실행 시 year를 지정하고, 예약 실행은 해당 시점의 현재 UTC 연도를 사용합니다. API 장애·빈 업로드·빈 연도 응답·기존 영상 누락·검증 실패 시 기존 JSON을 보존하고 실패로 보고합니다. 삭제/비공개 전환을 반영하려면 원본 상태를 먼저 확인한 뒤 수동으로 데이터를 수정해야 합니다.

동기화 완료 후 봇이 검증된 데이터만 commit합니다. GITHUB_TOKEN의 push가 다른 workflow를 자동 실행하지 않는 점을 고려해, 동기화 workflow가 재사용 가능한 `deploy.yml`을 직접 호출하여 최신 main을 다시 빌드·배포합니다. main이 동기화 중 갱신되면 push가 실패해 데이터 손실 없이 재실행할 수 있습니다.

로컬에서는 `YOUTUBE_API_KEY`와 선택적 `EXHIBITION_YEAR` 환경변수를 설정한 후 `npm run sync:youtube`를 실행합니다. 키 값이 담긴 명령을 공개 기록에 남기지 마세요.

## 중복 판단·수동 편집

자동 통합은 **공개 학생명 집합 + 정규화한 작품명 + 전체 원본 설명**이 모두 일치한 경우로 한정합니다. 최신 공개 영상이 대표이며 이전 레코드는 `duplicates-{year}.json`에 `duplicateOf`와 함께 보존합니다. 같은 제목이나 학생명이 반복돼도 설명이 다르면 후보에 기록하고 통합하지 않습니다.

설명이 다른 재업로드 또는 팀원별 영상이 실제로 같은 작품임을 확인했다면 `data/dedupe-decisions.json`의 groups에 `{ "videoIds": ["이전ID", "최신ID"], "reason": "확인한 근거" }`를 추가합니다. 최신 공개 영상이 자동 대표가 되고 학생명은 합집합으로 보존합니다. 후보는 `dedupe-review.json`에서 검토합니다.

수동 편집은 `overrides.json`의 videoId 항목에 넣습니다. `title`, `slug`, `summary`, `categories`, `features`, `techStack`, `problem`, `solution`, `teamName`, `featured` 등을 지정할 수 있습니다. 설명에 있는 근거만 사용하며, 불명확한 정보는 빈 값으로 둡니다. `featured=true`가 없으면 최신 3개를 중립적으로 소개합니다. 상세 페이지 URL의 slug를 공개 후 바꾸면 기존 URL이 깨지므로 신중히 변경합니다.

```sh
npm run prepare:data
npm run validate
npm test
npm run build
```

생성된 projects 파일을 직접 편집할 수도 있지만 다음 동기화/prepare에서 덮어쓰이므로 지속 편집은 overrides에 기록합니다. 공개 이름 이외의 개인정보는 추가하지 않습니다. 공개 HTML은 학번·개인 연락처·이메일을 제거합니다. 원본 자료는 저장소 조사용이며 웹 배포 자산에 복사하지 않습니다.

## 신규 연도 추가

공식 동기화 workflow의 year를 `2027`로 실행하면 `youtube-raw-2027.json`과 `projects-2027.json` 등을 생성합니다. 그 연도의 실제 영상이 0개이면 안전하게 실패하므로 미래 메뉴나 가짜 작품이 생기지 않습니다. 수동으로 검증된 원본 JSON을 같은 스키마로 추가하고 prepare를 실행해도 됩니다. 생성기는 `projects-YYYY.json`을 자동 발견하여 최신 연도를 홈에 표시하고 기존 연도별 URL을 유지합니다.

## Google · Naver · Bing 색인 설정

- Google Search Console: 도메인 속성 `contest.k-bigdata.kr` 소유 확인(DNS) 또는 URL-prefix 속성 등록 → sitemap 제출 → 작품 URL 검사 → 색인 요청.
- Naver Search Advisor: 사이트 등록 → HTML meta 소유 확인 → robots 수집 확인 → sitemap 제출 → 주요 작품 수집 요청.
- Bing Webmaster Tools: 사이트 등록 또는 Search Console에서 가져오기 → 소유 확인 → sitemap 제출.

소유권 meta 값은 `site.config.json`의 `verification.google-site-verification`, `verification.naver-site-verification`, `verification.msvalidate.01`에 실제 발급 값을 넣은 뒤 배포합니다. 인증 값은 임의로 만들지 않습니다. DNS 인증/계정 소유권과 검색엔진 색인 결정은 별도이며, 공개했다고 즉시 검색 노출이 보장되지는 않습니다.

- 일반 Sitemap: https://contest.k-bigdata.kr/sitemap.xml
- 동영상 Sitemap: https://contest.k-bigdata.kr/video-sitemap.xml
- Robots: https://contest.k-bigdata.kr/robots.txt

VideoObject에는 실제 title, 공개 설명 기반 description, thumbnailUrl, uploadDate, duration, embedUrl이 들어갑니다. 상세 페이지의 영상이 주 콘텐츠로 보이도록 최상단에 배치합니다.

## 검증

자동 테스트: 실제 데이터 필수값, 중복 videoId/slug, 날짜·연도, 안전한 중복 처리, 불확실 후보 보존, 팀원 합집합, 누락/빈 API 응답 보호, 공식 API 페이지 순회, 개인정보 제거, HTML 내부 링크/자산 존재, JSON-LD 파싱, 모든 작품의 최초 HTML 본문, 두 Sitemap과 CNAME.

출시 전 브라우저 검증: 360/390/430/768/1280/1440px 화면, 모든 작품 새로고침, 검색·분야·기술·정렬·URL 상태, 모바일 메뉴와 Escape, 썸네일 로드, 클릭 후 iframe 생성, 콘솔 오류. 외부 영상 재생은 YouTube 네트워크/브라우저 정책에 영향을 받으므로 원본 링크를 함께 제공합니다.

참고 공식 문서: [YouTube channels.list](https://developers.google.com/youtube/v3/docs/channels/list), [playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list), [Google VideoObject](https://developers.google.com/search/docs/appearance/structured-data/video), [GitHub Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
