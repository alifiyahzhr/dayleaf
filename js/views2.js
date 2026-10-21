/* dayleaf — habit tracker, calendar, event / habit / settings modals */
(function (g) {
  const { D, esc, icon, tone, MOOD } = U;
  const S = Store, ui = App.ui, V = Views;
  const { bar, pct, card, empty, plural, pageHead, taskRow, eventRow, fmtTime, addRow, opt } = Object.assign({}, V.h, { opt: V.h.opt });

  const HICONS = ['pen', 'sprout', 'droplet', 'book', 'heart', 'sun', 'flame', 'smile', 'moon', 'coffee', 'activity', 'palette', 'clock', 'compass', 'flag', 'calendar'];
  const EVC = { blue: '#6F8FAA', sky: '#8FB4CF', sand: '#C9A66B', sage: '#8DB48F', rose: '#C99A93' };
  const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const WDN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* blue / cream colours first; "More colours" reveals the rest plus a custom picker */
  function colorPicker(sel, act, id) {
    const dot = ([k, h]) => `<button class="${sel === k ? 'on' : ''}" style="--ev:${h}" data-key="${k}" data-act="${act}" data-id="${id}" data-v="${k}" aria-label="${k}" title="${k}"></button>`;
    const main = Object.entries(U.COL_MAIN), more = Object.entries(U.COL_MORE);
    const isCustom = sel && sel[0] === '#', inMore = more.some(([k]) => k === sel), open = ui.moreColors || isCustom || inMore;
    return `<div class="evc-wrap"><div class="evc" role="group" aria-label="Colour">${main.map(dot).join('')}<button class="evc-toggle" data-act="colors-more" aria-expanded="${open}">${icon(open ? 'minus' : 'plus')}${open ? 'Fewer colours' : 'More colours'}</button></div>
      ${open ? `<div class="evc extra">${more.map(dot).join('')}<label class="evc-custom${isCustom ? ' on' : ''}" title="Pick any colour" style="--ev:${U.evHex(sel)}"><input type="color" value="${U.evHex(sel)}" data-change="${act}-custom" data-id="${id}" aria-label="Custom colour"><i></i>Custom</label></div>` : ''}</div>`;
  }

  const schedText = h => {
    const d = h.days || [0, 1, 2, 3, 4, 5, 6];
    if (d.length === 7) return 'Every day';
    if (d.length === 5 && !d.includes(5) && !d.includes(6)) return 'Weekdays';
    if (d.length === 2 && d.includes(5) && d.includes(6)) return 'Weekends';
    if (!d.length) return 'No days selected';
    return d.slice().sort().map(i => WDN[i]).join(', ');
  };

  /* ---------- habit tracker ---------- */
  V.habits = () => {
    const s = S.s, t = D.today(), wk = ui.habWk || D.weekKey(t), days = D.weekDays(wk), hs = s.habits;
    const todayList = S.habitsFor(t), todayDone = todayList.filter(h => S.done(h.id, t)).length;
    let wDone = 0, wSched = 0;
    days.forEach(k => { if (k <= t) S.habitsFor(k).forEach(h => { wSched++; if (S.done(h.id, k)) wDone++; }); });
    const best = hs.reduce((a, h) => Math.max(a, S.streak(h.id)), 0);
    const avg = hs.length ? hs.reduce((a, h) => a + S.habitRate(h.id, 30), 0) / hs.length : 0;
    const stat = (label, val, f, sub) => `<div class="stat"><span>${label}</span><b>${val}</b>${f == null ? '' : bar(f)}<small>${sub}</small></div>`;

    const rows = hs.map(h => {
      let d = 0, sc = 0;
      days.forEach(k => { if (k <= t && (S.scheduled(h, k) || S.done(h.id, k))) { sc++; if (S.done(h.id, k)) d++; } });
      return `<div class="ht-row" data-key="${h.id}">
        <button class="ht-name" style="${U.habStyle(h)}" data-act="habit-open" data-id="${h.id}"><span class="h-ic tinted">${icon(h.icon)}</span><span><b>${esc(h.name)}</b><small>${schedText(h)}</small></span></button>
        ${days.map(k => {
        const on = S.done(h.id, k), off = !S.scheduled(h, k) && !on, fut = k > t;
        return `<button class="hdot${on ? ' on' : ''}${off ? ' off' : ''}${fut ? ' fut' : ''}${k === t ? ' tod' : ''}" style="${U.habStyle(h)}" data-key="${k}" data-act="habit-toggle" data-id="${h.id}" data-day="${k}" aria-pressed="${on}" ${fut ? 'disabled' : ''} aria-label="${esc(h.name)} on ${D.short(k)}">${icon('check')}</button>`;
      }).join('')}
        <span class="ht-sum"><b>${d}/${sc}</b>${bar(sc ? d / sc : 0)}</span></div>`;
    }).join('');

    const cards = hs.map(h => {
      const heat = Array.from({ length: 28 }, (_, i) => {
        const k = D.add(t, i - 27), on = S.done(h.id, k), sc = S.scheduled(h, k);
        return `<i class="${on ? 'done' : k > t ? '' : sc ? 'miss' : 'off'}${k === t ? ' now' : ''}" data-key="${k}" title="${D.long(k)}"></i>`;
      }).join('');
      const rate = S.habitRate(h.id, 30);
      return `<article class="hcardx" style="${U.habStyle(h)}" data-key="${h.id}">
        <header><span class="h-ic tinted">${icon(h.icon)}</span><div><h3>${esc(h.name)}</h3><p>${esc(h.sub || schedText(h))}</p></div><button class="icon-btn sm" data-act="habit-open" data-id="${h.id}" aria-label="Edit ${esc(h.name)}">${icon('pencil')}</button></header>
        <div class="sched">${WD.map((c, i) => `<span class="${(h.days || []).includes(i) ? 'on' : ''}" data-key="s${i}">${c}</span>`).join('')}</div>
        <div class="hstats"><div><b>${S.streak(h.id)}</b><small>streak</small></div><div><b>${S.bestStreak(h.id)}</b><small>best</small></div><div><b>${pct(rate)}%</b><small>30 days</small></div><div><b>${S.habitTotal(h.id)}</b><small>total</small></div></div>
        <div class="heat" aria-label="Last 28 days">${heat}</div>
        ${bar(rate)}
      </article>`;
    }).join('');

    return `
    ${pageHead(`${plural(hs.length, 'habit')} tracked`, 'Habit Tracker', 'Build routines that fit your life. Customise each habit, choose the days it applies to, and watch it add up.',
      `${Mascot.html('mini', 'habits')}<button class="btn primary" data-act="habit-new">${icon('plus')}New habit</button>`)}
    <div class="stats">
      ${stat('Today', `${todayDone}/${todayList.length}`, todayList.length ? todayDone / todayList.length : 0, 'habits done')}
      ${stat('This week', `${wSched ? pct(wDone / wSched) : 0}%`, wSched ? wDone / wSched : 0, `${wDone} of ${wSched} check-ins`)}
      ${stat('Best streak', `${best} ${best === 1 ? 'day' : 'days'}`, null, 'current, any habit')}
      ${stat('30-day average', `${pct(avg)}%`, avg, 'across all habits')}
    </div>
    ${card('', 'Week at a glance', `<div class="week-nav"><button class="icon-btn sm" data-act="hab-week" data-d="-1" aria-label="Previous week">${icon('chevL')}</button><b>${D.label('week', wk)}</b><button class="icon-btn sm" data-act="hab-week" data-d="1" aria-label="Next week">${icon('chevR')}</button>${wk !== D.weekKey(t) ? `<button class="btn sm ghost" data-act="hab-week" data-d="0">This week</button>` : ''}</div>`,
      `<div class="ht">
        <div class="ht-head"><span></span>${days.map((k, i) => `<span class="${k === t ? 'today' : ''}" data-key="${k}">${WDN[i]}<small>${Number(k.slice(8))}</small></span>`).join('')}<span>Week</span></div>
        ${rows || empty('No habits yet. Create your first one.')}
      </div>`)}
    <div class="section-title"><h2>Your habits</h2><span class="muted">Select the pencil to rename, change the icon or schedule</span></div>
    <div class="habit-cards stagger">${cards}<button class="hcardx new" data-act="habit-new">${icon('plus')}<b>New habit</b><small>Add something you want to build</small></button></div>`;
  };

  V.modals.habit = m => {
    const h = S.habit(m.id); if (!h) return null;
    const d = h.days || [];
    return `<div class="m-head"><span class="eyebrow">Customise habit</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <div class="hm-top"><span class="h-ic big tinted" style="${U.habStyle(h)}">${icon(h.icon)}</span><input class="m-title" value="${esc(h.name)}" data-input="habit-name" data-id="${h.id}" aria-label="Habit name" placeholder="Habit name"></div>
      <input class="m-line" value="${esc(h.sub || '')}" placeholder="A short description (optional)" data-input="habit-sub" data-id="${h.id}" aria-label="Description">
      <h3 class="m-h">Icon</h3>
      <div class="icon-grid">${HICONS.map(c => `<button class="${h.icon === c ? 'on' : ''}" data-key="${c}" data-act="habit-icon" data-id="${h.id}" data-v="${c}" aria-label="${c}">${icon(c)}</button>`).join('')}</div>
      <h3 class="m-h">Colour <small>Used when you tick it off</small></h3>
      ${colorPicker(h.color || 'blue', 'habit-color', h.id)}
      <h3 class="m-h">Repeat on <small>${schedText(h)}</small></h3>
      <div class="day-pick">${WD.map((c, i) => `<button class="${d.includes(i) ? 'on' : ''}" data-key="d${i}" data-act="habit-day" data-id="${h.id}" data-v="${i}" aria-pressed="${d.includes(i)}" aria-label="${WDN[i]}">${c}</button>`).join('')}</div>
      <div class="presets"><button class="btn sm ghost" data-act="habit-preset" data-id="${h.id}" data-v="all">Every day</button><button class="btn sm ghost" data-act="habit-preset" data-id="${h.id}" data-v="weekdays">Weekdays</button><button class="btn sm ghost" data-act="habit-preset" data-id="${h.id}" data-v="weekends">Weekends</button></div>
      <div class="m-progress"><div><b>${S.streak(h.id)}</b><small>day streak · best ${S.bestStreak(h.id)}</small></div>${bar(S.habitRate(h.id, 30))}</div>
      <div class="m-foot"><span class="row-gap"><button class="btn ghost" data-act="habit-move" data-id="${h.id}" data-v="-1">${icon('chevL')}Earlier</button><button class="btn ghost" data-act="habit-move" data-id="${h.id}" data-v="1">Later${icon('chevR')}</button></span><button class="btn ghost danger" data-act="habit-del" data-id="${h.id}">${icon('trash')}Delete</button></div>
    </div>`;
  };

  /* ---------- calendar ---------- */
  V.calendar = () => {
    const s = S.s, t = D.today(), ym = ui.calM || t.slice(0, 7), [y, m] = ym.split('-').map(Number);
    const sel = ui.calSel || (ym === t.slice(0, 7) ? t : ym + '-01');
    const off = (new Date(y, m - 1, 1).getDay() + 6) % 7, dim = new Date(y, m, 0).getDate(), total = Math.ceil((off + dim) / 7) * 7;

    const cells = Array.from({ length: total }, (_, i) => {
      const d = new Date(y, m - 1, 1 - off + i), k = D.key(d), out = d.getMonth() !== m - 1;
      const evs = S.eventsOn(k), mood = s.moods[k], tasks = S.tasksOn(k), dn = tasks.filter(x => x.done).length;
      const hs = S.habitsFor(k), hf = hs.length ? S.dayHabitFrac(k) : 0, j = s.journal[k];
      const tip = `${D.long(k)}${j && j.title ? ' — ' + j.title : ''}`;
      return `<button class="cc${out ? ' out' : ''}${k === t ? ' today' : ''}${k === sel ? ' sel' : ''}${k < t ? ' past' : ''}" data-key="${k}" data-act="cal-select" data-day="${k}" title="${esc(tip)}">
        <span class="cc-top"><span class="cc-n">${d.getDate()}</span>${mood ? `<i class="cc-mood" style="--fc:${MOOD[mood].c}" title="Feeling: ${MOOD[mood].name}"></i>` : ''}</span>
        <span class="cc-evs">${evs.slice(0, 2).map(e => `<span class="cc-ev" style="--ev:${U.evHex(e.color)}">${e.allDay ? '' : `<small>${fmtTime(e.time).replace(':00', '').replace(' ', '').toLowerCase()}</small>`}${esc(e.title)}</span>`).join('')}${evs.length > 2 ? `<small class="cc-more">+${evs.length - 2} more</small>` : ''}</span>
        <span class="cc-foot">${S.hasEntry(k) ? `<span class="cc-entry" title="Has an entry">${icon('file')}</span>` : ''}${tasks.length ? `<small>${dn}/${tasks.length}</small>` : ''}</span>
        ${k <= t && hs.length && hf > 0 ? `<i class="cc-hab tone-${tone(hf)}" style="width:${pct(hf)}%"></i>` : ''}
      </button>`;
    }).join('');

    /* selected-day panel */
    const evs = S.eventsOn(sel), tasks = S.tasksOn(sel), notes = S.notesOn(sel), j = s.journal[sel], lv = s.moods[sel];
    const hs = S.habitsFor(sel), future = sel > t;
    const panel = `<aside class="card day-panel">
      <header class="dp-head"><div><span class="eyebrow">${D.rel(sel)}</span><h2>${D.long(sel)}</h2></div><a class="btn primary sm" href="#/daily/${sel}">Open entry${icon('arrowR')}</a></header>
      ${future ? `<div class="dp-hint">${icon('repeat')}Events and tasks scheduled for this day appear in its daily entry automatically.</div>` : ''}
      <div class="dp-sec"><h4>Feeling</h4>${lv ? `<span class="dp-mood" style="--fc:${MOOD[lv].c}">${icon('face' + lv)}<b>${MOOD[lv].name}</b>${s.moodNotes[sel] ? `<small>${esc(s.moodNotes[sel])}</small>` : ''}</span>` : `<p class="empty-line">${future ? 'Not logged yet.' : 'No mood logged.'}</p>`}</div>
      <div class="dp-sec"><h4>Events</h4><div class="ev-list">${evs.map(e => eventRow(e, sel)).join('') || empty('No events.')}</div>${addRow('Add an event', `data-enter="event-add" data-day="${sel}"`)}</div>
      <div class="dp-sec"><h4>Tasks <small>${tasks.filter(x => x.done).length}/${tasks.length}</small></h4><div class="task-list">${tasks.map(x => taskRow(x)).join('') || empty('No tasks.')}</div>${addRow('Add a task', `data-enter="task-add" data-day="${sel}"`)}</div>
      ${!future || hs.some(h => S.done(h.id, sel)) ? `<div class="dp-sec"><h4>Habits <small>${hs.filter(h => S.done(h.id, sel)).length}/${hs.length}</small></h4><div class="habit-chips">${hs.map(h => { const on = S.done(h.id, sel); return `<button class="hchip${on ? ' on' : ''}" style="${U.habStyle(h)}" data-key="${h.id}" data-act="habit-toggle" data-id="${h.id}" data-day="${sel}" aria-pressed="${on}">${icon(on ? 'check' : h.icon)}${esc(h.name)}</button>`; }).join('') || empty('None scheduled.')}</div></div>` : ''}
      <div class="dp-sec"><h4>Journal & notes</h4>
        ${j && (j.title || j.body) ? `<a class="dp-entry" href="#/daily/${sel}"><b>${esc(j.title || 'Journal entry')}</b><p>${esc(j.body.slice(0, 160))}${j.body.length > 160 ? '…' : ''}</p></a>` : ''}
        ${notes.map(n => `<a class="dp-entry" data-key="${n.id}" href="#/daily/${sel}"><b>${esc(n.title || 'Untitled note')}</b><p>${esc(n.body.slice(0, 100))}</p></a>`).join('')}
        ${!(j && (j.title || j.body)) && !notes.length ? empty(future ? 'Nothing yet — you can write on the day.' : 'No entry for this day.') : ''}
      </div>
    </aside>`;

    /* agenda view */
    const upcoming = S.eventsBetween(t, D.add(t, 60));
    const groups = [...new Set(upcoming.map(x => x.day))].slice(0, 14);
    const upHtml = groups.map(k => `<div class="ag-day" data-key="u${k}"><div class="ag-label"><b>${D.rel(k)}</b><small>${D.longY(k)}</small></div>${upcoming.filter(x => x.day === k).map(x => eventRow(x.ev, k, { key: k })).join('')}</div>`).join('');
    const past = [];
    for (let i = 0; i <= 60 && past.length < 14; i++) { const k = D.add(t, -i); if (S.hasEntry(k) || s.moods[k]) past.push(k); }
    const pastHtml = past.map(k => {
      const j2 = s.journal[k], n = S.notesOn(k)[0], ts = S.tasksOn(k), mv = s.moods[k];
      return `<a class="pe-row" data-key="p${k}" href="#/daily/${k}"><span class="nd"><b>${Number(k.slice(8))}</b><small>${D.MON[Number(k.slice(5, 7)) - 1]}</small></span>
        <span class="nt"><strong>${esc((j2 && j2.title) || (n && n.title) || D.long(k))}</strong><small>${esc(((j2 && j2.body) || (n && n.body) || 'No written entry').slice(0, 90))}</small></span>
        <span class="pe-meta">${mv ? `<i class="cc-mood" style="--fc:${MOOD[mv].c}" title="${MOOD[mv].name}"></i>` : ''}${ts.length ? `<small>${ts.filter(x => x.done).length}/${ts.length}</small>` : ''}</span></a>`;
    }).join('');

    const nav = `<div class="cal-toolbar">
      <div class="week-nav"><button class="icon-btn" data-act="calm-nav" data-d="-1" aria-label="Previous month">${icon('chevL')}</button><b class="cal-title">${D.MONTHS[m - 1]} ${y}</b><button class="icon-btn" data-act="calm-nav" data-d="1" aria-label="Next month">${icon('chevR')}</button><button class="btn sm ghost" data-act="calm-nav" data-d="0">Today</button></div>
      <span class="spacer"></span>
      <div class="seg"><button class="${ui.calView === 'month' ? 'on' : ''}" data-act="cal-view" data-v="month">${icon('calendar')}Month</button><button class="${ui.calView === 'agenda' ? 'on' : ''}" data-act="cal-view" data-v="agenda">${icon('list')}Agenda</button></div>
      <button class="btn primary" data-act="event-new" data-day="${sel}">${icon('plus')}Add event</button></div>`;

    const legend = `<div class="cal-legend"><span><i class="cc-mood" style="--fc:${MOOD[4].c}"></i>Mood</span><span>${icon('file')}Has an entry</span><span><i class="lg-bar"></i>Habits done</span><span><i class="lg-ev"></i>Event</span></div>`;

    return `
    ${pageHead('Past, present & planned', 'Calendar', 'See past entries at a glance and schedule what is coming. Scheduled events appear in the daily entry when the day arrives.', Mascot.html('mini', 'calendar'))}
    ${nav}
    ${ui.calView === 'month' ? `<div class="cal-layout">
        <section class="card cal-card"><div class="cal-dow-row">${WDN.map(d => `<span>${d}</span>`).join('')}</div><div class="cal-cells" data-month="${ym}">${cells}</div>${legend}</section>
        ${panel}</div>`
        : `<div class="grid-2">
        ${card('', 'Coming up', `<span class="muted">Next 60 days</span>`, `<div class="agenda">${upHtml || empty('Nothing scheduled. Add an event to see it here.')}</div>`)}
        ${card('', 'Past entries', `<span class="muted">Most recent first</span>`, `<div class="note-list">${pastHtml || empty('No entries yet.')}</div>`)}
      </div>`}`;
  };

  /* ---------- event modal ---------- */
  V.modals.event = m => {
    const e = S.event(m.id); if (!e) return null;
    return `<div class="m-head"><span class="eyebrow">Event</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <input class="m-title" value="${esc(e.title)}" data-input="event-title" data-id="${e.id}" aria-label="Event title" placeholder="Event name" ${m.fresh ? 'data-autofocus' : ''}>
      <div class="m-fields">
        <label>Date<input type="date" value="${e.date}" data-change="event-date" data-id="${e.id}"></label>
        <label>Repeat<select data-change="event-repeat" data-id="${e.id}">${['none', 'daily', 'weekly', 'monthly', 'yearly'].map(r => opt(r, r === 'none' ? 'Does not repeat' : 'Every ' + ({ daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' })[r], (e.repeat || 'none') === r)).join('')}</select></label>
        ${e.repeat && e.repeat !== 'none' ? `<label>Until<input type="date" value="${e.until || ''}" data-change="event-until" data-id="${e.id}"></label>` : ''}
      </div>
      <label class="check-line"><input type="checkbox" data-change="event-allday" data-id="${e.id}" ${e.allDay ? 'checked' : ''}> All day</label>
      ${e.allDay ? '' : `<div class="m-fields"><label>Starts<input type="time" value="${e.time || ''}" data-change="event-time" data-id="${e.id}"></label><label>Ends<input type="time" value="${e.endTime || ''}" data-change="event-end" data-id="${e.id}"></label></div>`}
      ${colorPicker(e.color || 'blue', 'event-color', e.id)}
      <textarea class="m-desc" rows="2" placeholder="Notes (optional)" data-input="event-notes" data-id="${e.id}" aria-label="Notes">\n${esc(e.notes || '')}</textarea>
      <div class="dp-hint">${icon('calendar')}This event shows in the daily entry for ${D.long(e.date)}${e.repeat && e.repeat !== 'none' ? ' and every repeat after it' : ''}.</div>
      <div class="m-foot"><a class="btn ghost" href="#/daily/${e.date}" data-act="modal-close">${icon('book')}Open that day</a><button class="btn ghost danger" data-act="event-del" data-id="${e.id}">${icon('trash')}Delete</button></div>
    </div>`;
  };

  /* ---------- years: switch, review, start fresh ---------- */
  const closeBtn = `<button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button>`;
  const stat = (label, val, sub, f) => `<div class="stat"><span>${label}</span><b>${val}</b>${f == null ? '' : bar(f)}<small>${sub}</small></div>`;

  V.modals.year = () => {
    const cur = Number(D.today().slice(0, 4)), ry = Number(D.real().slice(0, 4));
    const tiles = S.yearsList().slice().reverse().map(y => {
      const st = S.yearStats(y), started = !!S.s.years[y], kind = y === ry ? 'now' : y < ry ? 'past' : 'next';
      return `<div class="yr-tile${y === cur ? ' on' : ''}" data-key="${y}">
        <div class="yr-top"><b>${y}</b><span class="yr-tag ${kind}">${y === ry ? 'Current year' : y < ry ? 'Past year' : started ? 'Next year · started' : 'Next year'}</span></div>
        <p>${st.done}/${st.tasks} tasks · ${plural(st.entries, 'journal entry').replace('entrys', 'entries')} · ${plural(st.goals, 'goal')}</p>
        <div class="yr-actions"><button class="btn sm${y === cur ? '' : ' primary'}" data-act="year-set" data-y="${y}" ${y === cur ? 'disabled' : ''}>${y === cur ? 'Viewing' : 'Open'}</button><button class="btn sm ghost" data-act="year-review" data-y="${y}">${icon('award')}Review</button>${y > ry && !started ? `<button class="btn sm" data-act="year-start" data-y="${y}">${icon('sparkles')}Start ${y}</button>` : ''}</div></div>`;
    }).join('');
    return `<div class="m-head"><span class="eyebrow">Switch year</span>${closeBtn}</div>
      <div class="m-body"><p class="muted">Each year keeps its own goals, calendar, habit history and entries. Switch to look back, or plan the next year ahead of time.</p><div class="yr-list">${tiles}</div></div>`;
  };

  V.modals.review = m => {
    const y = m.y, st = S.yearStats(y), goals = S.goalsFor('year', String(y)), mood = Math.round(st.mood);
    return `<div class="m-head"><span class="eyebrow">Year in review</span>${closeBtn}</div>
      <div class="m-body"><h2 class="rv-title">${y}</h2>
        <div class="stats rv-stats">
          ${stat('Tasks done', st.done, `of ${st.tasks} planned`, st.tasks ? st.done / st.tasks : 0)}
          ${stat('Habit check-ins', st.checkins, 'ticked off', null)}
          ${stat('Journal', st.entries, `${st.words.toLocaleString()} words written`, null)}
          ${stat('Mood', mood ? U.MOOD[mood].name : '—', st.daysLogged ? `average over ${plural(st.daysLogged, 'day')}` : 'no days logged', st.mood ? st.mood / 5 : null)}
        </div>
        <h3 class="m-h">${icon('flag')}Year goals <small>${st.goals ? `${st.goalsDone} of ${st.goals} completed` : 'none set'}</small></h3>
        <div class="rv-goals">${goals.map(g => { const i = S.goalInfo(g); return `<div class="rv-goal"><span>${esc(g.title)}</span><div>${bar(i.pct)}<b>${pct(i.pct)}%</b></div></div>`; }).join('') || empty('No year goals were set.')}</div>
        <div class="m-foot"><span class="muted">${plural(st.notes, 'note')} · ${plural(st.events, 'event')}</span><button class="btn primary" data-act="year-set" data-y="${y}">Open ${y}</button></div></div>`;
  };

  V.modals.newyear = m => {
    const ny = m.y, py = ny - 1, st = S.yearStats(py), o = ui.ny;
    const unfinished = S.goalsFor('year', String(py)).filter(g => S.goalInfo(g).pct < 1).length;
    const late = S.s.tasks.filter(t => !t.done && t.date && t.date >= `${py}-12-18` && t.date <= `${py}-12-31`).length;
    const row = (k, label, hint) => `<label class="ny-opt"><input type="checkbox" data-change="ny-opt" data-k="${k}" ${o[k] ? 'checked' : ''}><span><b>${label}</b><small>${hint}</small></span></label>`;
    return `<div class="m-head"><span class="eyebrow">A fresh start</span>${closeBtn}</div>
      <div class="m-body"><h2 class="rv-title">Start ${ny}</h2>
        <p class="muted">In ${py} you finished <b>${st.done}</b> tasks, ticked <b>${st.checkins}</b> habit check-ins and wrote <b>${st.entries}</b> journal entries. ${py} stays in the archive — you can switch back to it any time.</p>
        <div class="ny-opts">
          ${row('goals', `Carry over unfinished year goals`, unfinished ? `${plural(unfinished, 'goal')} will be copied into ${ny} with progress reset.` : 'Nothing unfinished to carry over.')}
          ${row('tasks', 'Move late-December tasks to 1 January', late ? `${plural(late, 'unfinished task')} from the last two weeks of ${py}.` : 'No unfinished tasks from late December.')}
          ${row('focus', `Start from last year’s focus line`, `Copy your ${py} focus statement as a starting point.`)}
        </div>
        <div class="dp-hint">${icon('repeat')}Habits and their streaks, projects, overarching goals and repeating events carry on automatically.</div>
        <div class="m-foot"><button class="btn ghost" data-act="year-review" data-y="${py}">${icon('award')}See ${py} review</button><button class="btn primary" data-act="ny-begin" data-y="${ny}">${icon('sparkles')}Begin ${ny}</button></div></div>`;
  };

  /* ---------- backup (desktop browsers) ---------- */
  const isDesktop = () => !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && matchMedia('(pointer: fine)').matches;
  function backupBlock() {
    if (!isDesktop()) return `<p class="muted">Saving a backup file is available from a desktop browser.</p>`;
    const last = S.s.prefs.lastBackup, r = ui.restore;
    const when = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const n = r && r.data;
    return `<div class="backup">
      <p class="muted">Save a copy of everything — entries, habits, goals, photos and boards — to this computer. The file is not encrypted, so keep it somewhere safe.</p>
      <p class="last-backup">${icon('clock')}${last ? `Last backup: ${when(last)}` : 'No backup saved yet'}</p>
      <div class="sec-actions"><button class="btn primary" data-act="backup-download">${icon('download')}Download backup</button><button class="btn ghost" data-act="restore-pick">${icon('upload')}Restore from a backup</button></div>
      ${r ? `<div class="restore-box"><b>Replace your current data with this backup?</b><small>Saved ${r.exported ? when(r.exported) : 'earlier'} · ${n.tasks.length} tasks, ${Object.keys(n.journal || {}).length} journal entries, ${n.habits.length} habits, ${n.projects.length} projects. Your current data will be overwritten.</small><div class="sec-btns"><button class="btn primary sm" data-act="restore-confirm">Replace my data</button><button class="btn ghost sm" data-act="restore-cancel">Cancel</button></div></div>` : ''}
      ${ui.restoreErr ? `<p class="sec-msg show">${esc(ui.restoreErr)}</p>` : ''}
    </div>`;
  }

  /* ---------- cloud sync ---------- */
  const pwField = (f, ph, autocomplete) => `<div class="pw-field"><input type="password" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} data-f="${f}" placeholder="${ph}" aria-label="${ph}"><button type="button" class="icon-btn sm pw-eye" data-pw-toggle tabindex="-1" aria-label="Show password">${icon('eye')}</button></div>`;

  function syncBlock() {
    const sy = ui.sync, when = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const msg = `<p class="sec-msg${sy.msg ? ' show' : ''} ${sy.ok ? 'ok' : ''}" role="status">${esc(sy.msg || '')}</p>`;

    if (!Sync.isSignedIn()) {
      if (sy.mode === 'reset') {
        return `<div class="backup">
          <p class="muted">Enter your account email and we’ll send a link to reset your password.</p>
          <div class="sec-form text" data-row-sync>
            <input type="email" autocomplete="email" data-f="email" placeholder="Email" aria-label="Email">
            <div class="sec-btns"><button class="btn primary sm" data-act="sync-reset-request">Send reset link</button><button class="btn ghost sm" data-act="sync-mode" data-v="signin">Back to sign in</button></div>
          </div>${msg}</div>`;
      }
      return `<div class="backup">
        <p class="muted">Sign in to sync your data to the cloud, so you can open the same dayleaf on another device.</p>
        <div class="seg"><button class="${sy.mode === 'signin' ? 'on' : ''}" data-act="sync-mode" data-v="signin">Sign in</button><button class="${sy.mode === 'signup' ? 'on' : ''}" data-act="sync-mode" data-v="signup">Sign up</button></div>
        <div class="sec-form text" data-row-sync>
          <input type="email" autocomplete="email" data-f="email" placeholder="Email" aria-label="Email">
          ${pwField('pw', 'Password', sy.mode === 'signup' ? 'new-password' : 'current-password')}
          <div class="sec-btns"><button class="btn primary sm" data-act="sync-auth">${sy.mode === 'signup' ? 'Create account' : 'Sign in'}</button>${sy.mode === 'signin' ? `<button class="lk-link" data-act="sync-mode" data-v="reset">Forgot password?</button>` : ''}</div>
        </div>${msg}</div>`;
    }
    if (Sync.needsPassphrase) {
      return `<div class="backup">
        <p class="muted">Signed in as <b>${esc(Sync.email())}</b>. Your cloud data is encrypted — enter the sync passphrase from your other device to unlock it here.</p>
        <div class="sec-form text" data-row-sync>
          ${pwField('pass', 'Sync passphrase')}
          <div class="sec-btns"><button class="btn primary sm" data-act="sync-unlock">Unlock</button><button class="btn ghost sm" data-act="sync-signout">Sign out</button></div>
        </div>${msg}</div>`;
    }
    if (!Sync.hasPassphrase() && !Sync.lastSyncedAt && !sy.encDecided) {
      return `<div class="backup">
        <p class="muted">Signed in as <b>${esc(Sync.email())}</b>. Add a sync passphrase to keep your data encrypted in the cloud — only you can read it, not even dayleaf's own code.</p>
        <div class="sec-form text" data-row-sync>
          ${pwField('pass', 'Sync passphrase')}
          ${pwField('passConf', 'Confirm passphrase')}
          <div class="sec-btns"><button class="btn primary sm" data-act="sync-enc-save">Enable encryption</button><button class="btn ghost sm" data-act="sync-enc-skip">Skip, sync without encryption</button></div>
        </div>${msg}</div>`;
    }
    const p = sy.pullPreview, n = p && p.data;
    return `<div class="backup">
      <p class="last-backup">${icon('cloud')}Signed in as <b>${esc(Sync.email())}</b> · ${Sync.lastSyncedAt ? `Last synced ${when(Sync.lastSyncedAt)}` : 'Not synced yet'}${Sync.hasPassphrase() ? ' · encrypted' : ''}</p>
      <div class="sec-actions"><button class="btn primary" data-act="sync-now">${icon('refresh')}Sync now</button><button class="btn ghost" data-act="sync-signout">Sign out</button></div>
      ${p ? `<div class="restore-box"><b>Replace your current data with the version from the cloud?</b><small>Synced ${when(p.updatedAt)} · ${n.tasks.length} tasks, ${Object.keys(n.journal || {}).length} journal entries, ${n.habits.length} habits, ${n.projects.length} projects. Your current data on this device will be overwritten.</small><div class="sec-btns"><button class="btn primary sm" data-act="sync-pull-confirm">Replace my data</button><button class="btn ghost sm" data-act="sync-pull-cancel">Cancel</button></div></div>` : ''}
      ${msg}</div>`;
  }

  /* ---------- settings & security ---------- */
  V.modals.profile = () => {
    const sec = ui.sec, on = Security.enabled(), enc = Security.encrypted(), m = Security.meta() || {};
    const pinInput = (f, ph) => `<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" data-f="${f}" placeholder="${ph}" aria-label="${ph}">`;
    const form = sec.step === 'idle' ? '' : `<div class="sec-form" data-row>
        ${sec.step !== 'set' ? pinInput('cur', 'Current PIN') : ''}
        ${sec.step !== 'remove' ? pinInput('new', 'New PIN (4–6 digits)') + pinInput('conf', 'Confirm new PIN') : ''}
        <div class="sec-btns"><button class="btn primary sm" data-act="sec-save">${sec.step === 'remove' ? 'Remove PIN' : 'Save PIN'}</button><button class="btn ghost sm" data-act="sec-cancel">Cancel</button></div></div>`;
    return `<div class="m-head"><span class="eyebrow">Settings</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
    <div class="m-body">
      <label class="m-field">Your name<input value="${esc(S.s.user.name)}" data-input="user-name" placeholder="Your name"><small>Used to greet you on the dashboard.</small></label>
      <div class="toggle-group">
        <label class="check-line"><input type="checkbox" data-change="mascot-show" ${S.s.prefs.mascotOn ? 'checked' : ''}> Show the bunny</label>
        <label class="check-line sub${S.s.prefs.mascotOn ? '' : ' dim'}"><input type="checkbox" data-change="mascot-visits" ${S.s.prefs.mascot ? 'checked' : ''} ${S.s.prefs.mascotOn ? '' : 'disabled'}> Let it pop by now and then</label>
      </div>

      <h3 class="m-h">${icon('shield')}Security</h3>
      <div class="sec-status ${on ? 'on' : ''}"><span class="ss-ic">${icon(on ? 'lock' : 'shield')}</span><div><b>${on ? 'PIN lock is on' : 'PIN lock is off'}</b><small>${on ? (enc ? 'Your data is stored encrypted (AES-256) and is unreadable without your PIN.' : 'Locks the app. Encryption needs a secure browser context (https or localhost).') : 'Add a PIN to lock dayleaf and encrypt everything stored in this browser.'}</small></div></div>
      ${form}
      <p class="sec-msg${sec.msg ? ' show' : ''} ${sec.ok ? 'ok' : ''}" role="status">${esc(sec.msg || '')}</p>
      ${sec.step === 'idle' ? `<div class="sec-actions">
        ${on ? `<button class="btn" data-act="sec-start" data-v="change">${icon('lock')}Change PIN</button><button class="btn ghost" data-act="sec-start" data-v="remove">Remove PIN</button><button class="btn ghost" data-act="lock-now">Lock now</button>` : `<button class="btn primary" data-act="sec-start" data-v="set">${icon('shield')}Set a PIN</button>`}
      </div>` : ''}
      ${on ? `<label class="m-field">Auto-lock after inactivity<select data-change="autolock">${[[1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [0, 'Never']].map(([v, l]) => opt(String(v), l, (m.autoLock ?? 5) === v)).join('')}</select></label>` : ''}
      <ul class="sec-notes"><li>Five wrong PINs trigger a timed pause that gets longer each time.</li><li>Data never leaves this device. If you forget your PIN it cannot be recovered.</li></ul>

      <h3 class="m-h">${icon('download')}Backup</h3>
      ${backupBlock()}

      <h3 class="m-h">${icon('cloud')}Sync across devices</h3>
      ${syncBlock()}

      <h3 class="m-h">Data</h3>
      <div class="m-foot"><button class="btn ghost" data-act="reset-demo">${icon('refresh')}Reload sample data</button><button class="btn ghost danger" data-act="wipe-all">${icon('trash')}Start empty</button></div>
    </div>`;
  };

  /* ---------- finish a password reset after the email link lands back here ---------- */
  V.modals.resetpw = () => {
    const r = ui.reset;
    return `<div class="m-head"><span class="eyebrow">Reset password</span>${closeBtn}</div>
    <div class="m-body">
      <p class="muted">Choose a new password for your dayleaf account.</p>
      <div class="sec-form text" data-row-sync>
        ${pwField('pw', 'New password', 'new-password')}
        ${pwField('pwConf', 'Confirm new password', 'new-password')}
        <div class="sec-btns"><button class="btn primary sm" data-act="resetpw-save">Save new password</button></div>
      </div>
      <p class="sec-msg${r.msg ? ' show' : ''} ${r.ok ? 'ok' : ''}" role="status">${esc(r.msg || '')}</p>
    </div>`;
  };
})(window);
