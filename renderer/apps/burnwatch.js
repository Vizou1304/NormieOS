async function openBurnWatch() {
    const body = window.createNativeWindow('ASHFALL', '<div class="native-loading">>> FETCHING BURNS...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '520px'; win.style.height = '600px'; }
    body.style.cssText = 'display:flex;flex-direction:column;padding:0;overflow:hidden;height:100%;box-sizing:border-box;';
    try {
        const [res, statsRes] = await Promise.all([
            fetch(`${window.API}/history/burns?limit=20`),
            fetch(`${window.API}/history/stats`).catch(() => null),
        ]);
        if (!res.ok) { body.innerHTML = `<div class="native-loading">>> HTTP ${res.status}</div>`; return; }
        const data = await res.json();
        let stats = null;
        try { stats = statsRes?.ok ? await statsRes.json() : null; } catch {}
        const commits = Array.isArray(data) ? data : (data.burns ?? data.data ?? []);
        if (!commits.length) { body.innerHTML = '<div class="native-loading">>> NO BURNS FOUND</div>'; return; }

        const details = [];
        for (const [idx, b] of commits.entries()) {
            const commitId = b.id ?? b.commitId ?? b._id ?? (idx + 1);
            const by  = b.burner ?? b.owner ?? b.from ?? b.address ?? b.wallet ?? '?';
            const ts  = b.timeStamp ?? b.timestamp ?? b.date ?? b.created_at ?? b.blockTimestamp ?? b.block_timestamp ?? b.burnedAt ?? b.time;
            let time = '—';
            if (ts !== undefined && ts !== null) {
                const raw = (typeof ts === 'number' || /^\d+$/.test(ts)) && Number(ts) < 1e12 ? Number(ts) * 1000 : ts;
                const d = new Date(raw);
                if (!isNaN(d.getTime())) {
                    time = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                }
            } else if (b.blockNumber !== undefined) { time = `BLK ${b.blockNumber}`; }
            const pixels = b.pixelCounts ?? b.pixel_counts ?? 'N/A';

            let burnedTokens = [];
            try {
                const dr = await fetch(`${window.API}/history/burns/${commitId}`);
                const dd = await dr.json();
                const raw = dd.burnedTokens ?? dd.burned_tokens ?? dd.tokens ?? dd.tokenIds ?? [];
                burnedTokens = Array.isArray(raw) ? raw : [raw];
            } catch {}

            details.push({ commitId, by, time, pixels, burnedTokens });
            await new Promise(r => setTimeout(r, 150));
        }

        const short = addr => window.fmtWallet(String(addr));

        const ROW = 'display:flex;align-items:center;gap:8px;padding:4px 10px;border-bottom:1px dashed #48494b;cursor:pointer;font-family:\'Courier New\',monospace;font-size:11px;color:#48494b;';

        const cards = details.flatMap(({ commitId, by, time, pixels, burnedTokens }) => {
            if (!burnedTokens.length) {
                return [`<div onclick="window.openBurnDetail(event,'${commitId}','${time}','${pixels}')" style="${ROW}">
                    <div style="width:32px;height:32px;border:1px solid #48494b;flex-shrink:0;background:#e3e5e4;"></div>
                    <span>? &nbsp; ${window.escapeHTML(short(by))}</span>
                </div>`];
            }
            return burnedTokens.map(t => {
                const tid = t.tokenId ?? t.token_id ?? t.id ?? t;
                return `<div onclick="window.openBurnDetail(event,'${commitId}','${time}','${pixels}')" style="${ROW}">
                    <img src="${window.API}/history/burned/${tid}/image.svg" onerror="this.style.visibility='hidden'" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #48494b;flex-shrink:0;">
                    <span style="flex:1;">#${window.escapeHTML(String(tid))} &nbsp; ${window.escapeHTML(short(by))}</span>
                    <span style="color:#48494b;opacity:0.65;">${time}</span>
                </div>`;
            });
        }).join('');

        const BTN = "background:transparent;border:1px solid #48494b;color:#48494b;font-family:'Courier New',monospace;font-size:10px;padding:1px 6px;cursor:pointer;";
        body.innerHTML = `
            <div class="window-tabs-bar">
                <button class="window-tab-btn active" data-tab="burns">[ BURNS ]</button>
                <button class="window-tab-btn" data-tab="canvas">[ CANVAS HISTORY ]</button>
            </div>
            <div id="tab-burns" class="tab-content-panel" style="display:block;flex:1;overflow-y:auto;display:flex;flex-direction:column;">
                <div style="padding:5px 10px;border-bottom:2px dashed #48494b;font-family:'Courier New',monospace;font-size:10px;color:#48494b;display:flex;gap:16px;flex-shrink:0;">
                    <span>BURNED: ${stats?.totalBurnedTokens ?? '—'}</span>
                    <span>TRANSFORMS: ${stats?.totalTransforms ?? '—'}</span>
                    <span>AP DISTRIB: ${stats?.totalActionPointsDistributed ?? '—'}</span>
                </div>
                <div style="flex:1;overflow-y:auto;">${cards}</div>
            </div>
            <div id="tab-canvas" class="tab-content-panel" style="flex:1;overflow-y:auto;padding:10px 14px;font-family:'Courier New',monospace;font-size:11px;color:#48494b;">
                <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;">
                    <input id="ch-input" type="text" placeholder="TOKEN ID" style="width:90px;background:#e3e5e4;border:1px solid #48494b;color:#48494b;font-family:'Courier New',monospace;font-size:11px;padding:3px 6px;">
                    <button id="ch-load" style="${BTN}padding:2px 8px;">[ LOAD ]</button>
                    <button id="ch-orig" style="${BTN}padding:2px 8px;">[ ORIGINAL ]</button>
                </div>
                <div style="display:flex;gap:12px;">
                    <div id="ch-list" style="flex:1;overflow-y:auto;max-height:220px;border-right:1px solid rgba(72,73,75,0.3);padding-right:8px;"></div>
                    <div style="text-align:center;">
                        <canvas id="ch-canvas" width="320" height="320" style="image-rendering:pixelated;border:1px solid #48494b;display:none;width:160px;height:160px;"></canvas>
                        <div id="ch-nav" style="margin-top:6px;display:none;align-items:center;justify-content:center;gap:4px;">
                            <button id="ch-prev" style="${BTN}">[ PREV ]</button>
                            <span id="ch-label" style="font-size:10px;white-space:nowrap;"></span>
                            <button id="ch-next" style="${BTN}">[ NEXT ]</button>
                        </div>
                    </div>
                </div>
            </div>
            `;

        body.querySelectorAll('.window-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                body.querySelectorAll('.window-tab-btn').forEach(b => b.classList.remove('active'));
                body.querySelectorAll('.tab-content-panel').forEach(p => { p.style.display = 'none'; });
                btn.classList.add('active');
                const panel = body.querySelector(`#tab-${btn.dataset.tab}`);
                if (panel) panel.style.display = 'block';
            });
        });

        let _chVersions = [];
        let _chIdx      = 0;
        let _chTokenId  = '';
        const chCanvas  = body.querySelector('#ch-canvas');
        const chNav     = body.querySelector('#ch-nav');
        const chLabel   = body.querySelector('#ch-label');

        function chShowVersion(idx) {
            if (!_chVersions.length) return;
            _chIdx = idx;
            const v    = _chVersions[idx];
            const vNum = v.version ?? v.v ?? (idx + 1);
            const img  = new Image();
            img.onload = () => { const ctx = chCanvas.getContext('2d'); ctx.clearRect(0,0,320,320); ctx.drawImage(img,0,0,320,320); };
            img.src = `${window.API}/history/normie/${_chTokenId}/version/${vNum}/image.svg`;
            chCanvas.style.display = 'block';
            chNav.style.display    = 'flex';
            chLabel.textContent    = `[ VERSION ${idx + 1} / ${_chVersions.length} ]`;
            body.querySelectorAll('.ch-row').forEach((r, i) => {
                r.style.background = i === idx ? '#48494b' : 'transparent';
                r.style.color      = i === idx ? '#e3e5e4' : '#48494b';
            });
        }

        body.querySelector('#ch-orig').addEventListener('click', () => {
            const tokenId = body.querySelector('#ch-input').value.trim();
            if (!tokenId) return;
            _chTokenId = tokenId;
            const img = new Image();
            img.onload = () => { const ctx = chCanvas.getContext('2d'); ctx.clearRect(0,0,320,320); ctx.drawImage(img,0,0,320,320); };
            img.src = `${window.API}/normie/${tokenId}/original/image.svg`;
            chCanvas.style.display = 'block';
            chNav.style.display    = 'flex';
            chLabel.textContent    = '[ ORIGINAL VERSION ]';
            body.querySelectorAll('.ch-row').forEach(r => { r.style.background = 'transparent'; r.style.color = '#48494b'; });
        });

        body.querySelector('#ch-load').addEventListener('click', async () => {
            const tokenId = body.querySelector('#ch-input').value.trim();
            if (!tokenId) return;
            _chTokenId = tokenId;
            const list = body.querySelector('#ch-list');
            list.innerHTML = '<div style="opacity:0.6;font-size:10px;">LOADING...</div>';
            try {
                const r = await fetch(`${window.API}/history/normie/${tokenId}/versions`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const d = await r.json();
                _chVersions = Array.isArray(d) ? d : (d.versions ?? d.data ?? []);
                if (!_chVersions.length) { list.innerHTML = '<div style="opacity:0.6;font-size:10px;">NO VERSIONS</div>'; return; }
                list.innerHTML = _chVersions.map((v, i) => {
                    const vNum = v.version ?? v.v ?? (i + 1);
                    const ts   = v.timestamp ?? v.createdAt ?? v.date ?? '';
                    let timeStr = '';
                    if (ts) { const dt = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : Number(ts)); if (!isNaN(dt)) timeStr = ` &nbsp;${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; }
                    const cc = v.changeCount ?? v.changes ?? '';
                    const np = v.newPixelCount ?? v.newPixels ?? '';
                    return `<div class="ch-row" data-idx="${i}" style="padding:3px 6px;cursor:pointer;border-bottom:1px dashed rgba(72,73,75,0.3);font-size:10px;">v${window.escapeHTML(String(vNum))}${cc !== '' ? ` &nbsp;Delta${window.escapeHTML(String(cc))}` : ''}${np !== '' ? ` +${window.escapeHTML(String(np))}` : ''}${timeStr}</div>`;
                }).join('');
                body.querySelectorAll('.ch-row').forEach(row => {
                    row.addEventListener('click', () => chShowVersion(parseInt(row.dataset.idx)));
                });
                chShowVersion(0);
            } catch(err) {
                list.innerHTML = `<div style="color:#48494b;opacity:0.65;font-size:10px;">>> ERROR: ${err.message}</div>`;
            }
        });

        body.querySelector('#ch-prev').addEventListener('click', () => { if (_chIdx > 0) chShowVersion(_chIdx - 1); });
        body.querySelector('#ch-next').addEventListener('click', () => { if (_chIdx < _chVersions.length - 1) chShowVersion(_chIdx + 1); });


    } catch (err) {
        body.innerHTML = `<div class="native-loading">>> ERROR: ${err.message}</div>`;
    }
}

window.openBurnDetail = function(e, commitId, time, pixels) {
    const row = e.currentTarget;
    const win = row.closest('.os-window');
    if (!win) return;
    const existing = win.querySelector('.burn-detail-modal');
    if (existing) { existing.remove(); return; }

    const STYLE = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#e3e5e4;border:2px solid #48494b;padding:16px;font-family:\'Courier New\',monospace;font-size:12px;color:#48494b;z-index:9999;min-width:220px;max-width:320px;box-shadow:4px 4px 0 #48494b;text-align:center;';
    const CLOSE_BTN = `<button style="background:#48494b;color:#e3e5e4;border:2px solid #48494b;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:4px 10px;cursor:pointer;width:100%;" onclick="this.closest('.burn-detail-modal').remove()">[ CLOSE ]</button>`;

    const modal = document.createElement('div');
    modal.className = 'burn-detail-modal';
    modal.style.cssText = STYLE;
    modal.innerHTML = `<div style="margin-bottom:10px;">>> LOADING BURN #${commitId}...</div>${CLOSE_BTN}`;
    win.appendChild(modal);

    fetch(`${window.API}/history/burns/${commitId}`)
        .then(r => r.json())
        .then(async d => {
            const raw = d.burnedTokens ?? d.burned_tokens ?? d.tokens ?? d.tokenIds ?? [];
            const tokens = Array.isArray(raw) ? raw : [raw];
            if (!tokens.length) { modal.innerHTML = `<div style="color:#48494b;opacity:0.65;margin-bottom:10px;">NO TOKENS FOUND</div>${CLOSE_BTN}`; return; }

            const tid = tokens[0].tokenId ?? tokens[0].token_id ?? tokens[0].id ?? tokens[0];
            const multi = tokens.length > 1 ? ` (+${tokens.length - 1} more)` : '';

            modal.innerHTML = `
                <div style="font-size:10px;letter-spacing:2px;opacity:0.6;margin-bottom:4px;">NORMIES ASHFALL</div>
                <div style="font-weight:bold;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid #48494b;padding-bottom:6px;">NORMIE #${window.escapeHTML(String(tid))}${multi}</div>
                <img src="${window.API}/history/burned/${tid}/image.svg"
                     onerror="this.src='${window.API}/normie/${tid}/image.svg'"
                     style="width:160px;height:160px;image-rendering:pixelated;border:2px solid #48494b;display:block;margin:0 auto 8px;">
                <div style="font-size:10px;opacity:0.6;margin-bottom:8px;">PIXELS CONTRIBUTED: ${pixels}</div>
                <div id="ashfall-eulogy" style="font-size:11px;line-height:1.7;min-height:36px;border-top:1px solid #48494b;padding-top:8px;margin-bottom:10px;font-style:italic;opacity:0.85;">
                    >> requesting last words...
                </div>
                ${CLOSE_BTN}`;

            // Attempt Ollama eulogy
            const eulogyEl = modal.querySelector('#ashfall-eulogy');
            try {
                const [personaRes] = await Promise.allSettled([
                    fetch(`${window.API}/agents/info/${tid}`).then(r => r.ok ? r.json() : null).catch(() => null)
                ]);
                const persona = personaRes.value;
                const agentName = persona?.name ?? `Normie #${tid}`;
                const systemPrompt = persona?.systemPrompt ?? '';
                const model = window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b';
                const prompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}You are ${agentName}, a Normies NFT agent. You have just been burned on Ethereum — your pixels sacrificed to the collective canvas. In one short sentence, speak your final words before disappearing into the blockchain.`;
                const ctrl = new AbortController();
                setTimeout(() => ctrl.abort(), 10000);
                const res = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: 50 } }),
                    signal: ctrl.signal
                });
                const data = await res.json();
                const msg = data.response?.trim();
                if (msg && eulogyEl) eulogyEl.textContent = `"${msg}"`;
            } catch {
                if (eulogyEl) eulogyEl.textContent = 'no signal from the void.';
            }
        })
        .catch(err => {
            modal.innerHTML = `<div style="color:#48494b;opacity:0.65;margin-bottom:10px;">>> ERROR: ${err.message}</div>${CLOSE_BTN}`;
        });
};

window.openBurnWatch = openBurnWatch;