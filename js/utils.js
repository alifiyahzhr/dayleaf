/* dayleaf — utilities: dates, icons, DOM morphing, toasts */
(function (g) {
  const pad = n => String(n).padStart(2, '0');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map(m => m.slice(0, 3));
  const DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DOW = DAYN.map(d => d.slice(0, 3));

  /* ---------- dates (all keys are local-time strings) ---------- */
  const D = {
    MONTHS, MON, DAYN, DOW,
    key: d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    parse: k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); },
    /* "today" follows the year you are viewing: null means the real date; otherwise a fixed day in that year */
    anchor: null,
    real: () => D.key(new Date()),
    today: () => D.anchor || D.key(new Date()),
    add: (k, n) => { const d = D.parse(k); d.setDate(d.getDate() + n); return D.key(d); },
    dow: k => (D.parse(k).getDay() + 6) % 7, // Monday = 0
    valid: k => /^\d{4}-\d{2}-\d{2}$/.test(k || '') && D.key(D.parse(k)) === k,
    weekKey(k) {
      const d = D.parse(k);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3); // Thursday of this week
      const y = d.getFullYear();
      const doy = Math.round((d - new Date(y, 0, 1)) / 864e5);
      return `${y}-W${pad(Math.floor(doy / 7) + 1)}`;
    },
    weekStart(wk) {
      const [y, w] = wk.split('-W').map(Number);
      const jan4 = new Date(y, 0, 4);
      jan4.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
      return D.key(jan4);
    },
    weekDays: wk => { const s = D.weekStart(wk); return Array.from({ length: 7 }, (_, i) => D.add(s, i)); },
    weekNum: wk => Number(wk.split('-W')[1]),
    monthDays(ym) {
      const [y, m] = ym.split('-').map(Number);
      const n = new Date(y, m, 0).getDate();
      return Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`);
    },
    weeksOfMonth: ym => [...new Set(D.monthDays(ym).map(D.weekKey))],
    periodOf: (h, k) => h === 'life' ? 'all' : h === 'year' ? k.slice(0, 4) : h === 'month' ? k.slice(0, 7) : h === 'week' ? D.weekKey(k) : k,
    range(h, p) {
      if (h === 'life') return ['0000-01-01', '9999-12-31'];
      if (h === 'year') return [p + '-01-01', p + '-12-31'];
      if (h === 'month') { const d = D.monthDays(p); return [d[0], d[d.length - 1]]; }
      if (h === 'week') { const d = D.weekDays(p); return [d[0], d[6]]; }
      return [p, p];
    },
    shift(h, p, n) {
      if (h === 'year') return String(Number(p) + n);
      if (h === 'month') { const [y, m] = p.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
      if (h === 'week') return D.weekKey(D.add(D.weekStart(p), 7 * n));
      return D.add(p, n);
    },
    contains(h, p, k) { const [a, b] = D.range(h, p); return k >= a && k <= b; },
    short(k) { const d = D.parse(k); return `${MON[d.getMonth()]} ${d.getDate()}`; },
    long(k) { const d = D.parse(k); return `${DAYN[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; },
    longY(k) { return `${D.long(k)}, ${k.slice(0, 4)}`; },
    label(h, p) {
      if (h === 'life') return 'Overarching';
      if (h === 'year') return p;
      if (h === 'month') { const [y, m] = p.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; }
      if (h === 'week') {
        const [a, b] = D.range('week', p);
        const same = a.slice(0, 7) === b.slice(0, 7);
        return `${D.short(a)} – ${same ? Number(b.slice(8)) : D.short(b)}`;
      }
      return `${DOW[D.parse(p).getDay()]}, ${D.short(p)}`;
    },
    rel(k) {
      const t = D.today();
      if (k === t) return 'Today';
      if (k === D.add(t, 1)) return 'Tomorrow';
      if (k === D.add(t, -1)) return 'Yesterday';
      return D.label('day', k);
    },
  };

  /* ---------- misc ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const min = html => html.replace(/>\s+</g, '><').trim();

  /* ---------- icons (24px stroke set) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowUR: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    layout: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    compass: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    pen: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    pointer: '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
    note: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    columns: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    listcheck: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    corner: '<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
    graduation: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    layers: '<path d="m12.83 2.18 8.58 3.91a1 1 0 0 1 0 1.83l-8.58 3.9a2 2 0 0 1-1.66 0L2.6 7.92a1 1 0 0 1 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  };
  Object.assign(ICONS, {
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z"/><path d="M17 11h1a3 3 0 0 1 0 6h-1"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
    face1: '<circle cx="12" cy="12" r="10"/><path d="M16 17s-1.5-2.2-4-2.2S8 17 8 17"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
    face2: '<circle cx="12" cy="12" r="10"/><path d="M9 16c.9-.7 1.9-1 3-1s2.1.3 3 1"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
    face3: '<circle cx="12" cy="12" r="10"/><path d="M8.5 15h7"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
    face4: '<circle cx="12" cy="12" r="10"/><path d="M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
    face5: '<circle cx="12" cy="12" r="10"/><path d="M7.5 13.5h9a4.5 4 0 0 1-9 0z"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
  });
  Object.assign(ICONS, {
    bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    italic: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
    underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>',
    strike: '<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/>',
    listOrdered: '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    alignLeft: '<path d="M21 6H3"/><path d="M15 12H3"/><path d="M17 18H3"/>',
    alignCenter: '<path d="M21 6H3"/><path d="M17 12H7"/><path d="M19 18H5"/>',
    alignRight: '<path d="M21 6H3"/><path d="M21 12H9"/><path d="M21 18H7"/>',
    alignJustify: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
    highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    lineSpacing: '<path d="M21 6H11"/><path d="M21 12H11"/><path d="M21 18H11"/><path d="m3 8 3-4 3 4"/><path d="M6 4v16"/><path d="m3 16 3 4 3-4"/>',
    charSpacing: '<path d="M3 4v16"/><path d="M21 4v16"/><path d="m8 16 4-9 4 9"/><path d="M9.5 13h5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9Z"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  });
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ---------- DOM morph: patch existing nodes so CSS transitions survive re-renders ---------- */
  const kindOf = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName;
  const keyOf = n => (n.nodeType === 1 ? n.getAttribute('data-key') : null);

  function patchNode(a, b) {
    if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (a.nodeType !== 1) return;
    if (a.hasAttribute('data-skip') && b.hasAttribute('data-skip')) return;
    for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of b.attributes) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    const tag = a.nodeName;
    if (tag === 'TEXTAREA') {
      if (document.activeElement !== a && a.value !== b.textContent) a.value = b.textContent;
      return;
    }
    if (tag === 'INPUT') {
      if (document.activeElement !== a) {
        if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked');
        else if (a.value !== (b.getAttribute('value') || '')) a.value = b.getAttribute('value') || '';
      }
      return;
    }
    patchChildren(a, b);
    if (tag === 'SELECT') {
      const sel = b.querySelector('option[selected]') || b.querySelector('option');
      if (sel && document.activeElement !== a) a.value = sel.getAttribute('value');
    }
  }

  function patchChildren(a, b) {
    const old = [...a.childNodes], keyed = new Map(), pool = [];
    old.forEach(n => { const k = keyOf(n); if (k) keyed.set(k, n); else pool.push(n); });
    const next = []; let pi = 0;
    [...b.childNodes].forEach(bn => {
      const k = keyOf(bn); let m = null;
      if (k) { m = keyed.get(k); keyed.delete(k); }
      else if (pi < pool.length && kindOf(pool[pi], bn) && !keyOf(pool[pi])) m = pool[pi++];
      if (m && kindOf(m, bn)) { patchNode(m, bn); next.push(m); } else next.push(bn);
    });
    next.forEach((n, i) => { if (a.childNodes[i] !== n) a.insertBefore(n, a.childNodes[i] || null); });
    while (a.childNodes.length > next.length) a.lastChild.remove();
  }

  function morph(target, html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    patchChildren(target, t.content);
  }

  /* ---------- toasts ---------- */
  function toast(msg) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2700);
  }

  /* progress tone: calm red -> orange -> yellow -> green */
  const tone = f => (f < 0.25 ? 'r' : f < 0.5 ? 'o' : f < 0.75 ? 'y' : 'g');
  const MOOD = [null,
    { v: 1, name: 'Awful', c: '#C98B80', sub: 'A heavy one' },
    { v: 2, name: 'Low', c: '#D9A06E', sub: 'Not my best' },
    { v: 3, name: 'Okay', c: '#D6BD6B', sub: 'Steady enough' },
    { v: 4, name: 'Good', c: '#A3C29A', sub: 'Feeling well' },
    { v: 5, name: 'Great', c: '#7FA987', sub: 'Glowing today' },
  ];

  /* colour sets: the blue / cream theme first, with more colours on request */
  const COL_MAIN = { blue: '#6F8FAA', sky: '#8FB4CF', ice: '#B7D0E4', slate: '#4F6B84', cream: '#D9C9A3', sand: '#C9A66B' };
  const COL_MORE = { sage: '#8DB48F', mint: '#9CC9B8', rose: '#C99A93', blush: '#DDB3B0', peach: '#D9A98A', lavender: '#A9A1C9', plum: '#9B7FA6', gold: '#D6BD6B' };
  const evHex = c => (c && c[0] === '#' ? c : COL_MAIN[c] || COL_MORE[c] || COL_MAIN.blue);

  /* rich text: keep only a small, safe subset of HTML */
  const OK_TAGS = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'SPAN', 'HR', 'SUB', 'SUP']);
  const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);
  const OK_STYLE = new Set(['text-align', 'font-size', 'color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line']);
  function sanitize(html) {
    const t = document.createElement('template');
    t.innerHTML = html || '';
    (function walk(n) {
      [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1) { c.remove(); return; }
        if (DROP_TAGS.has(c.tagName.toUpperCase())) { c.remove(); return; }
        walk(c);
        if (!OK_TAGS.has(c.tagName)) { c.replaceWith(...c.childNodes); return; }
        [...c.attributes].forEach(a => {
          const nm = a.name.toLowerCase();
          if (nm === 'style') {
            const keep = a.value.split(';').map(x => x.trim()).filter(x => {
              const [p, ...v] = x.split(':'), val = v.join(':').trim();
              return OK_STYLE.has((p || '').trim().toLowerCase()) && /^[#\w\s.,%()\-]+$/.test(val) && !/url|expression|javascript/i.test(val);
            });
            if (keep.length) c.setAttribute('style', keep.join('; ')); else c.removeAttribute('style');
          } else if (nm === 'href' && c.tagName === 'A' && /^(https?:|mailto:)/i.test(a.value.trim())) { /* keep */ }
          else c.removeAttribute(a.name);
        });
        if (c.tagName === 'A') { c.setAttribute('rel', 'noopener noreferrer'); c.setAttribute('target', '_blank'); }
      });
    })(t.content);
    return t.innerHTML;
  }
  const plainToHtml = text => String(text || '').split(/\n+/).filter(l => l.trim() !== '' || false).map(l => `<p>${esc(l)}</p>`).join('');

  /* readable text colour on top of any swatch, and a habit's colour variables */
  const ink = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) > 170 ? '#243240' : '#FFFFFF'; };
  const habStyle = h => { const c = evHex(h.color || 'blue'); return `--hc:${c};--hci:${ink(c)}`; };

  /* read an image file, scale it down and hand back a compact JPEG data URL */
  function readImage(file, maxSide, quality, cb) {
    if (!file || !file.type.startsWith('image/')) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const m = Math.min(1, maxSide / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * m); c.height = Math.round(im.height * m);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', quality));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  const PROJECT_SECTIONS = ['tasks', 'journal', 'notes', 'goals'];
  const COURSE_SECTIONS = ['tasks', 'notes', 'journal'];
  const DAPUKAN_SECTIONS = ['todo', 'notes', 'journal', 'links'];
  g.U = { D, esc, uid, clamp, min, icon, morph, toast, tone, MOOD, COL_MAIN, COL_MORE, evHex, sanitize, plainToHtml, ink, habStyle, readImage, PROJECT_SECTIONS, COURSE_SECTIONS, DAPUKAN_SECTIONS };
  g.App = {
    route: { name: 'dashboard', params: {} },
    ui: {
      modal: null, closing: false, cal: null,
      search: { q: '', sel: 0 },
      view: { projects: 'board', area: 'all' },
      addTask: { project: '', goal: '' },
      quote: 0, photoIdx: 0, habWk: null, calM: null, calSel: null, calView: 'month', calFull: false,
      allYears: false, jBrowse: 'month', nBrowse: 'month', pastOpen: {}, treeOpen: {}, ny: { goals: true, tasks: true, focus: true },
      restore: null, bannerH: 'all', moreColors: false, journalQ: '', journalSort: 'new', jOpen: {}, notesQ: '', notesSort: 'new', mascotSeed: 0,
      jcQ: '', jcSort: 'new', jeOpen: {},
      sec: { step: 'idle', msg: '' },
      sync: { mode: 'signin', msg: '', ok: false, pullPreview: null },
    },
  };
})(window);
