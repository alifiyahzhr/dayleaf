/* dayleaf — views: every page is a pure function of the store, so everything stays in sync */
(function (g) {
  const { D, esc, icon, min, tone, MOOD } = U;
  const S = Store, ui = App.ui;
  const V = {};

  const HORIZ = ['year', 'month', 'week', 'day'];
  const HNAME = { life: 'Overarching', year: 'Year', month: 'Month', week: 'Week', day: 'Day' };
  const LV = ['life', 'year', 'month', 'week', 'day'];
  const NEXT_H = { life: 'year', year: 'month', month: 'week', week: 'day' };
  const HCUR = { year: 'This year', month: 'This month', week: 'This week', day: 'Today' };
  const AREAS = ['Creative', 'Learning', 'Personal', 'Work', 'Life', 'Wellbeing'];
  const COVERS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const MORE_COVERS = ['c7', 'c8', 'c9', 'c10'];
  const PICONS = ['book', 'palette', 'layout', 'flag', 'sun', 'heart', 'sprout', 'calendar'];
  const STATUS = { motion: 'In motion', horizon: 'On the horizon', done: 'Completed' };
  const PROMPTS = [
    'What is on your mind today?', 'What made you smile recently?', 'What would make today feel well spent?',
    'What are you grateful for right now?', 'Write about something small you noticed.', 'What do you want to let go of?',
    'Describe the day so far in three sentences.',
  ];
  const QUOTES = g.QUOTES;
  const pct = f => Math.round(f * 100);
  const bar = (f, cls = '') => `<div class="bar tone-${tone(f)} ${cls}"><i style="width:${pct(f)}%"></i></div>`;
  const plural = (n, w) => `${n} ${n === 1 ? w : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's'}`;
  const card = (id, title, right, body, cls = '') => `<section class="card ${cls}" ${id ? `id="${id}"` : ''}><header class="card-head"><h2>${title}</h2>${right || ''}</header>${body}</section>`;
  const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  const empty = t => `<p class="empty-line">${t}</p>`;
  const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  /* ---------- shared building blocks ---------- */
  function taskRow(t, o = {}) {
    const p = t.projectId && S.project(t.projectId), gl = t.goalId && S.goal(t.goalId);
    return `<div class="task${t.done ? ' done' : ''}" data-key="${t.id}">
      <button class="check${t.done ? ' on' : ''}" data-act="task-toggle" data-id="${t.id}" role="checkbox" aria-checked="${!!t.done}" aria-label="Mark ${esc(t.title)} done">${icon('check')}</button>
      ${o.edit ? `<input class="task-title" value="${esc(t.title)}" data-input="task-title" data-id="${t.id}" aria-label="Task">` : `<span class="task-title">${esc(t.title)}</span>`}
      <span class="tags">
        ${p && !o.noProject ? `<button class="chip proj ${p.cover}" data-act="project-open" data-id="${p.id}">${esc(p.title)}</button>` : ''}
        ${gl && !o.noGoal ? `<button class="chip gchip" data-act="goal-open" data-id="${gl.id}">${icon('flag')}${esc(gl.title)}</button>` : ''}
        ${o.date && t.date ? `<a class="chip date" href="#/daily/${t.date}">${D.short(t.date)}</a>` : ''}
      </span>
      <button class="icon-btn sm ghost del" data-act="task-del" data-id="${t.id}" aria-label="Delete task">${icon('x')}</button>
    </div>`;
  }

  function goalRow(gl, o = {}) {
    const i = S.goalInfo(gl), parent = gl.parentId && S.goal(gl.parentId);
    const lead = i.auto
      ? `<span class="ring tone-${tone(i.pct)}" style="--p:${pct(i.pct)}" title="${pct(i.pct)}%"></span>`
      : `<button class="check round${gl.done ? ' on' : ''}" data-act="goal-toggle" data-id="${gl.id}" role="checkbox" aria-checked="${!!gl.done}" aria-label="Mark goal done">${icon('check')}</button>`;
    return `<div class="goal${gl.done ? ' done' : ''}" data-key="${gl.id}" data-act="goal-open" data-id="${gl.id}" role="button" tabindex="0">
      ${lead}
      <div class="gmain">
        <div class="gtitle">${esc(gl.title)}${o.period ? `<span class="gper">${esc(D.label(gl.horizon, gl.period))}</span>` : ''}</div>
        <div class="gsub">${esc(i.bits.join(' · ') || 'Set your own progress')}${parent && !o.noParent ? `<span class="gup">${icon('corner')}${esc(parent.title)}</span>` : ''}</div>
        ${bar(i.pct)}
      </div>
      <span class="gpct">${pct(i.pct)}%</span>
    </div>`;
  }

  function habitCard(h, day, on) {
    const st = S.streak(h.id);
    return `<button class="habit${on ? ' on' : ''}" style="${U.habStyle(h)}" data-key="${h.id}" data-act="habit-toggle" data-id="${h.id}" data-day="${day}" aria-pressed="${on}">
      <span class="h-ic">${icon(h.icon)}</span>
      <span class="h-txt"><b>${esc(h.name)}</b><small>${st ? `${icon('flame')}${st}-day streak` : esc(h.sub || 'Not started yet')}</small></span>
      <span class="h-ck">${icon('check')}</span></button>`;
  }

  const addRow = (placeholder, inputAttrs, extra = '') => `<div class="add-row" data-row>
      <span class="add-ic">${icon('plus')}</span>
      <input class="grow" data-f="title" placeholder="${esc(placeholder)}" ${inputAttrs} aria-label="${esc(placeholder)}">
      ${extra}
    </div>`;

  const goalOptions = (day, sel) => '<option value="">No goal</option>' +
    S.goalsOn(day).reverse().flatMap(x => x.list).map(x => opt(x.id, `${HNAME[x.horizon]} · ${x.title}`, sel === x.id)).join('');
  const projectOptions = sel => '<option value="">No project</option>' +
    S.s.projects.filter(p => p.status !== 'done').map(p => opt(p.id, p.title, sel === p.id)).join('');

  function pageHead(eyebrow, title, sub, actions = '') {
    return `<header class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="head-actions">${actions}</div></header>`;
  }

  const letterBanner = l => `<button class="letter-banner" data-key="lb${l.id}" data-act="letter-open" data-id="${l.id}">${icon('mail')}<span><b>A letter from past you has arrived</b><small>${esc(l.title)}</small></span>${icon('chevR')}</button>`;

  /* editable schedule row: change the time or name right here */
  const eventEditRow = e => `<div class="ev-row ev-edit" style="--ev:${U.evHex(e.color)}" data-key="${e.id}">
      <div class="ev-times">${e.allDay
    ? `<button class="ev-allday" data-act="event-timed" data-id="${e.id}" title="Set a time">${icon('clock')}All day</button>`
    : `<input type="time" value="${e.time || ''}" data-change="event-time" data-id="${e.id}" aria-label="Start time"><span>to</span><input type="time" value="${e.endTime || ''}" data-change="event-end" data-id="${e.id}" aria-label="End time">`}</div>
      <span class="ev-bar"></span>
      <input class="ev-title" value="${esc(e.title)}" data-input="event-title" data-id="${e.id}" aria-label="Event name">
      <span class="ev-tools">
        ${e.allDay ? '' : `<button class="icon-btn sm ghost" data-act="event-allday" data-id="${e.id}" aria-label="Make all day" title="Make all day">${icon('calendar')}</button>`}
        <button class="icon-btn sm ghost" data-act="event-open" data-id="${e.id}" aria-label="More options" title="Colour, repeat, notes">${icon('sliders')}</button>
        <button class="icon-btn sm ghost del-ev" data-act="event-del" data-id="${e.id}" aria-label="Delete event" title="Delete">${icon('x')}</button>
      </span>
    </div>`;

  const eventRow = (e, day, o = {}) => `<button class="ev-row" style="--ev:${U.evHex(e.color)}" data-key="${e.id}${o.key || ''}" data-act="event-open" data-id="${e.id}">
      <span class="ev-time">${e.allDay ? 'All day' : fmtTime(e.time)}${!e.allDay && e.endTime ? `<small>${fmtTime(e.endTime)}</small>` : ''}</span>
      <span class="ev-bar"></span>
      <span class="ev-main"><b>${esc(e.title)}</b>${e.repeat && e.repeat !== 'none' ? `<small>${icon('repeat')}Repeats ${e.repeat}</small>` : (e.notes ? `<small>${esc(e.notes)}</small>` : '')}</span>
    </button>`;

  const faceBtn = (v, day, lv, label = true) => `<button class="face${lv === v ? ' on' : ''}" style="--fc:${MOOD[v].c}" data-key="m${v}" data-act="mood-set" data-day="${day}" data-v="${v}" aria-pressed="${lv === v}" aria-label="${MOOD[v].name}" title="${MOOD[v].name}">${icon('face' + v)}${label ? `<small>${MOOD[v].name}</small>` : ''}</button>`;

  /* ---------- photo widget ---------- */
  function photoWidget() {
    const ph = S.s.photos, style = S.s.prefs.photoStyle || 'fill';
    const i = Math.max(0, Math.min(ui.photoIdx, ph.length - 1)), cur = ph[i];
    if (!cur) return `<section class="card photo-card empty" data-photo-drop>
      <div class="ph-empty"><span class="ph-ic">${icon('camera')}</span><b>Add a photo</b><small>A place, a person or a moment worth looking at. Drop an image here or choose one.</small><button class="btn primary" data-act="photo-add">${icon('plus')}Choose photo</button></div></section>`;
    return `<section class="card photo-card ${style}" data-photo-drop>
      <div class="ph-frame"><img data-key="img-${cur.id}" src="${cur.src}" alt="${esc(cur.caption || 'Your photo')}">
        <div class="ph-over"><input class="ph-cap" value="${esc(cur.caption)}" placeholder="Add a caption" data-input="photo-caption" data-id="${cur.id}" aria-label="Photo caption"></div></div>
      <div class="ph-bar">
        <div class="ph-dots">${ph.length > 1 ? ph.map((p, j) => `<button class="${j === i ? 'on' : ''}" data-key="pd${p.id}" data-act="photo-go" data-i="${j}" aria-label="Photo ${j + 1}"></button>`).join('') : ''}</div>
        <div class="ph-tools">
          ${ph.length > 1 ? `<button class="icon-btn sm" data-act="photo-prev" aria-label="Previous photo">${icon('chevL')}</button><button class="icon-btn sm" data-act="photo-next" aria-label="Next photo">${icon('chevR')}</button>` : ''}
          <button class="icon-btn sm" data-act="photo-style" aria-label="Change frame style" title="Frame: ${style === 'fill' ? 'full' : 'polaroid'}">${icon('layout')}</button>
          <button class="icon-btn sm" data-act="photo-add" aria-label="Add photo" title="Add photo">${icon('plus')}</button>
          <button class="icon-btn sm" data-act="photo-del" data-id="${cur.id}" aria-label="Remove photo" title="Remove photo">${icon('trash')}</button>
        </div>
      </div></section>`;
  }

  /* ---------- dashboard ---------- */
  V.dashboard = () => {
    const t = D.today(), s = S.s, hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const tasks = S.tasksOn(t), left = tasks.filter(x => !x.done).length, doneN = tasks.length - left;
    const hs = S.habitsFor(t), hd = hs.filter(h => S.done(h.id, t)).length, hn = hs.length, noteN = S.notesOn(t).length;
    const todayEv = S.eventsOn(t).length;
    const sub = !tasks.length ? 'Nothing planned yet — open today to set an intention.'
      : left === 0 ? 'Everything on today’s list is done. Nicely done.'
        : `You have ${plural(left, 'task')} and ${plural(hn - hd, 'habit')} still open today.`;
    const qi = (Math.floor(D.parse(t) / 864e5) + ui.quote) % QUOTES.length;
    const q = QUOTES[qi];
    const lettersToday = S.lettersOn(t);

    // a different welcome on the first day of a new week, month or year
    const dt = D.parse(t), yrNow = t.slice(0, 4), wkNow = D.weekKey(t), ymNow = t.slice(0, 7), nm = esc(s.user.name);
    const newYear = t.slice(5) === '01-01', newMonth = t.slice(8) === '01', newWeek = D.dow(t) === 0;
    let fresh = null;
    if (newYear) fresh = { tag: 'New year', h1: `Happy New Year, ${nm}!`, sub: `${yrNow} begins today — a clean page. Set your focus and your first goals.`, cta: ['Plan the year', `#/goals/year/${yrNow}`], n: S.goalsFor('year', yrNow).length };
    else if (newMonth) fresh = { tag: newWeek ? 'New month & week' : 'New month', h1: `Welcome to ${D.MONTHS[dt.getMonth()]}, ${nm}!`, sub: `${newWeek ? 'A new month and a new week begin together. ' : 'A new month begins. '}`, cta: ['Plan the month', `#/goals/month/${ymNow}`], n: S.goalsFor('month', ymNow).length, what: D.MONTHS[dt.getMonth()] };
    else if (newWeek) fresh = { tag: 'New week', h1: `Happy new week, ${nm}!`, sub: `Week ${D.weekNum(wkNow)} starts today. `, cta: ['Plan the week', `#/goals/week/${wkNow}`], n: S.goalsFor('week', wkNow).length, what: `Week ${D.weekNum(wkNow)}` };
    if (fresh && !newYear) fresh.sub += fresh.n ? `You have ${plural(fresh.n, 'goal')} set for ${fresh.what}.` : `Set a few goals for ${fresh.what} to give it direction.`;
    if (fresh && newYear && fresh.n) fresh.sub += ` You already have ${plural(fresh.n, 'goal')}.`;

    const days = D.weekDays(D.weekKey(t));
    const bars = days.map((k, i) => { const f = S.dayHabitFrac(k); return `<div class="wb${k === t ? ' today' : ''}${k > t ? ' future' : ''}" data-key="${k}"><i class="tone-${tone(f)}" style="height:${Math.max(7, pct(f))}%"></i><span>${'MTWTFSS'[i]}</span></div>`; }).join('');
    const upto = days.filter(k => k <= t);
    const weekDone = upto.reduce((a, k) => a + S.habitsDone(k), 0), weekAll = upto.reduce((a, k) => a + Math.max(S.habitsFor(k).length, S.habitsDone(k)), 0);
    const streak = S.showUpStreak();
    const moodStrip = days.map(k => { const v = s.moods[k]; return `<span class="ms${v ? ' set' : ''}" data-key="${k}" style="--fc:${v ? MOOD[v].c : 'transparent'}" title="${v ? MOOD[v].name : 'No mood logged'}"></span>`; }).join('');

    const weekGoals = S.goalsFor('week', D.weekKey(t)), monthGoals = S.goalsFor('month', t.slice(0, 7));
    const motion = s.projects.filter(p => p.status === 'motion');
    const upcoming = S.eventsBetween(t, D.add(t, 14)).slice(0, 6);

    return `
    <header class="page-head dash-head${fresh ? ' fresh' : ''}"><div>${fresh ? `<span class="fresh-tag">${icon('sparkles')}${fresh.tag}</span>` : ''}<div class="eyebrow">${D.longY(t)}</div><h1>${fresh ? fresh.h1 : `${greet}, ${esc(s.user.name)}.`}</h1><p class="sub">${fresh ? fresh.sub : sub}</p>${fresh ? `<a class="btn primary fresh-cta" href="${fresh.cta[1]}">${icon('flag')}${fresh.cta[0]}</a>` : ''}</div>${fresh ? '<span class="sparkle-field" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' : ''}${Mascot.html('hero', 'dashboard')}</header>
    ${lettersToday.map(l => letterBanner(l)).join('')}

    <div class="hero-grid">
      <a class="today-cta" href="#/daily/${t}" aria-label="Open today’s daily entry">
        <span class="tc-deco" aria-hidden="true"></span>
        <span class="tc-badge">${icon('sun')} Daily entry</span>
        <span class="tc-main"><b>Today</b><em>${D.longY(t)}</em></span>
        <span class="tc-stats"><span><strong>${doneN}/${tasks.length}</strong> tasks</span><span><strong>${hd}/${hn}</strong> habits</span><span><strong>${todayEv}</strong> ${todayEv === 1 ? 'event' : 'events'}</span><span><strong>${noteN}</strong> ${noteN === 1 ? 'note' : 'notes'}</span></span>
        <span class="tc-go"><span>Open today</span><i>${icon('arrowR')}</i></span>
      </a>
      <figure class="quote-card">
        <svg class="qc-art" viewBox="0 0 520 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs><linearGradient id="qsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9DDEC"/><stop offset=".7" stop-color="#F3EBD8"/><stop offset="1" stop-color="#F9F5EA"/></linearGradient></defs>
          <rect width="520" height="260" fill="url(#qsky)"/>
          <circle cx="400" cy="92" r="58" fill="#FBF4E2" opacity=".45"/><circle cx="400" cy="92" r="34" fill="#FBF4E2"/>
          <path d="M0 170 C70 140 130 148 200 160 S320 172 390 146 S480 128 520 146 V260 H0Z" fill="#C2D6E6"/>
          <path d="M0 200 C80 172 150 184 230 194 S370 204 440 180 S500 172 520 178 V260 H0Z" fill="#9DB7CC"/>
          <path d="M0 232 C100 210 190 220 280 228 S430 234 520 214 V260 H0Z" fill="#6F8FAA"/>
          <path d="M120 70c8-4 14-3 20 3m10-8c8-4 14-3 20 3" fill="none" stroke="#6F8FAA" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        </svg>
        <div class="qc-body" data-key="q${qi}">
          <span class="qc-label">${icon('quote')} Quote of the day <em>${esc(q.k)}</em></span>
          <blockquote>${esc(q.t)}</blockquote>
          <figcaption>${esc(q.a)}</figcaption>
        </div>
        <button class="icon-btn qc-next" data-act="quote-next" aria-label="Show another quote" title="Another quote">${icon('refresh')}</button>
      </figure>
    </div>

    <div class="grid-2 wide-left">
      ${card('', 'Today’s tasks', `<span class="muted">${doneN} of ${tasks.length} complete</span>`,
      `${tasks.length ? bar(doneN / tasks.length, 'slim') : ''}<div class="task-list">${tasks.map(x => taskRow(x, { edit: false })).join('') || empty('No tasks yet. Add one below.')}</div>
       ${addRow('Add a task for today', `data-enter="task-add" data-day="${t}"`, `<button class="btn sm primary" data-act="task-add">Add</button>`)}
       <a class="foot-link" href="#/daily/${t}">Continue in your daily entry ${icon('arrowR')}</a>`)}

      ${card('', 'Habits', `<span class="muted">${weekDone} / ${weekAll} this week</span>`,
        `<div class="rhythm"><div class="rh-num"><b>${streak}</b><span>${streak === 1 ? 'day' : 'days'} of showing up for yourself</span></div>
        <div class="week-bars" role="img" aria-label="Habits completed each day this week">${bars}</div></div>
        <div class="habit-chips">${hs.map(h => { const on = S.done(h.id, t); return `<button class="hchip${on ? ' on' : ''}" style="${U.habStyle(h)}" data-key="${h.id}" data-act="habit-toggle" data-id="${h.id}" data-day="${t}" aria-pressed="${on}">${icon(on ? 'check' : h.icon)}${esc(h.name)}</button>`; }).join('') || empty('No habits scheduled today.')}</div>
        <div class="mood-row"><span>Mood this week</span><div class="mood-strip">${moodStrip}</div></div>
        <a class="foot-link" href="#/habits">Open habit tracker ${icon('arrowR')}</a>`)}
    </div>

    <div class="grid-2">
      ${photoWidget()}
      ${card('', 'Goals', `<a class="link" href="#/goals">All goals ${icon('arrowUR')}</a>`,
          `<div class="gh-label">This week</div>${weekGoals.map(x => goalRow(x)).join('') || empty('No goals for this week.')}
         <div class="gh-label">This month</div>${monthGoals.map(x => goalRow(x)).join('') || empty('No goals for this month.')}`)}
    </div>

    <div class="grid-2">
      ${card('', 'Recent entries', `<a class="link" href="#/calendar">Calendar ${icon('arrowUR')}</a>`,
            `<div class="note-list">${S.recentEntries(5).map(n => `<a class="note-row" data-key="${n.id}" href="#/daily/${n.date}">
          <span class="nd"><b>${Number(n.date.slice(8))}</b><small>${D.MON[Number(n.date.slice(5, 7)) - 1]}</small></span>
          <span class="nt"><strong>${esc(n.title)}</strong><small>${esc(n.body.slice(0, 70))}${n.body.length > 70 ? '…' : ''}</small></span><span class="kind">${n.kind === 'journal' ? 'Journal' : 'Note'}</span></a>`).join('') || empty('What you write in your daily entry shows up here.')}</div>`)}
      ${card('', 'Coming up', `<a class="link" href="#/calendar">Calendar ${icon('arrowUR')}</a>`,
              `<div class="up-list">${upcoming.map(({ day, ev }) => `<button class="up-row" style="--ev:${U.evHex(ev.color)}" data-key="${ev.id}${day}" data-act="event-open" data-id="${ev.id}"><span class="up-d"><small>${D.DOW[D.parse(day).getDay()]}</small><b>${Number(day.slice(8))}</b></span><span class="ev-bar"></span><span class="up-t"><strong>${esc(ev.title)}</strong><small>${D.rel(day)} · ${ev.allDay ? 'All day' : fmtTime(ev.time)}</small></span></button>`).join('') || empty('Nothing scheduled in the next two weeks.')}</div>
           ${addRow('Schedule an event', `data-enter="event-add" data-day="${t}"`)}`)}
    </div>

    ${card('', 'Projects in motion', `<a class="link" href="#/projects">All projects ${icon('arrowUR')}</a>`,
                `<div class="mini-projects stagger">${motion.map(miniProject).join('') || empty('No active projects. Start one from the Projects page.')}</div>`, 'plain')}
    `;
  };

  function miniProject(p) {
    const st = S.projectStats(p);
    return `<button class="mini-proj" data-key="${p.id}" data-act="project-open" data-id="${p.id}">
      <span class="mp-cover ${p.cover}">${icon(p.icon)}</span>
      <span class="mp-body"><b>${esc(p.title)}</b><small>${esc(p.area)} · ${st.done}/${st.total} tasks</small>${bar(st.pct)}</span>
      <span class="mp-pct">${pct(st.pct)}%</span></button>`;
  }

  /* ---------- daily entry ---------- */
  function dateCard(day) {
    const d = D.parse(day), t = D.today(), diff = Math.round((d - D.parse(t)) / 864e5);
    const rel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
    return `<section class="date-card">
      <div class="dc-tile" aria-hidden="true"><small>${D.MON[d.getMonth()]}</small><b>${d.getDate()}</b></div>
      <div class="dc-text"><span class="dc-rel${diff === 0 ? ' now' : ''}">${rel}</span><h2>${D.DAYN[d.getDay()]}</h2><p>${D.MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · Week ${D.weekNum(D.weekKey(day))}</p></div>
      <div class="dc-nav">
        <a class="icon-btn" href="#/daily/${D.add(day, -1)}" aria-label="Previous day">${icon('chevL')}</a>
        <div class="seg">
          <a class="${day === D.add(t, -1) ? 'on' : ''}" href="#/daily/${D.add(t, -1)}">Yesterday</a>
          <a class="${day === t ? 'on' : ''}" href="#/daily/${t}">Today</a>
          <a class="${day === D.add(t, 1) ? 'on' : ''}" href="#/daily/${D.add(t, 1)}">Tomorrow</a>
        </div>
        <a class="icon-btn" href="#/daily/${D.add(day, 1)}" aria-label="Next day">${icon('chevR')}</a>
        <button class="icon-btn pick" data-act="date-open" aria-label="Pick a date">${icon('calendar')}<input type="date" value="${day}" data-change="date-pick" tabindex="-1"></button>
      </div></section>`;
  }

  function feelCard(day) {
    const lv = S.s.moods[day] || 0, note = S.s.moodNotes[day] || '', m = MOOD[lv];
    return `<section class="feel-card" id="sec-feel" style="--fc:${m ? m.c : 'var(--blue-400)'}">
      <header><h3>How are you feeling?</h3>${m ? `<span class="feel-now"><i></i>${m.name} <small>· ${m.sub}</small></span>` : '<span class="feel-hint">Tap a face</span>'}</header>
      <div class="faces" role="group" aria-label="Mood">${[1, 2, 3, 4, 5].map(v => faceBtn(v, day, lv)).join('')}</div>
      <input class="feel-note" value="${esc(note)}" placeholder="Anything behind it? (optional)" data-input="mood-note" data-day="${day}" aria-label="Mood note">
    </section>`;
  }

  function writing(day) {
    const j = S.s.journal[day] || { title: '', body: '' }, words = j.body.trim() ? j.body.trim().split(/\s+/).length : 0;
    const lv = S.s.moods[day] || 0, prompt = PROMPTS[Math.floor(D.parse(day) / 864e5) % PROMPTS.length];
    return `<section class="write">
      <div class="write-bar">
        <div class="wb-feel"><span>Feeling</span>${[1, 2, 3, 4, 5].map(v => faceBtn(v, day, lv, false)).join('')}${lv ? `<em style="color:${MOOD[lv].c}">${MOOD[lv].name}</em>` : ''}</div>
        <div class="wb-right"><span class="muted">${plural(words, 'word')}</span><button class="btn sm ghost" data-act="focus-toggle">${icon('maximize')}Focus</button></div>
      </div>
      ${Editor.toolbar()}
      <article class="paper">
        <input class="w-title" data-input="journal-title" data-day="${day}" value="${esc(j.title)}" placeholder="Give this day a title" aria-label="Entry title">
        <div class="rt-editor w-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Write your entry" data-skip data-day="${day}" data-ph="${esc(prompt)}" spellcheck="true">${U.sanitize(j.html || U.plainToHtml(j.body))}</div>
      </article>
      <p class="write-foot">${icon('check')}Saved automatically · ${D.longY(day)}</p>
    </section>`;
  }

  V.daily = r => {
    const day = r.params.day, t = D.today(), s = S.s, mode = s.prefs.dailyMode;
    const modeSeg = `<div class="seg mode" role="group" aria-label="Entry view"><button class="${mode === 'write' ? 'on' : ''}" data-act="daily-mode" data-v="write">${icon('pencil')}Write</button><button class="${mode === 'board' ? 'on' : ''}" data-act="daily-mode" data-v="board">${icon('layout')}Board</button></div>`;
    const head = pageHead('Journal & planner', 'Daily Entry', '', modeSeg);
    if (mode === 'write') return `${head}${S.lettersOn(day).map(letterBanner).join('')}${dateCard(day)}${writing(day)}`;

    const tasks = S.tasksOn(day), dn = tasks.filter(x => x.done).length;
    const hs = S.habitsFor(day), hd = hs.filter(h => S.done(h.id, day)).length;
    const notes = S.notesOn(day), evs = S.eventsOn(day);
    const goalsToday = S.goalsOn(day);
    const goalCount = goalsToday.reduce((a, x) => a + x.list.length, 0);
    const cv = s.canvases[day], bc = cv ? cv.items.length + cv.strokes.length : 0;
    const prev = D.add(day, -1), carry = day >= t ? S.tasksOn(prev).filter(x => !x.done) : [];
    const inbox = S.inbox();
    const projTasks = new Set(tasks.map(x => x.projectId).filter(Boolean));
    const projs = s.projects.filter(p => p.status === 'motion' || projTasks.has(p.id));
    const j = s.journal[day];

    const labelFor = (h, p) => h === 'day' ? D.rel(p) : h === 'week' ? `Week ${D.weekNum(p)} · ${D.label('week', p)}` : D.label(h, p);
    const goalsHtml = goalsToday.slice().reverse().map(({ h, p, list }) => `<div class="gh"><div class="gh-label">${labelFor(h, p)}</div>
      ${list.map(x => goalRow(x)).join('') || empty(`No ${h} goals yet`)}
      ${h === 'day' || h === 'week' ? addRow(`Add a ${h} goal`, `data-enter="goal-add" data-h="${h}" data-p="${p}"`) : ''}</div>`).join('');

    const chip = (to, ic, label, val) => `<button class="dchip" data-act="scroll" data-to="${to}">${icon(ic)}<span>${label}</span><b>${val}</b></button>`;

    return `
    ${head}
    ${S.lettersOn(day).map(letterBanner).join('')}
    <div class="day-top">${dateCard(day)}${feelCard(day)}</div>

    <nav class="day-chips" aria-label="Everything for this day">
      ${chip('sec-habits', 'activity', 'Habits', `${hd}/${hs.length}`)}
      ${chip('sec-events', 'calendar', 'Events', evs.length)}
      ${chip('sec-tasks', 'listcheck', 'Tasks', `${dn}/${tasks.length}`)}
      ${chip('sec-goals', 'flag', 'Goals', goalCount)}
      ${chip('sec-notes', 'file', 'Notes', notes.length + (j && j.body ? 1 : 0))}
      ${chip('sec-projects', 'folder', 'Projects', projs.length)}
      ${chip('board', 'palette', 'Board', bc)}
    </nav>

    ${card('sec-events', 'Schedule', `<a class="link" href="#/calendar">Calendar ${icon('arrowUR')}</a>`,
      `${Mascot.html('perch', 'daily')}<div class="ev-list">${evs.map(e => eventEditRow(e)).join('') || empty('No events. Anything you schedule in the calendar for this day appears here automatically.')}</div>
       ${addRow('Add an event', `data-enter="event-add" data-day="${day}"`)}<p class="hint-line">${icon('clock')}Change a time by editing it directly. Use the sliders icon for colour, repeats and notes.</p>`, 'schedule-card')}

    ${card('sec-habits', 'Habits', `<a class="link" href="#/habits">Habit tracker ${icon('arrowUR')}</a>`,
      `<div class="habit-grid stagger">${hs.map(h => habitCard(h, day, S.done(h.id, day))).join('') || empty('No habits are scheduled for this day.')}</div>`)}

    <div class="grid-2">
      <div class="col">
        ${carry.length ? `<div class="banner" data-key="carry">${icon('corner')}<span>${plural(carry.length, 'unfinished task')} from yesterday</span><button class="btn sm" data-act="carry-over" data-day="${day}">Move to ${day === t ? 'today' : 'this day'}</button></div>` : ''}
        ${card('sec-tasks', 'To-do', `<span class="muted">${dn} of ${tasks.length} complete</span>`,
        `${tasks.length ? bar(dn / tasks.length, 'slim') : ''}
          <div class="task-list">${tasks.map(x => taskRow(x, { edit: true })).join('') || empty('Nothing planned for this day yet.')}</div>
          <div class="add-task" data-row>
            <div class="add-row">
              <span class="add-ic">${icon('plus')}</span>
              <input class="grow" data-f="title" placeholder="Add a task for this day" data-enter="task-add" data-scope="daily" data-day="${day}" aria-label="New task">
              <button class="btn sm primary" data-act="task-add">Add</button>
            </div>
            <div class="add-opts">
              <label>${icon('folder')}<select data-change="addtask-project" aria-label="Project">${projectOptions(ui.addTask.project)}</select></label>
              <label>${icon('flag')}<select data-change="addtask-goal" aria-label="Goal">${goalOptions(day, ui.addTask.goal)}</select></label>
            </div>
          </div>
          ${inbox.length ? `<details class="inbox"><summary>${icon('inbox')} Unscheduled <b>${inbox.length}</b>${icon('chevD', 'chev')}</summary>
            ${inbox.map(x => `<div class="inbox-row" data-key="${x.id}"><span>${esc(x.title)}</span><button class="btn sm ghost" data-act="task-schedule" data-id="${x.id}" data-day="${day}">Add to this day</button></div>`).join('')}</details>` : ''}`)}
      </div>
      <div class="col">
        ${card('sec-journal', 'Journal', `<button class="btn sm" data-act="daily-mode" data-v="write">${icon('pencil')}${j && j.body ? 'Keep writing' : 'Start writing'}</button>`,
          j && (j.body || j.title) ? `<div class="journal-peek"><b>${esc(j.title || 'Untitled entry')}</b><p>${esc(j.body.slice(0, 220))}${j.body.length > 220 ? '…' : ''}</p></div>` : empty('Nothing written yet. Switch to Write for a distraction-free page.'))}
        ${card('sec-notes', 'Notes', `<button class="btn sm" data-act="note-add" data-day="${day}">${icon('plus')}New note</button>`,
            `<div class="notes">${notes.map(n => { const np = n.projectId && S.project(n.projectId); return `<article class="note" data-key="${n.id}">
            <div class="note-top"><span>${n.createdAt > 1e12 ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Note'}</span>${np ? `<button class="chip proj ${np.cover}" data-act="project-open" data-id="${np.id}">${esc(np.title)}</button>` : ''}<button class="icon-btn sm ghost" data-act="note-del" data-id="${n.id}" aria-label="Delete note">${icon('trash')}</button></div>
            <input class="note-title" value="${esc(n.title)}" placeholder="Title" data-input="note-title" data-id="${n.id}" aria-label="Note title">
            <textarea class="note-body" rows="3" placeholder="Write something…" data-input="note-body" data-id="${n.id}" aria-label="Note">\n${esc(n.body)}</textarea></article>`; }).join('') || empty('Quick thoughts and ideas. Add your first note.')}</div>`)}
      </div>
    </div>

    <div class="grid-2">
      ${card('sec-goals', 'Goals & focus', `<a class="link" href="#/goals/day/${day}">Future goals ${icon('arrowUR')}</a>`, goalsHtml)}
      ${card('sec-projects', 'Projects', `<a class="link" href="#/projects">All projects ${icon('arrowUR')}</a>`,
                `<div class="proj-rows">${projs.map(p => {
        const st = S.projectStats(p), todayN = tasks.filter(x => x.projectId === p.id).length;
        return `<div class="proj-row" data-key="${p.id}"><button class="pr-main" data-act="project-open" data-id="${p.id}"><span class="mp-cover ${p.cover}">${icon(p.icon)}</span><span class="mp-body"><b>${esc(p.title)}</b><small>${todayN ? `${plural(todayN, 'task')} on this day · ` : ''}${st.done}/${st.total} done</small>${bar(st.pct)}</span></button><button class="btn sm ghost" data-act="proj-task" data-id="${p.id}">${icon('plus')}Task</button></div>`;
      }).join('') || empty('No active projects.')}</div>`)}
    </div>

    ${Board.html(day)}`;
  };

  /* ---------- projects ---------- */
  function projectCard(p) {
    const st = S.projectStats(p);
    return `<article class="pcard" draggable="true" data-key="${p.id}" data-id="${p.id}" data-act="project-open" tabindex="0">
      <div class="pcover ${p.cover}"><span class="pc-icon">${icon(p.icon)}</span><span class="tag">${esc(p.area)}</span>${p.pinned ? `<span class="pin-badge">${icon('pin')}</span>` : ''}</div>
      <div class="pbody"><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p>
        <div class="pprog">${bar(st.pct)}<span>${pct(st.pct)}%</span></div>
        <div class="pmeta"><span>${icon('listcheck')}${st.done}/${st.total} tasks</span>${p.due ? `<span>${icon('calendar')}${p.status === 'done' ? 'Done' : 'Due'} ${D.short(p.due)}</span>` : ''}</div></div>
      <div class="pnext">${icon('arrowUR')}<span>${st.next ? `Next: ${esc(st.next.title)}` : (p.status === 'done' ? 'Gathered & done' : 'No open tasks')}</span></div>
    </article>`;
  }

  V.projects = () => {
    const v = ui.view, all = S.s.projects;
    const list = all.filter(p => v.area === 'all' || p.area === v.area);
    const by = k => list.filter(p => p.status === k);
    const col = k => `<div class="col-p" data-status="${k}"><div class="col-head"><span class="dot ${k}"></span><b>${STATUS[k]}</b><small>${by(k).length}</small><button class="icon-btn sm ghost" data-act="project-new" data-status="${k}" aria-label="New project in ${STATUS[k]}">${icon('plus')}</button></div>
      <div class="col-body stagger">${by(k).map(projectCard).join('') || '<div class="drop-hint">Drop a project here</div>'}</div></div>`;
    const rows = list.map(p => { const st = S.projectStats(p); return `<button class="lrow" data-key="${p.id}" data-act="project-open" data-id="${p.id}">
      <span class="mp-cover ${p.cover}">${icon(p.icon)}</span><span class="l-title"><b>${esc(p.title)}</b><small>${esc(p.desc)}</small></span>
      <span class="tag">${esc(p.area)}</span><span class="l-status"><i class="dot ${p.status}"></i>${STATUS[p.status]}</span>
      <span class="l-prog">${bar(st.pct)}<small>${pct(st.pct)}%</small></span><span class="l-due">${p.due ? D.short(p.due) : '—'}</span></button>`; }).join('');
    return `
    ${pageHead(`${all.filter(p => p.status === 'motion').length} in motion · ${all.filter(p => p.status === 'done').length} completed`, 'Personal Projects', 'Every project, its tasks and its progress — linked to your daily entries and goals.',
      `${Mascot.html('mini', 'projects')}<button class="btn primary" data-act="project-new" data-status="motion">${icon('plus')}New project</button>`)}
    <div class="toolbar">
      <div class="seg"><button class="${v.projects === 'board' ? 'on' : ''}" data-act="view-toggle" data-v="board">${icon('columns')}Board</button><button class="${v.projects === 'list' ? 'on' : ''}" data-act="view-toggle" data-v="list">${icon('list')}List</button></div>
      <span class="muted">${plural(list.length, 'project')}</span><span class="spacer"></span>
      <label class="select">${icon('folder')}<select data-change="filter-area" aria-label="Filter by area">${opt('all', 'All areas', v.area === 'all')}${AREAS.map(a => opt(a, a, v.area === a)).join('')}</select></label>
    </div>
    ${v.projects === 'board' ? `<div class="kanban">${['motion', 'horizon', 'done'].map(col).join('')}</div>` : `<div class="card list-card">${rows || empty('No projects here yet.')}</div>`}`;
  };

  /* ---------- future goals ---------- */
  function periodCard(h, p) {
    const goals = S.goalsFor(h, p), tasks = S.tasksIn(h, p), dn = tasks.filter(x => x.done).length;
    const pend = tasks.filter(x => !x.done).sort((a, b) => a.date.localeCompare(b.date));
    return `<section class="card" data-key="${h}">
      <header class="card-head"><div><h2>${HCUR[h]}</h2><p class="muted">${D.label(h, p)}</p></div><a class="link" href="#/goals/${h}/${p}">Open ${icon('arrowUR')}</a></header>
      <div class="goal-list">${goals.map(x => goalRow(x)).join('') || empty(`No goals set for this ${h}.`)}</div>
      ${addRow(`Add a ${h} goal`, `data-enter="goal-add" data-h="${h}" data-p="${p}"`)}
      <div class="sub-head">${icon('listcheck')}Scheduled tasks<small>${dn} of ${tasks.length} done</small></div>
      <div class="task-list">${pend.slice(0, 4).map(x => taskRow(x, { date: h !== 'day' })).join('') || empty(tasks.length ? 'Everything here is done.' : 'No tasks scheduled in this period.')}</div>
      ${pend.length > 4 ? `<a class="more" href="#/goals/${h}/${p}">+${pend.length - 4} more tasks</a>` : ''}
    </section>`;
  }

  function habitsFor(h, p) {
    const hs = S.s.habits, t = D.today();
    if (h === 'day') {
      const list = S.habitsFor(p);
      return `<div class="habit-chips">${list.map(x => { const on = S.done(x.id, p); return `<button class="hchip${on ? ' on' : ''}" style="${U.habStyle(x)}" data-key="${x.id}" data-act="habit-toggle" data-id="${x.id}" data-day="${p}" aria-pressed="${on}">${icon(on ? 'check' : x.icon)}${esc(x.name)}</button>`; }).join('') || empty('No habits scheduled this day.')}</div>`;
    }
    if (h === 'week') {
      const ds = D.weekDays(p);
      return `<div class="hweek"><div class="hw-head"><span></span>${ds.map((k, i) => `<span class="${k === t ? 'today' : ''}">${'MTWTFSS'[i]}</span>`).join('')}</div>
        ${hs.map(x => `<div class="hw-row" data-key="${x.id}"><span>${esc(x.name)}</span>${ds.map(k => { const on = S.done(x.id, k), off = !S.scheduled(x, k) && !on; return `<button class="hdot${on ? ' on' : ''}${off ? ' off' : ''}" style="${U.habStyle(x)}" data-act="habit-toggle" data-id="${x.id}" data-day="${k}" aria-pressed="${on}" aria-label="${esc(x.name)} on ${D.short(k)}">${icon('check')}</button>`; }).join('')}</div>`).join('')}</div>`;
    }
    const [a, b] = D.range(h, p), end = b < t ? b : t, elapsed = a > t ? 0 : Math.round((D.parse(end) - D.parse(a)) / 864e5) + 1;
    return `<div class="hmonth">${hs.map(x => { const c = S.habitCount(x.id, a, b); return `<div class="hm-row" data-key="${x.id}"><span>${icon(x.icon)}${esc(x.name)}</span>${bar(elapsed ? Math.min(1, c / elapsed) : 0)}<b>${c} <small>days</small></b></div>`; }).join('')}</div>`;
  }

  function breakdown(h, p) {
    const t = D.today();
    if (h === 'year') {
      const tiles = Array.from({ length: 12 }, (_, i) => {
        const ym = `${p}-${String(i + 1).padStart(2, '0')}`, ts = S.tasksIn('month', ym), dn = ts.filter(x => x.done).length, gc = S.goalsFor('month', ym).length;
        return `<a class="mtile${ym === t.slice(0, 7) ? ' now' : ''}" data-key="${ym}" href="#/goals/month/${ym}"><b>${D.MONTHS[i]}</b>${bar(ts.length ? dn / ts.length : 0)}<small>${dn}/${ts.length} tasks · ${plural(gc, 'goal')}</small></a>`;
      }).join('');
      return card('', 'Months', '', `<div class="month-grid stagger">${tiles}</div>`);
    }
    if (h === 'month') {
      const rows = D.weeksOfMonth(p).map(wk => {
        const ts = S.tasksIn('week', wk), dn = ts.filter(x => x.done).length, gc = S.goalsFor('week', wk).length;
        return `<a class="wrow${wk === D.weekKey(t) ? ' now' : ''}" data-key="${wk}" href="#/goals/week/${wk}"><span><b>Week ${D.weekNum(wk)}</b><small>${D.label('week', wk)}</small></span>${bar(ts.length ? dn / ts.length : 0)}<small>${dn}/${ts.length} tasks · ${plural(gc, 'goal')}</small>${icon('chevR')}</a>`;
      }).join('');
      const pend = S.tasksIn('month', p).filter(x => !x.done).sort((a, b) => a.date.localeCompare(b.date));
      return card('', 'Weeks', '', `<div class="week-rows stagger">${rows}</div>`) +
        card('', 'Upcoming tasks', `<span class="muted">${pend.length} open</span>`, `<div class="task-list">${pend.slice(0, 8).map(x => taskRow(x, { date: true })).join('') || empty('No open tasks this month.')}</div>${pend.length > 8 ? `<p class="empty-line">+${pend.length - 8} more</p>` : ''}`);
    }
    if (h === 'week') {
      const blocks = D.weekDays(p).map(k => {
        const ts = S.tasksOn(k), dn = ts.filter(x => x.done).length, evs = S.eventsOn(k);
        return `<div class="dblock${k === t ? ' today' : ''}" data-key="${k}"><div class="dhead"><a href="#/daily/${k}"><b>${D.DOW[D.parse(k).getDay()]}</b> ${D.short(k)}</a><small>${ts.length ? `${dn}/${ts.length}` : ''}</small></div>
          ${evs.map(e => `<button class="ev-mini" style="--ev:${U.evHex(e.color)}" data-key="${e.id}" data-act="event-open" data-id="${e.id}"><span class="ev-bar"></span>${e.allDay ? '' : `<small>${fmtTime(e.time)}</small>`}${esc(e.title)}</button>`).join('')}
          ${ts.map(x => taskRow(x)).join('')}
          ${addRow('Add a task', `data-enter="task-add" data-day="${k}"`)}</div>`;
      }).join('');
      return card('', 'Days', `<span class="muted">Tasks added here appear in that day’s entry</span>`, `<div class="day-blocks stagger">${blocks}</div>`);
    }
    const ts = S.tasksOn(p), notes = S.notesOn(p), evs = S.eventsOn(p);
    return card('', 'Tasks', `<a class="link" href="#/daily/${p}">Open daily entry ${icon('arrowUR')}</a>`,
      `<div class="task-list">${ts.map(x => taskRow(x, { edit: true })).join('') || empty('Nothing scheduled.')}</div>${addRow('Add a task', `data-enter="task-add" data-day="${p}"`)}`) +
      (evs.length ? card('', 'Events', '', `<div class="ev-list">${evs.map(e => eventRow(e, p)).join('')}</div>`) : '') +
      card('', 'Notes', '', `<div class="note-list">${notes.map(n => `<a class="note-row" data-key="${n.id}" href="#/daily/${p}"><span class="nt"><strong>${esc(n.title || 'Untitled note')}</strong><small>${esc(n.body.slice(0, 80))}</small></span>${icon('chevR')}</a>`).join('') || empty('No notes for this day.')}</div>`);
  }

  /* a banner for every goals tab: a focus line, with an optional picture behind it */
  function banner(h, p) {
    const img = (S.s.banners || {})[h] || '', t = D.today();
    const fkey = h === 'all' ? p : `${h}:${p}`;
    const label = h === 'all' ? `Focus for ${p}` : `Focus for ${D.label(h, p)}`;
    const ph = { all: 'What do you want this year to be about?', year: 'What is this year for?', month: 'What matters most this month?', week: 'What is the one thing this week?', day: 'What would make today a good day?' }[h];
    return `<div class="focus-card banner${img ? ' has-img' : ''}" data-banner-drop data-h="${h}">
      ${img ? `<img class="fc-img" data-key="bimg" src="${img}" alt="">` : ''}
      ${h === 'all' ? Mascot.html('perch', 'goals') : ''}
      <span class="fc-label">${icon('compass')}${esc(label)}</span>
      <textarea class="fc-text" rows="1" placeholder="${ph}" data-input="focus" data-fkey="${esc(fkey)}" aria-label="${esc(label)}">\n${esc(S.s.focus[fkey] || '')}</textarea>
      <span class="fc-tools"><button class="btn sm" data-act="banner-add" data-h="${h}">${icon('image')}${img ? 'Change image' : 'Add image'}</button>${img ? `<button class="icon-btn sm fc-del" data-act="banner-del" data-h="${h}" aria-label="Remove image" title="Remove image">${icon('trash')}</button>` : ''}</span>
    </div>`;
  }

  /* ----- overarching goals: big, lasting goals planned down through year > month > week > day ----- */
  function lifeCard(g, i) {
    const info = S.goalInfo(g), c = S.descCounts(g.id);
    const parts = [c.year && plural(c.year, 'year goal'), c.month && plural(c.month, 'month goal'), c.week && plural(c.week, 'week goal'), c.day && plural(c.day, 'day goal')].filter(Boolean);
    return `<a class="life-card" data-key="${g.id}" href="#/goals/life/${g.id}">
      <div class="lc-cover ${g.img ? 'has' : COVERS[i % COVERS.length]}">${g.img ? `<img src="${g.img}" alt="">` : `<span class="lc-ic">${icon('compass')}</span>`}</div>
      <div class="lc-body"><h3>${esc(g.title || 'Untitled goal')}</h3><p>${esc(g.desc || 'Open to plan it by year, month, week and day.')}</p>${bar(info.pct)}<div class="lc-meta"><b>${pct(info.pct)}%</b><span>${parts.join(' · ') || 'No sub-goals yet'}</span></div></div></a>`;
  }
  function lifeSection() {
    const lg = S.s.goals.filter(g => g.horizon === 'life');
    return `<section class="card life-section"><header class="card-head"><div><h2>Overarching Goals</h2><p class="muted">Big, lasting goals. Open one to plan it down through years, months, weeks and days.</p></div><button class="btn sm primary" data-act="life-new">${icon('plus')}New overarching goal</button></header>
      <div class="life-grid stagger">${lg.map(lifeCard).join('') || empty('Add your first overarching goal — something you want to build over years.')}</div></section>`;
  }
  function treeNode(g, depth) {
    const kids = S.s.goals.filter(x => x.parentId === g.id).sort((a, b) => a.period.localeCompare(b.period));
    const open = ui.treeOpen[g.id] !== false, nh = NEXT_H[g.horizon];
    return `<div class="tnode lvl-${g.horizon}" data-key="${g.id}">
      <div class="trow"><button class="tgl${open ? ' open' : ''}${kids.length ? '' : ' none'}" data-act="tree-toggle" data-id="${g.id}" aria-label="${open ? 'Collapse' : 'Expand'}" aria-expanded="${open}">${icon('chevR')}</button>${goalRow(g, { noParent: true, period: true })}</div>
      ${open ? `<div class="tkids">${kids.map(k => treeNode(k, depth + 1)).join('')}${nh ? addRow(`Add a ${nh} goal`, `data-enter="goal-add" data-parent="${g.id}"`) : ''}</div>` : ''}
    </div>`;
  }
  function lifePage(g) {
    const info = S.goalInfo(g), c = S.descCounts(g.id);
    const kids = S.s.goals.filter(x => x.parentId === g.id).sort((a, b) => a.period.localeCompare(b.period));
    const chips = [['Year', c.year], ['Month', c.month], ['Week', c.week], ['Day', c.day]].map(([l, n]) => `<span class="lp-chip"><b>${n}</b>${l} goals</span>`).join('');
    return `
    <nav class="crumb-trail"><a href="#/goals">${icon('chevL')}All Horizons</a><i>/</i><span>Overarching</span></nav>
    <div class="focus-card banner life-banner${g.img ? ' has-img' : ''}" data-banner-drop data-life="${g.id}">
      ${g.img ? `<img class="fc-img" data-key="bimg" src="${g.img}" alt="">` : ''}
      <span class="fc-label">${icon('compass')}Overarching goal</span>
      <textarea class="lb-title" rows="1" data-input="goal-title" data-id="${g.id}" placeholder="Name this goal" aria-label="Goal name">\n${esc(g.title)}</textarea>
      <span class="fc-tools"><button class="btn sm" data-act="banner-add" data-h="life:${g.id}">${icon('image')}${g.img ? 'Change image' : 'Add image'}</button>${g.img ? `<button class="icon-btn sm fc-del" data-act="banner-del" data-h="life:${g.id}" aria-label="Remove image" title="Remove image">${icon('trash')}</button>` : ''}<button class="icon-btn sm fc-del" data-act="goal-open" data-id="${g.id}" aria-label="Link a project or habit" title="Link a project or habit">${icon('sliders')}</button></span>
    </div>
    <textarea class="life-desc" data-input="goal-desc" data-id="${g.id}" rows="2" placeholder="Why does this matter to you?" aria-label="Description">\n${esc(g.desc || '')}</textarea>
    <div class="card life-progress"><div class="lp-main"><b>${pct(info.pct)}%</b><small>${esc(info.bits.join(' · ') || 'Add year goals below to track progress')}</small></div>${bar(info.pct)}<div class="lp-chips">${chips}</div></div>
    ${card('', 'Plan By Time', `<span class="tl-legend"><i>Year</i>${icon('chevR')}<i>Month</i>${icon('chevR')}<i>Week</i>${icon('chevR')}<i>Day</i></span>`,
      `<p class="muted tl-hint">Break this goal down level by level. Open any goal to edit it, link tasks or move it to another period.</p><div class="tree">${kids.map(k => treeNode(k, 1)).join('')}${addRow('Add a year goal', `data-enter="goal-add" data-parent="${g.id}"`)}</div>`)}
    <div class="life-foot"><button class="btn ghost danger" data-act="goal-del" data-id="${g.id}">${icon('trash')}Delete this overarching goal</button></div>`;
  }

  V.goals = r => {
    let { h, p } = r.params; const t = D.today();
    if (h === 'life') { const lg = S.goal(r.params.id); if (lg && lg.horizon === 'life') return lifePage(lg); h = 'all'; p = t.slice(0, 4); }
    const tabs = `<nav class="tabs" aria-label="Horizons"><a class="${h === 'all' ? 'on' : ''}" href="#/goals">All horizons</a>${HORIZ.map(x => `<a class="${h === x ? 'on' : ''}" href="#/goals/${x}/${h === x ? p : D.periodOf(x, t)}">${HNAME[x]}</a>`).join('')}</nav>`;
    const head = pageHead('Year · Month · Week · Day', 'Future Goals', 'Goals at every horizon, connected to your tasks, habits and projects.');

    if (h === 'all') {
      const yr = t.slice(0, 4);
      return `${head}${tabs}
      ${banner('all', yr)}
      ${lifeSection()}
      <div class="grid-2 stagger">${HORIZ.map(x => periodCard(x, D.periodOf(x, t))).join('')}</div>`;
    }
    const cur = D.periodOf(h, t), goals = S.goalsFor(h, p), ts = S.tasksIn(h, p), dn = ts.filter(x => x.done).length;
    return `${head}${tabs}
    ${banner(h, p)}
    <div class="period-nav">
      <a class="icon-btn" href="#/goals/${h}/${D.shift(h, p, -1)}" aria-label="Previous ${h}">${icon('chevL')}</a>
      <div class="pn-label"><b>${D.label(h, p)}</b><small>${h === 'week' ? `Week ${D.weekNum(p)}` : HNAME[h]}${p === cur ? ' · current' : ''}</small></div>
      <a class="icon-btn" href="#/goals/${h}/${D.shift(h, p, 1)}" aria-label="Next ${h}">${icon('chevR')}</a>
      ${p !== cur ? `<a class="btn sm ghost" href="#/goals/${h}/${cur}">Back to current</a>` : ''}
      <span class="spacer"></span><span class="muted">${dn} of ${ts.length} tasks done</span>
    </div>
    <div class="grid-2 wide-left">
      <div class="col">
        ${card('', `${HNAME[h]} goals`, `<span class="muted">${plural(goals.length, 'goal')}</span>`,
      `<div class="goal-list">${goals.map(x => goalRow(x)).join('') || empty(`No goals for this ${h} yet.`)}</div>${addRow(`Add a ${h} goal`, `data-enter="goal-add" data-h="${h}" data-p="${p}"`, `<button class="btn sm primary" data-act="goal-add">Add</button>`)}`)}
        ${card('', 'Habits', '', habitsFor(h, p))}
      </div>
      <div class="col">${breakdown(h, p)}</div>
    </div>`;
  };

  /* ---------- sidebar & topbar ---------- */
  V.sidebar = () => {
    const t = D.today(), s = S.s, r = App.route;
    const has = new Set([...s.tasks.map(x => x.date), ...s.notes.map(x => x.date), ...Object.keys(s.habitLog), ...Object.keys(s.journal), ...s.events.filter(e => e.repeat === 'none').map(e => e.date)]);
    for (const k in s.canvases) if (s.canvases[k].items.length || s.canvases[k].strokes.length) has.add(k);
    const sel = r.name === 'daily' ? r.params.day : '';
    const { y, m } = ui.cal, off = (new Date(y, m, 1).getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < Math.ceil((off + dim) / 7) * 7; i++) {
      const d = new Date(y, m, 1 - off + i), k = D.key(d);
      cells.push(`<a class="cd${d.getMonth() !== m ? ' out' : ''}${k === t ? ' today' : ''}${k === sel ? ' sel' : ''}${has.has(k) ? ' has' : ''}" data-key="${k}" href="#/daily/${k}" aria-label="${D.long(k)}">${d.getDate()}</a>`);
    }
    const nav = (id, href, ic, label) => `<a class="nav-link${r.name === id ? ' on' : ''}" href="${href}">${icon(ic)}<span>${label}</span></a>`;
    const pinned = s.projects.filter(p => p.pinned);
    return `
      <a class="brand" href="#/dashboard"><span class="logo">${icon('sprout')}</span><b>dayleaf</b></a>
      <button class="search-btn" data-act="search-open">${icon('search')}<span>Find anything</span><kbd>Ctrl K</kbd></button>
      <a class="today-btn" href="#/daily/${t}"><span class="tb-ic">${icon('sun')}</span><span class="tb-txt"><b>Today</b><small>${D.long(t)}</small></span><span class="tb-go">${icon('arrowR')}</span></a>
      <div class="nav-label">My workspace</div>
      <nav class="nav">
        ${nav('dashboard', '#/dashboard', 'layout', 'Dashboard')}
        ${nav('daily', `#/daily/${t}`, 'book', 'Daily Entry')}
        ${nav('journal', '#/journal', 'pencil', 'Journal')}
        ${nav('notes', '#/notes', 'file', 'Notes')}
        ${nav('calendar', '#/calendar', 'calendar', 'Calendar')}
        ${nav('habits', '#/habits', 'activity', 'Habit Tracker')}
        ${nav('projects', '#/projects', 'folder', 'Personal Projects')}
        ${nav('goals', '#/goals', 'flag', 'Future Goals')}
        ${nav('about', '#/about', 'heart', 'About Me')}
      </nav>
      <div class="nav-label">Pinned<button class="icon-btn sm ghost" data-act="project-new" data-status="motion" aria-label="New project">${icon('plus')}</button></div>
      <nav class="nav pinned">${pinned.map(p => `<button class="nav-link sm" data-key="${p.id}" data-act="project-open" data-id="${p.id}">${icon(p.icon)}<span>${esc(p.title)}</span></button>`).join('') || '<p class="side-empty">Pin a project to keep it here.</p>'}</nav>
      <div class="cal-wrap">${Mascot.html('side', 'side')}<div class="cal">
        <div class="cal-head"><b>${D.MONTHS[m]} ${y}</b><span><button class="icon-btn sm ghost" data-act="cal-prev" aria-label="Previous month">${icon('chevL')}</button><button class="icon-btn sm ghost" data-act="cal-next" aria-label="Next month">${icon('chevR')}</button></span></div>
        <div class="cal-dow">${'MTWTFSS'.split('').map((c, i) => `<span data-key="d${i}">${c}</span>`).join('')}</div>
        <div class="cal-grid">${cells.join('')}</div>
      </div></div>
      <div class="side-spacer"></div>
      <div class="user-row"><button class="user" data-act="profile-open"><span class="avatar">${esc((s.user.name || '?')[0].toUpperCase())}</span><span><b>${esc(s.user.name)}</b><small>Personal workspace</small></span>${icon('sliders')}</button>
      <button class="icon-btn lock-btn" data-act="lock-now" aria-label="Lock dayleaf" title="${Security.enabled() ? 'Lock now' : 'Set a PIN'}">${icon('lock')}</button></div>`;
  };

  const CRUMB = { dashboard: 'Dashboard', daily: 'Daily Entry', journal: 'Journal', notes: 'Notes', calendar: 'Calendar', habits: 'Habit Tracker', projects: 'Personal Projects', goals: 'Future Goals', about: 'About Me' };
  V.title = () => CRUMB[App.route.name];
  V.topbar = () => `<button class="icon-btn menu-btn" data-act="nav-open" aria-label="Open menu">${icon('menu')}</button>
    <nav class="crumbs" aria-label="Breadcrumb"><span>My workspace</span><i>/</i><b>${CRUMB[App.route.name]}</b></nav>
    <div class="top-right"><button class="year-chip${D.anchor ? ' away' : ''}" data-act="year-open" title="Switch year">${icon('calendar')}<b>${D.today().slice(0, 4)}</b>${icon('chevD')}</button><span class="saved">${icon('check')}<span>All changes saved</span></span>
    <button class="icon-btn" data-act="search-open" aria-label="Search">${icon('search')}</button></div>`;

  /* ---------- modals (other files register more in V.modals) ---------- */
  function projectModal(id) {
    const p = S.project(id); if (!p) return null;
    const st = S.projectStats(p), ts = S.s.tasks.filter(x => x.projectId === id);
    const linked = S.s.goals.filter(x => x.projectId === id), free = S.s.goals.filter(x => x.projectId !== id && x.horizon !== 'day');
    return `
    <div class="m-cover ${p.cover}"><span class="pc-icon">${icon(p.icon)}</span>
      <div class="m-cover-tools"><div class="dots" role="group" aria-label="Cover colour">${(ui.moreColors || MORE_COVERS.includes(p.cover) ? COVERS.concat(MORE_COVERS) : COVERS).map(c => `<button class="cdot ${c}${p.cover === c ? ' on' : ''}" data-act="project-cover" data-id="${id}" data-v="${c}" aria-label="Cover ${c}"></button>`).join('')}<button class="cdot-more" data-act="colors-more" title="${ui.moreColors ? 'Fewer colours' : 'More colours'}" aria-label="${ui.moreColors ? 'Fewer colours' : 'More colours'}">${icon(ui.moreColors ? 'minus' : 'plus')}</button></div>
      <div class="icons" role="group" aria-label="Icon">${PICONS.map(c => `<button class="${p.icon === c ? 'on' : ''}" data-act="project-icon" data-id="${id}" data-v="${c}" aria-label="${c}">${icon(c)}</button>`).join('')}</div></div>
      <button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <input class="m-title" value="${esc(p.title)}" data-input="project-title" data-id="${id}" aria-label="Project title" placeholder="Project name">
      <textarea class="m-desc" rows="2" data-input="project-desc" data-id="${id}" placeholder="What is this project about?" aria-label="Description">\n${esc(p.desc)}</textarea>
      <div class="m-fields">
        <label>Status<select data-change="project-status" data-id="${id}">${Object.keys(STATUS).map(k => opt(k, STATUS[k], p.status === k)).join('')}</select></label>
        <label>Area<select data-change="project-area" data-id="${id}">${AREAS.map(a => opt(a, a, p.area === a)).join('')}</select></label>
        <label>Target date<input type="date" value="${p.due || ''}" data-change="project-due" data-id="${id}"></label>
      </div>
      <div class="m-progress"><div><b>${pct(st.pct)}%</b><small>${st.done} of ${st.total} tasks done</small></div>${bar(st.pct)}</div>
      <h3 class="m-h">${icon('listcheck')}Tasks <small>Tasks with a date also appear in that day’s daily entry</small></h3>
      <div class="task-list">${ts.map(x => taskRow(x, { edit: true, noProject: true, date: true })).join('') || empty('No tasks yet.')}</div>
      <div class="add-row" data-row><span class="add-ic">${icon('plus')}</span><input class="grow" data-f="title" placeholder="Add a task" data-enter="task-add" data-project="${id}" aria-label="New task"><input type="date" data-f="date" aria-label="Date (optional)"><button class="btn sm primary" data-act="task-add">Add</button></div>
      <h3 class="m-h">${icon('flag')}Linked goals</h3>
      <div class="goal-list">${linked.map(x => goalRow(x, { noParent: true })).join('') || empty('Not linked to a goal yet.')}</div>
      ${free.length ? `<label class="m-link">${icon('link')}<select data-change="project-link-goal" data-id="${id}"><option value="">Link to a goal…</option>${free.map(x => opt(x.id, `${HNAME[x.horizon]} · ${x.title}`)).join('')}</select></label>` : ''}
      <h3 class="m-h">${icon('file')}Notes <small>Also appears in that day’s daily entry</small></h3>
      <div class="notes">${S.notesForProject(id).map(n => `<article class="note" data-key="${n.id}">
        <div class="note-top"><span>${n.createdAt > 1e12 ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Note'}</span><button class="icon-btn sm ghost" data-act="note-del" data-id="${n.id}" aria-label="Delete note">${icon('trash')}</button></div>
        <input class="note-title" value="${esc(n.title)}" placeholder="Title" data-input="note-title" data-id="${n.id}" aria-label="Note title">
        <textarea class="note-body" rows="3" placeholder="Write something…" data-input="note-body" data-id="${n.id}" aria-label="Note">\n${esc(n.body)}</textarea></article>`).join('') || empty('No notes yet. Jot down ideas, references or anything else for this project.')}</div>
      <button class="btn sm" data-act="note-add" data-project="${id}">${icon('plus')}New note</button>
      <div class="m-foot"><button class="btn ghost" data-act="project-pin" data-id="${id}">${icon('pin')}${p.pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}</button><button class="btn ghost danger" data-act="project-del" data-id="${id}">${icon('trash')}Delete</button></div>
    </div>`;
  }

  function goalModal(id) {
    const gl = S.goal(id); if (!gl) return null;
    const i = S.goalInfo(gl), h = gl.horizon, hi = LV.indexOf(h);
    const parents = S.s.goals.filter(x => LV.indexOf(x.horizon) < hi);
    const kids = S.s.goals.filter(x => x.parentId === id), ts = S.s.tasks.filter(x => x.goalId === id);
    const habit = gl.habitId && S.habit(gl.habitId);
    return `
    <div class="m-head"><span class="eyebrow">${h === 'life' ? 'Overarching goal' : `${HNAME[h]} goal · ${D.label(h, gl.period)}`}</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <input class="m-title" value="${esc(gl.title)}" data-input="goal-title" data-id="${id}" aria-label="Goal title" placeholder="Goal">
      <div class="m-progress"><div><b>${pct(i.pct)}%</b><small>${esc(i.bits.join(' · ') || 'Progress is set by you')}</small></div>${bar(i.pct)}</div>
      <div class="m-fields">
        ${hi > 0 ? `<label>Part of<select data-change="goal-parent" data-id="${id}"><option value="">Nothing</option>${parents.map(x => opt(x.id, `${HNAME[x.horizon]} · ${x.title}`, gl.parentId === x.id)).join('')}</select></label>` : ''}
        <label>Project<select data-change="goal-project" data-id="${id}"><option value="">None</option>${S.s.projects.map(x => opt(x.id, x.title, gl.projectId === x.id)).join('')}</select></label>
        <label>Habit<select data-change="goal-habit" data-id="${id}"><option value="">None</option>${S.s.habits.map(x => opt(x.id, x.name, gl.habitId === x.id)).join('')}</select></label>
        ${habit ? `<label>Target days<input type="number" min="1" value="${gl.target || 1}" data-input="goal-target" data-id="${id}"></label>` : ''}
        ${h !== 'life' ? `<label>Move to the ${h} containing<input type="date" value="${D.range(h, gl.period)[0]}" data-change="goal-period" data-id="${id}"></label>` : ''}
      </div>
      ${i.auto ? '' : `<label class="m-range">Manual progress <b>${pct(gl.done ? 1 : (gl.manual || 0) / 100)}%</b><input type="range" min="0" max="100" step="5" value="${gl.done ? 100 : gl.manual || 0}" data-input="goal-manual" data-id="${id}"></label>`}
      <h3 class="m-h">${icon('listcheck')}Tasks for this goal <small>They also show up on their day</small></h3>
      <div class="task-list">${ts.map(x => taskRow(x, { edit: true, noGoal: true, date: true })).join('') || empty('No tasks linked yet.')}</div>
      <div class="add-row" data-row><span class="add-ic">${icon('plus')}</span><input class="grow" data-f="title" placeholder="Add a task" data-enter="task-add" data-goal="${id}" aria-label="New task"><input type="date" data-f="date" value="${h === 'day' ? gl.period : ''}" aria-label="Date (optional)"><button class="btn sm primary" data-act="task-add">Add</button></div>
      ${h !== 'day' ? `<h3 class="m-h">${icon('corner')}Sub-goals</h3>
        <div class="goal-list">${kids.map(x => goalRow(x, { noParent: true })).join('') || empty('No sub-goals yet.')}</div>
        <div class="add-row" data-row><span class="add-ic">${icon('plus')}</span><input class="grow" data-f="title" placeholder="Add a sub-goal" data-enter="goal-add" data-parent="${id}" aria-label="New sub-goal"><button class="btn sm primary" data-act="goal-add">Add</button></div>` : ''}
      <div class="m-foot"><button class="btn ghost danger" data-act="goal-del" data-id="${id}">${icon('trash')}Delete goal</button></div>
    </div>`;
  }

  V.searchList = () => {
    const q = ui.search.q.trim();
    if (!q) return [
      { kind: 'go', href: `#/daily/${D.today()}`, title: 'Open today', sub: 'Daily entry', icon: 'sun' },
      { kind: 'go', href: '#/dashboard', title: 'Dashboard', sub: 'Go to', icon: 'layout' },
      { kind: 'go', href: '#/journal', title: 'Journal', sub: 'Go to', icon: 'pencil' },
      { kind: 'go', href: '#/notes', title: 'Notes', sub: 'Go to', icon: 'file' },
      { kind: 'go', href: '#/calendar', title: 'Calendar', sub: 'Go to', icon: 'calendar' },
      { kind: 'go', href: '#/about', title: 'About Me', sub: 'Go to', icon: 'heart' },
      { kind: 'go', href: '#/habits', title: 'Habit Tracker', sub: 'Go to', icon: 'activity' },
      { kind: 'go', href: '#/projects', title: 'Personal Projects', sub: 'Go to', icon: 'folder' },
      { kind: 'go', href: '#/goals', title: 'Future Goals', sub: 'Go to', icon: 'flag' },
    ];
    return S.search(q);
  };
  function searchModal() {
    const list = V.searchList(), sel = Math.min(ui.search.sel, Math.max(0, list.length - 1));
    return `<div class="search-box">${icon('search')}<input data-autofocus data-input="search-q" value="${esc(ui.search.q)}" placeholder="Search tasks, notes, events, projects and goals" aria-label="Search" autocomplete="off"><kbd>Esc</kbd></div>
      <div class="results">${list.map((x, i) => `<button class="res${i === sel ? ' on' : ''}" data-key="${x.kind}${x.id || x.href}" data-act="search-go" data-i="${i}">${icon(x.icon)}<span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span>${icon('chevR')}</button>`).join('') || `<p class="empty-line pad">No matches for “${esc(ui.search.q)}”.</p>`}</div>`;
  }

  V.modals = { project: m => projectModal(m.id), goal: m => goalModal(m.id), search: searchModal };
  V.modal = () => {
    const m = ui.modal; if (!m) return '';
    const body = V.modals[m.type](m);
    if (body === null) return '';
    return `<div class="modal-back${ui.closing ? ' closing' : ''}${m.type === 'search' ? ' top' : ''}" data-act="backdrop"><div class="modal m-${m.type}" role="dialog" aria-modal="true">${body}</div></div>`;
  };

  /* shown on every page while you are looking at (or planning) a different year */
  function yearBanner() {
    const y = Number(D.today().slice(0, 4)), ry = Number(D.real().slice(0, 4)), past = y < ry, started = !!S.s.years[y];
    return `<div class="year-banner ${past ? 'past' : 'next'}" data-key="yb">${icon('calendar')}<span><b>${past ? `Looking back at ${y}` : `Planning ${y}`}</b>${past ? 'Everything here is still editable.' : started ? 'You are planning ahead for the new year.' : 'A fresh year. Start it to carry things over.'}</span>
      ${!past && !started ? `<button class="btn sm primary" data-act="year-start" data-y="${y}">${icon('sparkles')}Start ${y}</button>` : ''}<button class="btn sm" data-act="year-set" data-y="${ry}">Back to ${ry}</button></div>`;
  }
  V.page = r => min((D.anchor ? yearBanner() : '') + V[r.name](r));
  V.minify = min;
  V.h = { bar, pct, card, opt, empty, plural, pageHead, taskRow, goalRow, eventRow, faceBtn, fmtTime, addRow, letterBanner, AREAS, HNAME };
  g.Views = V;
})(window);
