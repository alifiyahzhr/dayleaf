/* dayleaf — rich text editor for the writing view (bold, lists, headings, alignment, size, colour...) */
(function (g) {
  const { icon, D } = U;
  const S = Store;

  const btn = (cmd, ic, title, val) => `<button type="button" class="rt-btn" data-cmd="${cmd}" ${val ? `data-val="${val}"` : ''} title="${title}" aria-label="${title}">${icon(ic)}</button>`;

  /* the toolbar markup; the whole bar is data-skip so its state is managed here, not by re-renders */
  function toolbar() {
    return `<div class="rt-bar" data-skip role="toolbar" aria-label="Text formatting">
      <select class="rt-sel" data-rt="block" aria-label="Text style"><option value="" selected>Style</option><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option></select>
      <select class="rt-sel" data-rt="size" aria-label="Text size"><option value="" selected>Size</option><option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="6">Extra large</option></select>
      <span class="rt-sep"></span>
      ${btn('bold', 'bold', 'Bold (Ctrl+B)')}${btn('italic', 'italic', 'Italic (Ctrl+I)')}${btn('underline', 'underline', 'Underline (Ctrl+U)')}${btn('strikeThrough', 'strike', 'Strikethrough')}
      <span class="rt-sep"></span>
      ${btn('insertUnorderedList', 'list', 'Bulleted list')}${btn('insertOrderedList', 'listOrdered', 'Numbered list')}
      <span class="rt-sep"></span>
      ${btn('justifyLeft', 'alignLeft', 'Align left')}${btn('justifyCenter', 'alignCenter', 'Centre')}${btn('justifyRight', 'alignRight', 'Align right')}${btn('justifyFull', 'alignJustify', 'Justify')}
      <span class="rt-sep"></span>
      <label class="rt-color" title="Text colour">${icon('type')}<i data-swatch="fore" style="background:#243240"></i><input type="color" value="#243240" data-rt="fore" aria-label="Text colour"></label>
      <label class="rt-color" title="Highlight colour">${icon('highlighter')}<i data-swatch="back" style="background:#F2EBD9"></i><input type="color" value="#F2EBD9" data-rt="back" aria-label="Highlight colour"></label>
      <span class="rt-sep"></span>
      <button type="button" class="rt-btn" data-rt="link" title="Add link" aria-label="Add link">${icon('link')}</button>
      ${btn('formatBlock', 'quote', 'Quote', 'blockquote')}${btn('insertHorizontalRule', 'minus', 'Divider line')}${btn('removeFormat', 'eraser', 'Clear formatting')}
      <span class="rt-sep"></span>
      <label class="rt-spc" title="Space between lines">${icon('lineSpacing')}<select data-rt="lh" aria-label="Line spacing"><option value="1.45">Tight</option><option value="1.8">Normal</option><option value="2.2">Relaxed</option><option value="2.6">Airy</option></select></label>
      <label class="rt-spc" title="Space between letters">${icon('charSpacing')}<select data-rt="ls" aria-label="Letter spacing"><option value="-0.015">Tight</option><option value="0">Normal</option><option value="0.03">Wide</option><option value="0.07">Wider</option></select></label>
      <span class="spacer"></span>
      ${btn('undo', 'undo', 'Undo (Ctrl+Z)')}${btn('redo', 'redo', 'Redo (Ctrl+Y)')}
    </div>`;
  }

  const E = {
    el: null, bar: null, day: null, range: null, toolbar,

    mount() {
      this.el = document.querySelector('.rt-editor');
      this.bar = document.querySelector('.rt-bar');
      if (!this.el || !this.bar) { this.el = null; return; }
      this.day = this.el.dataset.day; this.range = null;
      const el = this.el, bar = this.bar;

      el.addEventListener('focus', () => { try { document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (_) { /* ignore */ } });
      el.addEventListener('input', () => this.save());
      el.addEventListener('keyup', () => this.sync());
      el.addEventListener('mouseup', () => this.sync());
      el.addEventListener('paste', e => {
        e.preventDefault();
        const h = e.clipboardData.getData('text/html'), t = e.clipboardData.getData('text/plain');
        document.execCommand('insertHTML', false, h ? U.sanitize(h) : U.plainToHtml(t));
        this.save();
      });

      // keep the text selection when pressing toolbar buttons
      bar.addEventListener('mousedown', e => { if (e.target.closest('button.rt-btn')) e.preventDefault(); });
      bar.addEventListener('click', e => {
        const b = e.target.closest('button.rt-btn'); if (!b) return;
        if (b.dataset.rt === 'link') return this.link();
        this.exec(b.dataset.cmd, b.dataset.val);
      });
      this.applySpacing(true);
      bar.addEventListener('change', e => {
        const s = e.target.closest('select[data-rt]'); if (!s || !s.value) return;
        if (s.dataset.rt === 'lh' || s.dataset.rt === 'ls') {
          S.set(p => { if (s.dataset.rt === 'lh') p.prefs.lineSpace = Number(s.value); else p.prefs.charSpace = Number(s.value); });
          return this.applySpacing(false);
        }
        if (s.dataset.rt === 'block') this.exec('formatBlock', s.value === 'p' ? 'p' : s.value);
        if (s.dataset.rt === 'size') this.exec('fontSize', s.value);
        s.value = '';
      });
      bar.addEventListener('input', e => {
        const c = e.target.closest('input[type=color]'); if (!c) return;
        const kind = c.dataset.rt;
        bar.querySelector(`[data-swatch="${kind}"]`).style.background = c.value;
        this.exec(kind === 'fore' ? 'foreColor' : 'hiliteColor', c.value);
      });

      if (!E._bound) {
        E._bound = true;
        document.addEventListener('selectionchange', () => {
          const e = E.el; if (!e || !e.isConnected) return;
          const sel = getSelection();
          if (sel.rangeCount && e.contains(sel.anchorNode)) { E.range = sel.getRangeAt(0).cloneRange(); E.sync(); }
        });
      }
    },

    /* line and letter spacing are remembered and apply to the editor and to journal entries everywhere */
    applySpacing(syncSelects) {
      const p = S.s && S.s.prefs; if (!p) return;
      const root = document.documentElement;
      root.style.setProperty('--rt-lh', String(p.lineSpace ?? 1.8));
      root.style.setProperty('--rt-ls', `${p.charSpace ?? 0}em`);
      if (syncSelects && this.bar) {
        const lh = this.bar.querySelector('[data-rt="lh"]'), ls = this.bar.querySelector('[data-rt="ls"]');
        if (lh) lh.value = String(p.lineSpace ?? 1.8); if (ls) ls.value = String(p.charSpace ?? 0);
      }
    },

    restore() {
      if (!this.range) return;
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(this.range);
    },
    exec(cmd, val) {
      if (!this.el) return;
      this.el.focus(); this.restore();
      try { document.execCommand('styleWithCSS', false, true); } catch (_) { /* ignore */ }
      document.execCommand(cmd, false, val || null);
      this.save(); this.sync();
    },
    link() {
      this.el.focus(); this.restore();
      const url = (window.prompt('Link address (https://…)') || '').trim();
      if (/^(https?:\/\/|mailto:)/i.test(url)) this.exec('createLink', url);
      else if (url) U.toast('Links need to start with https://');
    },
    save() {
      if (!this.el || !S.s) return;
      const raw = this.el.innerHTML, text = this.el.innerText.replace(/ /g, ' ');
      const clean = U.sanitize(raw);
      if (!text.trim() && !/<(ul|ol|hr|blockquote)/i.test(clean) && raw !== '') this.el.innerHTML = '';
      const day = this.day;
      S.set(s => { const j = (s.journal[day] ||= { title: '', body: '', html: '', updated: 0 }); j.html = text.trim() || /<(ul|ol|hr)/i.test(clean) ? clean : ''; j.body = text.trim(); j.updated = Date.now(); });
    },
    sync() {
      if (!this.bar) return;
      this.bar.querySelectorAll('[data-cmd]').forEach(b => {
        const c = b.dataset.cmd; if (['undo', 'redo', 'removeFormat', 'insertHorizontalRule', 'formatBlock'].includes(c)) return;
        let on = false; try { on = document.queryCommandState(c); } catch (_) { /* ignore */ }
        b.classList.toggle('on', on);
      });
    },
  };

  g.Editor = E;
})(window);
