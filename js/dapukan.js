/* dayleaf — Dapukan: a dashboard for your roles in Jamaah, at Daerah, Desa or Kelompok level.
   Each role gets a to-do list, quick notes, longer journal entries and links to personal projects. */
(function (g) {
  const { D, esc, icon } = U;
  const S = Store, ui = App.ui, V = Views;
  const { bar, empty, plural, pageHead, taskRow, opt } = V.h;

  const COVERS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const MORE_COVERS = ['c7', 'c8', 'c9', 'c10'];
  const DICONS = ['book', 'palette', 'layout', 'flag', 'sun', 'heart', 'sprout', 'compass', 'calendar', 'activity'];
  const LEVELS = { daerah: 'Daerah', desa: 'Desa', kelompok: 'Kelompok' };
  const SEC_TITLE = { todo: 'To-do', notes: 'Notes', journal: 'Journal', links: 'Linked projects' };

  /* ---------- dashboard: overview + a square per role ---------- */
  function roleCard(d) {
    const st = S.dapukanStats(d);
    return `<a class="course-card ${d.color}" href="#/role/${d.id}">
      <span class="cc-icon">${icon(d.icon)}</span>
      <b>${esc(d.role || 'Untitled role')}</b>${d.unit ? `<small>${esc(d.unit)}</small>` : ''}
      <span class="cc-prog"><small>${st.total ? `${st.done}/${st.total} to-dos done` : 'No to-dos yet'}</small></span>
    </a>`;
  }
  function levelBlock(lvl) {
    const list = S.s.dapukans.filter(d => d.level === lvl);
    if (!list.length) return '';
    return `<div class="term-block"><div class="term-head"><b>${LEVELS[lvl]}</b></div>
      <div class="course-grid stagger">${list.map(roleCard).join('')}</div></div>`;
  }
  V.dapukan = () => {
    const all = S.s.dapukans;
    const openTodo = all.reduce((n, d) => { const st = S.dapukanStats(d); return n + (st.total - st.done); }, 0);
    return `${pageHead(`${plural(all.length, 'role')} · ${plural(openTodo, 'open to-do')}`, 'Dapukan', 'Track your roles in Jamaah, at Daerah, Desa or Kelompok level.',
      `<button class="btn primary" data-act="dapukan-new">${icon('plus')}Add role</button>`)}
      ${all.length ? `<div class="card school-card">${Object.keys(LEVELS).map(levelBlock).join('')}</div>` : empty('Add a role to start tracking your Dapukan.')}`;
  };

  /* ---------- role (full page) ---------- */
  V.role = r => {
    const id = r.params.id, d = S.dapukan(id);
    if (!d) return `<a class="proj-back" href="#/dapukan">${icon('chevL')}Dapukan</a>${empty('This role no longer exists.')}`;
    const ts = S.s.tasks.filter(x => x.dapukanId === id), journal = S.journalForDapukan(id);
    const linked = (d.projectIds || []).map(pid => S.project(pid)).filter(Boolean);
    const free = S.s.projects.filter(p => !(d.projectIds || []).includes(p.id));
    const secCard = (key, body) => `<section class="card sec-card" draggable="true" data-sec="${key}" data-list="dapukans" data-id="${id}">
      <header class="card-head"><span class="sec-grip" title="Drag to reorder">${icon('grip')}</span><h2>${SEC_TITLE[key]}</h2></header>${body}</section>`;
    const SEC_HTML = {
      todo: `<div class="task-list">${ts.map(x => taskRow(x, { edit: true, noDapukan: true, date: true })).join('') || empty('No to-dos yet.')}</div>
        <div class="add-row" data-row><span class="add-ic">${icon('plus')}</span><input class="grow" data-f="title" placeholder="Add a to-do" data-enter="task-add" data-dapukan="${id}" aria-label="New to-do"><input type="date" data-f="date" aria-label="Date (optional)"><button class="btn sm primary" data-act="task-add">Add</button></div>`,
      notes: `<p class="muted">Quick notes for this role.</p>
        <div class="notes">${S.notesForDapukan(id).map(n => `<article class="note" data-key="${n.id}">
          <div class="note-top"><span>${n.createdAt > 1e12 ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Note'}</span><button class="icon-btn sm ghost" data-act="dnote-del" data-id="${n.id}" aria-label="Delete note">${icon('trash')}</button></div>
          <input class="note-title" value="${esc(n.title)}" placeholder="Title" data-input="note-title" data-id="${n.id}" aria-label="Note title">
          <textarea class="note-body" rows="3" placeholder="Write something…" data-input="note-body" data-id="${n.id}" aria-label="Note">\n${esc(n.body)}</textarea></article>`).join('') || empty('No notes yet.')}</div>
        <button class="btn sm" data-act="dnote-add" data-dapukan="${id}">${icon('plus')}New note</button>`,
      journal: `<p class="muted">Longer entries — opens in its own window.</p>
        <div class="jrow-list">${journal.map(j => `<button class="jrow" data-act="djournal-open" data-id="${j.id}">
          <span class="jrow-main"><b>${esc(j.title || 'Untitled entry')}</b><small>${esc((j.body || '').slice(0, 90) || 'No written entry')}</small></span>
          <span class="jrow-date">${D.short(new Date(j.createdAt).toISOString().slice(0, 10))}</span>${icon('chevR')}</button>`).join('') || empty('No journal entries yet.')}</div>
        <button class="btn sm" data-act="djournal-add" data-dapukan="${id}">${icon('plus')}New journal entry</button>`,
      links: `<div class="tags wrap">${linked.map(p => `<span class="link-chip"><button class="chip proj ${p.cover}" data-act="project-open" data-id="${p.id}">${esc(p.title)}</button><button class="icon-btn sm ghost" data-act="dapukan-unlink" data-id="${id}" data-pid="${p.id}" aria-label="Unlink ${esc(p.title)}">${icon('x')}</button></span>`).join('') || empty('No linked projects yet.')}</div>
        ${free.length ? `<label class="m-link">${icon('link')}<select data-change="dapukan-link" data-id="${id}"><option value="">Link a personal project…</option>${free.map(p => opt(p.id, p.title)).join('')}</select></label>` : ''}`,
    };
    const order = (d.sections || U.DAPUKAN_SECTIONS).slice();
    U.DAPUKAN_SECTIONS.forEach(k => { if (!order.includes(k)) order.push(k); });
    return `
    <a class="proj-back" href="#/dapukan">${icon('chevL')}Dapukan</a>
    <div class="proj-page">
      <div class="m-cover ${d.color}"><span class="pc-icon">${icon(d.icon)}</span>
        <div class="m-cover-tools"><div class="dots" role="group" aria-label="Colour">${(ui.moreColors || MORE_COVERS.includes(d.color) ? COVERS.concat(MORE_COVERS) : COVERS).map(cc => `<button class="cdot ${cc}${d.color === cc ? ' on' : ''}" data-act="dapukan-color" data-id="${id}" data-v="${cc}" aria-label="Colour ${cc}"></button>`).join('')}<button class="cdot-more" data-act="colors-more" title="${ui.moreColors ? 'Fewer colours' : 'More colours'}" aria-label="${ui.moreColors ? 'Fewer colours' : 'More colours'}">${icon(ui.moreColors ? 'minus' : 'plus')}</button></div>
        <div class="icons" role="group" aria-label="Icon">${DICONS.map(ic => `<button class="${d.icon === ic ? 'on' : ''}" data-act="dapukan-icon" data-id="${id}" data-v="${ic}" aria-label="${ic}">${icon(ic)}</button>`).join('')}</div></div>
      </div>
      <div class="m-body">
        <input class="m-title" value="${esc(d.role)}" data-input="dapukan-role" data-id="${id}" aria-label="Role title" placeholder="Role title">
        <div class="m-fields">
          <label>Level<select data-change="dapukan-level" data-id="${id}">${Object.keys(LEVELS).map(k => opt(k, LEVELS[k], d.level === k)).join('')}</select></label>
          <label>Unit name<input value="${esc(d.unit || '')}" placeholder="e.g. Springfield" data-input="dapukan-unit" data-id="${id}"></label>
        </div>
        <textarea class="m-desc" rows="2" data-input="dapukan-desc" data-id="${id}" placeholder="What does this role involve?" aria-label="Description">\n${esc(d.desc || '')}</textarea>
      </div>
    </div>
    ${order.map(k => secCard(k, SEC_HTML[k])).join('')}
    <div class="m-foot"><button class="btn ghost danger" data-act="dapukan-del" data-id="${id}">${icon('trash')}Delete role</button></div>`;
  };

  /* journal entries pop out into their own modal, same pattern as projects and courses */
  V.modals.djournal = m => {
    const j = S.s.dapukanJournal.find(x => x.id === m.id); if (!j) return null;
    const d = j.dapukanId && S.dapukan(j.dapukanId);
    return `<div class="m-head"><span class="eyebrow">${d ? esc(d.role) + ' · ' : ''}Journal entry</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <input class="m-title" value="${esc(j.title)}" data-input="djournal-title" data-id="${j.id}" aria-label="Entry title" placeholder="Title" ${m.fresh ? 'data-autofocus' : ''}>
      <textarea class="m-desc jr-body" rows="12" placeholder="Write something…" data-input="djournal-body" data-id="${j.id}" aria-label="Journal entry">\n${esc(j.body)}</textarea>
      <div class="m-foot"><button class="btn ghost danger" data-act="djournal-del" data-id="${j.id}">${icon('trash')}Delete entry</button></div>
    </div>`;
  };
})(window);
