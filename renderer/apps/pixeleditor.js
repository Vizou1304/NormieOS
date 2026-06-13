async function openPixelEditor() {
    const alphaId = window.currentAlphaId;
    const body = window.createNativeWindow('PIXELFORGE', '<div class="native-loading">>> LOADING CANVAS...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '540px'; win.style.height = '540px'; }

    if (!alphaId) { body.innerHTML = '<div class="native-loading">>> NO ALPHA DETECTED</div>'; return; }

    let originalPixels = new Uint8Array(1600);
    let localPixels = new Uint8Array(1600);

    try {
        const res = await fetch(`${window.API}/normie/${alphaId}/pixels`);
        const txt = await res.text();
        for (let i = 0; i < 1600; i++) {
            originalPixels[i] = txt[i] === '1' ? 1 : 0;
            localPixels[i] = originalPixels[i];
        }
    } catch {}

    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.padding = '0';
    body.innerHTML = `
        <div class="window-tabs-bar">
            <button class="window-tab-btn active" data-petab="editor">[ PIXEL EDITOR ]</button>
            <button class="window-tab-btn" data-petab="planner">[ BURN PLANNER ]</button>
        </div>
        <div id="petab-editor" style="display:flex;flex:1;flex-direction:column;overflow:hidden;">
            <div style="padding:8px 12px;border-bottom:2px dashed #48494b;font-family:'Courier New',monospace;font-size:11px;color:#48494b;display:flex;justify-content:space-between;align-items:center;">
                <span>AGENT #${alphaId} — LOCAL PREVIEW</span>
                <span id="pe-cost">AP COST: 0</span>
            </div>
            <canvas id="pe-canvas" width="400" height="400" style="display:block;margin:10px auto;cursor:crosshair;image-rendering:pixelated;border:2px solid #48494b;"></canvas>
            <div style="padding:8px 12px;border-top:2px dashed #48494b;display:flex;gap:8px;justify-content:flex-end;">
                <button id="pe-reset" style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;cursor:pointer;">[ RESET ]</button>
                <button id="pe-push" disabled style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;opacity:0.4;cursor:not-allowed;">[ PUSH ON-CHAIN ]</button>
            </div>
        </div>
        <div id="petab-planner" style="display:none;flex:1;flex-direction:column;overflow:hidden;padding:12px;font-family:'Courier New',monospace;font-size:11px;color:#48494b;">
            <div style="font-size:12px;letter-spacing:2px;font-weight:bold;text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px dashed #48494b;">[ BURN PLANNER ]</div>
            <div id="bp-list" style="flex:1;overflow-y:auto;border:1px solid rgba(72,73,75,0.4);margin-bottom:10px;"></div>
            <div style="text-align:center;margin-bottom:10px;">
                <button id="bp-calc" style="background:#48494b;border:2px solid #48494b;color:#e3e5e4;font-family:'Courier New',monospace;font-size:11px;padding:5px 20px;cursor:pointer;letter-spacing:1px;">[ CALCULATE ]</button>
            </div>
            <div id="bp-result" style="display:none;border-top:1px solid #48494b;border-bottom:1px solid #48494b;padding:10px 4px;font-size:11px;line-height:2.2;"></div>
        </div>`;

    const cvs = body.querySelector('#pe-canvas');
    const ctx = cvs.getContext('2d');
    const costLabel = body.querySelector('#pe-cost');
    const pushBtn = body.querySelector('#pe-push');
    const resetBtn = body.querySelector('#pe-reset');
    const cellSize = 10;

    const redraw = () => {
        ctx.clearRect(0, 0, 400, 400);
        for (let i = 0; i < 1600; i++) {
            const x = (i % 40) * cellSize;
            const y = Math.floor(i / 40) * cellSize;
            if (localPixels[i]) {
                ctx.fillStyle = '#48494b';
                ctx.fillRect(x, y, cellSize, cellSize);
            }
            if (localPixels[i] !== originalPixels[i]) {
                ctx.strokeStyle = '#48494b';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
            }
        }
        const diff = localPixels.reduce((n, v, i) => n + (v !== originalPixels[i] ? 1 : 0), 0);
        costLabel.innerText = `AP COST: ~${diff}`;
        const connected = !!window.currentAlphaId;
        if (diff > 0 && connected) {
            pushBtn.disabled = false;
            pushBtn.style.background = '#48494b';
            pushBtn.style.color = '#e3e5e4';
            pushBtn.style.cursor = 'pointer';
        } else {
            pushBtn.disabled = true;
            pushBtn.style.background = '#e3e5e4';
            pushBtn.style.color = '#48494b';
            pushBtn.style.opacity = '0.4';
            pushBtn.style.cursor = 'not-allowed';
        }
    };

    redraw();

    let painting = false;
    let paintValue = 0;
    cvs.addEventListener('mousedown', (e) => {
        painting = true;
        const r = cvs.getBoundingClientRect();
        const scaleX = 400 / r.width;
        const scaleY = 400 / r.height;
        const x = Math.floor((e.clientX - r.left) * scaleX / cellSize);
        const y = Math.floor((e.clientY - r.top) * scaleY / cellSize);
        const idx = y * 40 + x;
        paintValue = localPixels[idx] ? 0 : 1;
        localPixels[idx] = paintValue;
        redraw();
    });
    cvs.addEventListener('mousemove', (e) => {
        if (!painting) return;
        const r = cvs.getBoundingClientRect();
        const scaleX = 400 / r.width;
        const scaleY = 400 / r.height;
        const x = Math.floor((e.clientX - r.left) * scaleX / cellSize);
        const y = Math.floor((e.clientY - r.top) * scaleY / cellSize);
        const idx = y * 40 + x;
        if (idx >= 0 && idx < 1600) { localPixels[idx] = paintValue; redraw(); }
    });
    cvs.addEventListener('mouseup', () => { painting = false; });

    resetBtn.addEventListener('click', () => { localPixels = new Uint8Array(originalPixels); redraw(); });
    pushBtn.addEventListener('click', () => {
        window.createNativeWindow('PUSH ON-CHAIN', '<div class="native-loading">>> PHASE 3 — WALLETCONNECT REQUIRED.<br>>> TRANSACTION SIGNING NOT YET ACTIVE.</div>');
    });

    // ── Tab switching ──────────────────────────────────────────────
    let _bpStatus = null;
    body.querySelectorAll('[data-petab]').forEach(btn => {
        btn.addEventListener('click', () => {
            body.querySelectorAll('[data-petab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const id = btn.dataset.petab;
            body.querySelector('#petab-editor').style.display = id === 'editor' ? 'flex' : 'none';
            body.querySelector('#petab-planner').style.display = id === 'planner' ? 'flex' : 'none';
            if (id === 'planner' && !_bpStatus) _bpLoadConfig();
        });
    });

    // ── Burn Planner ───────────────────────────────────────────────
    async function _bpLoadConfig() {
        _bpStatus = 'loading';
        try {
            const r = await fetch(`${window.API}/normie/${alphaId}/canvas/info`);
            _bpStatus = r.ok ? await r.json() : null;
        } catch { _bpStatus = null; }

        const ids = window.NormieState?.normieIds ?? [];
        const allMeta = window.NormieState?.allMetadata ?? {};
        const list = body.querySelector('#bp-list');
        if (!ids.length) {
            list.innerHTML = '<div style="padding:10px;font-size:10px;opacity:0.7;text-align:center;">NO NORMIES IN WALLET</div>';
            return;
        }
        const BOX = 'width:14px;height:14px;flex-shrink:0;border:1px solid #48494b;background:#e3e5e4;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;cursor:pointer;user-select:none;font-family:\'Courier New\',monospace;';
        const ROW = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px dashed rgba(72,73,75,0.2);cursor:pointer;';
        list.innerHTML = ids.map(id => {
            const meta  = allMeta[String(id)];
            const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
            const px    = Number(attrs.find(a => String(a.trait_type ?? '').toLowerCase() === 'pixel count')?.value ?? 0);
            return `<div style="${ROW}" data-id="${id}" data-px="${px}">
                <div class="bp-box" style="${BOX}"></div>
                <img src="${window.API}/normie/${id}/image.svg" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #48494b;flex-shrink:0;">
                <span style="flex:1;">#${id}</span>
                <span style="font-size:10px;opacity:0.7;">${px} PX</span>
            </div>`;
        }).join('');
        list.querySelectorAll('[data-id]').forEach(row => {
            row.addEventListener('click', () => {
                const box = row.querySelector('.bp-box');
                const on  = row.dataset.checked === '1';
                row.dataset.checked = on ? '0' : '1';
                box.textContent     = on ? '' : 'X';
                box.style.background = on ? '#e3e5e4' : '#48494b';
                box.style.color      = on ? '#48494b' : '#e3e5e4';
            });
        });
    }

    body.querySelector('#bp-calc').addEventListener('click', () => {
        const checked = [...body.querySelectorAll('#bp-list [data-checked="1"]')];
        if (!checked.length) return;

        const costPerPx  = _bpStatus?.apCostPerPixel ?? 0.1;
        const tiers      = _bpStatus?.tierThresholds ?? _bpStatus?.tiers ?? [];
        const alphaAP    = window.NormieState?.alpha?.traits?.ap ?? window.currentAlphaAP ?? 0;
        const apGained   = checked.reduce((s, el) => s + (parseInt(el.dataset.px) || 0), 0);
        const newAP      = alphaAP + apGained;
        const pxUnlocked = Math.floor(apGained / (costPerPx || 0.1));
        const curTier    = tiers.filter(t => alphaAP >= t).length;
        const newTier    = tiers.filter(t => newAP >= t).length;
        const tierLine   = newTier > curTier ? `${curTier} → ${newTier}` : `${curTier} (UNCHANGED)`;

        const row = (label, val) => `<div style="display:flex;justify-content:space-between;"><span>${label}</span><span>${val}</span></div>`;
        const result = body.querySelector('#bp-result');
        result.style.display = 'block';
        result.innerHTML =
            row('NORMIES BURNED', checked.length) +
            row('AP GAINED', `+${apGained}`) +
            row('PIXELS UNLOCKED', `+${pxUnlocked}`) +
            row('TIER', tierLine);
    });
}

window.openPixelEditor = openPixelEditor;
