/* dayleaf — optional cloud sync via Supabase, so the same data can be opened on another device.
   Sync mirrors the same plain data that Backup/Restore already works with (see store.js), not your
   local per-device PIN vault, so it works regardless of whether (or how) each device is PIN-locked.
   With a sync passphrase set, the payload is AES-GCM encrypted in this browser before it ever
   leaves the device — Supabase (and dayleaf's own code) only ever sees ciphertext. */
(function (g) {
  const SUPA_URL = 'https://iksehjsfnyvscmxfdjqr.supabase.co';
  const SUPA_KEY = 'sb_publishable_AX6-xUyiuZoLtVqaQovwJQ_IAO4Gg6X';
  const SESSION_KEY = 'dayleaf.session', SALT_KEY = 'dayleaf.syncSalt';
  const ITER = 200000;
  const te = new TextEncoder(), td = new TextDecoder();
  const b64e = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64d = s => { const bin = atob(s), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; };
  const rnd = n => crypto.getRandomValues(new Uint8Array(n));

  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (_) { /* ignore */ }
  let salt = null;
  try { salt = localStorage.getItem(SALT_KEY) || null; } catch (_) { /* ignore */ }
  let encKey = null, pushTimer = null;

  const setSession = s => { session = s; try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (_) { /* ignore */ } };
  const setSalt = s => { salt = s; try { localStorage.setItem(SALT_KEY, s); } catch (_) { /* ignore */ } };
  const withExp = r => ({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Math.floor(Date.now() / 1000) + r.expires_in, user: { id: r.user.id, email: r.user.email } });

  async function raw(path, opts) {
    const headers = Object.assign({ apikey: SUPA_KEY, 'Content-Type': 'application/json' }, opts.headers || {});
    const res = await fetch(SUPA_URL + path, Object.assign({}, opts, { headers }));
    if (!res.ok) { let msg = res.statusText; try { const j = await res.json(); msg = j.error_description || j.msg || j.message || msg; } catch (_) { /* ignore */ } throw new Error(msg); }
    return res.status === 204 ? null : res.json();
  }
  async function ensureToken() {
    if (!session) return null;
    if (session.expires_at - 30 > Date.now() / 1000) return session.access_token;
    const r = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
    setSession(withExp(r));
    return session.access_token;
  }
  async function rest(path, opts = {}) {
    const token = await ensureToken();
    if (!token) throw new Error('Not signed in');
    const headers = Object.assign({ apikey: SUPA_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, opts.headers || {});
    const res = await fetch(SUPA_URL + path, Object.assign({}, opts, { headers }));
    if (!res.ok) { let msg = res.statusText; try { const j = await res.json(); msg = j.message || msg; } catch (_) { /* ignore */ } throw new Error(msg); }
    return res.status === 204 ? null : res.json();
  }

  async function deriveKey(pass, saltB64) {
    const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(saltB64), iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptStr(str) {
    const iv = rnd(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, te.encode(str));
    return { iv: b64e(iv), d: b64e(ct) };
  }
  async function decryptStr(o, key) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(o.iv) }, key, b64d(o.d));
    return td.decode(pt);
  }

  const Sync = {
    needsPassphrase: false,
    isSignedIn: () => !!session,
    email: () => session && session.user.email,
    hasPassphrase: () => !!encKey,
    lastSyncedAt: null,

    async signUp(email, pw) {
      const r = await raw('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password: pw }) });
      if (!r.access_token) return { confirmEmail: true };
      setSession(withExp(r));
      await this.checkRemote();
      return { confirmEmail: false };
    },
    async signIn(email, pw) {
      const r = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: pw }) });
      setSession(withExp(r));
      await this.checkRemote();
    },
    async signOut() {
      try { await rest('/auth/v1/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
      setSession(null); encKey = null; this.needsPassphrase = false;
    },

    /* password reset: email a link back to this page, then finish it once that link lands */
    pendingRecovery: null,
    async requestReset(email) {
      const redirect = location.origin + location.pathname;
      await raw(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { method: 'POST', body: JSON.stringify({ email }) });
    },
    async completeReset(newPassword) {
      if (!this.pendingRecovery) throw new Error('This reset link is no longer active — request a new one.');
      if (newPassword.length < 6) throw new Error('Use a password of at least 6 characters.');
      const { access_token, refresh_token, expires_in } = this.pendingRecovery;
      const res = await fetch(SUPA_URL + '/auth/v1/user', { method: 'PUT', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPassword }) });
      if (!res.ok) { let msg = res.statusText; try { const j = await res.json(); msg = j.msg || j.message || msg; } catch (_) { /* ignore */ } throw new Error(msg); }
      const user = await res.json();
      setSession({ access_token, refresh_token, expires_at: Math.floor(Date.now() / 1000) + expires_in, user: { id: user.id, email: user.email } });
      this.pendingRecovery = null;
      await this.checkRemote();
    },

    /* look up whether this account already has synced data, and whether it's encrypted */
    async checkRemote() {
      if (!session) return;
      const rows = await rest(`/rest/v1/vaults?user_id=eq.${session.user.id}&select=salt,updated_at`);
      const row = rows && rows[0];
      if (row && row.salt) { setSalt(row.salt); this.needsPassphrase = !encKey; }
      else this.needsPassphrase = false;
      this.lastSyncedAt = row ? row.updated_at : null;
    },

    async setPassphrase(pass) {
      if (!salt) setSalt(b64e(rnd(16)));
      encKey = await deriveKey(pass, salt);
      this.needsPassphrase = false;
    },
    useNoEncryption() { this.needsPassphrase = false; },
    forgetPassphrase() { encKey = null; },

    async push() {
      if (!session || this.needsPassphrase) return;
      const json = JSON.stringify(Store.s);
      const row = { user_id: session.user.id, updated_at: new Date().toISOString() };
      if (encKey) { row.salt = salt; row.vault = JSON.stringify(await encryptStr(json)); row.plain = null; }
      else { row.salt = null; row.vault = null; row.plain = json; }
      await rest('/rest/v1/vaults', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([row]) });
      this.lastSyncedAt = row.updated_at;
    },
    schedulePush() {
      if (!session || this.needsPassphrase) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { this.push().catch(() => { /* retried on next save */ }); }, 1500);
    },

    /* fetch the cloud copy without applying it — caller decides whether to replace local data */
    async preview() {
      if (!session) throw new Error('Not signed in');
      const rows = await rest(`/rest/v1/vaults?user_id=eq.${session.user.id}&select=salt,vault,plain,updated_at`);
      const row = rows && rows[0];
      if (!row || (!row.vault && !row.plain)) return null;
      if (row.vault) {
        if (row.salt && row.salt !== salt) setSalt(row.salt);
        if (!encKey) { this.needsPassphrase = true; const e = new Error('A sync passphrase is needed to decrypt your cloud data.'); e.code = 'passphrase-needed'; throw e; }
        let data;
        try { data = JSON.parse(await decryptStr(JSON.parse(row.vault), encKey)); }
        catch (_) { const e = new Error('Could not decrypt — check your sync passphrase.'); e.code = 'bad-passphrase'; throw e; }
        return { data, updatedAt: row.updated_at };
      }
      return { data: JSON.parse(row.plain), updatedAt: row.updated_at };
    },
  };

  /* a password-reset email link lands back here as #access_token=...&type=recovery */
  (function captureRecovery() {
    const h = location.hash.slice(1);
    if (!h.includes('type=recovery')) return;
    const p = new URLSearchParams(h);
    if (p.get('type') !== 'recovery' || !p.get('access_token')) return;
    Sync.pendingRecovery = { access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in') || 3600) };
    history.replaceState(null, '', location.pathname + location.search);
  })();

  g.Sync = Sync;
})(window);
