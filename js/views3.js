/* dayleaf — journal, notes and about-me pages */
(function (g) {
  const { D, esc, icon, MOOD } = U;
  const S = Store, ui = App.ui, V = Views;
  const { bar, empty, plural, pageHead, addRow, opt } = V.h;

  const words = t => (t && t.trim() ? t.trim().split(/\s+/).length : 0);
  const stat = (label, val, sub) => `<div class="stat"><span>${label}</span><b>${val}</b><small>${sub}</small></div>`;
  const searchField = (ph, val, input) => `<label class="search-field">${icon('search')}<input type="search" value="${esc(val)}" placeholder="${ph}" data-input="${input}" aria-label="${ph}"></label>`;
  const sortSeg = (cur, act) => `<div class="seg"><button class="${cur === 'new' ? 'on' : ''}" data-act="${act}" data-v="new">Newest</button><button class="${cur === 'old' ? 'on' : ''}" data-act="${act}" data-v="old">Oldest</button></div>`;

  /* ---------- journal & notes: this week, then "past posts" you can browse by week, month or year ---------- */
  const groupKey = (mode, d) => (mode === 'week' ? D.weekKey(d) : mode === 'month' ? d.slice(0, 7) : d.slice(0, 4));
  const groupLabel = (mode, k, withYear) => (mode === 'week' ? `Week ${D.weekNum(k)} · ${D.label('week', k)}${withYear ? ', ' + k.slice(0, 4) : ''}` : mode === 'month' ? D.label('month', k) : k);
  const browseSeg = (cur, act, all) => `<div class="seg">${['week', 'month'].concat(all ? ['year'] : []).map(m => `<button class="${cur === m ? 'on' : ''}" data-act="${act}" data-v="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>`;
  const yearsToggle = () => `<label class="check-line mini"><input type="checkbox" data-change="all-years" ${ui.allYears ? 'checked' : ''}> All years</label>`;

  function pastCard(kind, items, mode, render, preview, noun) {
    const groups = [];
    items.forEach(it => { const k = groupKey(mode, it.date); let gr = groups[groups.length - 1]; if (!gr || gr.k !== k) { gr = { k, list: [] }; groups.push(gr); } gr.list.push(it); });
    const body = groups.map((gr, i) => {
      const key = `${kind}:${mode}:${gr.k}`, open = ui.pastOpen[key] ?? (i === 0);
      return `<div class="pg${open ? ' open' : ''}" data-key="${key}"><button class="pg-head" data-act="past-toggle" data-k="${key}" aria-expanded="${open}"><span class="pg-chev">${icon('chevR')}</span><span class="pg-label"><b>${groupLabel(mode, gr.k, ui.allYears)}</b><small>${preview(gr.list)}</small></span><span class="pg-count">${gr.list.length}</span></button>
        ${open ? `<div class="pg-body">${gr.list.map(render).join('')}</div>` : ''}</div>`;
    }).join('');
    return `<section class="card past-card"><header class="card-head"><div><h2>Past Posts</h2><p class="muted">${plural(items.length, noun)} older than a week — browse by</p></div>${browseSeg(mode, kind === 'j' ? 'jbrowse' : 'nbrowse', ui.allYears)}</header><div class="pg-list">${body}</div></section>`;
  }

  V.journal = () => {
    const s = S.s, t = D.today(), yr = t.slice(0, 4), weekAgo = D.add(t, -6);
    const has = k => (s.journal[k].body || '').trim() || (s.journal[k].title || '').trim();
    const all = Object.keys(s.journal).filter(has);
    let days = ui.allYears ? all.slice() : all.filter(d => d.slice(0, 4) === yr);
    const total = days.length, totalWords = days.reduce((a, k) => a + words(s.journal[k].body), 0);
    let streak = 0, k = t; if (!all.includes(k)) k = D.add(k, -1);
    while (all.includes(k)) { streak++; k = D.add(k, -1); }
    const q = ui.journalQ.trim().toLowerCase();
    days.sort(); if (ui.journalSort === 'new') days.reverse();
    const mode = !ui.allYears && ui.jBrowse === 'year' ? 'month' : ui.jBrowse;

    const entry = d => {
      const j = s.journal[d], open = !!ui.jOpen[d], lv = s.moods[d], w = words(j.body);
      return `<article class="j-card${open ? ' open' : ''}" data-key="${d}">
        <div class="j-date"><small>${D.DOW[D.parse(d).getDay()]}</small><b>${Number(d.slice(8))}</b><span>${D.MON[Number(d.slice(5, 7)) - 1]}</span></div>
        <div class="j-main">
          <header><h3>${esc(j.title || 'Untitled entry')}</h3><span class="j-meta">${lv ? `<i class="cc-mood" style="--fc:${MOOD[lv].c}"></i>${MOOD[lv].name} · ` : ''}${plural(w, 'word')}</span></header>
          <div class="j-body rt-view${open ? '' : ' clamp'}">${U.sanitize(j.html || U.plainToHtml(j.body)) || '<p></p>'}</div>
          <footer><button class="btn sm ghost" data-act="journal-toggle" data-day="${d}">${open ? 'Show less' : 'Read more'}</button><button class="btn sm" data-act="journal-open" data-day="${d}">${icon('pencil')}Open &amp; edit</button></footer>
        </div></article>`;
    };
    const preview = list => esc(list.slice(0, 2).map(it => s.journal[it.date].title || 'Untitled').join(' · ')) + (list.length > 2 ? ' …' : '');

    let content;
    if (q) {
      const hits = days.filter(d => `${s.journal[d].title} ${s.journal[d].body}`.toLowerCase().includes(q));
      content = hits.length ? `<div class="section-title"><h2>Results</h2><span class="muted">${plural(hits.length, 'entry').replace('entrys', 'entries')}</span></div><div class="j-list stagger">${hits.map(entry).join('')}</div>` : '';
    } else {
      const recent = days.filter(d => d >= weekAgo), older = days.filter(d => d < weekAgo);
      content = (recent.length ? `<section class="j-group"><div class="section-title"><h2>This Week</h2><span class="muted">${plural(recent.length, 'entry').replace('entrys', 'entries')}</span></div><div class="j-list stagger">${recent.map(entry).join('')}</div></section>` : '')
        + (older.length ? pastCard('j', older.map(d => ({ date: d })), mode, it => entry(it.date), preview, 'entry').replace('entrys', 'entries') : '');
      if (!content && days.length) content = '';
    }
    if (!content) content = `<div class="card empty-card"><b>${q ? 'No entries match your search' : 'No journal entries yet'}</b><p>${q ? 'Try another word.' : 'Open today’s entry in Write mode and start with a single sentence.'}</p></div>`;

    return `
    ${pageHead(`${plural(total, 'entry').replace('entrys', 'entries')} · ${totalWords.toLocaleString()} words${ui.allYears ? '' : ' · ' + yr}`, 'Journal', 'Your journal entries: the last week up front, everything older tucked into past posts.',
      `${Mascot.html('mini', 'journal')}<button class="btn primary" data-act="journal-open" data-day="${t}">${icon('pencil')}Write today’s entry</button>`)}
    <div class="stats three">${stat('Entries', total, ui.allYears ? 'across all years' : `written in ${yr}`)}${stat('Words', totalWords.toLocaleString(), 'across these entries')}${stat('Writing streak', `${streak} ${streak === 1 ? 'day' : 'days'}`, 'in a row')}</div>
    <div class="toolbar">${searchField('Search your entries', ui.journalQ, 'journal-q')}${yearsToggle()}<span class="spacer"></span>${sortSeg(ui.journalSort, 'journal-sort')}</div>
    ${content}`;
  };

  /* ---------- notes ---------- */
  V.notes = () => {
    const s = S.s, t = D.today(), yr = t.slice(0, 4), weekAgo = D.add(t, -6), q = ui.notesQ.trim().toLowerCase();
    let list = s.notes.filter(n => ui.allYears || n.date.slice(0, 4) === yr);
    const total = list.length;
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    if (ui.notesSort === 'new') list.reverse();
    const mode = !ui.allYears && ui.nBrowse === 'year' ? 'month' : ui.nBrowse;
    const card = n => `<article class="note" data-key="${n.id}">
      <div class="note-top"><span>${n.createdAt > 1e12 ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Note'}</span><button class="icon-btn sm ghost" data-act="note-del" data-id="${n.id}" aria-label="Delete note">${icon('trash')}</button></div>
      <input class="note-title" value="${esc(n.title)}" placeholder="Title" data-input="note-title" data-id="${n.id}" aria-label="Note title">
      <textarea class="note-body" rows="3" placeholder="Write something…" data-input="note-body" data-id="${n.id}" aria-label="Note">\n${esc(n.body)}</textarea></article>`;
    const dayGroups = arr => { const gs = []; arr.forEach(n => { let gr = gs[gs.length - 1]; if (!gr || gr.date !== n.date) { gr = { date: n.date, list: [] }; gs.push(gr); } gr.list.push(n); }); return gs; };
    const dayBlock = gr => `<section class="n-group" data-key="${gr.date}"><div class="section-title"><h2>${D.long(gr.date)}${gr.date === t ? ' <em class="today-tag">Today</em>' : ''}</h2><a class="link" href="#/daily/${gr.date}">Open daily entry ${icon('arrowUR')}</a></div><div class="notes-grid stagger">${gr.list.map(card).join('')}</div></section>`;
    const byId = {}; list.forEach(n => { byId[n.id] = n; });
    const preview = arr => esc(arr.slice(0, 2).map(it => byId[it.id].title || 'Untitled').join(' · ')) + (arr.length > 2 ? ' …' : '');

    let content;
    if (q) {
      const hits = list.filter(n => `${n.title} ${n.body}`.toLowerCase().includes(q));
      content = hits.length ? `<div class="section-title"><h2>Results</h2><span class="muted">${plural(hits.length, 'note')}</span></div><div class="notes-grid stagger">${hits.map(card).join('')}</div>` : '';
    } else {
      const recent = list.filter(n => n.date >= weekAgo), older = list.filter(n => n.date < weekAgo);
      content = dayGroups(recent).map(dayBlock).join('')
        + (older.length ? pastCard('n', older.map(n => ({ date: n.date, id: n.id })), mode, it => card(byId[it.id]), preview, 'note') : '');
    }
    if (!content) content = `<div class="card empty-card"><b>${q ? 'No notes match your search' : 'No notes yet'}</b><p>${q ? 'Try another word.' : 'Add a quick note for today.'}</p></div>`;

    return `
    ${pageHead(`${plural(total, 'note')}${ui.allYears ? ' in total' : ' in ' + yr}`, 'Notes', 'Quick notes: the last week up front, older ones in past posts. Edit them right here.',
      `${Mascot.html('mini', 'notes')}<button class="btn primary" data-act="note-add" data-day="${t}">${icon('plus')}New note</button>`)}
    <div class="toolbar">${searchField('Search your notes', ui.notesQ, 'notes-q')}${yearsToggle()}<span class="spacer"></span>${sortSeg(ui.notesSort, 'notes-sort')}</div>
    ${content}`;
  };

  /* ---------- about me ---------- */
  const WHEEL = [['faith', 'Faith & Spirit', 'Faith'], ['health', 'Health', 'Health'], ['family', 'Family & Friends', 'Family'], ['career', 'Career', 'Career'], ['money', 'Finances', 'Finances'], ['learning', 'Learning', 'Learning'], ['creativity', 'Creativity', 'Creativity'], ['rest', 'Rest & Fun', 'Rest']];
  const SUGGEST = ['Faith', 'Gratitude', 'Patience', 'Kindness', 'Growth', 'Honesty', 'Family', 'Creativity', 'Health', 'Courage', 'Learning', 'Service', 'Balance', 'Discipline'];

  function radar(w) {
    const cx = 170, cy = 165, R = 100, n = WHEEL.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, v) => { const r = R * v / 10; return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]; };
    const poly = (fn) => WHEEL.map((k, i) => fn(k[0], i).map(x => x.toFixed(1)).join(',')).join(' ');
    const rings = [2, 4, 6, 8, 10].map(v => `<polygon points="${poly((k, i) => pt(i, v))}" class="rd-ring"/>`).join('');
    const axes = WHEEL.map((k, i) => { const [x, y] = pt(i, 10); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rd-axis"/>`; }).join('');
    const labels = WHEEL.map((k, i) => { const [x, y] = pt(i, 11.9), c = Math.cos(ang(i)); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'}" class="rd-label">${k[2]}</text>`; }).join('');
    const dots = WHEEL.map((k, i) => { const [x, y] = pt(i, w[k[0]].now); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="rd-dot"/>`; }).join('');
    return `<svg class="radar" viewBox="0 0 340 330" role="img" aria-label="Life wheel: where you are now compared with where you want to be">${rings}${axes}
      <polygon points="${poly((k, i) => pt(i, w[k].goal))}" class="rd-goal"/><polygon points="${poly((k, i) => pt(i, w[k].now))}" class="rd-now"/>${dots}${labels}</svg>`;
  }

  V.about = () => {
    const a = S.s.about, t = D.today(), done = new Set(a.affirmDone[t] || []), yr = t.slice(0, 4);
    const doneN = a.affirmations.filter(x => done.has(x.id)).length;
    const sugg = SUGGEST.filter(x => !a.values.map(v => v.toLowerCase()).includes(x.toLowerCase()));
    const chip = (kind, v) => `<span class="chip-del" data-key="${esc(v)}"><b>${esc(v)}</b><button data-act="${kind}-del" data-v="${esc(v)}" aria-label="Remove ${esc(v)}">${icon('x')}</button></span>`;
    const letters = a.letters.slice().sort((x, y) => x.openOn.localeCompare(y.openOn));

    return `
    ${pageHead('Manifest & plan', 'About Me', 'A space to imagine who you want to become, then turn it into small, real steps. Play with it — nothing here is fixed.', Mascot.html('mini', 'about'))}

    <section class="card identity-card">
      <span class="fc-label">${icon('sparkles')}I am becoming…</span>
      <textarea class="identity" rows="2" data-input="about-identity" placeholder="Describe the person you are growing into…" aria-label="Who I am becoming">\n${esc(a.identity)}</textarea>
      <div class="chip-row">${a.traits.map(x => chip('trait', x)).join('')}<input class="chip-add" placeholder="+ Add a quality" data-enter="trait-add" aria-label="Add a quality"></div>
    </section>

    <div class="grid-2">
      <section class="card">
        <header class="card-head"><h2>Core Values</h2><span class="muted">What guides your choices</span></header>
        <div class="chip-row">${a.values.map(x => chip('value', x)).join('') || empty('Add the values you want to live by.')}<input class="chip-add" placeholder="+ Add a value" data-enter="value-add" aria-label="Add a value"></div>
        ${sugg.length ? `<div class="sub-head">${icon('sparkles')}Ideas</div><div class="sugg">${sugg.slice(0, 10).map(x => `<button data-key="${x}" data-act="value-add" data-v="${x}">+ ${x}</button>`).join('')}</div>` : ''}
      </section>
      <section class="card">
        <header class="card-head"><h2>Daily Affirmations</h2><span class="muted">${doneN} of ${a.affirmations.length} said today</span></header>
        ${a.affirmations.length ? bar(doneN / a.affirmations.length, 'slim') : ''}
        <div class="aff-list">${a.affirmations.map(x => `<div class="aff${done.has(x.id) ? ' done' : ''}" data-key="${x.id}"><button class="check round${done.has(x.id) ? ' on' : ''}" data-act="affirm-toggle" data-id="${x.id}" role="checkbox" aria-checked="${done.has(x.id)}" aria-label="Said today">${icon('check')}</button><input value="${esc(x.text)}" data-input="affirm-text" data-id="${x.id}" aria-label="Affirmation"><button class="icon-btn sm ghost del" data-act="affirm-del" data-id="${x.id}" aria-label="Delete">${icon('x')}</button></div>`).join('') || empty('Write a few kind sentences to repeat to yourself.')}</div>
        ${addRow('Add an affirmation', 'data-enter="affirm-add"')}
      </section>
    </div>

    <section class="card wheel-card">
      <header class="card-head"><div><h2>Life Wheel</h2><p class="muted">Rate where you are now and where you want to be, from 1 to 10.</p></div><div class="rd-legend"><span><i class="now"></i>Now</span><span><i class="goal"></i>Where I want to be</span></div></header>
      <div class="wheel">
        ${radar(a.wheel)}
        <div class="wheel-rows">${WHEEL.map(([key, label]) => { const w = a.wheel[key]; return `<div class="wr" data-key="${key}">
          <b>${label}</b>
          <label>Now <output>${w.now}</output><input type="range" min="1" max="10" value="${w.now}" data-input="wheel-now" data-id="${key}"></label>
          <label>Goal <output>${w.goal}</output><input type="range" min="1" max="10" value="${w.goal}" data-input="wheel-goal" data-id="${key}"></label>
          <input class="wr-note" value="${esc(w.note || '')}" placeholder="What would a 10 look like?" data-input="wheel-note" data-id="${key}" aria-label="${label} vision">
          <button class="btn sm ghost" data-act="wheel-goal" data-id="${key}" title="Add to this year’s goals">${icon('flag')}Make it a goal</button></div>`; }).join('')}</div>
      </div>
    </section>

    <section class="card">
      <header class="card-head"><div><h2>Letters To Future Me</h2><p class="muted">Write now, seal it, and it lands in your daily entry on the day you choose.</p></div><button class="btn sm" data-act="letter-new">${icon('plus')}Write a letter</button></header>
      <div class="letter-list">${letters.map(l => { const sealed = l.openOn > t; return `<button class="letter-row${sealed ? ' sealed' : ''}" data-key="${l.id}" data-act="letter-open" data-id="${l.id}"><span class="lr-ic">${icon(sealed ? 'lock' : 'mail')}</span><span><b>${esc(l.title || 'Untitled letter')}</b><small>${sealed ? `Sealed until ${D.longY(l.openOn)}` : `Opened on ${D.longY(l.openOn)}`}</small></span>${icon('chevR')}</button>`; }).join('') || empty('No letters yet.')}</div>
    </section>

    ${Board.html('about', { title: 'Vision Board', sub: 'Pictures, words and colours for the life you are building. Drop images straight onto the canvas.', saved: 'Saved to About Me' })}`;
  };

  /* ---------- letter modal ---------- */
  V.modals.letter = m => {
    const l = S.letter(m.id); if (!l) return null;
    const t = D.today(), sealed = l.openOn > t && !m.fresh;
    if (sealed) return `<div class="m-head"><span class="eyebrow">Sealed letter</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
      <div class="m-body seal"><div class="seal-ic">${icon('lock')}</div><h3>${esc(l.title || 'Untitled letter')}</h3><p>This letter is sealed until <b>${D.longY(l.openOn)}</b>. It will appear in your daily entry that day.</p>
      <label class="m-field">Change the opening date<input type="date" value="${l.openOn}" min="${D.add(t, 1)}" data-change="letter-date" data-id="${l.id}"></label>
      <div class="m-foot"><span></span><button class="btn ghost danger" data-act="letter-del" data-id="${l.id}">${icon('trash')}Delete letter</button></div></div>`;
    return `<div class="m-head"><span class="eyebrow">${l.openOn > t ? 'New letter' : 'Letter from the past'}</span><button class="icon-btn m-close" data-act="modal-close" aria-label="Close">${icon('x')}</button></div>
      <div class="m-body">
        <input class="m-title" value="${esc(l.title)}" placeholder="Dear future me…" data-input="letter-title" data-id="${l.id}" aria-label="Letter title" ${m.fresh ? 'data-autofocus' : ''}>
        <label class="m-field">Open on<input type="date" value="${l.openOn}" data-change="letter-date" data-id="${l.id}"><small>${l.openOn > t ? 'Once you close this, it stays sealed until that day.' : 'This letter is open — you can read and edit it.'}</small></label>
        <textarea class="m-desc letter-body" rows="9" placeholder="Write something for the person you are becoming…" data-input="letter-body" data-id="${l.id}" aria-label="Letter">\n${esc(l.body)}</textarea>
        <div class="m-foot"><span></span><button class="btn ghost danger" data-act="letter-del" data-id="${l.id}">${icon('trash')}Delete</button></div>
      </div>`;
  };

  V.WHEEL = WHEEL;
})(window);
