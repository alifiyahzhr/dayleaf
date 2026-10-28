/* dayleaf — Journals: separate journals for different parts of life (Study notes, Ngaji notes, etc.),
   alongside the everyday Daily journal. Each custom journal is a freeform, searchable list of entries. */
(function (g) {
  const { D, esc, icon } = U;
  const S = Store, ui = App.ui, V = Views;
  const { empty, plural, pageHead } = V.h;

  const COVERS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const MORE_COVERS = ['c7', 'c8', 'c9', 'c10'];
  const JICONS = ['pencil', 'book', 'palette', 'layout', 'flag', 'sun', 'heart', 'sprout', 'compass', 'calendar', 'activity'];
  const words = t => (t && t.trim() ? t.trim().split(/\s+/).length : 0);
  const searchField = (ph, val, input) => `<label class="search-field">${icon('search')}<input type="search" value="${esc(val)}" placeholder="${ph}" data-input="${input}" aria-label="${ph}"></label>`;
  const sortSeg = (cur, act) => `<div class="seg"><button class="${cur === 'new' ? 'on' : ''}" data-act="${act}" data-v="new">Newest</button><button class="${cur === 'old' ? 'on' : ''}" data-act="${act}" data-v="old">Oldest</button></div>`;

  /* ---------- hub: Daily + custom journals ---------- */
  function catCard(j) {
    const es = S.entriesForJournal(j.id);
    const last = es.length ? es.reduce((a, b) => (a.date > b.date ? a : b)) : null;
    return `<a class="course-card ${j.color}" href="#/journalcat/${j.id}">
      <span class="cc-icon">${icon(j.icon)}</span>
      <b>${esc(j.name || 'Untitled journal')}</b>
      <span class="cc-prog"><small>${es.length ? `${plural(es.length, 'entry').replace('entrys', 'entries')} · last ${D.short(last.date)}` : 'No entries yet'}</small></span>
    </a>`;
  }
  V.journals = () => {
    const cats = S.s.journals;
    return `${pageHead(`Daily + ${plural(cats.length, 'journal')}`, 'Journals', 'Keep separate journals for different parts of your life — study notes, ngaji notes, and more.',
      `<button class="btn primary" data-act="journalcat-new">${icon('plus')}New journal</button>`)}
      <div class="course-grid stagger">
        <a class="course-card c1" href="#/journal"><span class="cc-icon">${icon('book')}</span><b>Daily</b><span class="cc-prog"><small>Your everyday journal</small></span></a>
        ${cats.map(catCard).join('')}
      </div>`;
  };

  /* ---------- one journal (full page): freeform, searchable list of entries ---------- */
  V.journalcat = r => {
    const id = r.params.id, j = S.journalCat(id);
    if (!j) return `<a class="proj-back" href="#/journals">${icon('chevL')}Journals</a>${empty('This journal no longer exists.')}`;
    let list = S.entriesForJournal(id).slice();
    const total = list.length, totalWords = list.reduce((a, e) => a + words(e.body), 0);
    const q = (ui.jcQ || '').trim().toLowerCase();
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    if ((ui.jcSort || 'new') !== 'old') list.reverse();
    if (q) list = list.filter(e => `${e.title} ${e.body}`.toLowerCase().includes(q));

    const card = e => {
      const open = !!ui.jeOpen[e.id], w = words(e.body);
      return `<article class="j-card${open ? ' open' : ''}" data-key="${e.id}">
        <div class="j-date"><small>${D.DOW[D.parse(e.date).getDay()]}</small><b>${Number(e.date.slice(8))}</b><span>${D.MON[Number(e.date.slice(5, 7)) - 1]}</span></div>
        <div class="j-main">
          <header><h3>${esc(e.title || 'Untitled entry')}</h3><span class="j-meta">${plural(w, 'word')}</span></header>
          <div class="j-body rt-view${open ? '' : ' clamp'}">${U.sanitize(U.plainToHtml(e.body)) || '<p></p>'}</div>
          <footer><button class="btn sm ghost" data-act="jentry-toggle" data-id="${e.id}">${open ? 'Show less' : 'Read more'}</button><button class="btn sm" data-act="jentry-edit" data-id="${e.id}">${icon('pencil')}Open &amp; edit</button></footer>
        </div></article>`;
    };

    return `
    <a class="proj-back" href="#/journals">${icon('chevL')}Journals</a>
    <div class="proj-page">
      <div class="m-cover ${j.color}"><span class="pc-icon">${icon(j.icon)}</span>
        <div class="m-cover-tools"><div class="dots" role="group" aria-label="Colour">${(ui.moreColors || MORE_COVERS.includes(j.color) ? COVERS.concat(MORE_COVERS) : COVERS).map(cc => `<button class="cdot ${cc}${j.color === cc ? ' on' : ''}" data-act="journalcat-color" data-id="${id}" data-v="${cc}" aria-label="Colour ${cc}"></button>`).join('')}<button class="cdot-more" data-act="colors-more" title="${ui.moreColors ? 'Fewer colours' : 'More colours'}" aria-label="${ui.moreColors ? 'Fewer colours' : 'More colours'}">${icon(ui.moreColors ? 'minus' : 'plus')}</button></div>
        <div class="icons" role="group" aria-label="Icon">${JICONS.map(ic => `<button class="${j.icon === ic ? 'on' : ''}" data-act="journalcat-icon" data-id="${id}" data-v="${ic}" aria-label="${ic}">${icon(ic)}</button>`).join('')}</div></div>
      </div>
      <div class="m-body">
        <input class="m-title" value="${esc(j.name)}" data-input="journalcat-name" data-id="${id}" aria-label="Journal name" placeholder="Journal name">
        <p class="muted">${plural(total, 'entry').replace('entrys', 'entries')} · ${totalWords.toLocaleString()} words</p>
      </div>
    </div>
    <section class="card">
      <header class="card-head"><h2>Entries</h2><button class="btn sm primary" data-act="jentry-new" data-journal="${id}">${icon('plus')}New entry</button></header>
      <div class="toolbar">${searchField('Search this journal', ui.jcQ || '', 'jcat-q')}<span class="spacer"></span>${sortSeg(ui.jcSort || 'new', 'jcat-sort')}</div>
      ${list.length ? `<div class="j-list stagger">${list.map(card).join('')}</div>` : `<div class="card empty-card"><b>${q ? 'No entries match your search' : 'No entries yet'}</b><p>${q ? 'Try another word.' : 'Add your first entry to this journal.'}</p></div>`}
    </section>
    <div class="m-foot"><button class="btn ghost danger" data-act="journalcat-del" data-id="${id}">${icon('trash')}Delete journal</button></div>`;
  };

  /* entries pop out into their own modal, same pattern as project/course/dapukan journal entries */
  V.modals.jentry = m => {
    const e = S.s.journalEntries.find(x => x.id === m.id); if (!e) return null;
    const j = S.journalCat(e.journalId);
    return `<div class="m-head"><span class="eyebrow">${j ? esc(j.name) + ' · ' : ''}Journal entry</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <input class="m-title" value="${esc(e.title)}" data-input="jentry-title" data-id="${e.id}" aria-label="Entry title" placeholder="Title" ${m.fresh ? 'data-autofocus' : ''}>
      <div class="m-fields"><label>Date<input type="date" value="${e.date}" data-change="jentry-date" data-id="${e.id}"></label></div>
      <textarea class="m-desc jr-body" rows="12" placeholder="Write something…" data-input="jentry-body" data-id="${e.id}" aria-label="Journal entry">\n${esc(e.body)}</textarea>
      <div class="m-foot"><button class="btn ghost danger" data-act="jentry-del" data-id="${e.id}">${icon('trash')}Delete entry</button></div>
    </div>`;
  };
})(window);
