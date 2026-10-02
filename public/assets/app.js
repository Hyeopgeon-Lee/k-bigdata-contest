(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (menu && nav) {
    const close = () => { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', '메뉴 열기'); nav.classList.remove('open'); };
    menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기'); nav.classList.toggle('open', open); });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { close(); menu.focus(); } });
    window.matchMedia('(min-width: 961px)').addEventListener('change',close);
  }
  document.querySelectorAll('img[data-thumbnail]').forEach(img => { img.addEventListener('error', () => { if (img.dataset.fallback) return; img.dataset.fallback = 'true'; img.removeAttribute('srcset'); img.src = `https://i.ytimg.com/vi/${img.dataset.thumbnail}/mqdefault.jpg`; }); });
  const form = document.querySelector('.filter-panel');
  if (form) {
    const grid = document.querySelector('#project-grid');
    const cards = Array.from(grid.querySelectorAll('[data-project]'));
    const search = form.querySelector('#search'), category = form.querySelector('#category'), tech = form.querySelector('#technology'), sort = form.querySelector('#sort');
    const params = new URLSearchParams(location.search);
    for (const control of [search, category, tech, sort]) if (params.has(control.name)) control.value = params.get(control.name);
    if (!sort.value) sort.value = 'latest';
    function update() {
      const query = search.value.trim().toLocaleLowerCase('ko-KR');
      const ordered = [...cards].sort(sort.value === 'title' ? (a,b) => a.dataset.title.localeCompare(b.dataset.title,'ko') : (a,b) => Date.parse(b.dataset.date)-Date.parse(a.dataset.date));
      let count = 0;
      ordered.forEach(card => { const visible = query.split(/\s+/).every(term => card.dataset.search.includes(term)) && (!category.value || JSON.parse(card.dataset.categories).includes(category.value)) && (!tech.value || JSON.parse(card.dataset.tech).includes(tech.value)); card.hidden = !visible; count += Number(visible); grid.append(card); });
      document.querySelector('#result-count').textContent = `${count}개 작품${query || category.value || tech.value ? ' 검색됨' : ' 전체'}`;
      document.querySelector('#no-results').hidden = count > 0;
      const next = new URL(location.href);
      for (const control of [search, category, tech, sort]) if (control.value && !(control === sort && control.value === 'latest')) next.searchParams.set(control.name, control.value); else next.searchParams.delete(control.name);
      history.replaceState(null, '', next);
    }
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input',update);form.addEventListener('change',update);
    form.addEventListener('reset', () => setTimeout(update, 0));
    document.querySelector('#clear-filters').addEventListener('click', () => { form.reset(); search.focus(); });
    update();
  }
  document.querySelectorAll('[data-video]').forEach(container => {
    container.querySelector('button').addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${container.dataset.video}?autoplay=1&rel=0`;
      frame.title = `${container.dataset.videoTitle} 프로젝트 시연 영상`;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.setAttribute('tabindex','0'); container.replaceChildren(frame);frame.focus();
    }, { once: true });
  });
})();
