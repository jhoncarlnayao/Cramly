    'use strict';
    const world = document.getElementById('world');
    const viewport = document.getElementById('viewport');
    // ✅ FIX: drawCanvas is now inside #world — grab it from there
    const drawCanvas = document.getElementById('drawCanvas');
    const ctx = drawCanvas.getContext('2d');

    let decks = [], connectMode = false, connectSource = null, connections = [], connIdCtr = 0;
    let selPalette = '#f0f0f0', selNoteColor = 'yellow', kbOpen = false, memeImgSrc = '';
    let selectedEl = null, elZ = 10, elCtr = 0;
    let cam = { x: 0, y: 0, zoom: 1 }, panMode = false, isPanning = false;
    let panStart = { x: 0, y: 0 }, panCamStart = { x: 0, y: 0 }, spaceHeld = false;
    let dockVisible = true, darkMode = false, snapMode = false, shuffleMode = false;
    let drawMode = false, drawing = false, drawColor = '#111', drawSize = 2, lastPt = null;
    let activeDeckId = null, quizMode = 'mc';
    let quizData = { questions: [], idx: 0, score: 0, mode: 'mc', deckId: null };
    let bookmarks = [], panelFilter = 'all';
    let groups = [], groupCtr = 0;
    let multiSelected = [], lassoMode = false, lassoStart = null;
    let history = [], historyIdx = -1, historyPaused = false;

    // ✅ NEW: Drawing stroke history for per-stroke undo
    let drawStrokes = [];       // array of stroke objects {color, size, points:[{x,y}]}
    let currentStroke = null;   // stroke being drawn right now

    const noteColors = { yellow: '#fef9c3', lav: '#ede9fe', green: '#d1fae5', peach: '#ffedd5', pink: '#fce7f3', sky: '#e0f2fe' };
    const EMOJIS = ['📚', '🧮', '🔬', '🌍', '💡', '🎯', '📐', '🧬', '📖', '🎓', '🧪', '🗺️', '⚗️', '🔭', '💻'];
    const catFacts = ['Cats sleep 12–16 hrs/day 😴', 'A group of cats = a clowder 🐾', 'Cats can jump 6x their height 🦘', 'Cats purr at 25–150 Hz — it heals! 💊'];
    const ELEMENT_COLORS = ['#f0f0f0', '#fde68a', '#93c5fd', '#86efac', '#f9a8d4', '#c4b5fd', '#fca5a5', '#6ee7b7', '#fff'];
    let selEmoji = EMOJIS[0];
    const GEMINI_KEY = 'AIzaSyBelgw8NVH-lKg5sMCqJbqMIx4hEdyFudk';



    function shareCanvas() {
      const state = {
        decks: JSON.parse(JSON.stringify(decks)),
        bookmarks,
        drawStrokes,
        cam,
        darkMode
      };
      const encoded = btoa(
        unescape(encodeURIComponent(JSON.stringify(state)))
      );
      const url = location.href.split('?')[0] + '?share=' + encoded;
      navigator.clipboard.writeText(url).then(() =>
        showToast('Share link copied!')
      ).catch(() => {
        prompt('Copy this link:', url);
      });
    }

    function loadShareParam() {
      const params = new URLSearchParams(location.search);
      const share = params.get('share');
      if (!share) return;
      try {
        const state = JSON.parse(
          decodeURIComponent(escape(atob(share)))
        );
        if (state.decks) {
          decks = state.decks;
          decks.forEach(deck => placeDeckOnCanvas(deck));
        }
        if (state.bookmarks) {
          bookmarks = state.bookmarks;
          renderBookmarkBar();
        }
        if (state.drawStrokes) {
          drawStrokes = state.drawStrokes;
          replayStrokes();
        }
        if (state.darkMode) toggleDark();
        updateStats();
        showToast('Canvas loaded from shared link!');
      } catch (e) {
        showToast('Could not load shared canvas');
      }
    }









    /* ══ MORE PANEL ══ */
    function toggleMorePanel(e) {
      const panel = document.getElementById('morePanel');
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !isHidden);
      if (!isHidden) return;
      const btn = document.getElementById('moreBtn').getBoundingClientRect();
      panel.style.top = Math.min(btn.top - 8, window.innerHeight - panel.offsetHeight - 10) + 'px';
      e.stopPropagation();
    }
    function closeMorePanel() { document.getElementById('morePanel').classList.add('hidden') }
    document.addEventListener('click', e => {
      if (!e.target.closest('#morePanel') && !e.target.closest('#moreBtn')) closeMorePanel();
    });

    /* ══ STICKER LIBRARY ══ */
    const STICKER_CATS = {
      'Kawaii': ['https://api.dicebear.com/8.x/bottts/svg?seed=Felix&backgroundColor=b6e3f4', 'https://api.dicebear.com/8.x/bottts/svg?seed=Aneka&backgroundColor=ffdfbf', 'https://api.dicebear.com/8.x/bottts/svg?seed=Luna&backgroundColor=c0aede', 'https://api.dicebear.com/8.x/bottts/svg?seed=Max&backgroundColor=d1f7c4', 'https://api.dicebear.com/8.x/bottts/svg?seed=Pixel&backgroundColor=ffd5dc', 'https://api.dicebear.com/8.x/bottts/svg?seed=Nova&backgroundColor=ffeaa7', 'https://api.dicebear.com/8.x/bottts/svg?seed=Chip&backgroundColor=81ecec', 'https://api.dicebear.com/8.x/bottts/svg?seed=Bolt&backgroundColor=fd79a8', 'https://api.dicebear.com/8.x/bottts/svg?seed=Zap&backgroundColor=a29bfe', 'https://api.dicebear.com/8.x/bottts/svg?seed=Echo&backgroundColor=55efc4'],
      'Animals': ['https://api.dicebear.com/8.x/adventurer/svg?seed=Bear&backgroundColor=ffeaa7', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Fox&backgroundColor=fd79a8', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Bunny&backgroundColor=a29bfe', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Cat&backgroundColor=74b9ff', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Dog&backgroundColor=55efc4', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Panda&backgroundColor=dfe6e9', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Tiger&backgroundColor=fdcb6e', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Owl&backgroundColor=e17055', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Deer&backgroundColor=00b894', 'https://api.dicebear.com/8.x/adventurer/svg?seed=Wolf&backgroundColor=6c5ce7'],
      'Pixel': ['https://api.dicebear.com/8.x/pixel-art/svg?seed=Warrior&backgroundColor=b2bec3', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Mage&backgroundColor=a29bfe', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Knight&backgroundColor=74b9ff', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Rogue&backgroundColor=55efc4', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Priest&backgroundColor=fd79a8', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Ranger&backgroundColor=fdcb6e', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Bard&backgroundColor=ffeaa7', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Druid&backgroundColor=d1f7c4', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Paladin&backgroundColor=e17055', 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Wizard&backgroundColor=dfe6e9'],
      'Shapes': ['https://api.dicebear.com/8.x/shapes/svg?seed=A&backgroundColor=b6e3f4', 'https://api.dicebear.com/8.x/shapes/svg?seed=B&backgroundColor=ffd5dc', 'https://api.dicebear.com/8.x/shapes/svg?seed=C&backgroundColor=c0aede', 'https://api.dicebear.com/8.x/shapes/svg?seed=D&backgroundColor=d1f7c4', 'https://api.dicebear.com/8.x/shapes/svg?seed=E&backgroundColor=ffeaa7', 'https://api.dicebear.com/8.x/shapes/svg?seed=F&backgroundColor=ffdfbf', 'https://api.dicebear.com/8.x/shapes/svg?seed=G&backgroundColor=74b9ff', 'https://api.dicebear.com/8.x/shapes/svg?seed=H&backgroundColor=fd79a8', 'https://api.dicebear.com/8.x/shapes/svg?seed=I&backgroundColor=a29bfe', 'https://api.dicebear.com/8.x/shapes/svg?seed=J&backgroundColor=55efc4'],
      'Thumbs': ['https://api.dicebear.com/8.x/thumbs/svg?seed=Happy&backgroundColor=ffeaa7', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Cool&backgroundColor=74b9ff', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Chill&backgroundColor=a29bfe', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Smart&backgroundColor=55efc4', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Wow&backgroundColor=fd79a8', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Silly&backgroundColor=fdcb6e', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Wild&backgroundColor=d1f7c4', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Brave&backgroundColor=e17055', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Lively&backgroundColor=b6e3f4', 'https://api.dicebear.com/8.x/thumbs/svg?seed=Quirky&backgroundColor=dfe6e9']
    };
    let currentStickerCat = 'Kawaii';

    function buildStickerPanel() {
      const catsEl = document.getElementById('stickerCats'); catsEl.innerHTML = '';
      Object.keys(STICKER_CATS).forEach(cat => { const btn = document.createElement('button'); btn.className = 'sp-cat' + (cat === currentStickerCat ? ' active' : ''); btn.textContent = cat; btn.onclick = () => { currentStickerCat = cat; buildStickerPanel() }; catsEl.appendChild(btn) });
      const grid = document.getElementById('stickerGrid'); grid.innerHTML = '';
      STICKER_CATS[currentStickerCat].forEach(url => { const item = document.createElement('div'); item.className = 's-item'; const img = document.createElement('img'); img.src = url; img.alt = 'sticker'; item.appendChild(img); item.onclick = () => placeSticker(url); grid.appendChild(item) });
    }
    function toggleStickerPanel(e) {
      const sp = document.getElementById('stickerPanel'); const isOpen = sp.classList.toggle('open');
      if (isOpen) { const btn = document.getElementById('stickerBtn').getBoundingClientRect(); sp.style.left = (btn.right + 8) + 'px'; sp.style.top = Math.min(btn.top, window.innerHeight - 440) + 'px'; buildStickerPanel() }
    }
    function closeStickerPanel() { document.getElementById('stickerPanel').classList.remove('open') }
    function placeSticker(url) { const p = randWorldPos(); const el = makeEl(p.x, p.y, 90, 90); const wrap = document.createElement('div'); wrap.className = 'sticker-img'; const img = document.createElement('img'); img.src = url; img.alt = 'sticker'; wrap.appendChild(img); el.insertBefore(wrap, el.querySelector('.resize-h')); updateStats(); closeStickerPanel(); showToast('Sticker added!') }

    /* ══ FLOWCHART ══ */
    const FC_SHAPES = {
      process: { render: (w, h) => `<rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="#3b82f6"/>` },
      decision: { render: (w, h) => `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" fill="#f59e0b"/>` },
      terminal: { render: (w, h) => `<rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" fill="#10b981"/>` },
      data: { render: (w, h) => `<polygon points="${w * 0.15},0 ${w},0 ${w * 0.85},${h} 0,${h}" fill="#8b5cf6"/>` },
      doc: { render: (w, h) => `<path d="M0,0 H${w} V${h * 0.75} Q${w * 0.75},${h} ${w / 2},${h * 0.75} Q${w * 0.25},${h * 0.5} 0,${h * 0.75} Z" fill="#ec4899"/>` },
      delay: { render: (w, h) => `<path d="M0,0 H${w * 0.7} Q${w},${h / 2} ${w * 0.7},${h} H0 Q${w * 0.3},${h / 2} 0,0 Z" fill="#6366f1"/>` },
      db: { render: (w, h) => `<ellipse cx="${w / 2}" cy="${h * 0.2}" rx="${w / 2}" ry="${h * 0.2}" fill="#0d9488"/><rect x="0" y="${h * 0.2}" width="${w}" height="${h * 0.6}" fill="#14b8a6"/><ellipse cx="${w / 2}" cy="${h * 0.8}" rx="${w / 2}" ry="${h * 0.2}" fill="#0d9488"/>` },
    };
    const FC_LABELS = { process: 'Process', decision: 'Decision', terminal: 'Start/End', data: 'Data', doc: 'Document', delay: 'Delay', db: 'Database' };
    function toggleFlowPanel(e) { const fp = document.getElementById('flowPanel'); const isOpen = fp.classList.toggle('open'); if (isOpen) { const btn = document.getElementById('flowBtn').getBoundingClientRect(); fp.style.left = (btn.right + 8) + 'px'; fp.style.top = Math.min(btn.top, window.innerHeight - 500) + 'px' } }
    function closeFlowPanel() { document.getElementById('flowPanel').classList.remove('open') }
    function addFlowNode(type) { closeFlowPanel(); const p = randWorldPos(); const w = 160, h = (type === 'decision') ? 100 : (type === 'db') ? 80 : 60; const el = makeEl(p.x, p.y, w, h); const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;'; const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;'; svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.innerHTML = FC_SHAPES[type].render(w, h); const label = document.createElement('div'); label.style.cssText = 'position:relative;z-index:1;color:#fff;font-size:12px;font-weight:600;text-align:center;padding:4px 8px;width:100%;word-break:break-word;outline:none;cursor:text;'; label.contentEditable = 'true'; label.textContent = FC_LABELS[type]; label.addEventListener('mousedown', e => e.stopPropagation()); label.addEventListener('click', e => e.stopPropagation()); wrap.appendChild(svg); wrap.appendChild(label); el.insertBefore(wrap, el.querySelector('.resize-h')); updateStats(); setTimeout(() => label.focus(), 60) }

    /* ══ GROUPING ══ */
    function toggleLasso() { lassoMode = !lassoMode; document.getElementById('lassoBtn').classList.toggle('active', lassoMode); viewport.classList.toggle('lasso-mode', lassoMode); if (!lassoMode) clearMultiSelect(); showToast(lassoMode ? 'Lasso: drag to select multiple elements' : 'Lasso off') }
    function clearMultiSelect() { multiSelected.forEach(el => el.classList.remove('multi-selected')); multiSelected = [] }
    function groupSelected() {
      const toGroup = [...multiSelected];
      if (toGroup.length < 2) { showToast('Select 2+ elements to group (use Lasso)'); return }
      const groupId = 'grp-' + (++groupCtr);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      toGroup.forEach(el => { const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight; if (x < minX) minX = x; if (y < minY) minY = y; if (x + w > maxX) maxX = x + w; if (y + h > maxY) maxY = y + h });
      const pad = 20;
      const gWrap = document.createElement('div'); gWrap.className = 'group-wrap'; gWrap.dataset.groupId = groupId;
      gWrap.style.cssText = `left:${minX - pad}px;top:${minY - pad}px;width:${maxX - minX + pad * 2}px;height:${maxY - minY + pad * 2}px;z-index:${elZ - 1}`;
      const lbl = document.createElement('div'); lbl.className = 'group-label'; lbl.contentEditable = 'true'; lbl.textContent = 'Group ' + groupCtr; lbl.onclick = e => e.stopPropagation(); lbl.addEventListener('mousedown', e => e.stopPropagation());
      const delBtn = document.createElement('button'); delBtn.className = 'group-del'; delBtn.textContent = '✕'; delBtn.title = 'Ungroup'; delBtn.onclick = e => { e.stopPropagation(); ungroupById(groupId) };
      gWrap.appendChild(lbl); gWrap.appendChild(delBtn);
      const elIds = toGroup.map(el => el.dataset.elId);
      gWrap.dataset.elIds = JSON.stringify(elIds);
      groups.push({ id: groupId, elIds, wrap: gWrap });
      world.appendChild(gWrap);
      makeGroupDraggable(gWrap, elIds);
      clearMultiSelect();
      if (lassoMode) toggleLasso();
      updateStats(); captureState();
      showToast(`Grouped ${toGroup.length} elements!`);
    }
    function makeGroupDraggable(gWrap, elIds) {
      let sc, op, elOps = [], dr = false;
      gWrap.addEventListener('mousedown', e => {
        if (panMode || drawMode) return;
        if (e.target.classList.contains('group-label') || e.target.classList.contains('group-del')) return;
        dr = true; sc = { x: e.clientX, y: e.clientY }; op = { x: parseFloat(gWrap.style.left) || 0, y: parseFloat(gWrap.style.top) || 0 };
        elOps = elIds.map(id => { const el = document.querySelector(`.cel[data-el-id="${id}"]`); return el ? { el, x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 } : null }).filter(Boolean);
        gWrap.classList.add('selected'); e.preventDefault(); e.stopPropagation();
      });
      document.addEventListener('mousemove', e => { if (!dr) return; const dx = (e.clientX - sc.x) / cam.zoom, dy = (e.clientY - sc.y) / cam.zoom; gWrap.style.left = (op.x + dx) + 'px'; gWrap.style.top = (op.y + dy) + 'px'; elOps.forEach(({ el, x, y }) => { el.style.left = (x + dx) + 'px'; el.style.top = (y + dy) + 'px' }); redrawConnections(); updateMinimap() });
      document.addEventListener('mouseup', () => { if (dr) { dr = false; gWrap.classList.remove('selected'); captureState() } });
    }
    function ungroupById(id) { const g = groups.find(x => x.id === id); if (!g) return; g.wrap.remove(); groups = groups.filter(x => x.id !== id); updateStats(); captureState(); showToast('Ungrouped') }

    /* ══ LASSO SELECT ══ */
    let lassoEl = null;
    viewport.addEventListener('mousedown', e => {
      if (!lassoMode) return;
      if (e.target.closest('.cel') || e.target.closest('.group-wrap')) return;
      clearMultiSelect();
      const wpos = screenToWorld(e.clientX, e.clientY); lassoStart = wpos;
      const gs = document.getElementById('groupSelect'); gs.style.display = 'block'; gs.style.left = wpos.x + 'px'; gs.style.top = wpos.y + 'px'; gs.style.width = '0px'; gs.style.height = '0px'; lassoEl = gs; e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!lassoMode || !lassoStart || !lassoEl) return;
      const wpos = screenToWorld(e.clientX, e.clientY); const x = Math.min(lassoStart.x, wpos.x), y = Math.min(lassoStart.y, wpos.y); const w = Math.abs(wpos.x - lassoStart.x), h = Math.abs(wpos.y - lassoStart.y); lassoEl.style.left = x + 'px'; lassoEl.style.top = y + 'px'; lassoEl.style.width = w + 'px'; lassoEl.style.height = h + 'px';
    });
    document.addEventListener('mouseup', e => {
      if (!lassoMode || !lassoStart) return;
      const wpos = screenToWorld(e.clientX, e.clientY); const x = Math.min(lassoStart.x, wpos.x), y = Math.min(lassoStart.y, wpos.y); const w = Math.abs(wpos.x - lassoStart.x), h = Math.abs(wpos.y - lassoStart.y);
      if (w > 10 && h > 10) { document.querySelectorAll('.cel').forEach(el => { const ex = parseFloat(el.style.left), ey = parseFloat(el.style.top), ew = el.offsetWidth, eh = el.offsetHeight; if (ex >= x && ey >= y && ex + ew <= x + w && ey + eh <= y + h) { el.classList.add('multi-selected'); multiSelected.push(el) } }); if (multiSelected.length > 0) showToast(`${multiSelected.length} selected. Press G to group.`) }
      if (lassoEl) lassoEl.style.display = 'none'; lassoStart = null; lassoEl = null;
    });

    /* ══════════════════════════════════════════════
       DRAWING — FIXED
       Canvas is inside #world, so it moves/zooms
       with the camera automatically.
       We draw at WORLD coordinates (no cam math needed).
       Per-stroke undo via drawStrokes[] history.
    ══════════════════════════════════════════════ */
    function toggleDrawMode() {
      drawMode = !drawMode;
      document.getElementById('drawBtn').classList.toggle('active', drawMode);
      // ✅ pointer-events on the canvas (inside world) — enable/disable
      drawCanvas.style.pointerEvents = drawMode ? 'auto' : 'none';
      document.getElementById('drawColorRow').classList.toggle('visible', drawMode);
      viewport.classList.toggle('draw-active', drawMode);
    }

    function pickDrawColor(el) {
      document.querySelectorAll('.draw-swatch').forEach(s => s.classList.remove('on'));
      el.classList.add('on');
      drawColor = el.dataset.dc;
    }

    // ✅ Redraw all strokes from history onto the canvas
    function replayStrokes() {
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      drawStrokes.forEach(stroke => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });
    }

    // ✅ Undo last drawing stroke
    function undoDrawStroke() {
      if (drawStrokes.length === 0) { showToast('Nothing to undo'); return }
      drawStrokes.pop();
      replayStrokes();
      showToast('Draw stroke undone');
    }

    function clearDrawing() {
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      drawStrokes = [];
      showToast('Drawing cleared');
    }

    // ✅ FIXED: mouse coords -> world coords by reading canvas position in world
    // Since canvas is at (0,0) in world space and is 8000x8000, a mousedown on
    // the canvas gives clientX/Y. We convert to world using screenToWorld().
    drawCanvas.addEventListener('mousedown', e => {
      if (!drawMode) return;
      drawing = true;
      const wpos = screenToWorld(e.clientX, e.clientY);
      lastPt = wpos;
      // Start a new stroke
      currentStroke = { color: drawColor, size: drawSize, points: [{ x: wpos.x, y: wpos.y }] };
      e.stopPropagation();
    });

    drawCanvas.addEventListener('mousemove', e => {
      if (!drawing || !drawMode) return;
      const wpos = screenToWorld(e.clientX, e.clientY);
      // Draw incrementally
      ctx.globalAlpha = 1;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(wpos.x, wpos.y);
      ctx.stroke();
      lastPt = wpos;
      // Record point in current stroke
      if (currentStroke) currentStroke.points.push({ x: wpos.x, y: wpos.y });
    });

    window.addEventListener('mouseup', () => {
      if (drawing && currentStroke && currentStroke.points.length > 1) {
        drawStrokes.push(currentStroke);
      }
      drawing = false;
      lastPt = null;
      currentStroke = null;
    });

    /* ══ CAMERA ══ */
    function applyCamera() { world.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.zoom})`; world.style.transformOrigin = '2000px 2000px'; document.getElementById('zoomLbl').textContent = Math.round(cam.zoom * 100) + '%'; redrawConnections(); updateMinimap() }
    function zoomIn() { cam.zoom = Math.min(3, parseFloat((cam.zoom + .1).toFixed(1))); applyCamera() }
    function zoomOut() { cam.zoom = Math.max(.15, parseFloat((cam.zoom - .1).toFixed(1))); applyCamera() }
    function zoomReset() { cam.zoom = 1; cam.x = 0; cam.y = 0; applyCamera() }
    viewport.addEventListener('wheel', e => { e.preventDefault(); const d = e.deltaY < 0 ? .08 : -.08, nz = Math.min(3, Math.max(.15, cam.zoom + d)); const r = viewport.getBoundingClientRect(); cam.x = (e.clientX - r.left) - ((e.clientX - r.left) - cam.x) * (nz / cam.zoom); cam.y = (e.clientY - r.top) - ((e.clientY - r.top) - cam.y) * (nz / cam.zoom); cam.zoom = nz; applyCamera() }, { passive: false });

    /* ══ PAN ══ */
    function togglePan() { panMode = !panMode; document.getElementById('panBtn').classList.toggle('active', panMode); viewport.classList.toggle('pan-cursor', panMode) }
    viewport.addEventListener('mousedown', e => { if (!panMode || e.target.closest('.cel') || drawMode || lassoMode) return; if (e.target.closest('.group-wrap')) return; isPanning = true; panStart = { x: e.clientX, y: e.clientY }; panCamStart = { x: cam.x, y: cam.y }; viewport.classList.add('panning'); e.preventDefault() });
    document.addEventListener('mousemove', e => { if (!isPanning) return; cam.x = panCamStart.x + (e.clientX - panStart.x); cam.y = panCamStart.y + (e.clientY - panStart.y); applyCamera() });
    document.addEventListener('mouseup', () => { if (isPanning) { isPanning = false; viewport.classList.remove('panning') } });
    document.addEventListener('keydown', e => { if (e.code === 'Space' && !spaceHeld) { const a = document.activeElement; if (!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.contentEditable === 'true'))) { e.preventDefault(); spaceHeld = true; if (!panMode) togglePan() } } });
    document.addEventListener('keyup', e => { if (e.code === 'Space' && spaceHeld) { spaceHeld = false; if (panMode) togglePan() } });

    /* ══ COORDS ══ */
    function screenToWorld(sx, sy) { const r = viewport.getBoundingClientRect(); return { x: (sx - r.left - cam.x) / cam.zoom + 2000, y: (sy - r.top - cam.y) / cam.zoom + 2000 } }
    function worldToScreen(wx, wy) { const r = viewport.getBoundingClientRect(); return { x: (wx - 2000) * cam.zoom + cam.x + r.left, y: (wy - 2000) * cam.zoom + cam.y + r.top } }
    function randWorldPos() { const r = viewport.getBoundingClientRect(); const cx = r.left + r.width / 2 + (Math.random() - .5) * 300, cy = r.top + r.height / 2 + (Math.random() - .5) * 200; return screenToWorld(cx, cy) }
    const SNAP = 28;
    function snapXY(x, y) { if (!snapMode) return { x, y }; return { x: Math.round(x / SNAP) * SNAP, y: Math.round(y / SNAP) * SNAP } }

    /* ══ UNDO / REDO (element history) ══ */
    function captureState() {
      if (historyPaused) return;
      const els = []; document.querySelectorAll('.cel').forEach(el => { els.push({ id: el.dataset.elId, left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height, zIndex: el.style.zIndex, html: el.outerHTML }) });
      const grpData = groups.map(g => ({ id: g.id, elIds: g.elIds, left: g.wrap.style.left, top: g.wrap.style.top, width: g.wrap.style.width, height: g.wrap.style.height }));
      const state = { els, connections: connections.map(c => ({ id: c.id, fromId: c.from.dataset.elId, toId: c.to.dataset.elId, label: c.label || '', style: c.style || 'solid' })), decks: JSON.parse(JSON.stringify(decks)), grpData };
      history = history.slice(0, historyIdx + 1); history.push(state); if (history.length > 50) history.shift(); historyIdx = history.length - 1; updateUndoRedo();
    }
    function undo() { if (historyIdx <= 0) return; historyIdx--; restoreState(history[historyIdx]); updateUndoRedo() }
    function redo() { if (historyIdx >= history.length - 1) return; historyIdx++; restoreState(history[historyIdx]); updateUndoRedo() }
    function restoreState(state) {
      historyPaused = true; decks = JSON.parse(JSON.stringify(state.decks));
      document.querySelectorAll('.cel').forEach(el => el.remove()); document.querySelectorAll('.group-wrap').forEach(g => g.remove()); groups = []; connections = [];
      state.els.forEach(e => { const tmp = document.createElement('div'); tmp.innerHTML = e.html; const cel = tmp.firstChild; world.appendChild(cel); makeDraggable(cel); makeResizable(cel, cel.querySelector('.resize-h')); cel.addEventListener('mousedown', () => { if (!connectMode) selectEl(cel) }); cel.addEventListener('click', handleConnectClick.bind(null, cel)) });
      state.connections.forEach(c => { const from = document.querySelector(`.cel[data-el-id="${c.fromId}"]`); const to = document.querySelector(`.cel[data-el-id="${c.toId}"]`); if (from && to) connections.push({ id: c.id, from, to, label: c.label || '', style: c.style || 'solid' }) });
      historyPaused = false; redrawConnections(); updateStats(); renderDeckPanel();
    }
    function updateUndoRedo() { document.getElementById('undoBtn').disabled = historyIdx <= 0; document.getElementById('redoBtn').disabled = historyIdx >= history.length - 1 }

    /* ══ DOCK / DARK / SNAP ══ */
    function toggleDock() { dockVisible = !dockVisible; document.getElementById('sidedock').classList.toggle('hidden-dock', !dockVisible) }
    function toggleDark() { darkMode = !darkMode; document.body.classList.toggle('dark', darkMode); document.getElementById('darkBtn').classList.toggle('active', darkMode); saveLSState() }
    function toggleSnap() { snapMode = !snapMode; document.getElementById('snapBtn').classList.toggle('active', snapMode); showToast(snapMode ? 'Snap to grid ON' : 'Snap to grid OFF') }

    /* ══ CONNECTIONS ══ */
    function toggleConnectMode() { connectMode = !connectMode; document.getElementById('connectBtn').classList.toggle('active', connectMode); viewport.classList.toggle('connect-mode', connectMode); connectSource = null; document.querySelectorAll('.cel.connect-source').forEach(el => el.classList.remove('connect-source')); showToast(connectMode ? 'Connect mode: click an element to start' : 'Connect mode off') }
    function handleConnectClick(el, e) { if (!connectMode || e.target.closest('.el-tb') || e.target.classList.contains('resize-h')) return; e.stopPropagation(); if (!connectSource) { connectSource = el; el.classList.add('connect-source'); showToast('Now click another element to connect') } else if (connectSource !== el) { const connId = 'conn-' + (++connIdCtr); connections.push({ id: connId, from: connectSource, to: el, label: '', style: 'solid' }); connectSource.classList.remove('connect-source'); connectSource = null; redrawConnections(); captureState(); showToast('Connected!') } }
    function getElCenter(el) { return { x: parseFloat(el.style.left) + el.offsetWidth / 2, y: parseFloat(el.style.top) + el.offsetHeight / 2 } }
    function getElEdge(from, to) { const fc = getElCenter(from), tc = getElCenter(to), fw = from.offsetWidth / 2, fh = from.offsetHeight / 2, dx = tc.x - fc.x, dy = tc.y - fc.y, angle = Math.atan2(dy, dx), cos = Math.cos(angle), sin = Math.sin(angle), t = Math.abs(cos) * fh > Math.abs(sin) * fw ? fw / Math.abs(cos) : fh / Math.abs(sin); return { x: fc.x + cos * t, y: fc.y + sin * t } }
    function redrawConnections() {
      document.querySelectorAll('#connSVG .conn-line,.conn-lbl-el').forEach(l => l.remove());
      connections.forEach(conn => {
        if (!document.body.contains(conn.from) || !document.body.contains(conn.to)) return;
        const p1 = getElEdge(conn.from, conn.to), p2 = getElEdge(conn.to, conn.from), mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2, dx = p2.x - p1.x, dy = p2.y - p1.y, cx = mx - dy * .15, cy = my + dx * .15;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', `M${p1.x},${p1.y} Q${cx},${cy} ${p2.x},${p2.y}`); path.setAttribute('fill', 'none'); const isDashed = conn.style === 'dashed'; path.setAttribute('stroke', conn.color || '#555'); path.setAttribute('stroke-width', '1.8'); if (isDashed) path.setAttribute('stroke-dasharray', '6,4'); path.setAttribute('marker-end', `url(#arrowhead${isDashed ? '-dashed' : ''})`); path.classList.add('conn-line'); path.dataset.connId = conn.id;
        path.addEventListener('click', () => { const lbl = prompt('Connection label (blank to delete):', conn.label || ''); if (lbl === null) { connections = connections.filter(c => c.id !== conn.id); redrawConnections(); captureState(); return } conn.label = lbl; redrawConnections() });
        path.addEventListener('contextmenu', e => { e.preventDefault(); conn.style = conn.style === 'dashed' ? 'solid' : 'dashed'; redrawConnections() });
        document.getElementById('connSVG').appendChild(path);
        if (conn.label) { const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text'); txt.setAttribute('x', cx); txt.setAttribute('y', cy - 6); txt.setAttribute('text-anchor', 'middle'); txt.classList.add('conn-label', 'conn-lbl-el'); txt.setAttribute('stroke', '#fff'); txt.setAttribute('stroke-width', '3'); txt.textContent = conn.label; document.getElementById('connSVG').appendChild(txt) }
      });
    }
    document.addEventListener('mousemove', e => { const preview = document.getElementById('connPreview'); if (!connectMode || !connectSource) { preview.style.display = 'none'; return } const p1 = getElCenter(connectSource), wpos = screenToWorld(e.clientX, e.clientY); preview.style.display = ''; preview.setAttribute('x1', p1.x); preview.setAttribute('y1', p1.y); preview.setAttribute('x2', wpos.x); preview.setAttribute('y2', wpos.y) });

    /* ══ ELEMENT FACTORY ══ */
    function makeEl(x, y, w, h, skipHistory) {
      const snap = snapXY(x, y); x = snap.x; y = snap.y;
      const el = document.createElement('div'); el.className = 'cel'; el.dataset.elId = ++elCtr; el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${elZ++}`;
      const tb = document.createElement('div'); tb.className = 'el-tb'; tb.innerHTML = `<button class="el-tbtn" title="Bring forward" onclick="bringFront(this.closest('.cel'))"><i class="fa-solid fa-arrow-up" style="font-size:9px"></i></button><button class="el-tbtn" title="Change color" onclick="cycleElColor(this.closest('.cel'))">🎨</button><button class="el-tbtn" title="Lock/unlock" onclick="toggleLock(this.closest('.cel'))">🔓</button><button class="el-tbtn" title="Add to selection" onclick="addToMultiSelect(this.closest('.cel'))">☑</button><button class="el-tbtn del" title="Delete" onclick="removeEl(this.closest('.cel'))">✕</button>`;
      el.appendChild(tb);
      const rh = document.createElement('div'); rh.className = 'resize-h'; el.appendChild(rh);
      ['top', 'bottom', 'left', 'right'].forEach(pos => { const port = document.createElement('div'); port.className = `connect-port ${pos}`; port.addEventListener('mousedown', e => e.stopPropagation()); el.appendChild(port) });
      makeDraggable(el); makeResizable(el, rh); el.addEventListener('mousedown', () => { if (!connectMode) selectEl(el) }); el.addEventListener('click', handleConnectClick.bind(null, el)); world.appendChild(el); if (!skipHistory) setTimeout(captureState, 50); return el;
    }
    function addToMultiSelect(el) { if (multiSelected.includes(el)) { multiSelected = multiSelected.filter(x => x !== el); el.classList.remove('multi-selected') } else { multiSelected.push(el); el.classList.add('multi-selected') } showToast(`${multiSelected.length} element(s) selected. Press G to group.`) }
    function bringFront(el) { el.style.zIndex = ++elZ }
    function removeEl(el) { const id = el.dataset.elId; connections = connections.filter(c => c.from.dataset.elId !== id && c.to.dataset.elId !== id); redrawConnections(); el.remove(); updateStats(); captureState() }
    function selectEl(el) { if (selectedEl) selectedEl.classList.remove('selected'); selectedEl = el; el.classList.add('selected') }
    function toggleLock(el) { const locked = el.classList.toggle('locked'); el.querySelector('.el-tbtn[title="Lock/unlock"]').textContent = locked ? '🔒' : '🔓'; showToast(locked ? 'Element locked' : 'Element unlocked') }
    function cycleElColor(el) { const inner = el.querySelector('.sticky,.deck-canvas-card,.tbox'); if (!inner) return; const cur = inner.style.background || ELEMENT_COLORS[0]; const idx = (ELEMENT_COLORS.indexOf(cur) + 1) % ELEMENT_COLORS.length; inner.style.background = ELEMENT_COLORS[idx]; el.style.background = ELEMENT_COLORS[idx]; captureState() }
    function makeDraggable(el) {
      let sc, op, dr = false;
      el.addEventListener('mousedown', e => { if (panMode || connectMode || drawMode || el.classList.contains('locked')) return; if (e.target.closest('.el-tb') || e.target.classList.contains('resize-h') || e.target.contentEditable === 'true' || e.target.classList.contains('connect-port')) return; dr = true; sc = { x: e.clientX, y: e.clientY }; op = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 }; el.classList.add('dragging'); e.preventDefault(); e.stopPropagation() });
      document.addEventListener('mousemove', e => { if (!dr) return; let nx = op.x + (e.clientX - sc.x) / cam.zoom, ny = op.y + (e.clientY - sc.y) / cam.zoom; if (snapMode) { const s = snapXY(nx, ny); nx = s.x; ny = s.y } el.style.left = nx + 'px'; el.style.top = ny + 'px'; updateGroupBounds(el); redrawConnections(); updateMinimap() });
      document.addEventListener('mouseup', () => { if (dr) { dr = false; el.classList.remove('dragging'); captureState() } });
    }
    function updateGroupBounds(movedEl) {
      const id = movedEl.dataset.elId;
      groups.forEach(g => {
        if (!g.elIds.includes(id)) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        g.elIds.forEach(eid => { const el = document.querySelector(`.cel[data-el-id="${eid}"]`); if (!el) return; const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight; if (x < minX) minX = x; if (y < minY) minY = y; if (x + w > maxX) maxX = x + w; if (y + h > maxY) maxY = y + h });
        const pad = 20; g.wrap.style.left = (minX - pad) + 'px'; g.wrap.style.top = (minY - pad) + 'px'; g.wrap.style.width = (maxX - minX + pad * 2) + 'px'; g.wrap.style.height = (maxY - minY + pad * 2) + 'px';
      });
    }
    function makeResizable(el, handle) { let sx, sy, sw, sh, r = false; handle.addEventListener('mousedown', e => { if (el.classList.contains('locked')) return; r = true; sx = e.clientX; sy = e.clientY; sw = el.offsetWidth; sh = el.offsetHeight; e.preventDefault(); e.stopPropagation() }); document.addEventListener('mousemove', e => { if (!r) return; el.style.width = Math.max(80, sw + (e.clientX - sx) / cam.zoom) + 'px'; el.style.height = Math.max(40, sh + (e.clientY - sy) / cam.zoom) + 'px'; redrawConnections() }); document.addEventListener('mouseup', () => { if (r) { r = false; captureState() } }) }

    /* ══ MODALS ══ */
    function openOv(id) { if (id === 'deckModal') buildEmojiRow(); if (id === 'noteModal') { document.getElementById('nLabel').value = ''; document.getElementById('nContent').value = '' } document.getElementById(id).classList.add('open') }
    function closeOv(id) { document.getElementById(id).classList.remove('open') }
    document.querySelectorAll('.modal-bg').forEach(bg => bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open') }));

    /* ══ DECKS ══ */
    function buildEmojiRow() { selEmoji = EMOJIS[0]; const row = document.getElementById('emojiRow'); row.innerHTML = ''; EMOJIS.forEach(em => { const b = document.createElement('button'); b.textContent = em; b.className = 'ebtn' + (em === EMOJIS[0] ? ' sel' : ''); b.onclick = () => { document.querySelectorAll('.ebtn').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selEmoji = em }; row.appendChild(b) }); document.getElementById('dTitle').value = ''; document.getElementById('dDesc').value = '' }
    function createDeck() { const title = document.getElementById('dTitle').value.trim(); if (!title) return; const deck = { id: Date.now(), icon: selEmoji, title, desc: document.getElementById('dDesc').value.trim(), tag: document.getElementById('dTag').value, color: selPalette, cards: [], progress: 0 }; decks.push(deck); closeOv('deckModal'); placeDeckOnCanvas(deck); renderDeckPanel(); updateStats(); saveLSState(); captureState() }
    function placeDeckOnCanvas(deck) { const p = randWorldPos(); const el = makeEl(p.x, p.y, 250, 220, true); el.dataset.deckId = deck.id; const card = document.createElement('div'); card.className = 'deck-canvas-card'; card.style.background = deck.color; card.innerHTML = `<div class="dc-header"><span class="dc-icon">${deck.icon}</span><span class="dc-tag">${deck.tag}</span></div><div class="dc-body"><div class="dc-title">${escHtml(deck.title)}</div><div class="dc-desc">${escHtml(deck.desc || 'No description')}</div></div><div class="dc-footer"><div class="dc-meta"><span id="dcMeta-${deck.id}">${deck.cards.length} cards</span><span id="dcProg-${deck.id}">${deck.progress}%</span></div><div class="dc-pb"><div class="dc-pb-fill" id="dcFill-${deck.id}" style="width:${deck.progress}%"></div></div><div class="dc-actions"><button class="dc-btn" onclick="event.stopPropagation();openCardManager(${deck.id})">✏️ Cards</button><button class="dc-btn" onclick="event.stopPropagation();studyDeck(${deck.id})">Study</button><button class="dc-btn" onclick="event.stopPropagation();openQuiz(${deck.id})">🧠 Quiz</button></div></div>`; el.insertBefore(card, el.querySelector('.resize-h')); updateStats(); setTimeout(captureState, 80) }
    function updateDeckCard(id) { const d = decks.find(x => x.id === id); if (!d) return; const m = document.getElementById('dcMeta-' + id), f = document.getElementById('dcFill-' + id), g = document.getElementById('dcProg-' + id); if (m) m.textContent = `${d.cards.length} card${d.cards.length !== 1 ? 's' : ''}`; if (f) f.style.width = d.progress + '%'; if (g) g.textContent = d.progress + '%' }
    function deleteDeck(id) { decks = decks.filter(d => d.id !== id); const el = document.querySelector(`.cel[data-deck-id="${id}"]`); if (el) el.remove(); renderDeckPanel(); updateStats(); saveLSState(); captureState() }

    /* ══ CARD MANAGER ══ */
    function openCardManager(id) { activeDeckId = id; const d = decks.find(x => x.id === id); document.getElementById('cardModalTitle').textContent = d.title + ' — Cards'; document.getElementById('cFront').value = ''; document.getElementById('cBack').value = ''; document.getElementById('aiStatus').textContent = ''; renderCardList(); openOv('cardModal') }
    function renderCardList() { const d = decks.find(x => x.id === activeDeckId); const list = document.getElementById('cardList'); list.innerHTML = ''; if (!d || !d.cards.length) { list.innerHTML = '<div class="empty-cards">No cards yet. Add one below!</div>'; return } d.cards.forEach((c, i) => { const srs = c.srs || 0; const badges = ['new', 'hard', 'good', 'easy']; const lbls = ['NEW', 'HARD', 'GOOD', 'EASY']; const item = document.createElement('div'); item.className = 'card-item'; item.innerHTML = `<div class="card-item-num">${i + 1}</div><div class="card-item-body"><div class="card-item-front">${escHtml(c.front)}</div><div class="card-item-back">${escHtml(c.back)}</div><div class="card-item-srs"><span class="srs-badge ${badges[srs]}">${lbls[srs]}</span></div></div><button class="card-item-del" onclick="deleteCard(${i})">✕</button>`; list.appendChild(item) }); list.scrollTop = list.scrollHeight }
    function addCard() { const front = document.getElementById('cFront').value.trim(), back = document.getElementById('cBack').value.trim(); if (!front || !back) { document.getElementById('aiStatus').textContent = 'Both fields are required.'; return } const d = decks.find(x => x.id === activeDeckId); if (!d) return; d.cards.push({ front, back, srs: 0 }); document.getElementById('cFront').value = ''; document.getElementById('cBack').value = ''; document.getElementById('aiStatus').textContent = '✅ Card added!'; setTimeout(() => document.getElementById('aiStatus').textContent = '', 1500); renderCardList(); renderDeckPanel(); updateDeckCard(activeDeckId); updateStats(); saveLSState(); document.getElementById('cFront').focus() }
    function deleteCard(idx) { const d = decks.find(x => x.id === activeDeckId); if (!d) return; d.cards.splice(idx, 1); renderCardList(); renderDeckPanel(); updateDeckCard(activeDeckId); updateStats(); saveLSState() }

    /* ══ CSV EXPORT/IMPORT ══ */
    function exportDeckCSV() { const d = decks.find(x => x.id === activeDeckId); if (!d) return; const csv = d.cards.map(c => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}"`).join('\n'); const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,Front,Back\n' + encodeURIComponent(csv); a.download = d.title + '.csv'; a.click(); showToast('CSV exported!') }
    function importCSV(input) { const file = input.files[0]; if (!file) return; const d = decks.find(x => x.id === activeDeckId); if (!d) return; const r = new FileReader(); r.onload = e => { const lines = e.target.result.split('\n').filter(l => l.trim() && !l.toLowerCase().startsWith('front')); let added = 0; lines.forEach(line => { const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/); if (parts.length >= 2) { const front = parts[0].replace(/^"|"$/g, '').trim(); const back = parts[1].replace(/^"|"$/g, '').trim(); if (front && back) { d.cards.push({ front, back, srs: 0 }); added++ } } }); renderCardList(); renderDeckPanel(); updateDeckCard(activeDeckId); updateStats(); saveLSState(); showToast(`Imported ${added} cards!`) }; r.readAsText(file); input.value = '' }

    /* ══ DECK EXPORT/IMPORT ══ */
    function exportDecks() { const data = JSON.stringify({ decks }, null, 2); const a = document.createElement('a'); a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data); a.download = 'cramly-decks.json'; a.click(); showToast('Decks exported!') }
    function importDecks(input) { const file = input.files[0]; if (!file) return; const r = new FileReader(); r.onload = e => { try { const d = JSON.parse(e.target.result); if (d.decks) { d.decks.forEach(deck => decks.push(deck)); renderDeckPanel(); updateStats(); saveLSState(); showToast(`Imported ${d.decks.length} decks!`) } } catch { showToast('Import failed') } }; r.readAsText(file); input.value = '' }

    /* ══ JSON EXTRACT HELPER ══ */
    function extractJsonArray(text) {
      text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      const start = text.indexOf('['); const end = text.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) throw new Error('No JSON array found');
      return text.slice(start, end + 1);
    }

    /* ══ AI GENERATE CARDS ══ */
    async function aiGenerateCards() {
      const d = decks.find(x => x.id === activeDeckId); if (!d) return;
      const btn = document.getElementById('aiGenBtn'), status = document.getElementById('aiStatus');
      btn.disabled = true; status.textContent = '✨ Generating with AI…';
      const existing = d.cards.map(c => `Q: ${c.front} / A: ${c.back}`).join('\n');
      const prompt = `Create 5 high-quality flashcard pairs for a study deck titled "${d.title}" (${d.tag}).${d.desc ? ' Description: ' + d.desc : ''}${existing ? '\nExisting (avoid duplicates):\n' + existing : ''}\nReturn ONLY a valid JSON array with no extra text: [{"front":"...","back":"..."},...]. No markdown, no explanation.`;
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } }) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        if (!rawText) throw new Error('Empty response from AI');
        const jsonStr = extractJsonArray(rawText);
        const cards = JSON.parse(jsonStr);
        if (!Array.isArray(cards) || !cards.length) throw new Error('No cards in response');
        let added = 0;
        cards.forEach(c => { if (c.front && c.back) { d.cards.push({ front: String(c.front), back: String(c.back), srs: 0 }); added++ } });
        status.textContent = `✅ Added ${added} AI cards!`;
        renderCardList(); renderDeckPanel(); updateDeckCard(activeDeckId); updateStats(); saveLSState();
      } catch (err) {
        console.error('AI Generate error:', err);
        status.textContent = '⚠️ AI unavailable, generating locally…';
        const fallbackCards = genFallbackCards(d, 5);
        fallbackCards.forEach(c => d.cards.push({ front: c.front, back: c.back, srs: 0 }));
        renderCardList(); renderDeckPanel(); updateDeckCard(activeDeckId); updateStats(); saveLSState();
        setTimeout(() => status.textContent = `✅ Added ${fallbackCards.length} sample cards (AI offline)`, 500);
      }
      btn.disabled = false;
      setTimeout(() => status.textContent = '', 5000);
    }

    function genFallbackCards(deck, count) {
      const templates = [
        { front: `What is the main topic of "${deck.title}"?`, back: `${deck.title} — ${deck.desc || deck.tag}` },
        { front: `Define a key concept in ${deck.tag}`, back: `See your notes for ${deck.title}` },
        { front: `Give an example related to ${deck.title}`, back: `Review your ${deck.tag} materials` },
        { front: `Why is ${deck.title} important?`, back: `It builds foundational knowledge in ${deck.tag}` },
        { front: `Summarize ${deck.title} in one sentence`, back: `${deck.desc || 'A study deck covering ' + deck.tag + ' concepts'}` },
      ];
      return templates.slice(0, count);
    }

    /* ══ SRS / STUDY ══ */
    let studyQueue = [];
    function studyDeck(id) { const d = decks.find(x => x.id === id); if (!d || !d.cards.length) { showToast('No cards yet!'); return } studyQueue = [...d.cards].sort((a, b) => (a.srs || 0) - (b.srs || 0)); if (shuffleMode) studyQueue.sort(() => Math.random() - .5); window._study = { deck: d, queue: studyQueue, idx: 0, flipped: false }; document.getElementById('sDeckName').textContent = d.title; document.getElementById('srsButtons').style.display = 'none'; showStudyCard(); openOv('studyModal') }
    function showStudyCard() { const { queue, idx } = window._study; const c = queue[idx]; document.getElementById('sFront').textContent = c.front; document.getElementById('sBack').textContent = c.back; document.getElementById('sCtr').textContent = `${idx + 1} / ${queue.length}`; document.getElementById('sFill').style.width = `${((idx + 1) / queue.length) * 100}%`; document.getElementById('flipInner').classList.remove('flipped'); window._study.flipped = false; document.getElementById('srsButtons').style.display = 'none'; const srs = c.srs || 0; const lbls = ['new', 'hard', 'good', 'easy']; document.getElementById('srsBadge').className = 'srs-badge ' + lbls[srs]; document.getElementById('srsBadge').textContent = lbls[srs].toUpperCase() }
    function flipCard() { document.getElementById('flipInner').classList.toggle('flipped'); window._study.flipped = true; document.getElementById('srsButtons').style.display = 'flex' }
    function srsRate(rating) { const { queue, idx } = window._study; const c = queue[idx]; const map = { hard: 1, good: 2, easy: 3 }; c.srs = map[rating] || 1; saveLSState(); nextCard() }
    function toggleShuffle() { shuffleMode = !shuffleMode; showToast(shuffleMode ? 'Shuffle ON' : 'Shuffle OFF') }
    function nextCard() { const s = window._study; if (s.idx < s.queue.length - 1) { s.idx++; showStudyCard() } }
    function prevCard() { const s = window._study; if (s.idx > 0) { s.idx--; showStudyCard() } }

    /* ══ QUIZ ══ */
    function openQuiz(id) { const d = decks.find(x => x.id === id); if (!d || d.cards.length < 2) { showToast('Need at least 2 cards!'); return } quizData.deckId = id; document.getElementById('quizModeTitle').textContent = d.title + ' — Quiz'; document.getElementById('quizDeckName').textContent = d.title; document.getElementById('quizModeSelect').style.display = ''; document.getElementById('quizGame').style.display = 'none'; document.getElementById('quizResult').style.display = 'none'; document.getElementById('quizGenStatus').textContent = ''; openOv('quizModal') }
    function selectQuizMode(mode, btn) { quizMode = mode; document.querySelectorAll('.quiz-mode-btn').forEach(b => b.classList.remove('sel')); btn.classList.add('sel') }
    async function startQuiz() {
      const d = decks.find(x => x.id === quizData.deckId);
      const count = Math.min(parseInt(document.getElementById('quizCount').value) || 5, d.cards.length * 2, 20);
      const statusEl = document.getElementById('quizGenStatus'); statusEl.textContent = '✨ Generating quiz…';
      document.querySelector('#quizModeSelect .btn-ok').disabled = true;
      const prompts = {
        mc: `Based on these flashcards, create ${count} multiple-choice questions.\nCards:\n${d.cards.map(c => `Q: ${c.front} | A: ${c.back}`).join('\n')}\nReturn ONLY a valid JSON array: [{"question":"...","options":["A","B","C","D"],"answer":"exact option","explanation":"..."}]. No markdown.`,
        tf: `Based on these flashcards, create ${count} true/false questions.\nCards:\n${d.cards.map(c => `Q: ${c.front} | A: ${c.back}`).join('\n')}\nReturn ONLY a valid JSON array: [{"question":"True or False: ...","answer":"True","explanation":"..."}]. No markdown.`,
        fib: `Based on these flashcards, create ${count} fill-in-blank questions.\nCards:\n${d.cards.map(c => `Q: ${c.front} | A: ${c.back}`).join('\n')}\nReturn ONLY a valid JSON array: [{"question":"The ___ is ...","answer":"key word","explanation":"..."}]. No markdown.`
      };
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompts[quizMode] }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        if (!rawText) throw new Error('Empty response');
        const jsonStr = extractJsonArray(rawText);
        quizData.questions = JSON.parse(jsonStr);
        if (!Array.isArray(quizData.questions) || !quizData.questions.length) throw new Error('Empty quiz');
      } catch (err) {
        console.error('Quiz AI error:', err);
        statusEl.textContent = '⚠️ AI offline, using local questions…';
        quizData.questions = genLocalQuiz(d, quizMode, count);
      }
      quizData.idx = 0; quizData.score = 0; quizData.mode = quizMode;
      document.getElementById('quizModeSelect').style.display = 'none'; document.getElementById('quizGame').style.display = ''; renderQuizQ();
      document.querySelector('#quizModeSelect .btn-ok').disabled = false;
    }
    function genLocalQuiz(deck, mode, count) { const s = [...deck.cards].sort(() => Math.random() - .5).slice(0, count); if (mode === 'mc') return s.map(c => { const o = [c.back, ...deck.cards.filter(x => x !== c).sort(() => Math.random() - .5).slice(0, 3).map(x => x.back)].sort(() => Math.random() - .5); return { question: c.front, options: o, answer: c.back, explanation: c.back } }); if (mode === 'tf') return s.map((c, i) => { if (i % 2 === 0) return { question: `${c.front} — "${c.back}"`, answer: 'True', explanation: c.back }; const w = deck.cards.find(x => x !== c); return { question: `${c.front} — "${w ? w.back : '?'}"`, answer: 'False', explanation: c.back } }); return s.map(c => { const w = c.back.split(' ')[0]; return { question: `${c.front}: ${c.back.replace(w, '___')}`, answer: w, explanation: c.back } }) }
    function renderQuizQ() { const q = quizData.questions[quizData.idx], total = quizData.questions.length; document.getElementById('quizCtr').textContent = `${quizData.idx + 1} / ${total}`; document.getElementById('quizFill').style.width = `${((quizData.idx + 1) / total) * 100}%`; document.getElementById('quizQ').textContent = q.question; document.getElementById('quizFeedback').textContent = ''; document.getElementById('quizNext').style.display = 'none'; document.getElementById('quizScore').textContent = 'Score: ' + quizData.score; document.getElementById('quizTypeLabel').textContent = quizData.mode === 'mc' ? 'Multiple Choice' : quizData.mode === 'tf' ? 'True / False' : 'Fill in the Blank'; const optsEl = document.getElementById('quizOpts'), fibEl = document.getElementById('quizFib'); optsEl.innerHTML = ''; fibEl.style.display = 'none'; if (quizData.mode === 'fib') { optsEl.style.display = 'none'; fibEl.style.display = 'block'; const inp = document.getElementById('fibInput'); inp.value = ''; inp.className = 'fib-input'; inp.disabled = false; inp.focus() } else { optsEl.style.display = 'grid'; const opts = quizData.mode === 'tf' ? ['True', 'False'] : q.options; opts.forEach(opt => { const btn = document.createElement('button'); btn.className = 'quiz-opt'; btn.textContent = opt; btn.onclick = () => checkMC(opt, btn); optsEl.appendChild(btn) }) } }
    function checkMC(chosen, btn) { const q = quizData.questions[quizData.idx]; document.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = true; if (b.textContent === q.answer) b.classList.add('correct') }); if (chosen === q.answer) { btn.classList.add('correct'); quizData.score++; document.getElementById('quizFeedback').textContent = '✅ ' + q.explanation } else { btn.classList.add('wrong'); document.getElementById('quizFeedback').textContent = '❌ ' + q.explanation } document.getElementById('quizScore').textContent = 'Score: ' + quizData.score; document.getElementById('quizNext').style.display = 'inline-block' }
    function checkFib() { const q = quizData.questions[quizData.idx], inp = document.getElementById('fibInput'); const given = inp.value.trim().toLowerCase(), correct = q.answer.toLowerCase(); inp.disabled = true; if (given === correct || given.includes(correct) || correct.includes(given)) { inp.classList.add('correct'); quizData.score++; document.getElementById('quizFeedback').textContent = '✅ ' + q.explanation } else { inp.classList.add('wrong'); document.getElementById('quizFeedback').textContent = `❌ Answer: "${q.answer}". ${q.explanation}` } document.getElementById('quizScore').textContent = 'Score: ' + quizData.score; document.getElementById('quizNext').style.display = 'inline-block' }
    function nextQuizQ() { quizData.idx++; if (quizData.idx >= quizData.questions.length) showQuizResult(); else renderQuizQ() }
    function showQuizResult() { document.getElementById('quizGame').style.display = 'none'; document.getElementById('quizResult').style.display = 'block'; const pct = Math.round((quizData.score / quizData.questions.length) * 100); document.getElementById('quizResultScore').textContent = `${quizData.score}/${quizData.questions.length}`; const msgs = ['Keep studying! 📚', 'Getting there! 💪', 'Good job! 🎯', 'Great work! ⭐', 'Perfect! 🏆']; document.getElementById('quizResultMsg').textContent = `${pct}% — ${msgs[Math.min(4, Math.floor(pct / 20))]}`; const d = decks.find(x => x.id === quizData.deckId); if (d) { d.progress = pct; renderDeckPanel(); updateDeckCard(d.id); saveLSState() } }
    function retryQuiz() { quizData.idx = 0; quizData.score = 0; document.getElementById('quizResult').style.display = 'none'; document.getElementById('quizGame').style.display = ''; quizData.questions.sort(() => Math.random() - .5); renderQuizQ() }

    /* ══ DECK PANEL ══ */
    function doFilter(tag, el) { panelFilter = tag; document.querySelectorAll('.dp-filter .chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); renderDeckPanel() }
    function toggleDecks() { const p = document.getElementById('deckPanel'); p.classList.toggle('open'); if (p.classList.contains('open')) renderDeckPanel() }
    function closePanel() { document.getElementById('deckPanel').classList.remove('open') }
    function renderDeckPanel(search = '') { const list = document.getElementById('deckList'); list.innerHTML = ''; let filtered = panelFilter === 'all' ? decks : decks.filter(d => d.tag === panelFilter); if (search) filtered = filtered.filter(d => d.title.toLowerCase().includes(search.toLowerCase())); if (!filtered.length) { list.innerHTML = '<div style="text-align:center;color:#9a9a9a;font-size:12px;padding:20px 0">No decks found.</div>'; return } filtered.forEach(d => { const card = document.createElement('div'); card.className = 'dp-card'; card.style.background = d.color || '#f0f0f0'; card.innerHTML = `<div class="dp-card-top"><div class="dp-card-head"><span class="dp-card-icon">${d.icon}</span><span class="dp-card-tag">${d.tag}</span></div><div class="dp-card-title">${escHtml(d.title)}</div><div class="dp-card-desc">${escHtml(d.desc || 'No description')}</div></div><div class="dp-card-bottom"><div class="dp-card-meta"><span>${d.cards.length} card${d.cards.length !== 1 ? 's' : ''}</span><span>${d.progress}% done</span></div><div class="dp-card-pb"><div class="dp-card-pf" style="width:${d.progress}%"></div></div><div class="dp-card-actions"><button class="dp-card-btn" onclick="event.stopPropagation();openCardManager(${d.id})">✏️</button><button class="dp-card-btn" onclick="event.stopPropagation();studyDeck(${d.id})">Study</button><button class="dp-card-btn" onclick="event.stopPropagation();openQuiz(${d.id})">🧠</button><button class="dp-card-btn dp-card-del" onclick="event.stopPropagation();deleteDeck(${d.id})">✕</button></div></div>`; list.appendChild(card) }) }

    /* ══ NOTES / TEXT / SHAPES / IMAGES / CATS / MEME ══ */
    function createNote() { const label = document.getElementById('nLabel').value.trim(), content = document.getElementById('nContent').value.trim(); if (!content) return; const p = randWorldPos(); const el = makeEl(p.x, p.y, 190, 130); const note = document.createElement('div'); note.className = 'sticky'; note.style.background = noteColors[selNoteColor]; note.innerHTML = `${label ? `<div class="sticky-lbl">${label}</div>` : ''}<div class="sticky-txt">${content}</div>`; el.insertBefore(note, el.querySelector('.resize-h')); closeOv('noteModal'); updateStats(); captureState() }
    function addTextBox() { const p = randWorldPos(); const el = makeEl(p.x, p.y, 200, 40); const inner = document.createElement('div'); inner.className = 'tbox'; inner.contentEditable = 'true'; inner.dataset.ph = 'Type something…'; el.insertBefore(inner, el.querySelector('.resize-h')); setTimeout(() => inner.focus(), 50); updateStats() }
    const shapeSVGs = { rect: `<svg viewBox="0 0 100 60"><rect x="4" y="4" width="92" height="52" rx="6" fill="none" stroke="#555" stroke-width="3"/></svg>`, circle: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#555" stroke-width="3"/></svg>`, arrow: `<svg viewBox="0 0 120 40"><line x1="4" y1="20" x2="96" y2="20" stroke="#555" stroke-width="3"/><polyline points="80,6 100,20 80,34" fill="none" stroke="#555" stroke-width="3"/></svg>`, tri: `<svg viewBox="0 0 100 90"><polygon points="50,4 96,86 4,86" fill="none" stroke="#555" stroke-width="3"/></svg>`, diamond: `<svg viewBox="0 0 100 100"><polygon points="50,4 96,50 50,96 4,50" fill="none" stroke="#555" stroke-width="3"/></svg>`, star: `<svg viewBox="0 0 100 100"><polygon points="50,4 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="none" stroke="#555" stroke-width="3"/></svg>` };
    const shapeSizes = { rect: [160, 100], circle: [100, 100], arrow: [160, 60], tri: [120, 110], diamond: [100, 100], star: [100, 100] };
    function toggleShapePicker(e) { const sp = document.getElementById('shapePicker'); sp.classList.toggle('open'); if (sp.classList.contains('open') && e) { const r = document.getElementById('shapeDocBtn').getBoundingClientRect(); sp.style.left = (r.right + 8) + 'px'; sp.style.top = r.top + 'px' } }
    document.addEventListener('click', e => {
      if (!e.target.closest('#shapePicker') && !e.target.closest('#shapeDocBtn')) document.getElementById('shapePicker').classList.remove('open');
      if (!e.target.closest('#stickerPanel') && !e.target.closest('#stickerBtn')) document.getElementById('stickerPanel').classList.remove('open');
      if (!e.target.closest('#flowPanel') && !e.target.closest('#flowBtn')) document.getElementById('flowPanel').classList.remove('open');
    });
    function addShape(type) { document.getElementById('shapePicker').classList.remove('open'); const [w, h] = shapeSizes[type]; const p = randWorldPos(); const el = makeEl(p.x, p.y, w, h); const wrap = document.createElement('div'); wrap.className = 'shape-wrap'; wrap.innerHTML = shapeSVGs[type]; el.insertBefore(wrap, el.querySelector('.resize-h')); updateStats() }
    function triggerImg() { document.getElementById('imgInput').click() }
    function handleImgFile(input) { const f = input.files[0]; if (!f) return; const r = new FileReader(); r.onload = e => placeImage(e.target.result); r.readAsDataURL(f); input.value = '' }
    function placeImage(src) { const p = randWorldPos(); const el = makeEl(p.x, p.y, 240, 170); const wrap = document.createElement('div'); wrap.className = 'img-wrap'; const img = document.createElement('img'); img.src = src; wrap.appendChild(img); el.insertBefore(wrap, el.querySelector('.resize-h')); updateStats() }
    viewport.addEventListener('dragover', e => { e.preventDefault(); viewport.style.outline = '2px dashed #3b82f6' });
    viewport.addEventListener('dragleave', () => viewport.style.outline = '');
    viewport.addEventListener('drop', e => { e.preventDefault(); viewport.style.outline = ''; const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => placeImage(ev.target.result); r.readAsDataURL(f) } });
    document.addEventListener('paste', e => { const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/')); if (item) { const r = new FileReader(); r.onload = ev => placeImage(ev.target.result); r.readAsDataURL(item.getAsFile()) } });
    function dropCat() { const seed = Math.floor(Math.random() * 1000), fact = catFacts[Math.floor(Math.random() * catFacts.length)]; const p = randWorldPos(); const el = makeEl(p.x, p.y, 200, 215); const wrap = document.createElement('div'); wrap.className = 'cat-w'; wrap.innerHTML = `<img src="https://cataas.com/cat?${seed}" style="width:100%;height:160px;object-fit:cover;display:block"/><div class="cat-bar"><span class="cat-badge">🐱 cat #${seed}</span><button onclick="refreshCat(this)" style="font-size:10px;background:none;border:none;cursor:pointer;color:#9a9a9a">↺</button></div><div class="cat-fact">${fact}</div>`; el.insertBefore(wrap, el.querySelector('.resize-h')); updateStats() }
    function refreshCat(btn) { const seed = Math.floor(Math.random() * 1000); btn.closest('.cat-w').querySelector('img').src = `https://cataas.com/cat?${seed}`; btn.closest('.cat-w').querySelector('.cat-fact').textContent = catFacts[Math.floor(Math.random() * catFacts.length)] }
    function loadMemeCat() { memeImgSrc = `https://cataas.com/cat?${Math.random()}`; document.getElementById('mPrevImg').src = memeImgSrc }
    function triggerMemeImg() { document.getElementById('memeFile').click() }
    function handleMemeFile(input) { const f = input.files[0]; if (!f) return; const r = new FileReader(); r.onload = e => { memeImgSrc = e.target.result; document.getElementById('mPrevImg').src = memeImgSrc }; r.readAsDataURL(f); input.value = '' }
    function updateMPrev() { document.getElementById('mPrevTop').textContent = document.getElementById('mTop').value.toUpperCase(); document.getElementById('mPrevBot').textContent = document.getElementById('mBot').value.toUpperCase() }
    function placeMeme() { if (!memeImgSrc) return; const top = document.getElementById('mTop').value, bot = document.getElementById('mBot').value; const p = randWorldPos(); const el = makeEl(p.x, p.y, 270, 210); const wrap = document.createElement('div'); wrap.className = 'meme-w'; wrap.innerHTML = `<img src="${memeImgSrc}" style="width:100%;height:100%;object-fit:cover;display:block"/><div class="meme-txt top" contenteditable="true" onclick="event.stopPropagation()">${top.toUpperCase()}</div><div class="meme-txt bot" contenteditable="true" onclick="event.stopPropagation()">${bot.toUpperCase()}</div>`; el.insertBefore(wrap, el.querySelector('.resize-h')); closeOv('memeModal'); document.getElementById('mTop').value = ''; document.getElementById('mBot').value = ''; updateStats() }
    function pickPalette(el) { document.querySelectorAll('.sw').forEach(s => s.classList.remove('on')); el.classList.add('on'); selPalette = el.dataset.c }
    function pickNC(el) { document.querySelectorAll('.csw').forEach(s => s.classList.remove('sel')); el.classList.add('sel'); selNoteColor = el.dataset.nc }

    /* ══ BOOKMARKS ══ */
    function saveBookmark() { const name = prompt('Bookmark name:', 'View ' + (bookmarks.length + 1)); if (!name) return; bookmarks.push({ name, x: cam.x, y: cam.y, zoom: cam.zoom }); renderBookmarkBar(); saveLSState(); showToast('Bookmark saved!') }
    function gotoBookmark(idx) { const b = bookmarks[idx]; cam.x = b.x; cam.y = b.y; cam.zoom = b.zoom; applyCamera() }
    function deleteBookmark(idx) { bookmarks.splice(idx, 1); renderBookmarkBar(); saveLSState() }
    function renderBookmarkBar() { const bar = document.getElementById('bookmarkBar'); bar.innerHTML = ''; bookmarks.forEach((b, i) => { const pill = document.createElement('div'); pill.className = 'bm-pill'; pill.innerHTML = `<span onclick="gotoBookmark(${i})">📍 ${escHtml(b.name)}</span><button class="bm-del" onclick="deleteBookmark(${i})">✕</button>`; bar.appendChild(pill) }) }

    /* ══ SEARCH ══ */
    function openSearchBar() { document.getElementById('searchBar').classList.add('open'); document.getElementById('searchInput').focus() }
    function closeSearch() { document.getElementById('searchBar').classList.remove('open'); document.getElementById('searchResults').classList.remove('open'); document.getElementById('searchInput').value = '' }
    function doSearch(q) { const res = document.getElementById('searchResults'); res.innerHTML = ''; if (!q) { res.classList.remove('open'); return } res.classList.add('open'); const matches = []; document.querySelectorAll('.cel').forEach(el => { const txt = el.innerText.toLowerCase(); if (txt.includes(q.toLowerCase())) matches.push({ el, preview: el.innerText.slice(0, 60) }) }); if (!matches.length) { res.innerHTML = '<div class="search-item" style="color:#9a9a9a">No matches found</div>'; return } matches.slice(0, 8).forEach(({ el, preview }) => { const item = document.createElement('div'); item.className = 'search-item'; item.textContent = preview; item.onclick = () => { const x = parseFloat(el.style.left) + el.offsetWidth / 2 - 2000, y = parseFloat(el.style.top) + el.offsetHeight / 2 - 2000, r = viewport.getBoundingClientRect(); cam.x = r.width / 2 - x * cam.zoom; cam.y = r.height / 2 - y * cam.zoom; applyCamera(); selectEl(el); closeSearch() }; res.appendChild(item) }) }

    /* ══ MINIMAP ══ */
    let minimapRaf = null;
    function updateMinimap() { if (minimapRaf) return; minimapRaf = requestAnimationFrame(drawMinimap) }
    function drawMinimap() { minimapRaf = null; const mc = document.getElementById('minimapCanvas'), mctx = mc.getContext('2d'); mctx.clearRect(0, 0, 160, 100); mctx.fillStyle = '#f5f5f5'; mctx.fillRect(0, 0, 160, 100); const SCALE = 160 / 8000; document.querySelectorAll('.cel').forEach(el => { const wx = parseFloat(el.style.left) + 2000, wy = parseFloat(el.style.top) + 2000, mw = el.offsetWidth * SCALE, mh = el.offsetHeight * SCALE; mctx.fillStyle = '#3b82f6'; mctx.globalAlpha = 0.5; mctx.fillRect(wx * SCALE, wy * (100 / 6000), Math.max(2, mw), Math.max(2, mh)) }); mctx.globalAlpha = 1; const r = viewport.getBoundingClientRect(), vx = (-cam.x / cam.zoom + 2000) * SCALE, vy = (-cam.y / cam.zoom + 2000) * (100 / 6000), vw = (r.width / cam.zoom) * SCALE, vh = (r.height / cam.zoom) * (100 / 6000), mv = document.getElementById('minimapViewport'); mv.style.left = Math.max(0, vx) + 'px'; mv.style.top = Math.max(0, vy) + 'px'; mv.style.width = Math.min(160, vw) + 'px'; mv.style.height = Math.min(100, vh) + 'px' }
    function minimapClick(e) { const r = document.getElementById('minimap').getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, wx = (mx / 160) * 8000 - 2000, wy = (my / 100) * 6000 - 2000, vr = viewport.getBoundingClientRect(); cam.x = vr.width / 2 - wx * cam.zoom; cam.y = vr.height / 2 - wy * cam.zoom; applyCamera() }

    /* ══ AUTO LAYOUT ══ */
    function autoLayout() {
      const gapX = 280, gapY = 260, startX = 2100, startY = 2100;
      let col = 0, row = 0;
      const cols = 4;
      const groupedElIds = new Set();
      groups.forEach(g => g.elIds.forEach(id => groupedElIds.add(id)));
      groups.forEach(g => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        g.elIds.forEach(id => { const el = document.querySelector(`.cel[data-el-id="${id}"]`); if (!el) return; const ex = parseFloat(el.style.left), ey = parseFloat(el.style.top), ew = el.offsetWidth, eh = el.offsetHeight; if (ex < minX) minX = ex; if (ey < minY) minY = ey; if (ex + ew > maxX) maxX = ex + ew; if (ey + eh > maxY) maxY = ey + eh });
        const targetX = startX + col * (gapX), targetY = startY + row * (gapY), dx = targetX - minX, dy = targetY - minY;
        g.elIds.forEach(id => { const el = document.querySelector(`.cel[data-el-id="${id}"]`); if (!el) return; el.style.left = (parseFloat(el.style.left) + dx) + 'px'; el.style.top = (parseFloat(el.style.top) + dy) + 'px' });
        g.wrap.style.left = (parseFloat(g.wrap.style.left) + dx) + 'px'; g.wrap.style.top = (parseFloat(g.wrap.style.top) + dy) + 'px';
        col++; if (col >= cols) { col = 0; row++ }
      });
      document.querySelectorAll('.cel').forEach(el => { if (groupedElIds.has(el.dataset.elId)) return; el.style.left = (startX + col * gapX) + 'px'; el.style.top = (startY + row * gapY) + 'px'; col++; if (col >= cols) { col = 0; row++ } });
      redrawConnections(); updateMinimap(); captureState(); showToast('Elements auto-arranged!')
    }

    /* ══ SCREENSHOT ══ */
    function takeScreenshot() { html2canvas(world, { backgroundColor: darkMode ? '#141414' : '#f5f5f5', scale: 1 }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL(); a.download = 'cramly.png'; a.click() }) }

    /* ══ STATS ══ */
    function updateStats() { document.getElementById('sDecks').textContent = decks.length; document.getElementById('sCards').textContent = decks.reduce((a, d) => a + d.cards.length, 0); document.getElementById('sEls').textContent = document.querySelectorAll('.cel').length; document.getElementById('sGroups').textContent = groups.length }

    /* ══ TOAST ══ */
    let toastTimer = null;
    function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200) }

    /* ══ MISC ══ */
    function toggleKb() { kbOpen = !kbOpen; document.getElementById('kbPanel').classList.toggle('open', kbOpen) }
    function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

    /* ══ LOCALSTORAGE ══ */
    function saveLSState() { try { localStorage.setItem('cramly_v4', JSON.stringify({ decks, bookmarks, darkMode, snapMode })) } catch (e) { } }
    function loadLSState() { try { const d = JSON.parse(localStorage.getItem('cramly_v4') || '{}'); if (d.decks) { decks = d.decks; decks.forEach(deck => placeDeckOnCanvas(deck)) } if (d.bookmarks) { bookmarks = d.bookmarks; renderBookmarkBar() } if (d.darkMode) { darkMode = true; document.body.classList.add('dark'); document.getElementById('darkBtn').classList.add('active') } if (d.snapMode) { snapMode = true; document.getElementById('snapBtn').classList.add('active') } updateStats() } catch (e) { } }

    /* ══ CRAM MODE ══ */
