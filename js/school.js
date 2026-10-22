/* dayleaf — School: track coursework by school, then by semester or summer program, then by course.
   Each course gets assignments (tasks), quick notes, longer journal entries and a freeform board. */
(function (g) {
  const { D, esc, icon } = U;
  const S = Store, ui = App.ui, V = Views;
  const { bar, pct, empty, plural, pageHead, taskRow, opt } = V.h;

  const COVERS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const MORE_COVERS = ['c7', 'c8', 'c9', 'c10'];
  const CICONS = ['book', 'palette', 'layout', 'flag', 'sun', 'heart', 'sprout', 'compass', 'calendar', 'activity'];
  const TERM_KINDS = { semester: 'Semester', summer: 'Summer program' };
  const SEC_TITLE = { tasks: 'Assignments', notes: 'Notes', journal: 'Journal' };

  /* ---------- overview: schools > terms > courses ---------- */
  function courseCard(c) {
    const st = S.courseStats(c);
    return `<a class="course-card ${c.color}" href="#/course/${c.id}">
      <span class="cc-icon">${icon(c.icon)}</span>
      <b>${esc(c.name || 'Untitled course')}</b>${c.code ? `<small>${esc(c.code)}</small>` : ''}
      <span class="cc-prog">${bar(st.pct)}<small>${pct(st.pct)}%</small></span>
    </a>`;
  }
  function termBlock(t) {
    const courses = S.coursesFor(t.id);
    return `<div class="term-block" data-key="${t.id}">
      <div class="term-head">
        <input class="term-name" value="${esc(t.name)}" data-input="term-name" data-id="${t.id}" aria-label="Term name" placeholder="e.g. Fall 2026">
        <select data-change="term-kind" data-id="${t.id}" aria-label="Term type">${Object.keys(TERM_KINDS).map(k => opt(k, TERM_KINDS[k], t.kind === k)).join('')}</select>
        <button class="icon-btn sm ghost danger" data-act="term-del" data-id="${t.id}" aria-label="Delete term">${icon('trash')}</button>
      </div>
      <div class="course-grid stagger">${courses.map(courseCard).join('')}
        <button class="course-new" data-act="course-new" data-term="${t.id}">${icon('plus')}<b>Add course</b></button>
      </div>
    </div>`;
  }
  function schoolBlock(sc) {
    const terms = S.termsFor(sc.id);
    return `<section class="card school-card" data-key="${sc.id}">
      <header class="card-head">
        <span class="cc-icon ${sc.color || 'c1'}">${icon(sc.icon || 'book')}</span>
        <input class="school-name" value="${esc(sc.name)}" data-input="school-name" data-id="${sc.id}" aria-label="School name" placeholder="School name">
        <button class="icon-btn sm ghost danger" data-act="school-del" data-id="${sc.id}" aria-label="Delete school">${icon('trash')}</button>
      </header>
      <div class="school-tools">
        <div class="dots" role="group" aria-label="Colour">${(ui.moreColors || MORE_COVERS.includes(sc.color) ? COVERS.concat(MORE_COVERS) : COVERS).map(cc => `<button class="cdot ${cc}${(sc.color || 'c1') === cc ? ' on' : ''}" data-act="school-color" data-id="${sc.id}" data-v="${cc}" aria-label="Colour ${cc}"></button>`).join('')}<button class="cdot-more" data-act="colors-more" title="${ui.moreColors ? 'Fewer colours' : 'More colours'}" aria-label="${ui.moreColors ? 'Fewer colours' : 'More colours'}">${icon(ui.moreColors ? 'minus' : 'plus')}</button></div>
        <div class="icons" role="group" aria-label="Icon">${CICONS.map(ic => `<button class="${(sc.icon || 'book') === ic ? 'on' : ''}" data-act="school-icon" data-id="${sc.id}" data-v="${ic}" aria-label="${ic}">${icon(ic)}</button>`).join('')}</div>
      </div>
      ${terms.map(termBlock).join('') || empty('No semesters or summer programs yet.')}
      <button class="btn sm" data-act="term-new" data-school="${sc.id}">${icon('plus')}Add semester or summer program</button>
    </section>`;
  }
  V.school = () => {
    const schools = S.s.schools;
    return `${pageHead(`${plural(schools.length, 'school')} · ${plural(S.s.courses.length, 'course')}`, 'School', 'Track your coursework by school, semester or summer program.',
      `<button class="btn primary" data-act="school-new">${icon('plus')}Add school</button>`)}
      ${schools.map(schoolBlock).join('') || empty('Add a school to start tracking semesters and courses.')}`;
  };

  /* ---------- course (full page) ---------- */
  V.course = r => {
    const id = r.params.id, c = S.course(id);
    if (!c) return `<a class="proj-back" href="#/school">${icon('chevL')}School</a>${empty('This course no longer exists.')}`;
    const term = c.termId && S.term(c.termId), school = term && S.school(term.schoolId);
    const st = S.courseStats(c), ts = S.s.tasks.filter(x => x.courseId === id), journal = S.journalForCourse(id);
    const secCard = (key, body) => `<section class="card sec-card" draggable="true" data-sec="${key}" data-list="courses" data-id="${id}">
      <header class="card-head"><span class="sec-grip" title="Drag to reorder">${icon('grip')}</span><h2>${SEC_TITLE[key]}</h2></header>${body}</section>`;
    const SEC_HTML = {
      tasks: `<div class="task-list">${ts.map(x => taskRow(x, { edit: true, noCourse: true, date: true })).join('') || empty('No assignments yet.')}</div>
        <div class="add-row" data-row><span class="add-ic">${icon('plus')}</span><input class="grow" data-f="title" placeholder="Add an assignment" data-enter="task-add" data-course="${id}" aria-label="New assignment"><input type="date" data-f="date" aria-label="Due date (optional)"><button class="btn sm primary" data-act="task-add">Add</button></div>`,
      notes: `<p class="muted">Quick notes for this course.</p>
        <div class="notes">${S.notesForCourse(id).map(n => `<article class="note" data-key="${n.id}">
          <div class="note-top"><span>${n.createdAt > 1e12 ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Note'}</span><button class="icon-btn sm ghost" data-act="cnote-del" data-id="${n.id}" aria-label="Delete note">${icon('trash')}</button></div>
          <input class="note-title" value="${esc(n.title)}" placeholder="Title" data-input="note-title" data-id="${n.id}" aria-label="Note title">
          <textarea class="note-body" rows="3" placeholder="Write something…" data-input="note-body" data-id="${n.id}" aria-label="Note">\n${esc(n.body)}</textarea></article>`).join('') || empty('No notes yet.')}</div>
        <button class="btn sm" data-act="cnote-add" data-course="${id}">${icon('plus')}New note</button>`,
      journal: `<p class="muted">Longer entries — opens in its own window.</p>
        <div class="jrow-list">${journal.map(j => `<button class="jrow" data-act="cjournal-open" data-id="${j.id}">
          <span class="jrow-main"><b>${esc(j.title || 'Untitled entry')}</b><small>${esc((j.body || '').slice(0, 90) || 'No written entry')}</small></span>
          <span class="jrow-date">${D.short(new Date(j.createdAt).toISOString().slice(0, 10))}</span>${icon('chevR')}</button>`).join('') || empty('No journal entries yet.')}</div>
        <button class="btn sm" data-act="cjournal-add" data-course="${id}">${icon('plus')}New journal entry</button>`,
    };
    const order = (c.sections || U.COURSE_SECTIONS).slice();
    U.COURSE_SECTIONS.forEach(k => { if (!order.includes(k)) order.push(k); });
    return `
    <a class="proj-back" href="#/school">${icon('chevL')}School</a>
    <div class="proj-page">
      <div class="m-cover ${c.color}"><span class="pc-icon">${icon(c.icon)}</span>
        <div class="m-cover-tools"><div class="dots" role="group" aria-label="Colour">${(ui.moreColors || MORE_COVERS.includes(c.color) ? COVERS.concat(MORE_COVERS) : COVERS).map(cc => `<button class="cdot ${cc}${c.color === cc ? ' on' : ''}" data-act="course-color" data-id="${id}" data-v="${cc}" aria-label="Colour ${cc}"></button>`).join('')}<button class="cdot-more" data-act="colors-more" title="${ui.moreColors ? 'Fewer colours' : 'More colours'}" aria-label="${ui.moreColors ? 'Fewer colours' : 'More colours'}">${icon(ui.moreColors ? 'minus' : 'plus')}</button></div>
        <div class="icons" role="group" aria-label="Icon">${CICONS.map(ic => `<button class="${c.icon === ic ? 'on' : ''}" data-act="course-icon" data-id="${id}" data-v="${ic}" aria-label="${ic}">${icon(ic)}</button>`).join('')}</div></div>
      </div>
      <div class="m-body">
        <input class="m-title" value="${esc(c.name)}" data-input="course-name" data-id="${id}" aria-label="Course name" placeholder="Course name">
        <input class="m-line" value="${esc(c.code || '')}" placeholder="Course code (optional)" data-input="course-code" data-id="${id}" aria-label="Course code">
        ${school || term ? `<p class="muted">${school ? esc(school.name) : ''}${school && term ? ' · ' : ''}${term ? esc(term.name) : ''}</p>` : ''}
        <div class="m-fields">
          <label>Start date<input type="date" value="${c.startDate || ''}" data-change="course-start" data-id="${id}"></label>
          <label>Duration (weeks)<input type="number" min="0" step="1" value="${c.weeks || ''}" placeholder="e.g. 12" data-input="course-weeks" data-id="${id}"></label>
        </div>
        ${st.taskPct == null && st.timePct == null ? `<label class="m-range">Progress <b>${pct((c.manual || 0) / 100)}%</b><input type="range" min="0" max="100" step="5" value="${c.manual || 0}" data-input="course-manual" data-id="${id}"></label>` : ''}
        <div class="m-progress"><div><b>${pct(st.pct)}%</b><small>${[st.weekNow != null ? `Week ${st.weekNow} of ${c.weeks}` : '', st.total ? `${st.done} of ${st.total} assignments done` : ''].filter(Boolean).join(' · ') || 'Set your own progress'}</small></div>${bar(st.pct)}</div>
      </div>
    </div>
    ${order.map(k => secCard(k, SEC_HTML[k])).join('')}
    ${Board.html('course:' + id, { title: 'Board', sub: 'A canvas for this class — notes, images, sketches.', saved: 'Saved with this course' })}
    <div class="m-foot"><button class="btn ghost danger" data-act="course-del" data-id="${id}">${icon('trash')}Delete course</button></div>`;
  };

  /* journal entries pop out into their own modal, same as project journal entries */
  V.modals.cjournal = m => {
    const j = S.s.courseJournal.find(x => x.id === m.id); if (!j) return null;
    const c = j.courseId && S.course(j.courseId);
    return `<div class="m-head"><span class="eyebrow">${c ? esc(c.name) + ' · ' : ''}Journal entry</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <input class="m-title" value="${esc(j.title)}" data-input="cjournal-title" data-id="${j.id}" aria-label="Entry title" placeholder="Title" ${m.fresh ? 'data-autofocus' : ''}>
      <textarea class="m-desc jr-body" rows="12" placeholder="Write something…" data-input="cjournal-body" data-id="${j.id}" aria-label="Journal entry">\n${esc(j.body)}</textarea>
      <div class="m-foot"><button class="btn ghost danger" data-act="cjournal-del" data-id="${j.id}">${icon('trash')}Delete entry</button></div>
    </div>`;
  };
})(window);
