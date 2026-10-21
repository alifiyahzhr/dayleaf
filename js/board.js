/* dayleaf — daily canvas: sticky notes, text, images, palettes + freehand drawing on the same surface */
(function (g) {
  const { esc, icon, uid, clamp, toast } = U;
  const S = Store;
  const W = 1600, H = 900;
  const PALETTES = [
    ['#3B556C', '#6F8FAA', '#B3C8D9', '#E7DDC4', '#F9F5EA'],
    ['#4F708C', '#8FAAC0', '#D6E5F0', '#D8CAA6', '#FDFBF6'],
    ['#5C7C97', '#A9C1D5', '#E6EFF6', '#E2D6B8', '#F4EBD6'],
  ];
  const NOTE_COLORS = ['#F4EBD6', '#DCE8F1', '#C2D8E8', '#EFE6CF', '#E6EFF6'];
  const PEN_COLORS = ['#243240', '#4F708C', '#8FAAC0', '#C9A66B', '#B3C8D9'];

  const strokeD = pts => {
    if (!pts.length) return '';
    if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}l.01 0`;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += `Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
    }
    const l = pts[pts.length - 1];
    return d + `L${l[0]} ${l[1]}`;
  };
  const strokeEl = s => `<path data-sid="${s.id}" d="${strokeD(s.pts)}" stroke="${s.color}" stroke-width="${s.size}"/>`;

  const itemHTML = it => {
    const st = `left:${it.x}px;top:${it.y}px;width:${it.w}px;${it.h ? `height:${it.h}px;` : ''}--c:${it.color || '#F4EBD6'};`;
    let inner = '';
    if (it.type === 'note' || it.type === 'text') inner = `<div class="b-body" data-edit>${esc(it.text)}</div>`;
    if (it.type === 'image') inner = `<img src="${it.src}" alt="" draggable="false"><div class="b-cap" data-edit>${esc(it.text || '')}</div>`;
    if (it.type === 'palette') inner = `<div class="b-swatches">${it.colors.map(c => `<span style="background:${c}" data-hex="${c}" title="Copy ${c}"></span>`).join('')}</div><div class="b-cap" data-edit>${esc(it.text || '')}</div>`;
    return `<div class="b-item b-${it.type}" data-id="${it.id}" style="${st}">${inner}
      ${it.type === 'note' ? `<button class="b-btn b-color" data-recolor title="Change colour">${icon('palette')}</button>` : ''}
      <button class="b-btn b-del" data-del title="Delete">${icon('x')}</button><span class="b-resize" data-resize></span></div>`;
  };

  const B = {
    day: null, el: null, tool: 'select', color: PEN_COLORS[1], size: 3, zoom: 1, sel: null, hist: [], drag: null,

    html(day, o = {}) {
      return `<section class="card board" id="board" data-skip>
        <header class="card-head"><div><h2>${o.title || 'Board'}</h2><p class="muted">${o.sub || 'Collect, arrange and sketch on one canvas for this day.'}</p></div></header>
        <div class="board-bar">
          <div class="seg tools">
            <button data-tool="select" title="Select & move">${icon('pointer')}<span>Select</span></button>
            <button data-tool="pen" title="Draw">${icon('pen')}<span>Draw</span></button>
            <button data-tool="erase" title="Erase strokes">${icon('eraser')}<span>Erase</span></button>
          </div>
          <span class="sep"></span>
          <button class="btn sm ghost" data-add="note">${icon('note')}Note</button>
          <button class="btn sm ghost" data-add="text">${icon('type')}Text</button>
          <button class="btn sm ghost" data-add="image">${icon('image')}Image</button>
          <button class="btn sm ghost" data-add="palette">${icon('palette')}Palette</button>
          <span class="sep"></span>
          <div class="swatches">${PEN_COLORS.map(c => `<button data-pen="${c}" style="--sw:${c}" aria-label="Pen colour ${c}"></button>`).join('')}<label class="sw-more" title="More colours"><input type="color" value="#6F8FAA" data-pen-custom aria-label="Custom pen colour"><i></i></label></div>
          <input class="range" type="range" min="1" max="14" value="3" data-size aria-label="Brush size">
          <span class="spacer"></span>
          <button class="icon-btn" data-undo title="Undo (Ctrl+Z)" aria-label="Undo">${icon('undo')}</button>
          <button class="icon-btn" data-clear title="Clear board" aria-label="Clear board">${icon('trash')}</button>
          <div class="zoom"><button data-zoom="-1" aria-label="Zoom out">${icon('minus')}</button><span data-zl>100%</span><button data-zoom="1" aria-label="Zoom in">${icon('plus')}</button></div>
        </div>
        <div class="board-view" data-viewport>
          <div class="board-sizer" data-sizer><div class="board-world" data-world data-tool="select">
            <div class="board-items" data-items></div>
            <svg class="board-strokes" viewBox="0 0 ${W} ${H}" data-strokes></svg>
          </div></div>
        </div>
        <footer class="board-foot"><span>Drag to arrange · double-click a note to write · switch to Draw to sketch anywhere</span><span>${o.saved || 'Saved with this day'}</span></footer>
        <input type="file" accept="image/*" hidden data-file>
      </section>`;
    },

    mount(day) {
      this.day = day;
      this.el = document.getElementById('board');
      if (!this.el) return;
      const q = s => this.el.querySelector(s);
      Object.assign(this, { vp: q('[data-viewport]'), sizer: q('[data-sizer]'), world: q('[data-world]'), itemsEl: q('[data-items]'), svg: q('[data-strokes]'), file: q('[data-file]'), zl: q('[data-zl]') });
      this.sel = null; this.hist = []; this.drag = null;
      this.renderAll(); this.setTool('select'); this.setZoom(1); this.setColor(this.color);
      this.bind();
    },
    unmount() { this.el = null; },

    get cv() { return S.canvas(this.day); },
    renderAll() {
      this.itemsEl.innerHTML = this.cv.items.map(itemHTML).join('');
      this.svg.innerHTML = this.cv.strokes.map(strokeEl).join('');
      this.sel = null;
    },
    persist() { S.save(); S.emit(); },
    snap() { this.hist.push(JSON.stringify(this.cv)); if (this.hist.length > 25) this.hist.shift(); },
    undo() {
      const h = this.hist.pop();
      if (!h) return toast('Nothing to undo');
      S.s.canvases[this.day] = JSON.parse(h);
      this.renderAll(); this.persist();
    },

    setTool(t) {
      this.tool = t;
      this.world.dataset.tool = t;
      this.el.querySelectorAll('[data-tool]').forEach(b => { if (b.closest('.tools')) b.classList.toggle('on', b.dataset.tool === t); });
      this.el.classList.toggle('drawing', t !== 'select');
      if (t !== 'select') this.select(null);
    },
    setColor(c) {
      this.color = c;
      this.el.querySelectorAll('[data-pen]').forEach(b => b.classList.toggle('on', b.dataset.pen === c));
      const cu = this.el.querySelector('.sw-more'); if (cu) { cu.classList.toggle('on', !PEN_COLORS.includes(c)); cu.style.setProperty('--sw', c); }
    },
    setZoom(z) {
      this.zoom = clamp(Math.round(z * 100) / 100, 0.5, 1.6);
      this.sizer.style.width = W * this.zoom + 'px';
      this.sizer.style.height = H * this.zoom + 'px';
      this.world.style.transform = `scale(${this.zoom})`;
      this.zl.textContent = Math.round(this.zoom * 100) + '%';
    },
    select(id) {
      this.sel = id;
      this.itemsEl.querySelectorAll('.b-item').forEach(e => e.classList.toggle('sel', e.dataset.id === id));
    },
    pt(e) {
      const r = this.world.getBoundingClientRect();
      return { x: (e.clientX - r.left) / this.zoom, y: (e.clientY - r.top) / this.zoom };
    },
    item(id) { return this.cv.items.find(i => i.id === id); },
    itemEl(id) { return this.itemsEl.querySelector(`[data-id="${id}"]`); },

    addItem(type, extra = {}) {
      const dims = { note: [220, 150], text: [320, 70], image: [240, 260], palette: [300, 120] }[type];
      const cx = (this.vp.scrollLeft + this.vp.clientWidth / 2) / this.zoom, cy = (this.vp.scrollTop + this.vp.clientHeight / 2) / this.zoom;
      const j = () => (Math.random() - 0.5) * 70;
      const it = Object.assign({
        id: uid(), type, w: dims[0], h: dims[1],
        x: Math.round(clamp(cx - dims[0] / 2 + j(), 10, W - dims[0] - 10)),
        y: Math.round(clamp(cy - dims[1] / 2 + j(), 10, H - dims[1] - 10)),
        color: type === 'note' ? NOTE_COLORS[Math.floor(Math.random() * 3)] : '#4F708C',
        text: type === 'note' ? '' : type === 'text' ? 'A thought worth keeping' : '',
      }, type === 'palette' ? { colors: PALETTES[Math.floor(Math.random() * PALETTES.length)], text: 'new palette' } : {}, extra);
      this.snap(); this.cv.items.push(it);
      this.itemsEl.insertAdjacentHTML('beforeend', itemHTML(it));
      this.setTool('select'); this.select(it.id);
      const el = this.itemEl(it.id);
      if (type === 'note' || type === 'text') this.edit(el);
      this.persist();
    },
    edit(el) {
      const t = el.querySelector('[data-edit]'); if (!t) return;
      el.classList.add('editing'); t.contentEditable = 'plaintext-only';
      if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
      t.focus();
      const r = document.createRange(); r.selectNodeContents(t); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    remove(id) {
      this.snap();
      this.cv.items = this.cv.items.filter(i => i.id !== id);
      this.itemEl(id)?.remove(); this.sel = null; this.persist();
    },

    image(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const rd = new FileReader();
      rd.onload = () => {
        const im = new Image();
        im.onload = () => {
          const m = Math.min(1, 900 / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * m); c.height = Math.round(im.height * m);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const w = 250, h = Math.round(w * c.height / c.width) + 46;
          this.addItem('image', { src: c.toDataURL('image/jpeg', 0.82), w, h, text: '' });
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
    },

    bind() {
      const el = this.el;
      el.addEventListener('click', e => {
        const q = s => e.target.closest(s);
        let b;
        if ((b = q('[data-tool]')) && b.closest('.tools')) this.setTool(b.dataset.tool);
        else if ((b = q('[data-add]'))) b.dataset.add === 'image' ? this.file.click() : this.addItem(b.dataset.add);
        else if ((b = q('[data-pen]'))) { this.setColor(b.dataset.pen); if (this.tool === 'select') this.setTool('pen'); }
        else if (q('[data-undo]')) this.undo();
        else if (q('[data-clear]')) {
          if (!this.cv.items.length && !this.cv.strokes.length) return;
          this.snap(); S.s.canvases[this.day] = { items: [], strokes: [] }; this.renderAll(); this.persist(); toast('Board cleared — press Undo to bring it back');
        }
        else if ((b = q('[data-zoom]'))) this.setZoom(this.zoom + Number(b.dataset.zoom) * 0.1);
        else if ((b = q('[data-hex]'))) { try { navigator.clipboard.writeText(b.dataset.hex); } catch (_) { /* noop */ } toast(`Copied ${b.dataset.hex}`); }
      });
      el.querySelector('[data-size]').addEventListener('input', e => { this.size = Number(e.target.value); });
      el.querySelector('[data-pen-custom]').addEventListener('input', e => { this.setColor(e.target.value); if (this.tool === 'select') this.setTool('pen'); });
      this.file.addEventListener('change', () => { this.image(this.file.files[0]); this.file.value = ''; });

      // drop images straight onto the board
      this.vp.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); this.vp.classList.add('dropping'); } });
      this.vp.addEventListener('dragleave', () => this.vp.classList.remove('dropping'));
      this.vp.addEventListener('drop', e => { this.vp.classList.remove('dropping'); const f = e.dataTransfer.files[0]; if (f) { e.preventDefault(); this.image(f); } });

      this.vp.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); this.setZoom(this.zoom - Math.sign(e.deltaY) * 0.1); } }, { passive: false });

      this.itemsEl.addEventListener('dblclick', e => { const it = e.target.closest('.b-item'); if (it && e.target.closest('[data-edit]')) this.edit(it); });
      this.itemsEl.addEventListener('focusout', e => {
        const t = e.target.closest('[data-edit]'); if (!t) return;
        const it = t.closest('.b-item'), m = this.item(it.dataset.id);
        it.classList.remove('editing'); t.contentEditable = 'false';
        if (m && m.text !== t.innerText.replace(/\n$/, '')) { this.snap(); m.text = t.innerText.replace(/\n$/, ''); this.persist(); }
      });

      this.world.addEventListener('pointerdown', e => this.down(e));
      this.keyFn = e => {
        if (!this.el || !this.el.isConnected) return document.removeEventListener('keydown', this.keyFn);
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel && !e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]')) { e.preventDefault(); this.remove(this.sel); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && this.vp.matches(':hover') && !e.target.closest('input,textarea,[contenteditable]')) { e.preventDefault(); this.undo(); }
      };
      document.addEventListener('keydown', this.keyFn);
    },

    down(e) {
      if (e.button !== 0) return;
      const p = this.pt(e);
      if (this.tool === 'pen') {
        e.preventDefault(); this.snap();
        const s = { id: uid(), color: this.color, size: this.size, pts: [[Math.round(p.x), Math.round(p.y)]] };
        this.cv.strokes.push(s);
        this.svg.insertAdjacentHTML('beforeend', strokeEl(s));
        const path = this.svg.lastElementChild;
        this.track(e, ev => {
          const q = this.pt(ev), l = s.pts[s.pts.length - 1];
          if (Math.hypot(q.x - l[0], q.y - l[1]) < 1.5) return;
          s.pts.push([Math.round(q.x), Math.round(q.y)]); path.setAttribute('d', strokeD(s.pts));
        }, () => this.persist());
        path.setAttribute('d', strokeD(s.pts));
        return;
      }
      if (this.tool === 'erase') {
        e.preventDefault(); this.snap(); let hit = false;
        const wipe = ev => {
          const q = this.pt(ev), r = 10 + this.size * 1.5;
          this.cv.strokes = this.cv.strokes.filter(s => {
            if (!s.pts.some(pt => Math.hypot(pt[0] - q.x, pt[1] - q.y) < r + s.size)) return true;
            this.svg.querySelector(`[data-sid="${s.id}"]`)?.remove(); hit = true; return false;
          });
        };
        wipe(e);
        this.track(e, wipe, () => { if (hit) this.persist(); else this.hist.pop(); });
        return;
      }
      // select tool
      const itEl = e.target.closest('.b-item');
      if (!itEl) return this.select(null);
      const id = itEl.dataset.id, m = this.item(id);
      if (e.target.closest('[data-del]')) return this.remove(id);
      if (e.target.closest('[data-recolor]')) {
        this.snap(); m.color = NOTE_COLORS[(NOTE_COLORS.indexOf(m.color) + 1) % NOTE_COLORS.length];
        itEl.style.setProperty('--c', m.color); return this.persist();
      }
      this.select(id);
      if (itEl.classList.contains('editing')) return;
      e.preventDefault();
      const resize = !!e.target.closest('[data-resize]'), o = { x: m.x, y: m.y, w: m.w, h: m.h || itEl.offsetHeight };
      this.snap(); let moved = false;
      this.track(e, ev => {
        moved = true;
        const q = this.pt(ev), dx = q.x - p.x, dy = q.y - p.y;
        if (resize) {
          m.w = Math.round(clamp(o.w + dx, 90, W - m.x)); m.h = Math.round(clamp(o.h + dy, 50, H - m.y));
          itEl.style.width = m.w + 'px'; itEl.style.height = m.h + 'px';
        } else {
          m.x = Math.round(clamp(o.x + dx, 0, W - m.w)); m.y = Math.round(clamp(o.y + dy, 0, H - 40));
          itEl.style.left = m.x + 'px'; itEl.style.top = m.y + 'px';
        }
      }, () => { if (moved) this.persist(); else this.hist.pop(); itEl.classList.remove('moving'); });
      itEl.classList.add('moving');
    },
    track(e, move, up) {
      const mv = ev => move(ev);
      const end = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); up(); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    },
  };

  g.Board = B;
})(window);