let cramTimer = null, cramSecondsLeft = 0, cramTotalSeconds = 0;
let cramTabStrikes = 0, cramPaused = false, cramCollapsed = false;
let cramSessionStart = null, cramElapsedSeconds = 0;
let cramHUDDragging = false, cramHUDDragOffset = { x: 0, y: 0 };

/* ── Streak & total time stored in localStorage ── */
function cramGetStats() {
  try { return JSON.parse(localStorage.getItem('cramly_cram_stats') || '{}'); } catch { return {}; }
}
function cramSaveStats(s) {
  try { localStorage.setItem('cramly_cram_stats', JSON.stringify(s)); } catch {}
}
function cramGetStreak() {
  const s = cramGetStats();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  if (s.lastDay === today) return s.streak || 1;
  if (s.lastDay === yesterday) return s.streak || 1;
  return 0;
}
function cramUpdateStreak() {
  const s = cramGetStats();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  if (s.lastDay === today) {
    // already counted today
  } else if (s.lastDay === yesterday) {
    s.streak = (s.streak || 1) + 1;
    s.lastDay = today;
  } else {
    s.streak = 1;
    s.lastDay = today;
  }
  s.totalMinutes = (s.totalMinutes || 0) + Math.floor(cramElapsedSeconds / 60);
  cramSaveStats(s);
}
function cramFormatTotal(mins) {
  if (mins < 60) return mins + 'm';
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

/* ── Setup ── */
function startCramMode() {
  document.getElementById('cramSessionName').value = '';
  openOv('cramModeModal');
}

function launchCramMode() {
  const mins = parseInt(document.getElementById('cramDuration').value) || 25;
  const name = document.getElementById('cramSessionName').value.trim() || 'Focus session';
  closeOv('cramModeModal');

  cramTabStrikes = 0; cramPaused = false; cramCollapsed = false;
  cramElapsedSeconds = 0; cramSessionStart = Date.now();
  cramTotalSeconds = cramSecondsLeft = mins * 60;

  // Label
  document.getElementById('cramHUDLabel').textContent = name;

  // Reset tab badge
  document.getElementById('cramTabBadge').style.display = 'none';
  document.getElementById('cramTabNum').textContent = '0';

  // Streak & total from storage
  const s = cramGetStats();
  document.getElementById('cramStreak').textContent = '🔥 ' + (cramGetStreak() || 0);
  const totalMins = s.totalMinutes || 0;
  document.getElementById('cramTotalTime').textContent = totalMins < 60
    ? totalMins + 'm' : Math.floor(totalMins / 60) + 'h';

  // Show HUD at bottom-right
  const hud = document.getElementById('cramHUD');
  hud.style.display = 'block';
  hud.style.bottom = '28px';
  hud.style.right = '24px';
  hud.style.left = '';
  hud.style.top = '';

  document.getElementById('cramHUDBody').style.display = 'block';
  document.getElementById('cramCollapseBtn').textContent = '−';
  cramCollapsed = false;

  cramTickTimer();
  cramTimer = setInterval(cramTickTimer, 1000);

  // Fullscreen
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

  document.addEventListener('visibilitychange', cramTabGuard);

  // Make HUD draggable
  const inner = document.getElementById('cramHUDInner');
  inner.addEventListener('mousedown', cramStartDrag);

  showToast('Cram Mode on! Use Cramly freely ⏱️');
}

/* ── Timer ── */
function cramTickTimer() {
  if (cramPaused) return;
  if (cramSecondsLeft <= 0) { cramFinish(); return; }

  cramElapsedSeconds++;
  cramSecondsLeft--;

  const m = Math.floor(cramSecondsLeft / 60), s = cramSecondsLeft % 60;
  document.getElementById('cramTimerDisplay').textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

  const pct = ((cramTotalSeconds - cramSecondsLeft) / cramTotalSeconds) * 100;
  document.getElementById('cramProgressBar').style.width = pct + '%';

  // Time spent this session
  const spentM = Math.floor(cramElapsedSeconds / 60);
  document.getElementById('cramTimeSpent').textContent = spentM < 60
    ? spentM + 'm' : Math.floor(spentM / 60) + 'h ' + (spentM % 60) + 'm';

  // Pulse red when under 60s
  const disp = document.getElementById('cramTimerDisplay');
  disp.style.color = cramSecondsLeft < 60 ? '#f87171' : '#fff';
}

function cramPauseResume() {
  cramPaused = !cramPaused;
  document.getElementById('cramPauseBtn').textContent = cramPaused ? '▶ Resume' : '⏸ Pause';
  document.getElementById('cramTimerDisplay').style.opacity = cramPaused ? '0.4' : '1';
  showToast(cramPaused ? 'Paused' : 'Resumed');
}

/* ── Tab guard ── */
function cramTabGuard() {
  if (document.hidden) {
    cramTabStrikes++;
    const badge = document.getElementById('cramTabBadge');
    badge.style.display = 'inline';
    document.getElementById('cramTabNum').textContent = cramTabStrikes;
    badge.textContent = '';
    badge.innerHTML = '⚠ <span id="cramTabNum">' + cramTabStrikes + '</span> switch' + (cramTabStrikes > 1 ? 'es' : '');
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    }
  }
}

