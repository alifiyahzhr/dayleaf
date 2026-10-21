/* dayleaf — the bunny. One bunny on a page (plus the one in the sidebar), never in the writing view,
   and a different trick every time you click it. */
(function (g) {
  const { D, esc, icon } = U;
  const ui = App.ui;
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const fmt = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  function lines(page) {
    const s = Store.s, t = D.today(), name = (s.user.name || 'friend');
    const tasks = Store.tasksOn(t), left = tasks.filter(x => !x.done).length;
    const hs = Store.habitsFor(t), hLeft = hs.filter(h => !Store.done(h.id, t)).length;
    const evs = Store.eventsOn(t), now = new Date().toTimeString().slice(0, 5);
    const next = evs.find(e => !e.allDay && e.time >= now) || evs.find(e => e.allDay);
    const nextTxt = next ? `Next up: ${next.title}${next.allDay ? '' : ' at ' + fmt(next.time)}.` : 'Nothing scheduled — a gentle day.';
    const L = {
      dashboard: [`Hi ${name}! Ready for a lovely day?`, left ? `${left} task${left > 1 ? 's' : ''} left — you’ve got this!` : 'Everything is done. So proud of you!', nextTxt, 'Bismillah — begin with one small step.'],
      daily: ['What’s the plan for today?', nextTxt, hLeft ? `${hLeft} habit${hLeft > 1 ? 's' : ''} still to tick off.` : 'All habits ticked. Lovely!', 'Don’t forget to check in with your feelings.'],
      habits: [hLeft ? `${hLeft} left today. Small steps count!` : 'All habits done today. So proud!', 'Consistency beats intensity.', 'Tick one off and see how it feels.'],
      calendar: ['Plan something to look forward to.', 'Add an event and it will wait for you in that day’s entry.', 'Look how many days you’ve filled!'],
      journal: ['Your words, day by day.', 'Look how far you’ve come.', 'Every entry is a little time capsule.'],
      notes: ['Little notes, big ideas.', 'Jot it down before it hops away!', 'Your thoughts are safe here.'],
      about: ['Who do you want to become?', 'Dream big, then plan small.', 'Say your affirmations out loud!', 'Be gentle with who you are today.'],
      projects: ['One project at a time!', 'Drag cards to move them along.', 'Progress, not perfection.'],
      goals: ['Big goals start with tiny tasks.', 'Look at the year, then do today.', 'Every task moves a goal forward.'],
      side: [`Hi ${name}!`, 'Hop hop!', 'Need a little break?', 'You’re doing great.', 'Drink some water?'],
      visit: ['Time to stretch your legs?', 'Take a deep breath. In… and out.', 'You’re doing better than you think.', 'Have you had some water?', 'A tiny rest is still progress.', 'Remember to be kind to yourself today.'],
    };
    return L[page] || L.side;
  }
  const msg = page => { if (!Store.s) return ''; const a = lines(page); return a[(hash(D.today() + page) + ui.mascotSeed) % a.length]; };

  const html = (kind, page) => `<div class="mascot ${kind}" data-act="mascot-poke" data-page="${page}" role="button" tabindex="0" aria-label="Mif the bunny. Press for a trick"><span class="mq-bubble">${esc(msg(page))}</span><span class="mq-body"><img src="assets/mascot.png" alt="" draggable="false"></span><i class="mq-shadow"></i></div>`;

  /* ---------- particles ---------- */
  const FX = {
    hearts: { icon: 'heart', color: '#8FB4CF' }, stars: { icon: 'star', color: '#D9C9A3' }, sparkles: { icon: 'sparkles', color: '#6F8FAA' },
    notes: { text: '♪', color: '#6F8FAA' }, zzz: { text: 'z', color: '#9DB7CC' },
  };
  function burst(el, kind, n = 6) {
    const f = FX[kind], r = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'mq-fx';
      if (f.icon) p.innerHTML = icon(f.icon); else { p.textContent = f.text; p.style.fontSize = (14 + Math.random() * 10) + 'px'; }
      const x = r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.9, y = r.top + r.height * 0.28;
      p.style.cssText += `left:${x}px;top:${y}px;color:${f.color}`;
      document.body.appendChild(p);
      const dx = (Math.random() - 0.5) * 70, rise = kind === 'zzz' ? 70 : 90;
      p.animate([
        { transform: 'translate(0,0) scale(.3) rotate(0)', opacity: 0 },
        { transform: `translate(${dx / 2}px,-24px) scale(1) rotate(${dx / 4}deg)`, opacity: 1, offset: .25 },
        { transform: `translate(${dx}px,-${rise}px) scale(.8) rotate(${dx / 2}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, delay: i * 80, easing: 'ease-out', fill: 'backwards' }).onfinish = () => p.remove();
    }
  }

  /* ---------- tricks ---------- */
  const ACTS = [
    { id: 'hop', say: 'Boing!', fx: 'hearts', dur: 800, kf: [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.1,.86)', offset: .15 }, { transform: 'translateY(-34px) scale(.94,1.1) rotate(-4deg)', offset: .45 }, { transform: 'translateY(0) scale(1.1,.88)', offset: .72 }, { transform: 'translateY(-8px) scale(.98,1.03) rotate(2deg)', offset: .86 }, { transform: 'translateY(0) scale(1,1)' }] },
    { id: 'spin', say: 'Wheee!', fx: 'stars', dur: 950, kf: [{ transform: 'perspective(500px) rotateY(0)' }, { transform: 'perspective(500px) rotateY(360deg) translateY(-14px)', offset: .5 }, { transform: 'perspective(500px) rotateY(720deg)' }] },
    { id: 'wiggle', say: 'Hehe, that tickles!', fx: 'hearts', dur: 900, kf: [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(11deg)' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0)' }] },
    { id: 'flip', say: 'Ta-da!', fx: 'sparkles', dur: 1000, kf: [{ transform: 'translateY(0) rotate(0)', transformOrigin: '50% 55%' }, { transform: 'translateY(-46px) rotate(180deg)', transformOrigin: '50% 55%', offset: .5 }, { transform: 'translateY(0) rotate(360deg)', transformOrigin: '50% 55%' }] },
    { id: 'dance', say: '♪ Dance time ♪', fx: 'notes', dur: 1800, n: 8, kf: [{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-12px) rotate(-8deg) translateY(-6px)', offset: .15 }, { transform: 'translateX(0) rotate(0)', offset: .3 }, { transform: 'translateX(12px) rotate(8deg) translateY(-6px)', offset: .45 }, { transform: 'translateX(0) rotate(0)', offset: .6 }, { transform: 'translateX(-12px) rotate(-8deg) translateY(-6px)', offset: .75 }, { transform: 'translateX(12px) rotate(8deg) translateY(-6px)', offset: .9 }, { transform: 'translateX(0) rotate(0)' }] },
    { id: 'sleep', say: 'Zzz… oh! Just resting my eyes.', fx: 'zzz', dur: 2600, n: 5, kf: [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(16deg) scale(.96,.94)', offset: .25 }, { transform: 'rotate(16deg) scale(.97,.95)', offset: .75 }, { transform: 'rotate(-4deg) scale(1.04,1.02)', offset: .9 }, { transform: 'rotate(0) scale(1)' }] },
    { id: 'peek', say: 'Peekaboo!', fx: 'stars', dur: 1400, kf: [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6) translateY(16px)', offset: .25 }, { opacity: 0, transform: 'scale(.6) translateY(16px)', offset: .62 }, { opacity: 1, transform: 'scale(1.18) translateY(-8px)', offset: .82 }, { opacity: 1, transform: 'scale(1)' }] },
    { id: 'grow', say: 'Big bunny energy!', fx: 'sparkles', dur: 850, kf: [{ transform: 'scale(1)' }, { transform: 'scale(1.42,1.36)', offset: .35 }, { transform: 'scale(.9,.94)', offset: .65 }, { transform: 'scale(1.06)', offset: .85 }, { transform: 'scale(1)' }] },
    { id: 'twirl', say: 'Twirl twirl!', fx: 'stars', dur: 950, kf: [{ transform: 'rotate(0) translateY(0)', transformOrigin: '50% 60%' }, { transform: 'rotate(180deg) translateY(-16px)', transformOrigin: '50% 60%', offset: .5 }, { transform: 'rotate(360deg) translateY(0)', transformOrigin: '50% 60%' }] },
    { id: 'wave', say: 'Hello, hello!', fx: 'hearts', dur: 1500, kf: [{ transform: 'rotate(0) translateY(0)' }, { transform: 'rotate(-9deg) translateY(-6px)', offset: .15 }, { transform: 'rotate(9deg) translateY(-6px)', offset: .35 }, { transform: 'rotate(-9deg) translateY(-6px)', offset: .55 }, { transform: 'rotate(9deg) translateY(-6px)', offset: .75 }, { transform: 'rotate(0) translateY(0)' }] },
  ];
  let bag = [], lastAct = null;
  function nextAct() {
    if (!bag.length) { bag = ACTS.slice().sort(() => Math.random() - 0.5); if (bag[bag.length - 1] === lastAct) bag.unshift(bag.pop()); }
    return (lastAct = bag.pop());
  }

  function poke(el) {
    const act = nextAct(), body = el.querySelector('.mq-body'), b = el.querySelector('.mq-bubble');
    if (body && body.animate) body.animate(act.kf, { duration: act.dur, easing: 'cubic-bezier(.3,.7,.4,1)' });
    burst(el, act.fx, act.n || 6);
    if (b) { b.textContent = act.say; if (b.animate) b.animate([{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .82 }, { opacity: 0 }], { duration: Math.max(2600, act.dur + 900) }); }
    return act;
  }

  /* an occasional visitor: it takes the place of the page bunny while it is here */
  const V = {
    el: null, timer: null, hideT: null,
    init() { this.el = document.getElementById('buddy'); this.schedule(45000); },
    schedule(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.visit(), ms); },
    visit() {
      const s = Store.s;
      const writing = s && App.route.name === 'daily' && s.prefs.dailyMode === 'write';
      const busy = !s || !s.prefs.mascot || s.prefs.mascotOn === false || writing || document.hidden || document.body.classList.contains('locked') || document.getElementById('app').classList.contains('focus') || ui.modal;
      if (busy) return this.schedule(60000);
      const pool = [...lines('visit'), ...lines(App.route.name)];
      this.el.innerHTML = `<span class="mq-bubble">${esc(pool[Math.floor(Math.random() * pool.length)])}</span><span class="mq-body"><img src="assets/mascot.png" alt="" draggable="false"></span><i class="mq-shadow"></i>`;
      this.el.hidden = false; this.el.setAttribute('data-page', 'visit');
      document.body.classList.add('visiting');
      requestAnimationFrame(() => requestAnimationFrame(() => this.el.classList.add('in')));
      clearTimeout(this.hideT); this.hideT = setTimeout(() => this.hide(), 9000);
      this.schedule(100000 + Math.random() * 80000);
    },
    hide() {
      clearTimeout(this.hideT);
      this.el.classList.remove('in');
      document.body.classList.remove('visiting');
      setTimeout(() => { if (!this.el.classList.contains('in')) this.el.hidden = true; }, 800);
    },
  };

  g.Mascot = { html, msg, poke, visitor: V };
})(window);
