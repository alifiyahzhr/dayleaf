/* dayleaf — router, actions and event wiring */
(function () {
  const { D, toast, uid } = U;
  const S = Store, ui = App.ui, V = Views;
  const $ = s => document.querySelector(s);
  const view = $('#view'), side = $('#sidebar'), top = $('#topbar'), mroot = $('#modal-root'), main = $('#main'), app = $('#app'), photoFile = $('#photo-file'), bannerFile = $('#banner-file'), restoreFile = $('#restore-file');
  const HORIZ = ['year', 'month', 'week', 'day'];
  const LEVELS = ['life', 'year', 'month', 'week', 'day'];
  try { if (localStorage.getItem('dayleaf.mascotOff') === '1') document.body.classList.add('no-mascot'); } catch (_) { /* ignore */ }
  const STATUS = { motion: 'In motion', horizon: 'On the horizon', done: 'Completed' };
  const PAGES = ['dashboard', 'daily', 'journal', 'notes', 'calendar', 'habits', 'projects', 'goals', 'about'];

  /* ---------- routing & painting ---------- */
  const PERIOD_OK = {
    year: p => /^\d{4}$/.test(p || ''), month: p => /^\d{4}-\d{2}$/.test(p || ''),
    week: p => /^\d{4}-W\d{2}$/.test(p || ''), day: p => D.valid(p),
  };
  function parse() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean), t = D.today();
    const name = parts[0] || 'dashboard';
    if (name === 'daily') return { name, params: { day: D.valid(parts[1]) ? parts[1] : t } };
    if (name === 'goals') {
      if (parts[1] === 'life') return { name, params: { h: 'life', id: parts[2] || null } };
      const h = HORIZ.includes(parts[1]) ? parts[1] : 'all';
      return { name, params: { h, p: h === 'all' ? null : PERIOD_OK[h](parts[2]) ? parts[2] : D.periodOf(h, t) } };
    }
    return { name: PAGES.includes(name) ? name : 'dashboard', params: {} };
  }

  function paint(full) {
    if (!S.s) return;
    const r = App.route;
    const html = V.page(r);
    if (full) {
      Board.unmount();
      view.innerHTML = html;
      if (r.name === 'daily' && S.s.prefs.dailyMode === 'board') Board.mount(r.params.day);
      if (r.name === 'about') Board.mount('about');
      Editor.applySpacing(false);
      Editor.mount();
      main.scrollTop = 0;
    } else U.morph(view, html);
    U.morph(side, V.minify(V.sidebar()));
    U.morph(top, V.minify(V.topbar()));
    U.morph(mroot, V.minify(V.modal()));
    document.title = `${V.title()} · dayleaf`;
  }
  const refresh = () => paint(false);

  let first = true;
  function go() {
    if (!S.s) return;
    const r = parse(), same = !first && JSON.stringify(r) === JSON.stringify(App.route);
    App.route = r;
    if (r.name === 'daily') { const d = D.parse(r.params.day); ui.cal = { y: d.getFullYear(), m: d.getMonth() }; }
    app.classList.remove('nav-open');
    if (first) { first = false; return paint(true); }
    if (same) return paint(false);
    view.classList.add('leaving');
    clearTimeout(go.t);
    go.t = setTimeout(() => { paint(true); view.classList.remove('leaving'); }, 140);
  }

  /* ---------- modals ---------- */
  function openModal(m) {
    ui.modal = m; ui.closing = false;
    if (m.type === 'search') ui.search = { q: '', sel: 0 };
    paint(false);
    requestAnimationFrame(() => mroot.querySelector('[data-autofocus]')?.focus());
  }
  function closeModal() {
    if (!ui.modal || ui.closing) return;
    ui.closing = true; paint(false);
    setTimeout(() => { ui.modal = null; ui.closing = false; ui.sec = { step: 'idle', msg: '' }; ui.restore = null; ui.restoreErr = ''; ui.sync = Object.assign({}, ui.sync, { msg: '', pullPreview: null }); paint(false); }, 190);
  }

  /* ---------- data helpers ---------- */
  const rowTitle = row => row.querySelector('[data-f="title"]');
  function addTask(row) {
    const ti = rowTitle(row), title = ti.value.trim();
    if (!title) return;
    const dateEl = row.querySelector('[data-f="date"]');
    const date = dateEl ? (dateEl.value || null) : (ti.dataset.day || null);
    let projectId = ti.dataset.project || null, goalId = ti.dataset.goal || null;
    if (ti.dataset.scope === 'daily') { projectId = ui.addTask.project || null; goalId = ui.addTask.goal || null; ui.addTask = { project: '', goal: '' }; }
    S.set(s => s.tasks.push({ id: uid(), title, date, projectId, goalId, done: false, createdAt: Date.now() }));
    ti.value = ''; if (dateEl && !dateEl.defaultValue) dateEl.value = '';
    ti.focus();
  }
  function addGoal(row) {
    const ti = rowTitle(row), title = ti.value.trim();
    if (!title) return;
    let h = ti.dataset.h, p = ti.dataset.p;
    const parentId = ti.dataset.parent || null;
    if (parentId) {
      const pg = S.goal(parentId), t = D.today(), [a, b] = D.range(pg.horizon, pg.period);
      h = LEVELS[LEVELS.indexOf(pg.horizon) + 1]; p = D.periodOf(h, t >= a && t <= b ? t : a);
    }
    S.set(s => s.goals.push({ id: uid(), horizon: h, period: p, title, parentId, projectId: null, habitId: null, target: 0, manual: 0, done: false }));
    ti.value = ''; ti.focus();
  }
  const EVENT_COLORS = ['blue', 'sky', 'sand', 'sage', 'rose'];
  function newEvent(day, title) {
    const id = uid();
    S.set(s => s.events.push({ id, title, date: day, allDay: true, time: '', endTime: '', repeat: 'none', until: '', color: EVENT_COLORS[s.events.length % EVENT_COLORS.length], notes: '' }));
    return id;
  }
  const arm = (el, label) => {
    if (el.classList.contains('armed')) return true;
    el.classList.add('armed');
    const txt = [...el.childNodes].reverse().find(n => n.nodeType === 3), old = txt && txt.nodeValue;
    if (txt) txt.nodeValue = label;
    setTimeout(() => { el.classList.remove('armed'); if (txt && el.isConnected) txt.nodeValue = old; }, 3000);
    return false;
  };
  const upd = (list, id, fn) => S.set(s => { const o = s[list].find(x => x.id === id); if (o) fn(o, s); });
  const jset = (day, fn) => S.set(s => { const j = (s.journal[day] ||= { title: '', body: '', updated: 0 }); fn(j); j.updated = Date.now(); });

  /* ---------- photos ---------- */
  function addPhoto(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (S.s.photos.length >= 8) return toast('You can keep up to 8 photos. Remove one to add another.');
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const m = Math.min(1, 1400 / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * m); c.height = Math.round(im.height * m);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        S.set(s => s.photos.push({ id: uid(), src: c.toDataURL('image/jpeg', 0.85), caption: '' }));
        ui.photoIdx = S.s.photos.length - 1; refresh(); toast('Photo added');
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  photoFile.addEventListener('change', () => { addPhoto(photoFile.files[0]); photoFile.value = ''; });

  /* goals banner images (one per tab: all, year, month, week, day) */
  function addBanner(file, h) {
    U.readImage(file, 1600, 0.8, src => {
      S.set(s => { if (h.startsWith('life:')) { const g = s.goals.find(x => x.id === h.slice(5)); if (g) g.img = src; } else s.banners[h] = src; });
      toast('Banner image added');
    });
  }

  /* the year being viewed: "today" moves to that year so every page follows along */
  function setYear(y, quiet) {
    const ry = Number(D.real().slice(0, 4));
    D.anchor = y === ry ? null : (y < ry ? `${y}-12-31` : `${y}-01-01`);
    try { if (y === ry) sessionStorage.removeItem('dayleaf.year'); else sessionStorage.setItem('dayleaf.year', String(y)); } catch (_) { /* ignore */ }
    const d = D.parse(D.today()); ui.cal = { y: d.getFullYear(), m: d.getMonth() };
    ui.calM = null; ui.calSel = null; ui.habWk = null;
    if (quiet) return;
    ui.modal = null; ui.closing = false;
    if (location.hash === '#/dashboard') paint(true); else location.hash = '#/dashboard';
  }
  function applyMascot() {
    const on = !S.s || S.s.prefs.mascotOn !== false;
    document.body.classList.toggle('no-mascot', !on);
    try { if (on) localStorage.removeItem('dayleaf.mascotOff'); else localStorage.setItem('dayleaf.mascotOff', '1'); } catch (_) { /* ignore */ }
    if (!on) Mascot.visitor.hide();
  }
  bannerFile.addEventListener('change', () => { addBanner(bannerFile.files[0], ui.bannerH); bannerFile.value = ''; });
  const dropZone = e => e.target.closest && e.target.closest('[data-photo-drop],[data-banner-drop]');
  document.addEventListener('dragover', e => {
    const z = dropZone(e);
    if (z && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); z.classList.add('dropping'); }
  });
  document.addEventListener('dragleave', e => { const z = dropZone(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove('dropping'); });
  document.addEventListener('drop', e => {
    const z = dropZone(e);
    if (z && e.dataTransfer.files[0]) {
      e.preventDefault(); z.classList.remove('dropping');
      if (z.dataset.life) addBanner(e.dataTransfer.files[0], 'life:' + z.dataset.life);
      else if (z.hasAttribute('data-banner-drop')) addBanner(e.dataTransfer.files[0], z.dataset.h); else addPhoto(e.dataTransfer.files[0]);
    }
  });

  /* backup & restore */
  function restoreCheck(obj) {
    const d = obj && obj.data;
    return !!(obj && obj.app === 'dayleaf' && d && d.v === 2 && Array.isArray(d.tasks) && Array.isArray(d.habits) && Array.isArray(d.projects) && Array.isArray(d.goals) && Array.isArray(d.notes));
  }
  restoreFile.addEventListener('change', () => {
    const f = restoreFile.files[0]; restoreFile.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const obj = JSON.parse(rd.result);
        if (!restoreCheck(obj)) throw new Error('bad');
        ui.restore = { exported: obj.exported, data: obj.data }; ui.restoreErr = '';
      } catch (_) { ui.restore = null; ui.restoreErr = 'That file does not look like a dayleaf backup.'; }
      refresh();
    };
    rd.readAsText(f);
  });

  /* ---------- click actions ---------- */
  const A = {
    'nav-open': () => app.classList.add('nav-open'),
    'nav-close': () => app.classList.remove('nav-open'),
    'search-open': () => { app.classList.remove('nav-open'); openModal({ type: 'search' }); },
    'profile-open': () => openModal({ type: 'profile' }),
    'modal-close': closeModal,
    backdrop: (el, e) => { if (e.target === el) closeModal(); },
    'focus-toggle': () => app.classList.toggle('focus'),
    'lock-now': () => {
      if (Security.enabled()) return Security.lock();
      ui.sec = { step: 'set', msg: '' }; openModal({ type: 'profile' });
    },

    'task-toggle': el => upd('tasks', el.dataset.id, t => { t.done = !t.done; t.doneAt = t.done ? Date.now() : null; }),
    'task-del': el => S.set(s => { s.tasks = s.tasks.filter(t => t.id !== el.dataset.id); }),
    'task-add': el => addTask(el.closest('[data-row]')),
    'task-schedule': el => upd('tasks', el.dataset.id, t => { t.date = el.dataset.day; }),
    'carry-over': el => S.set(s => { const prev = D.add(el.dataset.day, -1); s.tasks.forEach(t => { if (t.date === prev && !t.done) t.date = el.dataset.day; }); }),

    /* bunny */
    'mascot-poke': el => { if (Mascot.visitor.justDragged) return; Mascot.poke(el); if (el.id === 'buddy') setTimeout(() => Mascot.visitor.hide(), 3200); },
    'banner-add': el => { ui.bannerH = el.dataset.h; bannerFile.click(); },
    'banner-del': el => S.set(s => { const h = el.dataset.h; if (h.startsWith('life:')) { const g = s.goals.find(x => x.id === h.slice(5)); if (g) g.img = ''; } else s.banners[h] = ''; }),

    /* overarching goals */
    'life-new': () => {
      const id = uid();
      S.set(s => s.goals.push({ id, horizon: 'life', period: 'all', title: 'New overarching goal', desc: '', img: '', parentId: null, projectId: null, habitId: null, target: 0, manual: 0, done: false }));
      location.hash = `#/goals/life/${id}`;
      setTimeout(() => { const i = view.querySelector('.lb-title'); i?.focus(); i?.select(); }, 500);
    },
    'tree-toggle': el => { const id = el.dataset.id; ui.treeOpen[id] = ui.treeOpen[id] === false; refresh(); },

    /* years */
    'year-open': () => openModal({ type: 'year' }),
    'year-set': el => setYear(Number(el.dataset.y)),
    'year-review': el => openModal({ type: 'review', y: Number(el.dataset.y) }),
    'year-start': el => { ui.ny = { goals: true, tasks: true, focus: true }; openModal({ type: 'newyear', y: Number(el.dataset.y) }); },
    'ny-begin': el => {
      const ny = Number(el.dataset.y), res = S.startYear(ny, ui.ny);
      setYear(ny);
      toast(`Welcome to ${ny}!${res.goals ? ` ${res.goals} goal${res.goals > 1 ? 's' : ''} carried over.` : ''}`);
    },

    /* journal & notes: past posts */
    'past-toggle': el => { ui.pastOpen[el.dataset.k] = el.getAttribute('aria-expanded') !== 'true'; refresh(); },
    jbrowse: el => { ui.jBrowse = el.dataset.v; refresh(); },
    nbrowse: el => { ui.nBrowse = el.dataset.v; refresh(); },
    'habit-color': el => upd('habits', el.dataset.id, h => { h.color = el.dataset.v; }),
    'backup-download': () => {
      const blob = new Blob([JSON.stringify({ app: 'dayleaf', format: 1, exported: new Date().toISOString(), data: S.s }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `dayleaf-backup-${D.today()}.json`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      S.set(s => { s.prefs.lastBackup = new Date().toISOString(); });
      toast('Backup saved to your downloads');
    },
    'restore-pick': () => { ui.restoreErr = ''; restoreFile.click(); },
    'restore-cancel': () => { ui.restore = null; refresh(); },
    'restore-confirm': () => {
      if (!ui.restore) return;
      const data = ui.restore.data; ui.restore = null;
      S.load(JSON.stringify(data)); closeModal(); paint(true); toast('Backup restored');
    },
    'colors-more': () => { ui.moreColors = !ui.moreColors; refresh(); },

    /* journal & notes */
    'journal-open': el => {
      S.set(s => { s.prefs.dailyMode = 'write'; });
      const target = `#/daily/${el.dataset.day}`;
      if (location.hash === target) paint(true); else location.hash = target;
    },
    'journal-toggle': el => { ui.jOpen[el.dataset.day] = !ui.jOpen[el.dataset.day]; refresh(); },
    'journal-sort': el => { ui.journalSort = el.dataset.v; refresh(); },
    'notes-sort': el => { ui.notesSort = el.dataset.v; refresh(); },

    /* about me */
    'trait-del': el => S.set(s => { s.about.traits = s.about.traits.filter(x => x !== el.dataset.v); }),
    'trait-add': el => { const v = (el.value || '').trim(); if (!v) return; S.set(s => { if (!s.about.traits.some(x => x.toLowerCase() === v.toLowerCase())) s.about.traits.push(v); }); el.value = ''; el.focus(); },
    'value-del': el => S.set(s => { s.about.values = s.about.values.filter(x => x !== el.dataset.v); }),
    'value-add': el => {
      const v = (el.dataset.v || el.value || '').trim(); if (!v) return;
      S.set(s => { if (!s.about.values.some(x => x.toLowerCase() === v.toLowerCase())) s.about.values.push(v); });
      if (el.tagName === 'INPUT') { el.value = ''; el.focus(); }
    },
    'affirm-add': el => {
      const ti = rowTitle(el.closest('[data-row]')), text = ti.value.trim(); if (!text) return;
      S.set(s => s.about.affirmations.push({ id: uid(), text })); ti.value = ''; ti.focus();
    },
    'affirm-del': el => S.set(s => { s.about.affirmations = s.about.affirmations.filter(x => x.id !== el.dataset.id); }),
    'affirm-toggle': el => S.set(s => {
      const arr = (s.about.affirmDone[D.today()] ||= []), i = arr.indexOf(el.dataset.id);
      if (i < 0) arr.push(el.dataset.id); else arr.splice(i, 1);
    }),
    'wheel-goal': el => {
      const key = el.dataset.id, label = V.WHEEL.find(w => w[0] === key)[1], w = S.s.about.wheel[key], yr = D.today().slice(0, 4);
      if (S.s.goals.some(g => g.horizon === 'year' && g.period === yr && g.title.startsWith(label + ':'))) return toast('That is already in your year goals');
      S.set(s => s.goals.push({ id: uid(), horizon: 'year', period: yr, title: `${label}: ${w.note || `grow from ${w.now} to ${w.goal}`}`, parentId: null, projectId: null, habitId: null, target: 0, manual: Math.min(100, Math.round(w.now / w.goal * 100)), done: false }));
      toast('Added to your year goals');
    },
    'letter-new': () => {
      const id = uid();
      S.set(s => s.about.letters.push({ id, title: '', body: '', openOn: D.add(D.today(), 30) }));
      openModal({ type: 'letter', id, fresh: true });
    },
    'letter-open': el => openModal({ type: 'letter', id: el.dataset.id }),
    'letter-del': el => { S.set(s => { s.about.letters = s.about.letters.filter(l => l.id !== el.dataset.id); }); closeModal(); },

    /* daily entry */
    'daily-mode': el => { if (S.s.prefs.dailyMode === el.dataset.v) return; S.set(s => { s.prefs.dailyMode = el.dataset.v; }); paint(true); },
    'mood-set': el => S.set(s => { const d = el.dataset.day, v = Number(el.dataset.v); if (s.moods[d] === v) delete s.moods[d]; else s.moods[d] = v; }),
    'note-add': el => {
      const id = uid();
      S.set(s => s.notes.push({ id, date: el.dataset.day || D.today(), title: '', body: '', createdAt: Date.now(), projectId: el.dataset.project || null }));
      requestAnimationFrame(() => requestAnimationFrame(() => (mroot.querySelector(`input[data-id="${id}"]`) || view.querySelector(`input[data-id="${id}"]`))?.focus()));
    },
    'note-del': el => S.set(s => { s.notes = s.notes.filter(n => n.id !== el.dataset.id); }),

    /* habits */
    'habit-toggle': el => S.set(s => {
      const day = el.dataset.day, id = el.dataset.id, l = (s.habitLog[day] ||= {});
      if (l[id]) delete l[id]; else l[id] = true;
      if (!Object.keys(l).length) delete s.habitLog[day];
    }),
    'habit-new': () => {
      const id = uid();
      S.set(s => s.habits.push({ id, name: 'New habit', sub: '', icon: 'sprout', days: [0, 1, 2, 3, 4, 5, 6] }));
      openModal({ type: 'habit', id });
      requestAnimationFrame(() => { const i = mroot.querySelector('.m-title'); i?.focus(); i?.select(); });
    },
    'habit-open': el => openModal({ type: 'habit', id: el.dataset.id }),
    'habit-icon': el => upd('habits', el.dataset.id, h => { h.icon = el.dataset.v; }),
    'habit-day': el => upd('habits', el.dataset.id, h => { const i = Number(el.dataset.v), d = new Set(h.days || []); d.has(i) ? d.delete(i) : d.add(i); h.days = [...d].sort(); }),
    'habit-preset': el => upd('habits', el.dataset.id, h => { h.days = { all: [0, 1, 2, 3, 4, 5, 6], weekdays: [0, 1, 2, 3, 4], weekends: [5, 6] }[el.dataset.v]; }),
    'habit-move': el => S.set(s => {
      const i = s.habits.findIndex(h => h.id === el.dataset.id), j = i + Number(el.dataset.v);
      if (i < 0 || j < 0 || j >= s.habits.length) return;
      [s.habits[i], s.habits[j]] = [s.habits[j], s.habits[i]];
    }),
    'habit-del': el => {
      if (!arm(el, 'Click again to delete')) return;
      S.set(s => {
        s.habits = s.habits.filter(h => h.id !== el.dataset.id);
        for (const k in s.habitLog) { delete s.habitLog[k][el.dataset.id]; if (!Object.keys(s.habitLog[k]).length) delete s.habitLog[k]; }
        s.goals.forEach(g => { if (g.habitId === el.dataset.id) g.habitId = null; });
      });
      closeModal();
    },
    'hab-week': el => {
      const d = Number(el.dataset.d), cur = ui.habWk || D.weekKey(D.today());
      ui.habWk = d === 0 ? null : D.weekKey(D.add(D.weekStart(cur), 7 * d)); refresh();
    },

    /* calendar & events */
    'cal-select': el => {
      ui.calSel = el.dataset.day;
      const ym = ui.calSel.slice(0, 7); if (ym !== (ui.calM || D.today().slice(0, 7))) ui.calM = ym;
      refresh();
    },
    'calm-nav': el => {
      const d = Number(el.dataset.d), cur = ui.calM || D.today().slice(0, 7);
      ui.calM = d === 0 ? null : D.shift('month', cur, d); ui.calSel = null; refresh();
    },
    'cal-view': el => { ui.calView = el.dataset.v; refresh(); },
    'event-new': el => {
      const id = newEvent(el.dataset.day || D.today(), 'New event');
      openModal({ type: 'event', id, fresh: true });
      requestAnimationFrame(() => { const i = mroot.querySelector('.m-title'); i?.focus(); i?.select(); });
    },
    'event-open': el => openModal({ type: 'event', id: el.dataset.id }),
    'event-del': el => { S.set(s => { s.events = s.events.filter(e => e.id !== el.dataset.id); }); closeModal(); toast('Event deleted'); },
    'event-color': el => upd('events', el.dataset.id, e => { e.color = el.dataset.v; }),
    'event-timed': el => upd('events', el.dataset.id, e => { e.allDay = false; if (!e.time) e.time = '09:00'; }),
    'event-allday': el => upd('events', el.dataset.id, e => { e.allDay = true; }),
    'event-add': el => {
      const ti = rowTitle(el.closest('[data-row]')), title = ti.value.trim(); if (!title) return;
      newEvent(el.dataset.day || ti.dataset.day, title); ti.value = ''; ti.focus();
    },

    /* goals */
    'goal-open': el => openModal({ type: 'goal', id: el.dataset.id }),
    'goal-toggle': el => upd('goals', el.dataset.id, g => { g.done = !g.done; g.manual = g.done ? 100 : 0; }),
    'goal-add': el => addGoal(el.closest('[data-row]')),
    'goal-del': el => {
      if (!arm(el, 'Click again to delete')) return;
      S.set(s => {
        const id = el.dataset.id;
        s.goals = s.goals.filter(g => g.id !== id);
        s.goals.forEach(g => { if (g.parentId === id) g.parentId = null; });
        s.tasks.forEach(t => { if (t.goalId === id) t.goalId = null; });
      });
      closeModal();
      if (App.route.params.h === 'life') location.hash = '#/goals';
    },

    /* projects */
    'project-new': el => {
      const id = uid(), covers = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
      S.set(s => s.projects.push({ id, title: 'Untitled project', desc: '', area: 'Creative', status: el.dataset.status || 'motion', cover: covers[s.projects.length % covers.length], icon: 'sprout', pinned: false, due: '', manual: 0 }));
      openModal({ type: 'project', id });
      requestAnimationFrame(() => { const i = mroot.querySelector('.m-title'); i?.focus(); i?.select(); });
    },
    'project-open': el => openModal({ type: 'project', id: el.dataset.id }),
    'project-del': el => {
      if (!arm(el, 'Click again to delete')) return;
      S.set(s => {
        const id = el.dataset.id;
        s.projects = s.projects.filter(p => p.id !== id);
        s.tasks.forEach(t => { if (t.projectId === id) t.projectId = null; });
        s.goals.forEach(g => { if (g.projectId === id) g.projectId = null; });
      });
      closeModal();
    },
    'project-pin': el => upd('projects', el.dataset.id, p => { p.pinned = !p.pinned; }),
    'project-cover': el => upd('projects', el.dataset.id, p => { p.cover = el.dataset.v; }),
    'project-icon': el => upd('projects', el.dataset.id, p => { p.icon = el.dataset.v; }),
    'view-toggle': el => { ui.view.projects = el.dataset.v; refresh(); },
    'proj-task': el => {
      ui.addTask.project = el.dataset.id; refresh();
      const i = view.querySelector('[data-scope="daily"]');
      if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => i.focus({ preventScroll: true }), 300); }
    },

    /* photo widget */
    'photo-add': () => photoFile.click(),
    'photo-go': el => { ui.photoIdx = Number(el.dataset.i); refresh(); },
    'photo-prev': () => { const n = S.s.photos.length; ui.photoIdx = (ui.photoIdx - 1 + n) % n; refresh(); },
    'photo-next': () => { const n = S.s.photos.length; ui.photoIdx = (ui.photoIdx + 1) % n; refresh(); },
    'photo-style': () => S.set(s => { s.prefs.photoStyle = s.prefs.photoStyle === 'fill' ? 'polaroid' : 'fill'; }),
    'photo-del': el => { S.set(s => { s.photos = s.photos.filter(p => p.id !== el.dataset.id); }); ui.photoIdx = Math.max(0, Math.min(ui.photoIdx, S.s.photos.length - 1)); refresh(); },

    /* security */
    'sec-start': el => { ui.sec = { step: el.dataset.v, msg: '' }; refresh(); setTimeout(() => mroot.querySelector('.sec-form input')?.focus(), 30); },
    'sec-cancel': () => { ui.sec = { step: 'idle', msg: '' }; refresh(); },
    'sec-save': async el => {
      const row = el.closest('[data-row]'), v = f => (row.querySelector(`[data-f="${f}"]`) || {}).value || '', step = ui.sec.step;
      const msg = (m, ok) => { ui.sec = Object.assign({}, ui.sec, { msg: m, ok: !!ok }); refresh(); };
      el.disabled = true;
      try {
        if (step === 'remove') { await Security.disable(v('cur')); ui.sec = { step: 'idle', msg: 'PIN removed. Your data is now stored without a PIN.', ok: true }; }
        else {
          const n = v('new');
          if (!/^\d{4,6}$/.test(n)) { el.disabled = false; return msg('Use 4–6 digits for your PIN.'); }
          if (n !== v('conf')) { el.disabled = false; return msg('The two PINs don’t match.'); }
          if (step === 'change') await Security.change(v('cur'), n); else await Security.enable(n);
          ui.sec = { step: 'idle', msg: 'PIN saved. Your data is protected.', ok: true };
        }
        refresh();
      } catch (e) { el.disabled = false; msg(e.message || 'Something went wrong.'); }
    },

    /* cloud sync */
    'sync-mode': el => { ui.sync = Object.assign({}, ui.sync, { mode: el.dataset.v, msg: '' }); refresh(); },
    'sync-auth': async el => {
      const row = el.closest('[data-row-sync]'), v = f => (row.querySelector(`[data-f="${f}"]`) || {}).value || '';
      const email = v('email'), pw = v('pw');
      if (!email || pw.length < 6) { ui.sync = Object.assign({}, ui.sync, { msg: 'Enter an email and a password of at least 6 characters.', ok: false }); return refresh(); }
      el.disabled = true;
      try {
        if (ui.sync.mode === 'signup') {
          const r = await Sync.signUp(email, pw);
          ui.sync = Object.assign({}, ui.sync, { msg: r.confirmEmail ? 'Check your email to confirm your account, then sign in.' : 'Account created and signed in.', ok: true });
        } else {
          await Sync.signIn(email, pw);
          ui.sync = Object.assign({}, ui.sync, { msg: '', ok: true });
        }
        refresh();
      } catch (e) { el.disabled = false; ui.sync = Object.assign({}, ui.sync, { msg: e.message || 'Something went wrong.', ok: false }); refresh(); }
    },
    'sync-unlock': async el => {
      const row = el.closest('[data-row-sync]'), pass = (row.querySelector('[data-f="pass"]') || {}).value || '';
      if (!pass) return;
      el.disabled = true;
      try {
        await Sync.setPassphrase(pass);
        const p = await Sync.preview();
        ui.sync = Object.assign({}, ui.sync, { pullPreview: p, msg: p ? '' : 'Nothing to restore yet.', ok: true });
        refresh();
      } catch (e) {
        Sync.forgetPassphrase(); Sync.needsPassphrase = true; el.disabled = false;
        ui.sync = Object.assign({}, ui.sync, { msg: e.message || 'Could not unlock.', ok: false }); refresh();
      }
    },
    'sync-enc-save': async el => {
      const row = el.closest('[data-row-sync]'), v = f => (row.querySelector(`[data-f="${f}"]`) || {}).value || '';
      const pass = v('pass');
      if (pass.length < 4) { ui.sync = Object.assign({}, ui.sync, { msg: 'Use a passphrase of at least 4 characters.', ok: false }); return refresh(); }
      if (pass !== v('passConf')) { ui.sync = Object.assign({}, ui.sync, { msg: 'The two passphrases don’t match.', ok: false }); return refresh(); }
      el.disabled = true;
      try {
        await Sync.setPassphrase(pass); await Sync.push();
        ui.sync = Object.assign({}, ui.sync, { encDecided: true, msg: 'Encryption enabled. This device is now synced.', ok: true }); refresh();
      } catch (e) { el.disabled = false; ui.sync = Object.assign({}, ui.sync, { msg: e.message || 'Something went wrong.', ok: false }); refresh(); }
    },
    'sync-enc-skip': async () => {
      Sync.useNoEncryption(); ui.sync = Object.assign({}, ui.sync, { encDecided: true });
      try { await Sync.push(); ui.sync = Object.assign({}, ui.sync, { msg: 'Synced without encryption.', ok: true }); } catch (e) { ui.sync = Object.assign({}, ui.sync, { msg: e.message || 'Something went wrong.', ok: false }); }
      refresh();
    },
    'sync-now': async el => {
      el.disabled = true;
      try {
        const p = await Sync.preview();
        if (!p) { await Sync.push(); ui.sync = Object.assign({}, ui.sync, { msg: 'Synced — this device’s data is now on the cloud.', ok: true }); }
        else ui.sync = Object.assign({}, ui.sync, { pullPreview: p, msg: '' });
        refresh();
      } catch (e) { el.disabled = false; ui.sync = Object.assign({}, ui.sync, { msg: e.message || 'Something went wrong.', ok: false }); refresh(); }
    },
    'sync-pull-confirm': () => {
      const data = ui.sync.pullPreview.data; ui.sync = Object.assign({}, ui.sync, { pullPreview: null });
      S.load(JSON.stringify(data)); closeModal(); paint(true); toast('Synced from the cloud');
    },
    'sync-pull-cancel': () => { ui.sync = Object.assign({}, ui.sync, { pullPreview: null }); refresh(); },
    'sync-signout': async () => { await Sync.signOut(); ui.sync = { mode: 'signin', msg: '', ok: false, pullPreview: null }; refresh(); },
    'sync-reset-request': async el => {
      const row = el.closest('[data-row-sync]'), email = (row.querySelector('[data-f="email"]') || {}).value || '';
      if (!email) { ui.sync = Object.assign({}, ui.sync, { msg: 'Enter your email.', ok: false }); return refresh(); }
      el.disabled = true;
      try { await Sync.requestReset(email); ui.sync = Object.assign({}, ui.sync, { msg: 'If that email has an account, a reset link is on its way.', ok: true }); }
      catch (e) { ui.sync = Object.assign({}, ui.sync, { msg: e.message || 'Something went wrong.', ok: false }); }
      el.disabled = false; refresh();
    },

    'cal-prev': () => { const c = ui.cal; ui.cal = c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }; refresh(); },
    'cal-next': () => { const c = ui.cal; ui.cal = c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }; refresh(); },
    'quote-next': () => { ui.quote++; refresh(); },
    scroll: el => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    'date-open': el => { const i = el.querySelector('input'); try { i.showPicker(); } catch (_) { i.focus(); i.click(); } },

    'search-go': el => searchGo(Number(el.dataset.i)),
    'reset-demo': () => { S.reset(); toast('Sample data restored'); closeModal(); },
    'wipe-all': el => { if (!arm(el, 'Click again to erase')) return; S.wipe(); toast('Started with a clean slate'); closeModal(); },
  };

  function searchGo(i) {
    const x = V.searchList()[i]; if (!x) return;
    ui.modal = null; ui.closing = false;
    if (x.kind === 'go') { location.hash = x.href; paint(false); return; }
    if (x.kind === 'project') { paint(false); return openModal({ type: 'project', id: x.id }); }
    if (x.kind === 'goal') { paint(false); return openModal({ type: 'goal', id: x.id }); }
    if (x.kind === 'event') { paint(false); return openModal({ type: 'event', id: x.id }); }
    if (x.date) { location.hash = `#/daily/${x.date}`; paint(false); return; }
    paint(false);
    if (x.project) openModal({ type: 'project', id: x.project });
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || !A[el.dataset.act] || !S.s && el.dataset.act !== 'nav-close') return;
    A[el.dataset.act](el, e);
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act][role="button"], .pcard[data-act]')) { e.preventDefault(); e.target.click(); }
  });

  /* ---------- live inputs ---------- */
  const I = {
    'task-title': el => upd('tasks', el.dataset.id, t => { t.title = el.value; }),
    'note-title': el => upd('notes', el.dataset.id, n => { n.title = el.value; }),
    'note-body': el => upd('notes', el.dataset.id, n => { n.body = el.value; }),
    'journal-title': el => jset(el.dataset.day, j => { j.title = el.value; }),
    'journal-body': el => jset(el.dataset.day, j => { j.body = el.value; }),
    'journal-q': el => { ui.journalQ = el.value; refresh(); },
    'notes-q': el => { ui.notesQ = el.value; refresh(); },
    'about-identity': el => S.set(s => { s.about.identity = el.value; }),
    'affirm-text': el => S.set(s => { const a = s.about.affirmations.find(x => x.id === el.dataset.id); if (a) a.text = el.value; }),
    'wheel-now': el => S.set(s => { s.about.wheel[el.dataset.id].now = Number(el.value); }),
    'wheel-goal': el => S.set(s => { s.about.wheel[el.dataset.id].goal = Number(el.value); }),
    'wheel-note': el => S.set(s => { s.about.wheel[el.dataset.id].note = el.value; }),
    'letter-title': el => S.set(s => { const l = s.about.letters.find(x => x.id === el.dataset.id); if (l) l.title = el.value; }),
    'letter-body': el => S.set(s => { const l = s.about.letters.find(x => x.id === el.dataset.id); if (l) l.body = el.value; }),
    'mood-note': el => S.set(s => { if (el.value) s.moodNotes[el.dataset.day] = el.value; else delete s.moodNotes[el.dataset.day]; }),
    'goal-title': el => upd('goals', el.dataset.id, g => { g.title = el.value; }),
    'goal-desc': el => upd('goals', el.dataset.id, g => { g.desc = el.value; }),
    'goal-manual': el => upd('goals', el.dataset.id, g => { g.manual = Number(el.value); g.done = g.manual >= 100; }),
    'goal-target': el => upd('goals', el.dataset.id, g => { g.target = Math.max(1, Number(el.value) || 1); }),
    'project-title': el => upd('projects', el.dataset.id, p => { p.title = el.value; }),
    'project-desc': el => upd('projects', el.dataset.id, p => { p.desc = el.value; }),
    'habit-name': el => upd('habits', el.dataset.id, h => { h.name = el.value; }),
    'habit-sub': el => upd('habits', el.dataset.id, h => { h.sub = el.value; }),
    'event-title': el => upd('events', el.dataset.id, e => { e.title = el.value; }),
    'event-notes': el => upd('events', el.dataset.id, e => { e.notes = el.value; }),
    'photo-caption': el => upd('photos', el.dataset.id, p => { p.caption = el.value; }),
    'user-name': el => S.set(s => { s.user.name = el.value; }),
    focus: el => S.set(s => { s.focus[el.dataset.fkey] = el.value; }),
    'search-q': el => { ui.search = { q: el.value, sel: 0 }; refresh(); },
  };
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && S.s && I[el.dataset.input]) I[el.dataset.input](el); });

  const C = {
    'addtask-project': el => { ui.addTask.project = el.value; },
    'addtask-goal': el => { ui.addTask.goal = el.value; },
    'date-pick': el => { if (D.valid(el.value)) location.hash = `#/daily/${el.value}`; },
    'project-status': el => upd('projects', el.dataset.id, p => { p.status = el.value; }),
    'project-area': el => upd('projects', el.dataset.id, p => { p.area = el.value; }),
    'project-due': el => upd('projects', el.dataset.id, p => { p.due = el.value; }),
    'project-link-goal': el => { if (el.value) upd('goals', el.value, g => { g.projectId = el.dataset.id; }); },
    'goal-parent': el => upd('goals', el.dataset.id, g => { g.parentId = el.value || null; }),
    'goal-project': el => upd('goals', el.dataset.id, g => { g.projectId = el.value || null; }),
    'goal-habit': el => upd('goals', el.dataset.id, g => { g.habitId = el.value || null; if (g.habitId && !g.target) g.target = 5; }),
    'habit-color-custom': el => upd('habits', el.dataset.id, h => { h.color = el.value; }),
    'event-color-custom': el => upd('events', el.dataset.id, e => { e.color = el.value; }),
    'letter-date': el => { if (D.valid(el.value)) S.set(s => { const l = s.about.letters.find(x => x.id === el.dataset.id); if (l) l.openOn = el.value; }); },
    'mascot-visits': el => S.set(s => { s.prefs.mascot = el.checked; }),
    'event-date': el => { if (D.valid(el.value)) upd('events', el.dataset.id, e => { e.date = el.value; }); },
    'event-repeat': el => upd('events', el.dataset.id, e => { e.repeat = el.value; }),
    'event-until': el => upd('events', el.dataset.id, e => { e.until = el.value; }),
    'event-allday': el => upd('events', el.dataset.id, e => { e.allDay = el.checked; if (!e.allDay && !e.time) e.time = '09:00'; }),
    'event-time': el => upd('events', el.dataset.id, e => { e.time = el.value; }),
    'event-end': el => upd('events', el.dataset.id, e => { e.endTime = el.value; }),
    autolock: el => { Security.setAutoLock(el.value); toast(Number(el.value) ? `Auto-lock after ${el.options[el.selectedIndex].text}` : 'Auto-lock is off'); },
    'filter-area': el => { ui.view.area = el.value; refresh(); },
    'goal-period': el => { if (D.valid(el.value)) upd('goals', el.dataset.id, g => { g.period = D.periodOf(g.horizon, el.value); }); },
    'ny-opt': el => { ui.ny[el.dataset.k] = el.checked; },
    'mascot-show': el => { S.set(s => { s.prefs.mascotOn = el.checked; }); applyMascot(); },
    'all-years': el => { ui.allYears = el.checked; refresh(); },
  };
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && S.s && C[el.dataset.change]) C[el.dataset.change](el); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pw-toggle]'); if (!b) return;
    const inp = b.previousElementSibling; if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.innerHTML = U.icon(show ? 'eyeOff' : 'eye');
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  /* ---------- keyboard ---------- */
  const E = { 'task-add': A['task-add'], 'goal-add': A['goal-add'], 'event-add': A['event-add'], 'trait-add': A['trait-add'], 'value-add': A['value-add'], 'affirm-add': A['affirm-add'] };
  document.addEventListener('keydown', e => {
    if (!S.s) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return ui.modal ? closeModal() : openModal({ type: 'search' }); }
    if (e.key === 'Escape') { if (ui.modal) closeModal(); else if (app.classList.contains('focus')) app.classList.remove('focus'); else app.classList.remove('nav-open'); return; }
    if (ui.modal && ui.modal.type === 'search' && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
      const n = V.searchList().length;
      e.preventDefault();
      if (e.key === 'Enter') return searchGo(Math.min(ui.search.sel, n - 1));
      ui.search.sel = (ui.search.sel + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; refresh();
      mroot.querySelector('.res.on')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const el = e.target.closest && e.target.closest('[data-enter]');
    if (el && e.key === 'Enter' && !e.shiftKey && !e.isComposing && E[el.dataset.enter]) { e.preventDefault(); E[el.dataset.enter](el, e); }
  });

  /* ---------- drag projects between columns ---------- */
  let dragId = null;
  document.addEventListener('dragstart', e => {
    const c = e.target.closest && e.target.closest('.pcard'); if (!c) return;
    dragId = c.dataset.id; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => c.classList.add('dragging'));
  });
  document.addEventListener('dragend', () => {
    dragId = null;
    document.querySelectorAll('.dragging,.over').forEach(x => x.classList.remove('dragging', 'over'));
  });
  document.addEventListener('dragover', e => {
    if (!dragId) return;
    const col = e.target.closest('.col-p'); if (!col) return;
    e.preventDefault();
    document.querySelectorAll('.col-p.over').forEach(x => { if (x !== col) x.classList.remove('over'); });
    col.classList.add('over');
  });
  document.addEventListener('drop', e => {
    const col = e.target.closest('.col-p'); if (!col || !dragId) return;
    e.preventDefault();
    const id = dragId, status = col.dataset.status;
    document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    upd('projects', id, p => { if (p.status !== status) { p.status = status; toast(`Moved to ${STATUS[status]}`); } });
  });

  /* ---------- boot ---------- */
  let savingT;
  S.onSave = () => { app.classList.add('saving'); clearTimeout(savingT); savingT = setTimeout(() => app.classList.remove('saving'), 800); Sync.schedulePush(); };
  S.onError = () => toast('Storage is full — try removing large photos or board images.');
  S.sub(refresh);
  window.addEventListener('beforeunload', () => { if (S.s) S.write(); });
  if (Sync.isSignedIn()) Sync.checkRemote().catch(() => { /* retried from Settings */ });
  window.addEventListener('hashchange', go);

  Security.onLock = () => {
    ui.modal = null; ui.closing = false; ui.sec = { step: 'idle', msg: '' };
    app.classList.remove('nav-open', 'focus');
    Board.unmount();
    view.innerHTML = ''; side.innerHTML = ''; top.innerHTML = ''; mroot.innerHTML = '';
    Mascot.visitor.hide();
    first = true;
  };
  Mascot.visitor.init();

  function start() {
    let sy = null; try { sy = sessionStorage.getItem('dayleaf.year'); } catch (_) { /* ignore */ }
    if (sy && Number.isFinite(Number(sy))) setYear(Number(sy), true); else { D.anchor = null; const now = new Date(); ui.cal = { y: now.getFullYear(), m: now.getMonth() }; }
    applyMascot();
    ui.photoIdx = 0;
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    first = true; go();
  }
  Security.run((data, newPin, name) => {
    S.load(data);
    if (name) S.set(s => { s.user.name = name; });
    if (newPin) Security.enable(newPin).catch(() => toast('Could not set the PIN')).then(start);
    else start();
  });
})();
