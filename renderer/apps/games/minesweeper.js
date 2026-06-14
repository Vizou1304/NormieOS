// Norminesweeper — NormiesOS native launcher
// Source: https://github.com/Vizou1304/Norminesweeper
// Isolated: no interaction with NormieState, notifications, or other apps

(function () {

    const MSW_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
#msw-root {
  --bg:     #e3e5e4;
  --ink:    #1a1a1a;
  --px-on:  #48494b;
  --px-off: #e3e5e4;
  --subtle: #c8cac8;
  --muted:  #8a8c8a;
  --w-hi:   #ffffff;
  --w-lo:   #9a9c9a;
  --w-face: #d4d6d4;
  --red:    #cc3b2e;
  --green:  #2a8a42;
  --blue:   #1a5a9a;
  --purple: #6a2a9a;
  --orange: #9a5a10;
  --cyan:   #1a7a6a;
  --gold:   #8a6010;
  font-family: 'Space Mono', monospace;
  color: var(--ink);
  display: flex;
  justify-content: center;
}
#msw-root * { margin:0; padding:0; box-sizing:border-box; user-select:none; }
#msw-root #win { display:inline-flex; flex-direction:column; background:var(--w-face); border:2px solid; border-color:var(--w-hi) var(--w-lo) var(--w-lo) var(--w-hi); box-shadow:2px 2px 0 rgba(0,0,0,.3); }
#msw-root #toolbar { background:var(--w-face); border-bottom:2px solid; border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); padding:6px 10px; display:flex; align-items:center; gap:8px; }
#msw-root .seg { font-size:18px; font-weight:700; letter-spacing:2px; padding:2px 7px; min-width:52px; text-align:center; background:var(--ink); color:var(--red); border:1px solid; border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); font-variant-numeric:tabular-nums; }
#msw-root #seg-timer { color:var(--green); }
#msw-root #smiley { width:28px; height:22px; background:var(--w-face); border:1px solid; border-color:var(--w-hi) var(--w-lo) var(--w-lo) var(--w-hi); font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
#msw-root #smiley:active { border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); }
#msw-root #tb-mid { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; }
#msw-root .w-lbl { font-size:9px; color:var(--muted); letter-spacing:2px; text-transform:uppercase; }
#msw-root .w-input { font-family:'Space Mono',monospace; font-size:11px; background:var(--bg); color:var(--ink); border:1px solid; border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); padding:2px 5px; outline:none; width:58px; }
#msw-root .w-input:focus { outline:1px solid var(--px-on); outline-offset:-1px; }
#msw-root .w-input.sm { width:44px; }
#msw-root .w-btn { font-family:'Space Mono',monospace; font-size:9px; font-weight:700; padding:3px 10px; letter-spacing:1px; text-transform:uppercase; background:var(--w-face); color:var(--ink); border:1px solid; border-color:var(--w-hi) var(--w-lo) var(--w-lo) var(--w-hi); cursor:pointer; }
#msw-root .w-btn:active { border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); padding:4px 9px 2px 11px; }
#msw-root .w-btn.primary { background:var(--px-on); color:var(--bg); border-color:var(--px-on); }
#msw-root #grid-area { padding:8px; background:var(--w-face); }
#msw-root #grid-inset { border:2px solid; border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); line-height:0; position:relative; display:inline-block; }
#msw-root #load-msg { width:560px; height:560px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; background:var(--bg); }
#msw-root #load-msg.hidden { display:none; }
#msw-root #load-txt { font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--ink); animation:msw-blink 1s step-end infinite; }
@keyframes msw-blink { 50%{opacity:.2} }
#msw-root .lbar { width:160px; height:3px; background:var(--subtle); border:1px solid; border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); overflow:hidden; }
#msw-root .lfill { height:100%; background:var(--px-on); width:0%; transition:width .12s; }
#msw-root #load-hint { font-size:9px; color:var(--muted); letter-spacing:2px; text-transform:lowercase; }
#msw-root #grid { display:none; line-height:0; }
#msw-root #grid.show { display:block; }
#msw-root .row { display:flex; }
#msw-root .cell { width:14px; height:14px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; font-size:8px; font-weight:700; line-height:1; flex-shrink:0; }
#msw-root .cell.on { background:var(--px-on); border-top:1px solid #5a5c5e; border-left:1px solid #5a5c5e; border-right:1px solid #28292a; border-bottom:1px solid #28292a; }
#msw-root .cell.off { background:var(--bg); border-top:1px solid var(--w-hi); border-left:1px solid var(--w-hi); border-right:1px solid var(--w-lo); border-bottom:1px solid var(--w-lo); }
#msw-root .cell.on:hover:not(.revealed):not(.flagged) { background:#5e6062; }
#msw-root .cell.off:hover:not(.revealed):not(.flagged) { background:#d0d2d0; }
#msw-root .cell.revealed.on { background:#303234; border:1px solid #1e2022; cursor:default; }
#msw-root .cell.revealed.off { background:#c8cac8; border:1px solid var(--subtle); cursor:default; }
#msw-root .cell.on.n1{color:#7ab8f0}#msw-root .cell.on.n2{color:#6ad890}#msw-root .cell.on.n3{color:#f08080}#msw-root .cell.on.n4{color:#c090f0}#msw-root .cell.on.n5{color:#f0b060}#msw-root .cell.on.n6{color:#60d0c0}#msw-root .cell.on.n7{color:var(--bg)}#msw-root .cell.on.n8{color:#8a8c8e}
#msw-root .cell.off.n1{color:var(--blue)}#msw-root .cell.off.n2{color:var(--green)}#msw-root .cell.off.n3{color:var(--red)}#msw-root .cell.off.n4{color:var(--purple)}#msw-root .cell.off.n5{color:var(--orange)}#msw-root .cell.off.n6{color:var(--cyan)}#msw-root .cell.off.n7{color:var(--ink)}#msw-root .cell.off.n8{color:var(--muted)}
#msw-root .cell.mine-hit { background:var(--red)!important; border-color:var(--red)!important; color:var(--bg)!important; }
#msw-root .cell.flagged { position:relative; }
#msw-root .cell.on.flagged { background:#5a5c5e; }
#msw-root .cell.off.flagged { background:#d0d2d0; }
#msw-root .cell.flagged::after { content:''; width:6px; height:6px; background:var(--gold); border:1px solid var(--ink); display:block; }
#msw-root #overlay { display:none; position:absolute; inset:0; background:rgba(227,229,228,.92); align-items:center; justify-content:center; flex-direction:column; gap:8px; z-index:10; }
#msw-root #overlay.show { display:flex; }
#msw-root #ov-emoji { font-size:40px; }
#msw-root #ov-title { font-size:13px; font-weight:700; letter-spacing:4px; text-transform:uppercase; color:var(--ink); }
#msw-root #ov-sub { font-size:9px; color:var(--muted); letter-spacing:2px; text-align:center; line-height:2; text-transform:lowercase; }
#msw-root .ov-row { display:flex; gap:6px; margin-top:8px; }
#msw-root .ov-btn { font-family:'Space Mono',monospace; font-size:9px; font-weight:700; padding:5px 14px; letter-spacing:2px; text-transform:uppercase; background:var(--w-face); color:var(--ink); border:1px solid; border-color:var(--w-hi) var(--w-lo) var(--w-lo) var(--w-hi); cursor:pointer; }
#msw-root .ov-btn:active { border-color:var(--w-lo) var(--w-hi) var(--w-hi) var(--w-lo); }
#msw-root .ov-btn.primary { background:var(--px-on); color:var(--bg); border-color:var(--px-on); }
#msw-root #statusbar { background:var(--w-face); border-top:1px solid var(--w-lo); padding:3px 10px; display:flex; gap:0; font-size:9px; color:var(--muted); letter-spacing:1px; text-transform:uppercase; }
#msw-root .sb { padding:0 10px; border-right:1px solid var(--subtle); }
#msw-root .sb:first-child { padding-left:0; }
#msw-root .sb:last-child { border-right:none; }
#msw-root .sb b { color:var(--ink); font-weight:700; }
#msw-root .sb b.accent { color:var(--px-on); }
`;

    const MSW_HTML = `
<div id="msw-root">
<div id="win">
  <div id="toolbar">
    <div class="seg" id="seg-mines">000</div>
    <div id="smiley" onclick="mswRestart()">&#x1F642;</div>
    <div id="tb-mid">
      <span class="w-lbl">#</span>
      <input class="w-input" id="id-input" type="number" min="0" max="9999" placeholder="0-9999"/>
      <button class="w-btn primary" onclick="mswLoadById()">Load</button>
      <button class="w-btn" onclick="mswLoadRand()">&#x1F3B2;</button>
      <span class="w-lbl" style="margin-left:4px;">Mines <span style="font-size:8px;">(face pixels)</span></span>
      <input class="w-input sm" id="mines-input" type="number" min="10" max="300" value="200"/>
    </div>
    <div class="seg" id="seg-timer">000</div>
  </div>
  <div id="grid-area">
    <div id="grid-inset">
      <div id="load-msg">
        <div id="load-txt">&#8212;</div>
        <div class="lbar"><div class="lfill" id="lfill"></div></div>
        <div id="load-hint">enter a normie id or click &#x1F3B2;</div>
      </div>
      <div id="grid"></div>
      <div id="overlay">
        <div id="ov-emoji"></div>
        <div id="ov-title"></div>
        <div id="ov-sub"></div>
        <div class="ov-row">
          <button class="ov-btn primary" onclick="mswRestart()">&#x25B6; replay</button>
          <button class="ov-btn" onclick="mswLoadRand()">&#x1F3B2; new normie</button>
        </div>
      </div>
    </div>
  </div>
  <div id="statusbar">
    <div class="sb">normie <b class="accent" id="sb-id">&#8212;</b></div>
    <div class="sb">mines <b id="sb-mines">&#8212;</b></div>
    <div class="sb">time <b id="sb-time">0s</b></div>
    <div class="sb">flags <b id="sb-flags">0</b></div>
  </div>
</div>
</div>`;

    function openMinesweeper() {
        // Clear any running timer from a previous instance
        if (window._mswGs && window._mswGs.iv) {
            clearInterval(window._mswGs.iv);
            window._mswGs.iv = null;
        }

        const body = window.createNativeWindow('NORMINESWEEPER', '');
        if (!body) return;
        const win = body.closest('.os-window');
        if (win) { win.style.width = '618px'; win.style.height = '730px'; }
        body.style.cssText = 'padding:8px;background:#e3e5e4;overflow:auto;';

        win?.querySelector('.window-close')?.addEventListener('click', () => {
            if (window._mswGs && window._mswGs.iv) {
                clearInterval(window._mswGs.iv);
                window._mswGs.iv = null;
            }
        }, { once: true });

        if (!document.getElementById('msw-style')) {
            const s = document.createElement('style');
            s.id = 'msw-style';
            s.textContent = MSW_CSS;
            document.head.appendChild(s);
        }

        body.innerHTML = MSW_HTML;

        // ── GAME LOGIC ────────────────────────────────────────────────
        (function () {
            const API  = 'https://api.normies.art';
            const COLS = 40, ROWS = 40, TOTAL = 1600;

            let gs = {
                pixels:[], board:[], revealed:[], flagged:[],
                mines:60, started:false, over:false,
                timer:0, iv:null, normieId:null,
            };
            window._mswGs = gs;

            async function loadById() {
                const v = document.getElementById('id-input').value;
                const id = v !== '' ? Math.max(0, Math.min(9999, parseInt(v))) : Math.floor(Math.random() * 10000);
                document.getElementById('id-input').value = id;
                await fetchNormie(id);
            }
            async function loadRand() {
                const id = Math.floor(Math.random() * 10000);
                document.getElementById('id-input').value = id;
                await fetchNormie(id);
            }

            async function fetchNormie(id) {
                stopTimer();
                document.getElementById('grid').classList.remove('show');
                document.getElementById('overlay').classList.remove('show');
                const lm = document.getElementById('load-msg');
                lm.classList.remove('hidden');
                document.getElementById('load-txt').textContent = 'loading #' + id + '...';
                document.getElementById('load-hint').textContent = 'fetching pixel data from chain';
                document.getElementById('smiley').textContent = '🙂';
                const fill = document.getElementById('lfill');
                fill.style.width = '0%';
                let w = 0;
                const lv = setInterval(() => { w = Math.min(w + Math.random() * 22, 88); fill.style.width = w + '%'; if (w >= 88) clearInterval(lv); }, 55);
                try {
                    const r = await fetch(`${API}/normie/${id}/pixels`);
                    if (!r.ok) throw new Error('normie #' + id + ' not found');
                    const txt = await r.text();
                    const px = txt.trim().replace(/\s/g, '').split('').filter(c => c === '0' || c === '1').map(Number);
                    if (px.length !== 1600) throw new Error('invalid pixel data');
                    clearInterval(lv); fill.style.width = '100%';
                    gs.pixels = px; gs.normieId = id;
                    gs.mines = Math.max(10, Math.min(500, parseInt(document.getElementById('mines-input').value) || 200));
                    document.getElementById('sb-id').textContent = '#' + id;
                    document.getElementById('sb-mines').textContent = gs.mines;
                    document.getElementById('sb-time').textContent = '0s';
                    document.getElementById('sb-flags').textContent = '0';
                    setTimeout(() => { lm.classList.add('hidden'); buildGame(); }, 150);
                } catch (e) {
                    clearInterval(lv);
                    document.getElementById('load-txt').textContent = 'error';
                    document.getElementById('load-hint').textContent = e.message;
                }
            }

            function buildGame() {
                gs.board = Array(TOTAL).fill(0);
                gs.revealed = Array(TOTAL).fill(false);
                gs.flagged = Array(TOTAL).fill(false);
                gs.started = false; gs.over = false; gs.timer = 0;
                stopTimer(); updateSeg();
                const grid = document.getElementById('grid');
                grid.innerHTML = '';
                for (let r = 0; r < ROWS; r++) {
                    const row = document.createElement('div');
                    row.className = 'row';
                    for (let c = 0; c < COLS; c++) {
                        const i = r * COLS + c;
                        const el = document.createElement('div');
                        el.className = 'cell ' + (gs.pixels[i] ? 'on' : 'off');
                        el.dataset.i = i;
                        el.addEventListener('click', () => click(i));
                        el.addEventListener('contextmenu', e => { e.preventDefault(); flag(i); });
                        let pt;
                        el.addEventListener('touchstart', () => { pt = setTimeout(() => flag(i), 400); }, { passive: true });
                        el.addEventListener('touchend', () => clearTimeout(pt));
                        row.appendChild(el);
                    }
                    grid.appendChild(row);
                }
                grid.classList.add('show');
            }

            function restart() {
                document.getElementById('overlay').classList.remove('show');
                if (gs.normieId !== null) buildGame(); else loadRand();
            }

            function placeMines(safe) {
                const safeSet = new Set([safe, ...nbrs(safe)]);
                const onCells = [...Array(TOTAL).keys()].filter(i => gs.pixels[i] === 1 && !safeSet.has(i));
                const offCells = [...Array(TOTAL).keys()].filter(i => gs.pixels[i] === 0 && !safeSet.has(i));
                const pool = [...onCells.sort(() => Math.random() - .5), ...offCells.sort(() => Math.random() - .5)];
                const n = Math.min(gs.mines, pool.length);
                for (let k = 0; k < n; k++) gs.board[pool[k]] = -1;
                for (let i = 0; i < TOTAL; i++) if (gs.board[i] !== -1) gs.board[i] = nbrs(i).filter(n => gs.board[n] === -1).length;
            }

            function nbrs(i) {
                const r = Math.floor(i / COLS), c = i % COLS, out = [];
                for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                    if (!dr && !dc) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc);
                }
                return out;
            }

            function click(i) {
                if (gs.over || gs.revealed[i] || gs.flagged[i]) return;
                if (!gs.started) {
                    placeMines(i); gs.started = true; startTimer();
                    document.getElementById('smiley').textContent = '😮';
                    setTimeout(() => { if (!gs.over) document.getElementById('smiley').textContent = '🙂'; }, 160);
                }
                if (gs.board[i] === -1) {
                    gs.over = true; gs.revealed[i] = true;
                    cellEl(i).classList.add('mine-hit');
                    for (let k = 0; k < TOTAL; k++) if (gs.board[k] === -1 && !gs.flagged[k]) gs.revealed[k] = true;
                    stopTimer(); renderAll();
                    document.getElementById('smiley').textContent = '😵';
                    setTimeout(() => showOverlay(false), 300);
                    return;
                }
                flood(i); renderAll(); checkWin();
            }

            function flood(i) {
                if (gs.revealed[i] || gs.flagged[i]) return;
                gs.revealed[i] = true;
                if (gs.board[i] === 0) nbrs(i).forEach(n => flood(n));
            }

            function flag(i) {
                if (gs.over || gs.revealed[i]) return;
                gs.flagged[i] = !gs.flagged[i];
                renderCell(i);
                document.getElementById('sb-flags').textContent = gs.flagged.filter(Boolean).length;
                updateSeg();
            }

            function cellEl(i) {
                const g = document.getElementById('grid');
                return g.children[Math.floor(i / COLS)]?.children[i % COLS];
            }

            function renderCell(i) {
                const el = cellEl(i); if (!el) return;
                const px = gs.pixels[i] ? 'on' : 'off';
                el.className = `cell ${px}`; el.textContent = '';
                if (gs.flagged[i] && !gs.revealed[i]) { el.classList.add('flagged'); return; }
                if (!gs.revealed[i]) return;
                el.classList.add('revealed');
                const v = gs.board[i];
                if (v === -1) { el.textContent = '☠'; el.classList.add('mine-hit'); return; }
                if (v > 0) { el.classList.add('n' + v); el.textContent = v; }
            }

            function renderAll() { for (let i = 0; i < TOTAL; i++) renderCell(i); }

            function checkWin() {
                if (gs.revealed.filter(r => !r).length === gs.mines) {
                    gs.over = true; stopTimer();
                    document.getElementById('smiley').textContent = '😎';
                    updateSeg(); setTimeout(() => showOverlay(true), 250);
                }
            }

            function startTimer() {
                gs.iv = setInterval(() => {
                    gs.timer++; updateSeg();
                    document.getElementById('sb-time').textContent = gs.timer + 's';
                    if (gs.timer >= 999) stopTimer();
                }, 1000);
                window._mswGs = gs;
            }

            function stopTimer() { if (gs.iv) { clearInterval(gs.iv); gs.iv = null; } }

            function updateSeg() {
                const pad = n => String(Math.max(0, Math.min(999, n))).padStart(3, '0');
                document.getElementById('seg-mines').textContent = pad(gs.mines - gs.flagged.filter(Boolean).length);
                document.getElementById('seg-timer').textContent = pad(gs.timer);
            }

            function showOverlay(won) {
                document.getElementById('ov-emoji').textContent = won ? '🎉' : '💀';
                document.getElementById('ov-title').textContent = won ? 'cleared' : 'game over';
                document.getElementById('ov-sub').textContent = won
                    ? `normie #${gs.normieId} \xB7 ${gs.mines} mines\ncleared in ${gs.timer}s`
                    : `normie #${gs.normieId} got you\n${gs.timer}s survived`;
                document.getElementById('overlay').classList.add('show');
            }

            document.getElementById('id-input').addEventListener('keydown', e => { if (e.key === 'Enter') loadById(); });
            document.getElementById('mines-input').addEventListener('keydown', e => { if (e.key === 'Enter') loadById(); });

            // Expose onclick targets
            window.mswRestart  = restart;
            window.mswLoadById = loadById;
            window.mswLoadRand = loadRand;
        })();
    }

    window.openMinesweeper = openMinesweeper;

})();