/* ── Collapse ── */
function toggleHUDCollapse() {
  cramCollapsed = !cramCollapsed;
  document.getElementById('cramHUDBody').style.display = cramCollapsed ? 'none' : 'block';
  document.getElementById('cramCollapseBtn').textContent = cramCollapsed ? '+' : '−';
}

/* ── Drag ── */
function cramStartDrag(e) {
  if (e.target.tagName === 'BUTTON') return;
  cramHUDDragging = true;
  const hud = document.getElementById('cramHUD');
  const rect = hud.getBoundingClientRect();
  cramHUDDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  e.preventDefault();
}
document.addEventListener('mousemove', e => {
  if (!cramHUDDragging) return;
  const hud = document.getElementById('cramHUD');
  hud.style.right = 'auto';
  hud.style.bottom = 'auto';
  hud.style.left = (e.clientX - cramHUDDragOffset.x) + 'px';
  hud.style.top = (e.clientY - cramHUDDragOffset.y) + 'px';
});
document.addEventListener('mouseup', () => { cramHUDDragging = false; });

/* ── Finish / End ── */
function cramFinish() {
  clearInterval(cramTimer);
  cramUpdateStreak();
  const s = cramGetStats();
  document.getElementById('cramTimerDisplay').textContent = '00:00';
  document.getElementById('cramProgressBar').style.width = '100%';
  const spentM = Math.floor(cramElapsedSeconds / 60);
  showToast('🎉 Session done! ' + spentM + 'min studied · ' + cramTabStrikes + ' tab switch' + (cramTabStrikes !== 1 ? 'es' : '') + ' · 🔥 ' + s.streak + ' day streak');
  setTimeout(endCramMode, 3000);
}

