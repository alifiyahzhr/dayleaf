/* dayleaf — one shared data store. Every view reads from here, which is what keeps tasks,
   habits, projects and goals connected. */
(function (g) {
  const { D, uid } = U;
  const KEY = 'dayleaf.v2';

  /* ---------- demo data, always relative to today ---------- */
  function seed() {
    const t = D.today();
    const d = n => D.add(t, n);
    const yr = t.slice(0, 4), ym = t.slice(0, 7), wk = D.weekKey(t);

    const habits = [
      { id: 'h1', name: 'Morning pages', sub: 'Three quiet pages', icon: 'pen' },
      { id: 'h2', name: 'Move outside', sub: 'A walk, a run, anything', icon: 'sprout' },
      { id: 'h3', name: 'Drink more water', sub: 'Eight glasses', icon: 'droplet' },
      { id: 'h4', name: 'Read 20 minutes', sub: 'A few pages at a time', icon: 'book' },
      { id: 'h5', name: 'Stretch', sub: 'Ten slow minutes', icon: 'heart' },
    ];
    habits.forEach(h => { h.days = [0, 1, 2, 3, 4, 5, 6]; });
    habits[4].days = [0, 2, 4, 6];
    const habitLog = {};
    for (let i = 0; i >= -60; i--) {
      if (i === -13) continue;
      const log = {};
      habits.forEach((h, j) => {
        let on;
        if (i === 0) on = [true, true, false, true, false][j];
        else on = ((Math.abs(i) * 7 + j * 13 + 3) % 10) < [9, 6, 5, 6, 4][j];
        if (j === 0 && i > -13) on = true;
        if (on) log[h.id] = true;
      });
      if (Object.keys(log).length) habitLog[d(i)] = log;
    }

    const projects = [
      { id: 'p1', title: 'Field Notes', desc: 'A seasonal journal about noticing the ordinary. First edition: autumn.', area: 'Creative', status: 'motion', cover: 'c1', icon: 'book', pinned: true, due: d(25), manual: 0 },
      { id: 'p3', title: 'A home for my work', desc: 'A personal portfolio that feels more like me. Thoughtful, simple, a little playful.', area: 'Work', status: 'motion', cover: 'c3', icon: 'layout', pinned: true, due: d(55), manual: 0 },
      { id: 'p2', title: 'Learn to make with clay', desc: 'Less screen time, more hands-on time. Find a local beginner’s pottery class.', area: 'Learning', status: 'horizon', cover: 'c2', icon: 'palette', pinned: true, due: d(40), manual: 0 },
      { id: 'p5', title: 'A long weekend by the sea', desc: 'A small coastal escape. Slow mornings, long walks, no real itinerary.', area: 'Life', status: 'horizon', cover: 'c6', icon: 'sun', pinned: false, due: d(120), manual: 0 },
      { id: 'p4', title: 'A summer of reading', desc: 'Six books, many underlined pages, and a few new ways of seeing.', area: 'Personal', status: 'done', cover: 'c4', icon: 'book', pinned: false, due: d(-35), manual: 100 },
      { id: 'p6', title: 'My first 10K', desc: 'From “maybe someday” to crossing the finish line.', area: 'Wellbeing', status: 'done', cover: 'c5', icon: 'flag', pinned: false, due: d(-10), manual: 100 },
    ];

    let n = 0;
    const T = (title, date, projectId, goalId, done) => ({ id: 't' + (++n), title, date, projectId: projectId || null, goalId: goalId || null, done: !!done, createdAt: n });
    const tasks = [
      T('Write morning pages & have a slow coffee', d(0), null, null, true),
      T('Read a chapter of The Creative Act', d(0), null, 'gw3', true),
      T('Gather Field Notes inspiration', d(0), 'p1', 'gw1', false),
      T('Sketch the first three journal spreads', d(0), 'p1', 'gd1', false),
      T('Email the clay studio about beginner classes', d(0), 'p2', null, false),
      T('Choose the journal’s seasonal theme', d(-6), 'p1', 'gm1', true),
      T('Save five colour palettes', d(-2), 'p1', 'gw1', true),
      T('Plan the first spread layout', d(-1), 'p1', 'gm1', true),
      T('Photograph autumn leaves for the cover', d(2), 'p1', 'gw1', false),
      T('Shortlist two local clay studios', d(3), 'p2', null, false),
      T('Visit the botanical garden', d(4), 'p1', 'gw1', false),
      T('Outline the About page', d(1), 'p3', null, false),
      T('Draft the homepage layout', d(5), 'p3', null, false),
      T('Book train tickets to the coast', d(9), 'p5', null, false),
      T('Pick a typeface for Field Notes', null, 'p1', null, false),
      T('Buy a sketchbook for outdoor drawing', null, null, null, false),
      T('Finish chapter four', d(-1), null, 'gw3', true),
      T('Choose six books', d(-60), 'p4', null, true),
      T('Finish the last page', d(-36), 'p4', null, true),
      T('Run 5K without stopping', d(-12), 'p6', null, true),
      T('Cross the finish line', d(-10), 'p6', null, true),
    ];

    const goals = [
      { id: 'gy1', horizon: 'year', period: yr, title: 'Make space for creative work', parentId: null, projectId: null, habitId: null, target: 0, manual: 0, done: false },
      { id: 'gy2', horizon: 'year', period: yr, title: 'Feel stronger, live slower', parentId: null, projectId: null, habitId: 'h2', target: 200, manual: 0, done: false },
      { id: 'gy3', horizon: 'year', period: yr, title: 'Read 24 books', parentId: null, projectId: null, habitId: null, target: 0, manual: 75, done: false },
      { id: 'gm1', horizon: 'month', period: ym, title: 'Build the Field Notes prototype', parentId: 'gy1', projectId: 'p1', habitId: null, target: 0, manual: 0, done: false },
      { id: 'gm2', horizon: 'month', period: ym, title: 'Move outside on 20 days', parentId: 'gy2', projectId: null, habitId: 'h2', target: 20, manual: 0, done: false },
      { id: 'gm3', horizon: 'month', period: ym, title: 'Finish two books, slowly', parentId: 'gy3', projectId: null, habitId: null, target: 0, manual: 50, done: false },
      { id: 'gw1', horizon: 'week', period: wk, title: 'Collect autumn references', parentId: 'gm1', projectId: null, habitId: null, target: 0, manual: 0, done: false },
      { id: 'gw2', horizon: 'week', period: wk, title: 'Two gentle runs by the river', parentId: 'gm2', projectId: null, habitId: null, target: 0, manual: 50, done: false },
      { id: 'gw3', horizon: 'week', period: wk, title: 'Read a chapter each evening', parentId: 'gm3', projectId: null, habitId: null, target: 0, manual: 0, done: false },
      { id: 'gd1', horizon: 'day', period: t, title: 'Sketch the first spreads', parentId: 'gw1', projectId: null, habitId: null, target: 0, manual: 0, done: false },
      { id: 'gd2', horizon: 'day', period: t, title: 'Take a proper lunch break', parentId: null, projectId: null, habitId: null, target: 0, manual: 0, done: false },
    ];

    const notes = [
      { id: 'n1', date: d(0), title: 'Less input, more noticing', body: 'The light on the kitchen wall. Leaves gathering by the door. Maybe that’s where the next idea begins.', createdAt: 1 },
      { id: 'n2', date: d(0), title: 'Ideas for the cover', body: 'Soft linen texture, a hand-lettered title, one pressed leaf.', createdAt: 2 },
      { id: 'n3', date: d(-1), title: 'Making room for less', body: 'Said no to two things today. It felt lighter than expected.', createdAt: 3 },
      { id: 'n4', date: d(-2), title: 'Back to the small things', body: 'Tea, a short walk, and ten pages before bed.', createdAt: 4 },
      { id: 'n5', date: d(-3), title: 'A Sunday without plans', body: 'Slow breakfast, sketching at the window, no screens after six.', createdAt: 5 },
    ];

    const nextSun = (() => { let k = d(0); while (D.dow(k) !== 6) k = D.add(k, 1); return k; })();
    const events = [
      { id: 'e1', title: 'Lunch with Maya', date: d(0), allDay: false, time: '12:30', endTime: '13:30', repeat: 'none', until: '', color: 'sky', notes: 'That new place by the river.' },
      { id: 'e2', title: 'Pottery studio visit', date: d(1), allDay: false, time: '17:00', endTime: '18:00', repeat: 'none', until: '', color: 'sand', notes: 'Ask about beginner evenings.' },
      { id: 'e3', title: 'Field Notes cover review', date: d(3), allDay: false, time: '10:00', endTime: '11:00', repeat: 'none', until: '', color: 'blue', notes: '' },
      { id: 'e4', title: 'Dentist', date: d(6), allDay: false, time: '09:15', endTime: '', repeat: 'none', until: '', color: 'rose', notes: '' },
      { id: 'e5', title: 'Weekly review', date: nextSun, allDay: false, time: '18:00', endTime: '18:30', repeat: 'weekly', until: '', color: 'sage', notes: 'Look back, plan the week ahead.' },
      { id: 'e6', title: 'Mum’s birthday', date: d(18), allDay: true, time: '', endTime: '', repeat: 'yearly', until: '', color: 'rose', notes: '' },
      { id: 'e7', title: 'Coffee with Sam', date: d(-3), allDay: false, time: '15:00', endTime: '', repeat: 'none', until: '', color: 'sky', notes: '' },
    ];
    const journal = {
      [d(-1)]: { title: 'A quieter day', body: 'I said no to two things today and it felt lighter than I expected. Walked by the river after lunch and noticed how much the light has changed. Want to keep protecting this kind of space.', updated: 1 },
      [d(-2)]: { title: 'Back to the small things', body: 'Tea, a short walk, and ten pages before bed. Nothing big happened, and that was exactly right.', updated: 1 },
      [d(-3)]: { title: 'A Sunday without plans', body: 'Slow breakfast, sketching at the window, no screens after six. Coffee with Sam in the afternoon was the highlight.', updated: 1 },
    };
    const moods = { [d(0)]: 4, [d(-1)]: 4, [d(-2)]: 3, [d(-3)]: 5, [d(-4)]: 2, [d(-5)]: 4, [d(-6)]: 4, [d(-7)]: 3, [d(-8)]: 5, [d(-10)]: 2, [d(-11)]: 4, [d(-12)]: 3 };
    const moodNotes = { [d(0)]: 'Slow start, but hopeful.', [d(-4)]: 'Tired after a long week.' };

    const about = defaultAbout(d);

    // a gently filled board for today
    const leaf = [];
    for (let a = 0; a <= Math.PI * 2 + 0.15; a += 0.18) {
      const x = Math.cos(a) * 78, y = Math.sin(a) * 34, r = -0.55;
      leaf.push([Math.round(850 + x * Math.cos(r) - y * Math.sin(r)), Math.round(360 + x * Math.sin(r) + y * Math.cos(r))]);
    }
    const canvases = {
      [d(0)]: {
        items: [
          { id: 'b1', type: 'note', x: 50, y: 40, w: 230, h: 150, color: '#F4EBD6', text: 'Collect colours, not just pictures.' },
          { id: 'b2', type: 'palette', x: 330, y: 60, w: 310, h: 120, colors: ['#3B556C', '#6F8FAA', '#B3C8D9', '#E7DDC4', '#F9F5EA'], text: 'a palette borrowed from the path' },
          { id: 'b3', type: 'text', x: 700, y: 70, w: 360, h: 80, color: '#4F708C', text: 'leave room for the unexpected' },
          { id: 'b4', type: 'note', x: 110, y: 250, w: 250, h: 140, color: '#DCE8F1', text: 'Cover ideas:\n• soft linen texture\n• hand-lettered title' },
        ],
        strokes: [
          { id: 's1', color: '#4F708C', size: 3, pts: leaf },
          { id: 's2', color: '#4F708C', size: 3, pts: [[780, 385], [820, 370], [870, 352], [915, 335]] },
          { id: 's3', color: '#8FAAC0', size: 4, pts: [[700, 160], [760, 168], [830, 158], [900, 166], [980, 156], [1040, 162]] },
        ],
      },
    };

    return {
      v: 2, user: { name: 'Leaf' }, habits, habitLog, projects, tasks, goals, notes, canvases,
      events, journal, moods, moodNotes, photos: [], prefs: { dailyMode: 'board', photoStyle: 'fill', mascot: true }, about,
      focus: { [yr]: 'Make more. Notice more. Live a little more intentionally.' },
    };
  }

  /* bring older saved data up to date without losing anything */
  function migrate(s) {
    const legacy = { 'Quietly hopeful': 4, Calm: 4, Energised: 5, Grateful: 5, Curious: 4, Tired: 2, 'Stretched thin': 2, Low: 1 };
    s.moods = s.moods || {};
    for (const k in s.moods) if (typeof s.moods[k] === 'string') s.moods[k] = legacy[s.moods[k]] || 3;
    s.moodNotes = s.moodNotes || {};
    s.events = s.events || []; s.journal = s.journal || {}; s.photos = s.photos || [];
    s.prefs = Object.assign({ dailyMode: 'board', photoStyle: 'fill', mascot: true }, s.prefs);
    if (!s.about) s.about = defaultAbout(k => D.add(D.today(), k));
    s.banners = Object.assign({ all: '', year: '', month: '', week: '', day: '' }, s.banners);
    s.years = s.years || {};
    s.prefs = Object.assign({ mascotOn: true, lineSpace: 1.8, charSpace: 0 }, s.prefs);
    // two starter overarching goals, linked to the existing year goals (only once)
    if (!s.prefs.lifeSeeded) {
      s.prefs.lifeSeeded = true;
      if (!s.goals.some(g => g.horizon === 'life')) {
        const mk = (id, title, desc) => ({ id, horizon: 'life', period: 'all', title, desc, img: '', parentId: null, projectId: null, habitId: null, target: 0, manual: 0, done: false });
        s.goals.push(mk('gl1', 'Live a creative, balanced life', 'Make room for making things, moving my body and slowing down.'), mk('gl2', 'Grow in faith and knowledge', 'Keep learning, reading and returning to what matters most.'));
        s.goals.forEach(g => { if (!g.parentId && (g.id === 'gy1' || g.id === 'gy2')) g.parentId = 'gl1'; if (!g.parentId && g.id === 'gy3') g.parentId = 'gl2'; });
      }
    }
    for (const k in s.journal) { const j = s.journal[k]; if (j.html == null) j.html = U.plainToHtml(j.body); }
    s.habits.forEach(h => { if (!h.days) h.days = [0, 1, 2, 3, 4, 5, 6]; });
    if (s.user && s.user.name === 'Zack') s.user.name = 'Leaf';
  }

  function defaultAbout(d) {
    return {
      identity: 'I am becoming someone calm, curious and rooted in my values.',
      traits: ['Calm', 'Curious', 'Grateful', 'Disciplined', 'Kind'],
      values: ['Faith', 'Growth', 'Family', 'Creativity', 'Health'],
      affirmations: [
        { id: 'a1', text: 'I am doing my best, and my best is enough.' },
        { id: 'a2', text: 'Small steps, taken daily, become a beautiful life.' },
        { id: 'a3', text: 'I make space for rest, learning and joy.' },
      ],
      affirmDone: {},
      wheel: {
        faith: { now: 6, goal: 9, note: '' }, health: { now: 5, goal: 8, note: '' }, family: { now: 7, goal: 9, note: '' }, career: { now: 6, goal: 8, note: '' },
        money: { now: 5, goal: 7, note: '' }, learning: { now: 7, goal: 9, note: '' }, creativity: { now: 6, goal: 9, note: '' }, rest: { now: 4, goal: 8, note: '' },
      },
      letters: [
        { id: 'l1', title: 'To the me of three months from now', body: 'Dear future me,\n\nI hope you are a little calmer, a little braver, and that you kept showing up for the small things. Remember why you started.\n\nWith love, me.', openOn: d(60) },
        { id: 'l2', title: 'A note I left for myself', body: 'Be gentle with yourself. You are allowed to rest, and you are allowed to begin again.', openOn: d(-5) },
      ],
    };
  }

  /* ---------- store ---------- */
  const Store = {
    s: null, subs: [], uid,
    /* data arrives as a JSON string once the PIN (if any) has been accepted */
    load(str) {
      this.s = null;
      try { if (str) this.s = JSON.parse(str); } catch (e) { /* ignore */ }
      if (!this.s || this.s.v !== 2) this.s = seed();
      migrate(this.s);
      this.write();
    },
    write() {
      clearTimeout(this._t);
      if (!this.s) return;
      try { Security.persist(JSON.stringify(this.s)); } catch (e) { if (this.onError) this.onError(e); }
    },
    save() {
      clearTimeout(this._t);
      this._t = setTimeout(() => this.write(), Security.encrypted() ? 80 : 250);
      if (this.onSave) this.onSave();
    },
    sub(f) { this.subs.push(f); },
    emit() {
      if (this._r) return;
      this._r = requestAnimationFrame(() => { this._r = 0; this.subs.forEach(f => f()); });
    },
    set(fn) { fn(this.s); this.save(); this.emit(); },
    reset() { this.s = seed(); this.write(); this.emit(); },
    wipe() {
      const s = seed();
      Object.assign(s, { habitLog: {}, projects: [], tasks: [], goals: [], notes: [], canvases: {}, moods: {}, moodNotes: {}, focus: {}, events: [], journal: {}, photos: [], banners: { all: '', year: '', month: '', week: '', day: '' }, years: {}, prefs: Object.assign({}, s.prefs, { lifeSeeded: true }), about: { identity: '', traits: [], values: [], affirmations: [], affirmDone: {}, wheel: defaultAbout(() => '').wheel, letters: [] } });
      this.s = s; this.write(); this.emit();
    },

    /* ----- lookups ----- */
    project: id => Store.s.projects.find(p => p.id === id),
    goal: id => Store.s.goals.find(x => x.id === id),
    habit: id => Store.s.habits.find(h => h.id === id),
    task: id => Store.s.tasks.find(x => x.id === id),
    note: id => Store.s.notes.find(x => x.id === id),
    canvas(day) { return (this.s.canvases[day] ||= { items: [], strokes: [] }); },

    tasksOn: day => Store.s.tasks.filter(t => t.date === day),
    tasksIn(h, p) { const [a, b] = D.range(h, p); return this.s.tasks.filter(t => t.date && t.date >= a && t.date <= b); },
    inbox: () => Store.s.tasks.filter(t => !t.date && !t.done),
    notesOn: day => Store.s.notes.filter(n => n.date === day).sort((a, b) => a.createdAt - b.createdAt),
    recentNotes(n) { return [...this.s.notes].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, n); },
    goalsFor: (h, p) => Store.s.goals.filter(x => x.horizon === h && x.period === p),
    goalsOn(day) { return ['year', 'month', 'week', 'day'].map(h => ({ h, p: D.periodOf(h, day), list: this.goalsFor(h, D.periodOf(h, day)) })); },

    /* ----- progress ----- */
    projectStats(p) {
      const ts = this.s.tasks.filter(t => t.projectId === p.id);
      const done = ts.filter(t => t.done).length;
      const pct = ts.length ? done / ts.length : (p.status === 'done' ? 1 : (p.manual || 0) / 100);
      return { total: ts.length, done, pct, next: ts.filter(t => !t.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))[0] };
    },
    habitCount(hid, a, b) {
      let c = 0;
      for (const k in this.s.habitLog) if (k >= a && k <= b && this.s.habitLog[k][hid]) c++;
      return c;
    },
    /* habits: a habit only counts on the weekdays it is scheduled for */
    scheduled(h, day) { return !h.days || h.days.includes(D.dow(day)); },
    done(hid, day) { return !!(this.s.habitLog[day] || {})[hid]; },
    habitsFor(day) { return this.s.habits.filter(h => this.scheduled(h, day) || this.done(h.id, day)); },
    streak(hid) {
      const h = this.habit(hid); if (!h) return 0;
      let k = D.today(), c = 0;
      for (let i = 0; i < 800; i++, k = D.add(k, -1)) {
        if (this.done(hid, k)) c++;
        else if (this.scheduled(h, k) && !(i === 0)) break;
      }
      return c;
    },
    bestStreak(hid) {
      const h = this.habit(hid); if (!h) return 0;
      let k = D.today(), c = 0, best = 0;
      for (let i = 0; i < 400; i++, k = D.add(k, -1)) {
        if (this.done(hid, k)) { c++; best = Math.max(best, c); } else if (this.scheduled(h, k)) c = 0;
      }
      return best;
    },
    habitRate(hid, n = 30) {
      const h = this.habit(hid); if (!h) return 0;
      let k = D.today(), sched = 0, ok = 0;
      for (let i = 0; i < n; i++, k = D.add(k, -1)) {
        const dn = this.done(hid, k);
        if (this.scheduled(h, k) || dn) { sched++; if (dn) ok++; }
      }
      return sched ? ok / sched : 0;
    },
    habitTotal(hid) { let c = 0; for (const k in this.s.habitLog) if (this.s.habitLog[k][hid]) c++; return c; },
    dayHabitFrac(day) { const hs = this.habitsFor(day); return hs.length ? hs.filter(h => this.done(h.id, day)).length / hs.length : 0; },

    /* events (with simple repeats) */
    eventOn(e, day) {
      if (day < e.date) return false;
      if (e.repeat === 'none' || !e.repeat) return day === e.date;
      if (e.until && day > e.until) return false;
      if (e.repeat === 'daily') return true;
      if (e.repeat === 'weekly') return D.dow(day) === D.dow(e.date);
      if (e.repeat === 'monthly') return day.slice(8) === e.date.slice(8);
      if (e.repeat === 'yearly') return day.slice(5) === e.date.slice(5);
      return false;
    },
    eventsOn(day) {
      return this.s.events.filter(e => this.eventOn(e, day)).sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title));
    },
    eventsBetween(a, b) {
      const out = [];
      for (let k = a, i = 0; k <= b && i < 400; k = D.add(k, 1), i++) this.eventsOn(k).forEach(e => out.push({ day: k, ev: e }));
      return out;
    },
    event: id => Store.s.events.find(e => e.id === id),
    lettersOn(day) { return this.s.about.letters.filter(l => l.openOn === day); },

    /* ----- years ----- */
    yearsList() {
      const s = this.s, ys = new Set([Number(D.real().slice(0, 4)), Number(D.real().slice(0, 4)) + 1]);
      const add = k => { const y = Number(String(k).slice(0, 4)); if (y > 1999 && y < 2200) ys.add(y); };
      s.tasks.forEach(t => t.date && add(t.date)); s.notes.forEach(n => add(n.date)); s.events.forEach(e => add(e.date));
      Object.keys(s.journal).forEach(add); Object.keys(s.habitLog).forEach(add); Object.keys(s.years).forEach(add);
      s.goals.forEach(g => g.horizon !== 'life' && add(g.period));
      const lo = Math.min(...ys), hi = Math.max(...ys);
      return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    },
    yearStats(y) {
      const s = this.s, a = `${y}-01-01`, b = `${y}-12-31`, within = k => k >= a && k <= b;
      const tasks = s.tasks.filter(t => t.date && within(t.date)), checkins = Object.keys(s.habitLog).filter(within).reduce((n, k) => n + Object.keys(s.habitLog[k]).length, 0);
      const jdays = Object.keys(s.journal).filter(k => within(k) && (s.journal[k].body || '').trim()), words = jdays.reduce((n, k) => n + s.journal[k].body.trim().split(/\s+/).length, 0);
      const goals = this.goalsFor('year', String(y)), prog = goals.map(g => this.goalInfo(g).pct);
      const moods = Object.keys(s.moods).filter(within).map(k => s.moods[k]);
      return {
        tasks: tasks.length, done: tasks.filter(t => t.done).length, checkins, entries: jdays.length, words,
        notes: s.notes.filter(n => within(n.date)).length, events: s.events.filter(e => within(e.date)).length,
        goals: goals.length, goalsDone: prog.filter(p => p >= 1).length, goalAvg: prog.length ? prog.reduce((x, p) => x + p, 0) / prog.length : 0,
        mood: moods.length ? moods.reduce((x, m) => x + m, 0) / moods.length : 0, daysLogged: moods.length,
      };
    },
    startYear(ny, o) {
      const py = String(ny - 1), res = { goals: 0, tasks: 0 };
      this.set(s => {
        if (o.goals) s.goals.filter(g => g.horizon === 'year' && g.period === py && this.goalInfo(g).pct < 1).forEach(g => {
          if (s.goals.some(x => x.horizon === 'year' && x.period === String(ny) && x.title === g.title)) return;
          s.goals.push({ id: uid(), horizon: 'year', period: String(ny), title: g.title, parentId: g.parentId, projectId: g.projectId, habitId: g.habitId, target: g.target, manual: 0, done: false }); res.goals++;
        });
        if (o.tasks) s.tasks.forEach(t => { if (!t.done && t.date && t.date >= `${py}-12-18` && t.date <= `${py}-12-31`) { t.date = `${ny}-01-01`; res.tasks++; } });
        if (o.focus && s.focus[py] && !s.focus[String(ny)]) s.focus[String(ny)] = s.focus[py];
        s.years[ny] = { started: new Date().toISOString(), goals: res.goals, tasks: res.tasks };
      });
      return res;
    },
    descCounts(id) {
      const c = { year: 0, month: 0, week: 0, day: 0 };
      (function walk(pid, depth) { Store.s.goals.filter(g => g.parentId === pid).forEach(g => { if (c[g.horizon] != null) c[g.horizon]++; if (depth < 5) walk(g.id, depth + 1); }); })(id, 0);
      return c;
    },
    letter: id => Store.s.about.letters.find(l => l.id === id),
    hasEntry(day) { const j = this.s.journal[day]; return !!(j && (j.body || j.title)) || this.s.notes.some(n => n.date === day); },
    recentEntries(n) {
      const out = [];
      for (const k in this.s.journal) { const j = this.s.journal[k]; if (j.body || j.title) out.push({ kind: 'journal', id: 'j' + k, date: k, title: j.title || 'Journal entry', body: j.body, at: j.updated || 0 }); }
      this.s.notes.forEach(x => out.push({ kind: 'note', id: x.id, date: x.date, title: x.title || 'Untitled note', body: x.body, at: x.createdAt }));
      return out.filter(x => x.date <= D.today()).sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, n);
    },
    showUpStreak() {
      const any = k => Object.keys(this.s.habitLog[k] || {}).length > 0;
      let k = D.today(), c = 0;
      if (!any(k)) k = D.add(k, -1);
      while (any(k)) { c++; k = D.add(k, -1); }
      return c;
    },
    habitsDone(day) { const l = this.s.habitLog[day] || {}; return this.s.habits.filter(h => l[h.id]).length; },
    goalInfo(gl, depth = 0) {
      const comps = [], bits = [];
      const ts = this.s.tasks.filter(t => t.goalId === gl.id);
      if (ts.length) { const dn = ts.filter(t => t.done).length; comps.push(dn / ts.length); bits.push(`${dn}/${ts.length} tasks`); }
      const kids = this.s.goals.filter(x => x.parentId === gl.id);
      if (kids.length && depth < 4) {
        const f = kids.reduce((a, k) => a + this.goalInfo(k, depth + 1).pct, 0) / kids.length;
        comps.push(f); bits.push(`${kids.length} sub-goal${kids.length === 1 ? '' : 's'}`);
      }
      const p = gl.projectId && this.project(gl.projectId);
      if (p) { const st = this.projectStats(p); comps.push(st.pct); bits.push(`${p.title} ${Math.round(st.pct * 100)}%`); }
      const h = gl.habitId && this.habit(gl.habitId);
      if (h) {
        const [a, b] = D.range(gl.horizon, gl.period);
        const c = this.habitCount(h.id, a, b), tg = gl.target || 1;
        comps.push(Math.min(1, c / tg)); bits.push(`${h.name} ${c}/${tg}`);
      }
      const auto = comps.length > 0;
      const pct = auto ? comps.reduce((a, b) => a + b, 0) / comps.length : (gl.done ? 1 : (gl.manual || 0) / 100);
      return { pct, bits, auto };
    },

    /* ----- search ----- */
    search(q) {
      q = q.trim().toLowerCase();
      if (!q) return [];
      const has = (...f) => f.some(x => (x || '').toLowerCase().includes(q));
      const out = [];
      this.s.projects.filter(p => has(p.title, p.desc, p.area)).slice(0, 5).forEach(p => out.push({ kind: 'project', id: p.id, title: p.title, sub: `Project · ${p.area}`, icon: 'folder' }));
      this.s.goals.filter(x => has(x.title)).slice(0, 5).forEach(x => out.push({ kind: 'goal', id: x.id, title: x.title, sub: `${x.horizon[0].toUpperCase() + x.horizon.slice(1)} goal · ${D.label(x.horizon, x.period)}`, icon: 'flag' }));
      this.s.tasks.filter(x => has(x.title)).slice(0, 6).forEach(x => out.push({ kind: 'task', id: x.id, title: x.title, sub: `Task · ${x.date ? D.rel(x.date) : 'Unscheduled'}${x.done ? ' · done' : ''}`, icon: 'listcheck', date: x.date, project: x.projectId }));
      this.s.notes.filter(x => has(x.title, x.body)).slice(0, 5).forEach(x => out.push({ kind: 'note', id: x.id, title: x.title || 'Untitled note', sub: `Note · ${D.rel(x.date)}`, icon: 'file', date: x.date }));
      this.s.events.filter(x => has(x.title, x.notes)).slice(0, 5).forEach(x => out.push({ kind: 'event', id: x.id, title: x.title, sub: `Event · ${D.rel(x.date)}${x.time ? ' · ' + x.time : ''}`, icon: 'calendar', date: x.date }));
      Object.keys(this.s.journal).filter(k => has(this.s.journal[k].title, this.s.journal[k].body)).slice(0, 4).forEach(k => out.push({ kind: 'note', id: 'j' + k, title: this.s.journal[k].title || 'Journal entry', sub: `Journal · ${D.rel(k)}`, icon: 'pencil', date: k }));
      return out;
    },
  };

  g.Store = Store;
})(window);
