async function openCombat() {
    const API  = window.API;
    const body = window.createNativeWindow('COMBAT', '');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '880px'; win.style.height = '580px'; }

    body.style.padding       = '0';
    body.style.display       = 'flex';
    body.style.flexDirection = 'column';
    body.style.overflow      = 'hidden';

    body.innerHTML = `
        <div style="display:flex;padding:7px 12px;border-bottom:2px solid #48494b;background:#e3e5e4;align-items:center;flex-shrink:0;font-family:'Courier New',monospace;">
            <div id="cb-header-a" style="flex:1;font-size:11px;font-weight:bold;color:#48494b;letter-spacing:1px;">FIGHTER A</div>
            <div style="font-size:13px;font-weight:bold;color:#48494b;letter-spacing:3px;padding:0 20px;">VS</div>
            <div id="cb-header-b" style="flex:1;font-size:11px;font-weight:bold;color:#48494b;letter-spacing:1px;text-align:right;">FIGHTER B</div>
        </div>
        <div style="display:flex;flex:1;overflow:hidden;">
            <div style="flex:1;border-right:1px solid #48494b;display:flex;flex-direction:column;font-family:'Courier New',monospace;">
                <div id="cb-col-a" style="flex:1;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px;overflow-y:auto;">
                    <div style="font-size:11px;color:#48494b;opacity:0.65;">LOADING ALPHA...</div>
                </div>
                <div style="padding:6px 10px;border-top:1px solid #48494b;flex-shrink:0;background:#e3e5e4;display:flex;flex-direction:column;gap:3px;">
                    <input id="cb-input-a" type="number" min="0" max="9999" placeholder="Token ID (e.g. 6594)" style="font-family:'Courier New',monospace;font-size:10px;border:1px solid #48494b;background:#e3e5e4;color:#48494b;padding:3px 6px;outline:none;width:100%;">
                    <div style="display:flex;gap:4px;">
                        <button id="cb-load-a" class="cp-action-btn" style="flex:1;font-size:10px;padding:3px 0;">[ LOAD ]</button>
                        <button id="cb-random-a" class="cp-action-btn" style="flex:1;font-size:10px;padding:3px 0;">[ RANDOM ]</button>
                    </div>
                    <div id="cb-err-a" style="font-size:10px;min-height:12px;color:#48494b;"></div>
                </div>
            </div>
            <div style="flex:1;border-right:1px solid #48494b;display:flex;flex-direction:column;">
                <div id="cb-log" style="flex:1;background:#e3e5e4;overflow-y:auto;padding:10px;font-family:'Courier New',monospace;font-size:11px;color:#48494b;line-height:1.7;white-space:pre-wrap;word-break:break-word;">
                    <div style="color:#48494b;opacity:0.65;">> BATTLE LOG — WAITING...</div>
                </div>
                <div style="display:flex;gap:6px;padding:8px 12px;border-top:1px solid #48494b;justify-content:center;flex-shrink:0;background:#e3e5e4;">
                    <button id="cb-fight" class="cp-action-btn">[ FIGHT ]</button>
                    <button id="cb-reset" class="cp-action-btn">[ RESET ]</button>
                </div>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;font-family:'Courier New',monospace;">
                <div id="cb-col-b" style="flex:1;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px;overflow-y:auto;">
                    <div style="font-size:11px;color:#48494b;opacity:0.65;">LOADING...</div>
                </div>
                <div style="padding:6px 10px;border-top:1px solid #48494b;flex-shrink:0;background:#e3e5e4;display:flex;flex-direction:column;gap:3px;">
                    <input id="cb-input-b" type="number" min="0" max="9999" placeholder="Token ID (e.g. 6594)" style="font-family:'Courier New',monospace;font-size:10px;border:1px solid #48494b;background:#e3e5e4;color:#48494b;padding:3px 6px;outline:none;width:100%;">
                    <div style="display:flex;gap:4px;">
                        <button id="cb-load-b" class="cp-action-btn" style="flex:1;font-size:10px;padding:3px 0;">[ LOAD ]</button>
                        <button id="cb-random" class="cp-action-btn" style="flex:1;font-size:10px;padding:3px 0;">[ RANDOM ]</button>
                    </div>
                    <div id="cb-err-b" style="font-size:10px;min-height:12px;color:#48494b;"></div>
                </div>
            </div>
        </div>`;

    const colA    = body.querySelector('#cb-col-a');
    const colB    = body.querySelector('#cb-col-b');
    const logEl   = body.querySelector('#cb-log');
    const headerA = body.querySelector('#cb-header-a');
    const headerB = body.querySelector('#cb-header-b');
    const alphaId  = String(window.currentAlphaId ?? '');
    const loadABtn = body.querySelector('#cb-load-a');
    const randABtn = body.querySelector('#cb-random-a');
    const loadBBtn = body.querySelector('#cb-load-b');
    const inputA   = body.querySelector('#cb-input-a');
    const inputB   = body.querySelector('#cb-input-b');
    const errA     = body.querySelector('#cb-err-a');
    const errB     = body.querySelector('#cb-err-b');

    let fighterA        = null;
    let fighterB        = null;
    let battling        = false;
    let typeTimers      = [];
    let agents          = [];
    let abortController = new AbortController();

    // ── Load fighter data ─────────────────────────────────────
    const loadFighter = async (id, col) => {
        const imgEl = document.createElement('img');
        imgEl.src = `${API}/normie/${id}/image.svg`;
        imgEl.className = 'normie-avatar';
        imgEl.style.cssText = 'width:120px;height:120px;image-rendering:pixelated;border:1px solid #48494b;';
        const loadingEl = document.createElement('div');
        loadingEl.style.cssText = 'font-size:11px;color:#48494b;opacity:0.65;';
        loadingEl.textContent = 'LOADING...';
        col.innerHTML = '';
        col.appendChild(imgEl);
        col.appendChild(loadingEl);

        const [infoRes, canvasRes, metaRes] = await Promise.all([
            fetch(`${API}/agents/info/${id}`).catch(() => null),
            fetch(`${API}/normie/${id}/canvas/info`).catch(() => null),
            fetch(`${API}/normie/${id}/metadata`).catch(() => null),
        ]);
        let info   = infoRes   ? await infoRes.json().catch(() => ({}))   : {};
        const canvas = canvasRes ? await canvasRes.json().catch(() => ({})) : {};
        const meta   = metaRes   ? await metaRes.json().catch(() => ({}))   : {};
        if (!infoRes?.ok || info.error || infoRes?.status >= 500) {
            const prevRes = await fetch(`${API}/agents/persona-preview/${id}`).catch(() => null);
            if (prevRes?.ok) {
                info = await prevRes.json().catch(() => ({}));
            } else {
                throw new Error('agent inaccessible');
            }
        }

        return {
            id,
            name:         info.name ?? info.agentName ?? `Normie #${id}`,
            level:        canvas.level ?? 0,
            ap:           canvas.actionPoints ?? canvas.action_points ?? 0,
            prestige:     window.calculatePrestigeScore(meta),
            systemPrompt: info.systemPrompt ?? info.persona?.systemPrompt ?? '',
        };
    };

    if (alphaId) {
        loadFighter(alphaId, colA).then(f => {
            fighterA = f;
            renderCol(colA, f);
            headerA.textContent = `FIGHTER A — ${f.name}`;
        }).catch(() => {
            colA.innerHTML = `<div style="font-size:11px;color:#48494b;opacity:0.65;">> ERROR ALPHA</div>`;
        });
    }

    // ── Log helpers ───────────────────────────────────────────
    const logClear = () => { logEl.innerHTML = ''; };
    const logLine  = (txt) => {
        const d = document.createElement('div');
        d.textContent = txt;
        logEl.appendChild(d);
        logEl.scrollTop = logEl.scrollHeight;
    };

    const typeText = (text, prefix) => new Promise(resolve => {
        const lines = text.trim().split('\n');
        let lineIdx = 0;
        let wordIdx = 0;
        let words   = [];
        let currentDiv = null;

        const nextLine = () => {
            currentDiv = document.createElement('div');
            currentDiv.textContent = lineIdx === 0 ? prefix : '';
            logEl.appendChild(currentDiv);
            logEl.scrollTop = logEl.scrollHeight;
            words   = lines[lineIdx].split(' ');
            wordIdx = 0;
        };
        nextLine();

        const t = setInterval(() => {
            if (lineIdx >= lines.length) { clearInterval(t); resolve(); return; }
            if (wordIdx < words.length) {
                const pfx = lineIdx === 0 ? prefix : '';
                currentDiv.textContent = pfx + words.slice(0, ++wordIdx).join(' ');
                logEl.scrollTop = logEl.scrollHeight;
            } else {
                lineIdx++;
                if (lineIdx < lines.length) nextLine();
                else { clearInterval(t); resolve(); }
            }
        }, 80);
        typeTimers.push(t);
    });

    // ── Render fighter column ─────────────────────────────────
    const renderCol = (col, f) => {
        col.innerHTML = `
            <img src="${API}/normie/${f.id}/image.svg" class="normie-avatar"
                 style="width:120px;height:120px;image-rendering:pixelated;border:1px solid #48494b;">
            <div style="font-weight:bold;font-size:13px;letter-spacing:1px;text-align:center;">${f.name}</div>
            <div style="font-size:11px;text-align:center;line-height:2;color:#48494b;">
                LVL &nbsp;&nbsp;: ${f.level}<br>
                AP &nbsp;&nbsp;&nbsp;: ${f.ap}<br>
                PRESTIGE : ${Math.round(f.prestige)}
            </div>
            <div style="font-size:11px;font-weight:bold;letter-spacing:1px;">● AWAKENED</div>`;
    };

    const onPick = async (sel, col, slot) => {
        const id = sel.value;
        if (!id) return;
        try {
            const f = await loadFighter(id, col);
            if (slot === 'A') fighterA = f; else fighterB = f;
            renderCol(col, f);
        } catch (e) {
            logLine(`> ERROR: ${e.message}`);
            col.innerHTML = `<div style="font-size:11px;color:#48494b;opacity:0.65;">> ERROR: ${e.message}</div>`;
        }
    };

    const pickRandom = () => {
        const currentBId = fighterB ? String(fighterB.id) : null;
        const pool = agents.filter(a =>
            String(a.id) !== alphaId && String(a.id) !== currentBId
        );
        if (!pool.length) { logLine('> NO OPPONENT AVAILABLE.'); return; }
        const idx  = Math.floor(Math.random() * pool.length);
        const pick = pool[idx];
        loadFighter(pick.id, colB).then(f => {
            fighterB = f;
            renderCol(colB, f);
            headerB.textContent = `FIGHTER B — ${f.name}`;
        }).catch(() => {
            colB.innerHTML = `<div style="font-size:11px;color:#48494b;opacity:0.65;">> ERROR AGENT</div>`;
        });
    };
    body.querySelector('#cb-random').addEventListener('click', pickRandom);

    const pickRandomA = () => {
        const bId = fighterB ? String(fighterB.id) : null;
        const pool = agents.filter(a => String(a.id) !== bId);
        if (!pool.length) { logLine('> NO FIGHTER AVAILABLE.'); return; }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        loadFighter(pick.id, colA).then(f => {
            fighterA = f; renderCol(colA, f); headerA.textContent = `FIGHTER A — ${f.name}`;
        }).catch(() => { colA.innerHTML = `<div style="font-size:11px;color:#48494b;opacity:0.65;">> ERROR</div>`; });
    };

    const loadByTokenId = async slot => {
        const input = slot === 'A' ? inputA : inputB;
        const err   = slot === 'A' ? errA   : errB;
        const col   = slot === 'A' ? colA   : colB;
        const raw   = input.value.trim();
        const id    = parseInt(raw, 10);
        err.textContent = '';
        if (!raw || isNaN(id) || id < 0 || id > 9999) { err.textContent = '> Invalid ID — enter 0–9999'; return; }
        try {
            const f = await loadFighter(id, col);
            if (slot === 'A') { fighterA = f; renderCol(colA, f); headerA.textContent = `FIGHTER A — ${f.name}`; }
            else              { fighterB = f; renderCol(colB, f); headerB.textContent = `FIGHTER B — ${f.name}`; }
        } catch (e) { err.textContent = `> Not found: ${e.message}`; }
    };

    loadABtn.addEventListener('click', () => loadByTokenId('A'));
    loadBBtn.addEventListener('click', () => loadByTokenId('B'));
    randABtn.addEventListener('click', pickRandomA);
    inputA.addEventListener('keydown', e => { if (e.key === 'Enter') loadByTokenId('A'); });
    inputB.addEventListener('keydown', e => { if (e.key === 'Enter') loadByTokenId('B'); });

    // ── Ollama streaming ──────────────────────────────────────
    const ollamaStream = async (system, prompt, prefix) => {
        const OLLAMA_URL = window.OLLAMA || 'http://localhost:11434';
        const r = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({
                model: window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b', system, prompt, stream: true,
                options: { num_predict: 60, temperature: 0.9 }
            })
        });
        const reader  = r.body.getReader();
        const decoder = new TextDecoder();
        let buf  = '';
        let full = '';
        const div = document.createElement('div');
        div.style.whiteSpace = 'pre-wrap';
        div.textContent = prefix;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
        outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop();
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const obj = JSON.parse(line);
                    if (obj.response) {
                        full += obj.response;
                        div.textContent = prefix + full;
                        logEl.scrollTop = logEl.scrollHeight;
                    }
                    if (obj.done) break outer;
                } catch {}
            }
        }
        return full.trim();
    };

    // ── FIGHT ─────────────────────────────────────────────────
    body.querySelector('#cb-fight').addEventListener('click', async () => {
        if (battling) return;
        if (!fighterA || !fighterB) {
            logClear();
            logLine('> ERROR: SELECT TWO FIGHTERS.');
            return;
        }
        abortController = new AbortController();
        if (window.NormieStreams) window.NormieStreams.COMBAT = abortController;
        battling = true;
        typeTimers.forEach(clearInterval);
        typeTimers = [];
        logClear();

        try {
            if (!fighterA.systemPrompt) { logLine('> ERROR: persona not loaded for ' + fighterA.name); battling = false; return; }
            if (!fighterB.systemPrompt) { logLine('> ERROR: persona not loaded for ' + fighterB.name); battling = false; return; }

            logLine(`> BATTLE : ${fighterA.name} vs ${fighterB.name}`);
            logLine('> ROUND 1');

            const coupletA = await ollamaStream(
                fighterA.systemPrompt,
                `Rap battle stats:\nYOU (${fighterA.name}): Level ${fighterA.level} | AP ${fighterA.ap} | Prestige ${Math.round(fighterA.prestige)}\nOPPONENT (${fighterB.name}): Level ${fighterB.level} | AP ${fighterB.ap} | Prestige ${Math.round(fighterB.prestige)}\n\n4 lines MAX. Attack ${fighterB.name} using these real stats. Be aggressive. Stay in character. English only.\nNo intro, no explanation. Just 4 lines.`,
                `> [${fighterA.name}] : `
            );
            logLine('');

            logLine('> ROUND 2');
            const coupletB = await ollamaStream(
                fighterB.systemPrompt,
                `Rap battle stats:\nYOU (${fighterB.name}): Level ${fighterB.level} | AP ${fighterB.ap} | Prestige ${Math.round(fighterB.prestige)}\nOPPONENT (${fighterA.name}): Level ${fighterA.level} | AP ${fighterA.ap} | Prestige ${Math.round(fighterA.prestige)}\n\n${fighterA.name} just said: ${coupletA}\nFire back with 4 lines using these real stats. Be aggressive. Stay in character. English only.\nNo intro, no explanation. Just 4 lines.`,
                `> [${fighterB.name}] : `
            );
            logLine('');
            logLine('> ────────────────────────────');

            const winner = fighterA.prestige >= fighterB.prestige ? fighterA : fighterB;
            const loser  = winner === fighterA ? fighterB : fighterA;
            logLine(`> WINNER : ${winner.name.toUpperCase()} — PRESTIGE ${Math.round(winner.prestige)}`);
            window.NormieBus?.emit('combat:result', { winner: winner.name, winnerTid: winner.id, loser: loser.name, loserTid: loser.id, rounds: 2 });

        } catch (err) {
            logLine(`> ERROR: ${err.message}`);
        }
        battling = false;
    });

    // ── RESET ─────────────────────────────────────────────────
    body.querySelector('#cb-reset').addEventListener('click', () => {
        typeTimers.forEach(clearInterval);
        typeTimers = [];
        battling = false;
        logClear();
        logLine('> BATTLE LOG — RESET.');
    });

    let _loopStopped = false;
    win?.querySelector('.window-close')?.addEventListener('click', () => {
        abortController.abort();
        _loopStopped = true;
        typeTimers.forEach(clearInterval);
    }, { once: true });

    // ── Fetch AWAKENED agents via /agents/list (background) ───
    setTimeout(async () => {
        try {
            const countRes = await fetch(`${API}/agents/count`, { signal: abortController.signal });
            const countData = await countRes.json();
            const total = countData.count ?? countData.total ?? '?';
            logLine(`> ${total} AGENTS AWAKENED — LOADING...`);

            let cursor = null;
            let hasMore = true;
            while (hasMore && !_loopStopped && body.closest('.os-window')) {
                const url = `${API}/agents/list?sort=newest&limit=100` + (cursor ? `&cursor=${cursor}` : '');
                const res  = await fetch(url, { signal: abortController.signal });
                const data = await res.json();
                const page = data.agents ?? data.items ?? data.data ?? (Array.isArray(data) ? data : []);
                page.forEach(a => {
                    const id   = a.tokenId ?? a.token_id ?? a.id;
                    const name = a.name ?? `Normie #${id}`;
                    if (id != null) agents.push({ id, name });
                });
                cursor  = data.nextCursor ?? data.cursor ?? null;
                hasMore = !!(data.hasMore ?? data.has_more ?? cursor);
            }
        } catch (err) {
            logLine(`> LOADING ERROR: ${err.message}`);
        }

        logClear();
        logLine(`> ${agents.length} AGENTS AWAKENED LOADED.`);
        logLine('> PRESS [ FIGHT ] — [ RANDOM ] to change opponent.');
        pickRandom();
    }, 100);
}

window.openCombat = openCombat;