function endCramMode() {
  clearInterval(cramTimer);
  cramUpdateStreak();
  document.removeEventListener('visibilitychange', cramTabGuard);
  const inner = document.getElementById('cramHUDInner');
  inner.removeEventListener('mousedown', cramStartDrag);
  document.getElementById('cramHUD').style.display = 'none';
  if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
  showToast('Cram session ended.');
}



    /* ══ KEYBOARD ══ */
    document.addEventListener('keydown', e => {
      const a = document.activeElement, typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.contentEditable === 'true');
      const cmd = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') { ['deckModal', 'noteModal', 'studyModal', 'memeModal', 'cardModal', 'quizModal'].forEach(closeOv); closeSearch(); document.getElementById('deckPanel').classList.remove('open'); document.getElementById('kbPanel').classList.remove('open'); kbOpen = false; document.getElementById('shapePicker').classList.remove('open'); document.getElementById('stickerPanel').classList.remove('open'); document.getElementById('flowPanel').classList.remove('open'); closeMorePanel(); if (connectMode) toggleConnectMode(); if (lassoMode) toggleLasso(); if (selectedEl) { selectedEl.classList.remove('selected'); selectedEl = null } clearMultiSelect(); return }
      // ✅ Ctrl+Z: if draw mode, undo a drawing stroke; else undo element history
      if (cmd && e.key === 'z') {
        e.preventDefault();
        if (drawMode) { undoDrawStroke() } else { undo() }
        return;
      }
      if (cmd && (e.key === 'y' || e.key === 'Z')) { e.preventDefault(); redo(); return }
      if (cmd && e.key === 'd') { e.preventDefault(); openOv('deckModal'); return }
      if (cmd && e.key === 'n') { e.preventDefault(); openOv('noteModal'); return }
      if (cmd && e.key === '.') { e.preventDefault(); toggleDark(); return }
      if (cmd && e.key === 'g') { e.preventDefault(); toggleSnap(); return }
      if (!typing) {
        if (e.key === 't' || e.key === 'T') { addTextBox(); return }
        if (e.key === 's' || e.key === 'S') { toggleShapePicker(); return }
        if (e.key === 'i' || e.key === 'I') { triggerImg(); return }
        if (e.key === 'c' || e.key === 'C') { dropCat(); return }
        if (e.key === 'm' || e.key === 'M') { openOv('memeModal'); loadMemeCat(); return }
        if (e.key === 'd' || e.key === 'D') { toggleDecks(); return }
        if (e.key === 'a' || e.key === 'A') { toggleConnectMode(); return }
        if (e.key === 'p' || e.key === 'P') { toggleDrawMode(); return }
        if (e.key === 'k' || e.key === 'K') { toggleStickerPanel(); return }
        if (e.key === 'f' || e.key === 'F') { if (window._study && document.getElementById('studyModal').classList.contains('open')) flipCard(); else toggleFlowPanel(); return }
        if (e.key === 'l' || e.key === 'L') { toggleLasso(); return }
        if (e.key === 'g' || e.key === 'G') { groupSelected(); return }
        if (e.key === 'b' || e.key === 'B') { saveBookmark(); return }
        if (e.key === '/') { openSearchBar(); return }
        if (e.key === '\\') { toggleDock(); return }
        if (e.key === '+' || e.key === '=') { zoomIn(); return }
        if (e.key === '-') { zoomOut(); return }
        if (e.key === 'ArrowRight' && window._study) { nextCard(); return }
        if (e.key === 'ArrowLeft' && window._study) { prevCard(); return }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl) { removeEl(selectedEl); selectedEl = null; return }
        if ((e.key === 'Delete' || e.key === 'Backspace') && multiSelected.length > 0) { multiSelected.forEach(el => removeEl(el)); multiSelected = []; return }
      }
    });

    /* ══ INIT ══ */
    applyCamera();
    loadLSState();
    loadShareParam();
    captureState();
    setInterval(saveLSState, 30000);
    setInterval(updateMinimap, 2000);