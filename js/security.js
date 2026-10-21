/* dayleaf — PIN lock, encrypted storage, brute-force delay and auto-lock.
   Everything stays on this device. With a PIN set, your data is stored as an AES-GCM vault whose key
   is derived from the PIN (PBKDF2-SHA256), so it is unreadable in browser storage without the PIN. */
(function (g) {
  const { icon, esc } = U;
  const META = 'dayleaf.sec', VAULT = 'dayleaf.vault', PLAIN = 'dayleaf.v2';
  const ITER = 300000;
  const te = new TextEncoder(), td = new TextDecoder();
  const secure = !!(g.crypto && g.crypto.subtle && g.isSecureContext);

  /* ---------- helpers ---------- */
  const b64e = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64d = s => { const bin = atob(s), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; };
  const rnd = n => crypto.getRandomValues(new Uint8Array(n));
  const meta = () => { try { return JSON.parse(localStorage.getItem(META)); } catch (_) { return null; } };
  const setMeta = m => localStorage.setItem(META, JSON.stringify(m));

  // small SHA-256 used only when the browser has no WebCrypto (insecure context)
  const K = new Uint32Array(64), H0 = new Uint32Array(8);
  (function () {
    const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
    const frac = x => (x - Math.floor(x)) * 4294967296;
    primes.forEach((p, i) => { K[i] = frac(Math.cbrt(p)); if (i < 8) H0[i] = frac(Math.sqrt(p)); });
  })();
  function sha256(data) {
    const l = data.length, buf = new Uint8Array(((l + 9 + 63) >> 6) * 64); buf.set(data); buf[l] = 0x80;
    const dv = new DataView(buf.buffer); dv.setUint32(buf.length - 4, (l * 8) >>> 0); dv.setUint32(buf.length - 8, Math.floor(l * 8 / 4294967296));
    const h = new Uint32Array(H0), w = new Uint32Array(64);
    for (let o = 0; o < buf.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        w[i] = (w[i - 16] + (((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)) + w[i - 7] + (((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10))) >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], gg = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & gg)) + K[i] + w[i]) >>> 0;
        const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = gg; gg = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += gg; h[7] += hh;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer); h.forEach((v, i) => ov.setUint32(i * 4, v)); return out;
  }
  const jsHash = (pin, salt) => { let h = sha256(te.encode(salt + ':' + pin)); for (let i = 0; i < 20000; i++) h = sha256(h); return b64e(h); };

  async function deriveKey(pin, salt) {
    const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /* ---------- vault ---------- */
  let key = null, chain = Promise.resolve();
  async function saveVault(str) {
    const iv = rnd(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(str));
    localStorage.setItem(VAULT, JSON.stringify({ iv: b64e(iv), d: b64e(ct) }));
  }
  async function tryUnlock(pin) {
    const m = meta();
    if (m.mode === 'vault') {
      try {
        const v = JSON.parse(localStorage.getItem(VAULT)), k = await deriveKey(pin, b64d(m.salt));
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(v.iv) }, k, b64d(v.d));
        key = k; return td.decode(pt);
      } catch (_) { return null; }
    }
    return jsHash(pin, m.salt) === m.hash ? (localStorage.getItem(PLAIN) || '') : null;
  }

  /* ---------- lock screen ---------- */
  const el = () => document.getElementById('lock');
  const L = { active: false, mode: 'unlock', pin: '', first: '', msg: '', shake: false, busy: false, armed: false, tick: null, cloud: { tab: 'signin', msg: '', busy: false } };
  let ready = null, idleT = null, hiddenAt = 0;

  const lockedFor = () => { const m = meta(); return m && m.until && m.until > Date.now() ? Math.ceil((m.until - Date.now()) / 1000) : 0; };
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function lockHTML() {
    const m = meta() || {}, wait = L.mode === 'unlock' ? lockedFor() : 0;
    const titles = {
      unlock: ['Welcome back', 'Enter your PIN to open dayleaf'],
      setup1: ['Create a PIN', 'Choose 4–6 digits. Your data is encrypted with it, so keep it somewhere safe.'],
      setup2: ['Confirm your PIN', 'Enter the same digits once more.'],
      forgot: ['Forgot your PIN?', 'Your data is encrypted with your PIN, so it can’t be recovered without it. You can erase everything and start fresh.'],
    }[L.mode];
    const slots = L.mode === 'unlock' ? (m.len || 4) : L.mode === 'setup2' ? L.first.length : 6;
    const dots = Array.from({ length: slots }, (_, i) => `<i class="${i < L.pin.length ? 'on' : ''}"></i>`).join('');
    const pad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => `<button data-k="${d}" ${wait ? 'disabled' : ''}>${d}</button>`).join('') +
      `<span class="blank"></span><button data-k="0" ${wait ? 'disabled' : ''}>0</button><button data-back aria-label="Delete" ${L.pin ? '' : 'disabled'}>⌫</button>`;
    if (L.mode === 'forgot') {
      return `<div class="lock-card"><span class="lk-logo">${icon('shield')}</span><h2>${titles[0]}</h2><p class="lk-sub">${titles[1]}</p>
        <div class="lk-actions"><button class="btn" data-lk="back">Back</button><button class="btn danger${L.armed ? ' armed' : ''}" data-lk="erase">${L.armed ? 'Tap again to erase everything' : 'Erase everything'}</button></div></div>`;
    }
    if (L.mode === 'cloud') {
      const c = L.cloud;
      return `<div class="lock-card">
        <span class="lk-logo">${icon('cloud')}</span>
        <h2>Sign in to sync</h2><p class="lk-sub">${c.tab === 'signup' ? 'Create an account to sync your data across devices.' : 'Sign in to pull your data down to this device.'}</p>
        <div class="seg lk-seg"><button class="${c.tab === 'signin' ? 'on' : ''}" data-lkc="tab" data-v="signin" ${c.busy ? 'disabled' : ''}>Sign in</button><button class="${c.tab === 'signup' ? 'on' : ''}" data-lkc="tab" data-v="signup" ${c.busy ? 'disabled' : ''}>Sign up</button></div>
        <div class="lk-form">
          <input type="email" class="lk-input" autocomplete="email" placeholder="Email" data-lkf="email" aria-label="Email" ${c.busy ? 'disabled' : ''}>
          <div class="pw-field"><input type="password" class="lk-input" autocomplete="${c.tab === 'signup' ? 'new-password' : 'current-password'}" placeholder="Password" data-lkf="pw" aria-label="Password" ${c.busy ? 'disabled' : ''}><button type="button" class="icon-btn sm pw-eye" data-pw-toggle tabindex="-1" aria-label="Show password">${icon('eye')}</button></div>
        </div>
        <p class="lk-msg${c.msg ? ' show' : ''}">${esc(c.msg)}</p>
        <button class="btn primary lk-go" data-lk="cloud-submit" ${c.busy ? 'disabled' : ''}>${c.tab === 'signup' ? 'Create account' : 'Sign in'}</button>
        <button class="lk-link" data-lk="cloud-back">Back</button>
      </div>`;
    }
    if (L.mode === 'cloud-pass') {
      const c = L.cloud;
      return `<div class="lock-card">
        <span class="lk-logo">${icon('cloud')}</span>
        <h2>Enter your sync passphrase</h2><p class="lk-sub">Your cloud data is encrypted. Enter the passphrase you set on your other device to unlock it here.</p>
        <div class="lk-form">
          <div class="pw-field"><input type="password" class="lk-input" placeholder="Sync passphrase" data-lkf="pass" aria-label="Sync passphrase" ${c.busy ? 'disabled' : ''}><button type="button" class="icon-btn sm pw-eye" data-pw-toggle tabindex="-1" aria-label="Show password">${icon('eye')}</button></div>
        </div>
        <p class="lk-msg${c.msg ? ' show' : ''}">${esc(c.msg)}</p>
        <button class="btn primary lk-go" data-lk="cloud-pass-submit" ${c.busy ? 'disabled' : ''}>Unlock</button>
        <button class="lk-link" data-lk="cloud">Use a different account</button>
      </div>`;
    }
    return `<div class="lock-card">
      <img class="lk-bunny" src="assets/mascot.png" alt="" draggable="false">
      <span class="lk-logo">${icon(L.mode === 'unlock' ? 'lock' : 'shield')}</span>
      <h2>${titles[0]}</h2><p class="lk-sub">${titles[1]}</p>
      <div class="lk-dots${L.shake ? ' shake' : ''}${L.busy ? ' busy' : ''}">${dots}</div>
      <p class="lk-msg${wait || L.msg ? ' show' : ''}">${wait ? `Too many attempts. Try again in ${fmt(wait)}` : L.msg}</p>
      <div class="lk-pad">${pad}</div>
      ${L.mode === 'setup1' ? `<button class="btn primary lk-go" data-lk="next" ${L.pin.length >= 4 ? '' : 'disabled'}>Continue</button><button class="lk-link" data-lk="skip">Not now</button><button class="lk-link" data-lk="cloud">Sign in to sync instead</button>` : ''}
      ${L.mode === 'setup2' ? `<button class="lk-link" data-lk="restart">Start over</button>` : ''}
      ${L.mode === 'unlock' ? `<button class="lk-link" data-lk="forgot">Forgot PIN?</button>` : ''}
    </div>`;
  }
  function paintLock() {
    const e = el(); if (!e) return;
    U.morph(e, U.min(lockHTML()));
    clearInterval(L.tick);
    if (L.mode === 'unlock' && lockedFor()) L.tick = setInterval(() => { if (!lockedFor()) { clearInterval(L.tick); L.msg = ''; } paintLock(); }, 1000);
  }
  function showLock() {
    L.active = true; L.pin = ''; L.msg = ''; L.busy = false; L.armed = false;
    document.body.classList.add('locked'); el().hidden = false; el().classList.remove('out');
    el().innerHTML = '';
    paintLock();
  }
  function hideLock() {
    L.active = false; clearInterval(L.tick);
    el().classList.add('out');
    setTimeout(() => { if (!L.active) { el().hidden = true; document.body.classList.remove('locked'); el().innerHTML = ''; } }, 380);
  }
  const shake = msg => { L.shake = true; L.msg = msg || ''; L.pin = ''; paintLock(); setTimeout(() => { L.shake = false; paintLock(); }, 450); };

  async function submitUnlock() {
    if (L.busy || lockedFor() || !L.pin) return;
    const pin = L.pin; L.busy = true; paintLock();
    const data = await tryUnlock(pin);
    L.busy = false;
    const m = meta();
    if (data === null) {
      m.fails = (m.fails || 0) + 1;
      if (m.fails % 5 === 0) m.until = Date.now() + Math.min(30 * 2 ** (m.fails / 5 - 1), 900) * 1000;
      setMeta(m);
      return shake(lockedFor() ? '' : `Incorrect PIN${m.fails >= 3 ? ` · ${5 - (m.fails % 5)} tries before a pause` : ''}`);
    }
    m.fails = 0; m.until = 0; setMeta(m);
    L.pin = ''; hideLock(); arm();
    ready(data, null);
  }
  function press(d) {
    if (L.busy || L.mode === 'forgot' || (L.mode === 'unlock' && lockedFor())) return;
    const max = L.mode === 'unlock' ? (meta().len || 4) : L.mode === 'setup2' ? L.first.length : 6;
    if (L.pin.length >= max) return;
    L.pin += d; L.msg = ''; paintLock();
    if (L.mode === 'unlock' && L.pin.length === max) setTimeout(submitUnlock, 120);
    if (L.mode === 'setup2' && L.pin.length === max) setTimeout(confirmSetup, 160);
  }
  function back() { if (!L.busy) { L.pin = L.pin.slice(0, -1); paintLock(); } }
  function confirmSetup() {
    if (L.pin !== L.first) { L.mode = 'setup1'; L.first = ''; return shake('PINs didn’t match. Try again.'); }
    const pin = L.pin; L.pin = ''; hideLock();
    ready(localStorage.getItem(PLAIN), pin);
  }
  function lkAction(a) {
    if (a === 'next' && L.pin.length >= 4) { L.first = L.pin; L.pin = ''; L.mode = 'setup2'; paintLock(); }
    if (a === 'restart') { L.mode = 'setup1'; L.first = ''; L.pin = ''; paintLock(); }
    if (a === 'skip') { setMeta({ mode: 'none', autoLock: 5 }); hideLock(); ready(localStorage.getItem(PLAIN), null); }
    if (a === 'forgot') { L.mode = 'forgot'; L.armed = false; paintLock(); }
    if (a === 'back') { L.mode = 'unlock'; L.pin = ''; paintLock(); }
    if (a === 'erase') {
      if (!L.armed) { L.armed = true; paintLock(); setTimeout(() => { L.armed = false; if (L.mode === 'forgot') paintLock(); }, 3500); return; }
      localStorage.removeItem(VAULT); localStorage.removeItem(PLAIN); localStorage.removeItem(META);
      key = null; L.mode = 'setup1'; L.first = ''; L.pin = ''; L.armed = false; paintLock();
    }
    if (a === 'cloud') { L.mode = 'cloud'; L.cloud = { tab: 'signin', msg: '', busy: false }; paintLock(); }
    if (a === 'cloud-back') { L.mode = 'setup1'; L.pin = ''; paintLock(); }
    if (a === 'cloud-submit') cloudSubmit();
    if (a === 'cloud-pass-submit') cloudPassSubmit();
  }
  function cloudTab(v) { L.cloud = Object.assign({}, L.cloud, { tab: v, msg: '' }); paintLock(); }

  /* a fresh sign-in may already have data waiting in the cloud — skip local PIN setup and load it */
  async function afterCloudAuth() {
    if (g.Sync.needsPassphrase) { L.mode = 'cloud-pass'; L.cloud = Object.assign({}, L.cloud, { busy: false, msg: '' }); paintLock(); return; }
    try {
      const p = await g.Sync.preview();
      setMeta({ mode: 'none', autoLock: 5 });
      hideLock(); ready(p ? JSON.stringify(p.data) : null, null);
    } catch (e) {
      if (e.code === 'passphrase-needed') { L.mode = 'cloud-pass'; L.cloud = Object.assign({}, L.cloud, { busy: false, msg: '' }); paintLock(); }
      else { L.cloud = Object.assign({}, L.cloud, { busy: false, msg: e.message || 'Something went wrong.' }); paintLock(); }
    }
  }
  async function cloudSubmit() {
    if (L.cloud.busy) return;
    const card = el().querySelector('.lock-card');
    const email = (card.querySelector('[data-lkf="email"]') || {}).value || '', pw = (card.querySelector('[data-lkf="pw"]') || {}).value || '';
    if (!email || pw.length < 6) { L.cloud = Object.assign({}, L.cloud, { msg: 'Enter an email and a password of at least 6 characters.' }); return paintLock(); }
    L.cloud = Object.assign({}, L.cloud, { busy: true, msg: '' }); paintLock();
    try {
      if (L.cloud.tab === 'signup') {
        const r = await g.Sync.signUp(email, pw);
        if (r.confirmEmail) { L.cloud = Object.assign({}, L.cloud, { busy: false, msg: 'Check your email to confirm your account, then sign in.' }); return paintLock(); }
      } else await g.Sync.signIn(email, pw);
      await afterCloudAuth();
    } catch (e) { L.cloud = Object.assign({}, L.cloud, { busy: false, msg: e.message || 'Something went wrong.' }); paintLock(); }
  }
  async function cloudPassSubmit() {
    if (L.cloud.busy) return;
    const pass = (el().querySelector('[data-lkf="pass"]') || {}).value || '';
    if (!pass) return;
    L.cloud = Object.assign({}, L.cloud, { busy: true, msg: '' }); paintLock();
    try {
      await g.Sync.setPassphrase(pass);
      const p = await g.Sync.preview();
      setMeta({ mode: 'none', autoLock: 5 });
      hideLock(); ready(p ? JSON.stringify(p.data) : null, null);
    } catch (e) {
      g.Sync.forgetPassphrase(); g.Sync.needsPassphrase = true;
      L.cloud = Object.assign({}, L.cloud, { busy: false, msg: e.message || 'Could not unlock.' }); paintLock();
    }
  }

  /* ---------- idle auto-lock ---------- */
  function arm() {
    clearTimeout(idleT);
    const m = meta();
    if (!m || m.mode === 'none' || !m.autoLock || L.active) return;
    idleT = setTimeout(() => Security.lock(), m.autoLock * 60000);
  }

  /* ---------- public API ---------- */
  const Security = {
    secure, meta,
    enabled() { const m = meta(); return !!m && m.mode !== 'none'; },
    encrypted() { const m = meta(); return !!m && m.mode === 'vault'; },

    run(cb) {
      ready = cb;
      const m = meta();
      if (!m) { L.mode = 'setup1'; L.first = ''; showLock(); }
      else if (m.mode === 'none') { document.body.classList.remove('locked'); cb(localStorage.getItem(PLAIN), null); }
      else { L.mode = 'unlock'; showLock(); }
    },
    persist(str) {
      const m = meta();
      if (m && m.mode === 'vault' && key) chain = chain.then(() => saveVault(str)).catch(e => { if (Store.onError) Store.onError(e); });
      else localStorage.setItem(PLAIN, str);
    },
    async enable(pin) {
      if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4–6 digits');
      const old = meta() || {}, salt = b64e(rnd(16)), m = { mode: secure ? 'vault' : 'hash', salt, len: pin.length, autoLock: old.autoLock ?? 5, fails: 0, until: 0 };
      const str = JSON.stringify(Store.s);
      if (secure) {
        key = await deriveKey(pin, b64d(salt)); await saveVault(str);
        localStorage.removeItem(PLAIN);
      } else { m.hash = jsHash(pin, salt); localStorage.setItem(PLAIN, str); }
      setMeta(m); arm();
    },
    async verify(pin) { return (await tryUnlock(pin)) !== null; },
    async change(oldPin, newPin) {
      if (!(await this.verify(oldPin))) throw new Error('Current PIN is incorrect');
      await this.enable(newPin);
    },
    async disable(pin) {
      if (!(await this.verify(pin))) throw new Error('PIN is incorrect');
      localStorage.setItem(PLAIN, JSON.stringify(Store.s)); localStorage.removeItem(VAULT);
      key = null; setMeta({ mode: 'none', autoLock: 5 }); clearTimeout(idleT);
    },
    setAutoLock(min) { const m = meta(); if (m) { m.autoLock = Number(min); setMeta(m); arm(); } },
    async lock() {
      if (!this.enabled() || L.active) return;
      try { if (Store.s) Store.write(); await chain; } catch (_) { /* ignore */ }
      key = null; clearTimeout(idleT);
      if (Security.onLock) Security.onLock();
      Store.s = null;
      L.mode = 'unlock'; showLock();
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    const e = el();
    e.addEventListener('click', ev => {
      const k = ev.target.closest('[data-k]'), b = ev.target.closest('[data-back]'), a = ev.target.closest('[data-lk]'), t = ev.target.closest('[data-lkc]');
      if (k) press(k.dataset.k); else if (b) back(); else if (a) lkAction(a.dataset.lk); else if (t) cloudTab(t.dataset.v);
    });
  });
  document.addEventListener('keydown', ev => {
    if (!L.active) return;
    if (L.mode === 'cloud' || L.mode === 'cloud-pass') {
      if (ev.key === 'Enter') { ev.preventDefault(); lkAction(L.mode === 'cloud' ? 'cloud-submit' : 'cloud-pass-submit'); }
      return;
    }
    if (L.mode === 'forgot') return;
    if (/^\d$/.test(ev.key)) { ev.preventDefault(); press(ev.key); }
    else if (ev.key === 'Backspace') { ev.preventDefault(); back(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (L.mode === 'unlock') submitUnlock(); else if (L.mode === 'setup1') lkAction('next'); }
  });
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => document.addEventListener(t, () => { if (!L.active) arm(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    const m = meta();
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && m && m.mode !== 'none' && m.autoLock && Date.now() - hiddenAt > m.autoLock * 60000) Security.lock();
  });

  g.Security = Security;
})(window);
