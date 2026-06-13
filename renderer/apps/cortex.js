async function openBrainInspector() {
    const API     = window.API;
    const alphaId = window.currentAlphaId;
    const body    = window.createNativeWindow('CORTEX', '<div class="native-loading">>> SYNCING NEURAL PATHWAYS...</div>');
    const win     = body.closest('.os-window');
    if (win) { win.style.width = '520px'; win.style.height = '480px'; }

    if (!alphaId) { body.innerHTML = '<div class="native-loading">>> NO ALPHA DETECTED</div>'; return; }

    const abortController = new AbortController();
    if (window.NormieStreams) window.NormieStreams.CORTEX = abortController;
    let systemPrompt = '';
    let canvasEdits  = 0;
    let ollamaContext = null;

    const [ollamaOnline, metaRes, versRes] = await Promise.all([
        window.checkOllamaStatus(),
        fetch(`${API}/normie/${alphaId}/metadata`).catch(() => null),
        fetch(`${API}/history/normie/${alphaId}/versions`).catch(() => null),
    ]);

    try {
        await metaRes.json();
        try {
            const vers = await versRes.json();
            canvasEdits = Array.isArray(vers) ? vers.length : 0;
        } catch {}
        systemPrompt = await window.buildSystemPrompt(alphaId);
    } catch {}

    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.padding = '0';
    body.innerHTML = `
        <div style="padding:8px 12px;border-bottom:2px dashed #48494b;font-family:'Courier New',monospace;font-size:11px;color:#48494b;display:flex;justify-content:space-between;align-items:center;">
            <span><strong>AGENT #${alphaId}</strong> | CANVAS EDITS: ${canvasEdits} | <span id="bi-agent-status">...</span></span>
            <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;">
                <span id="bi-led-dot" style="display:inline-block;width:8px;height:8px;background:#48494b;border:1px solid #48494b;"></span>
                <span id="bi-led-label">OLLAMA: ${ollamaOnline ? 'READY' : 'OFFLINE'}</span>
            </span>
        </div>
        <div class="window-tabs-bar">
            <button class="window-tab-btn active" data-panel="panel-chat">[ CHAT ]</button>
            <button class="window-tab-btn" data-panel="panel-scars">[ SCARS ]</button>
        </div>
        <div id="panel-chat" class="tab-content-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
            <div id="bi-chat" style="flex:1;overflow-y:auto;padding:12px;font-family:'Courier New',monospace;font-size:12px;color:#48494b;"></div>
            <div style="display:flex;border-top:2px solid #48494b;padding:8px;gap:6px;background:#e3e5e4;">
                <input id="bi-input" type="text" placeholder="SPEAK TO THE AGENT..." autocomplete="off"
                    style="flex:1;border:2px solid #48494b;padding:5px 8px;font-family:'Courier New',monospace;font-size:12px;background:#e3e5e4;color:#48494b;outline:none;">
                <button id="bi-send"  style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:12px;background:#48494b;color:#e3e5e4;cursor:pointer;">SEND</button>
                <button id="bi-clear" style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;cursor:pointer;opacity:0.65;" title="Clear memory">CLR</button>
            </div>
        </div>
        <div id="panel-scars" class="tab-content-panel" style="flex:1;overflow-y:auto;padding:12px;font-family:'Courier New',monospace;font-size:11px;color:#48494b;">
            <div id="scars-lore" style="border:1px solid rgba(72,73,75,0.4);padding:10px;margin-bottom:12px;line-height:1.8;min-height:60px;font-size:11px;"></div>
            <div id="scars-versions"></div>
            <img id="scars-preview" src="" style="display:none;width:200px;height:200px;image-rendering:pixelated;border:1px solid #48494b;margin-top:12px;">
        </div>`;

    window.applyAgentStatus(window.currentAlphaId, body.querySelector('#bi-agent-status'));

    const chat     = body.querySelector('#bi-chat');
    const input    = body.querySelector('#bi-input');
    const sendBtn  = body.querySelector('#bi-send');
    const ledDot   = body.querySelector('#bi-led-dot');
    const ledLabel = body.querySelector('#bi-led-label');

    const MEM_KEY = `cortex_history_${alphaId}`;
    let memHistory = [];
    try { memHistory = JSON.parse(localStorage.getItem(MEM_KEY) || '[]'); } catch {}
    const saveMemory = () => {
        try { localStorage.setItem(MEM_KEY, JSON.stringify(memHistory.slice(-20))); } catch {}
    };

    const addMsg = (role, text) => {
        const div = document.createElement('div');
        div.style.marginBottom = '8px';
        const dim = role === 'SYS' ? 'opacity:0.65;' : '';
        div.innerHTML = `<span style="color:#48494b;font-weight:bold;${dim}">${role}:</span> ${text}`;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
        return div;
    };

    if (memHistory.length) {
        addMsg('SYS', `>> MEMORY LOADED — ${memHistory.length} exchanges recalled`);
        memHistory.forEach(m => addMsg(m.role, m.text));
    }
    addMsg('SYS', `>> NEURAL BRIDGE ACTIVE. OLLAMA: ${ollamaOnline ? 'READY' : 'OFFLINE — START OLLAMA TO ACTIVATE'}`);

    const send = async () => {
        if (window._ollamaBusy) { addMsg('SYS', '>> AGENT BUSY...'); sendBtn.disabled = false; return; }
        const msg = input.value.trim();
        if (!msg) return;
        input.value = '';
        sendBtn.disabled = true;
        addMsg('USER', msg);
        memHistory.push({ role: 'USER', text: msg });

        const thinking = addMsg('AGENT', '<span style="opacity:0.65;">...</span>');
        window._ollamaBusy = true;
        try {
            const data = await window.fetchLocalAI(msg, systemPrompt, ollamaContext, abortController.signal);
            ollamaContext = data.context ?? null;
            const resp = data.response ?? '...';
            thinking.innerHTML = `<span style="font-weight:bold;">AGENT:</span> ${resp}`;
            memHistory.push({ role: 'AGENT', text: resp });
            window.normieSpeak?.(resp);
            saveMemory();
            ledDot.style.background = '#48494b';
            ledLabel.innerText = 'OLLAMA: READY';
        } catch (err) {
            thinking.innerHTML = `<span style="font-weight:bold;color:#48494b;">AGENT:</span> [OLLAMA OFFLINE — ${err.message}]`;
            ledDot.style.background = '#48494b';
            ledLabel.innerText = 'OLLAMA: OFFLINE';
        } finally {
            window._ollamaBusy = false;
            sendBtn.disabled = false;
            input.focus();
        }
        chat.scrollTop = chat.scrollHeight;
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    body.querySelector('#bi-clear')?.addEventListener('click', () => {
        memHistory = [];
        localStorage.removeItem(MEM_KEY);
        chat.innerHTML = '';
        addMsg('SYS', '>> MEMORY CLEARED');
    });
    input.focus();

    // ── SCARS tab ─────────────────────────────────────────────────────
    let scarsLoaded = false;
    let scarsAbort  = null;

    body.querySelectorAll('.window-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            body.querySelectorAll('.window-tab-btn').forEach(b => b.classList.remove('active'));
            body.querySelectorAll('.tab-content-panel').forEach(p => { p.style.display = 'none'; });
            btn.classList.add('active');
            const target = body.querySelector(`#${btn.dataset.panel}`);
            target.style.display = btn.dataset.panel === 'panel-chat' ? 'flex' : 'block';
            if (btn.dataset.panel === 'panel-scars' && !scarsLoaded) { scarsLoaded = true; loadScars(); }
        });
    });

    async function loadScars() {
        const panelScars    = body.querySelector('#panel-scars');
        const scarsLore     = body.querySelector('#scars-lore');
        const scarsVersions = body.querySelector('#scars-versions');
        const scarsPreview  = body.querySelector('#scars-preview');
        const id = window.NormieState?.alpha?.id ?? alphaId;

        scarsLore.textContent = '>> LOADING SCAR DATA...';
        scarsAbort = new AbortController();

        try {
            const [versRes, burnsRes, canvasRes] = await Promise.all([
                fetch(`${API}/history/normie/${id}/versions`).catch(() => null),
                fetch(`${API}/history/burns/receiver/${id}`).catch(() => null),
                fetch(`${API}/normie/${id}/canvas/info`).catch(() => null),
            ]);

            const versData   = versRes?.ok   ? await versRes.json()   : [];
            const burnsData  = burnsRes?.ok  ? await burnsRes.json()  : {};
            const canvasData = canvasRes?.ok ? await canvasRes.json() : {};

            const versionList  = Array.isArray(versData) ? versData : (versData.versions ?? versData.data ?? []);
            const lastV        = versionList[versionList.length - 1] ?? {};
            const changeCount  = lastV.changeCount ?? lastV.changes ?? 0;
            const burnCount    = burnsData?.count ?? burnsData?.totalReceived ?? (Array.isArray(burnsData) ? burnsData.length : 0);
            const level        = canvasData.level        ?? window.NormieState?.alpha?.traits?.Level               ?? window.currentAlphaLevel ?? 0;
            const ap           = canvasData.actionPoints ?? window.NormieState?.alpha?.traits?.['Action Points']   ?? window.currentAlphaAP    ?? 0;

            const prompt = `You are the soul of Normie #${id}. You have ${level} level, ${ap} action points. You were shaped by ${burnCount} sacrifices. You have ${versionList.length} canvas mutations. The last mutation changed ${changeCount} pixels. Write a short poetic journal entry (3-4 sentences) about your scars and what shaped you. Be cryptic, pixel-native, on-chain.`;

            scarsLore.textContent = '';

            const model     = window.NormieState?.ollama?.model ?? window.OLLAMA_MODEL ?? 'mistral:7b';
            const ollamaRes = await fetch('http://localhost:11434/api/generate', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ model, prompt, stream: true }),
                signal:  scarsAbort.signal,
            });
            if (!ollamaRes.ok) throw new Error(`Ollama HTTP ${ollamaRes.status}`);

            const reader  = ollamaRes.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                for (const line of decoder.decode(value, { stream: true }).split('\n')) {
                    if (!line.trim()) continue;
                    try { const obj = JSON.parse(line); if (obj.response) { scarsLore.textContent += obj.response; panelScars.scrollTop = panelScars.scrollHeight; } } catch {}
                }
            }

            if (!versionList.length) return;
            const VROW = 'padding:4px 0;border-bottom:1px dashed rgba(72,73,75,0.3);cursor:pointer;font-size:10px;';
            scarsVersions.innerHTML =
                `<div style="font-size:10px;letter-spacing:2px;border-bottom:2px solid #48494b;padding-bottom:3px;margin-bottom:6px;font-weight:bold;">[ VERSION HISTORY ]</div>` +
                versionList.map((v, i) => {
                    const vNum    = v.version ?? v.v ?? (i + 1);
                    const added   = v.addedPixels ?? v.newPixelCount ?? v.addedCount ?? v.changeCount ?? '';
                    const removed = v.removedPixels ?? v.removedCount ?? '';
                    const pxStr   = (added !== '' ? `+${added}px` : '') + (removed !== '' ? ` / -${removed}px` : '');
                    const ts      = v.timestamp ?? v.createdAt ?? v.date ?? '';
                    let   timeStr = '';
                    if (ts) { const dt = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : Number(ts)); if (!isNaN(dt)) timeStr = ` — ${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; }
                    return `<div class="scar-v-row" data-v="${vNum}" style="${VROW}">[ V${i} ] ${pxStr}${timeStr}</div>`;
                }).join('');

            scarsVersions.querySelectorAll('.scar-v-row').forEach(row => {
                row.addEventListener('mouseenter', () => { row.style.background = '#48494b'; row.style.color = '#e3e5e4'; });
                row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; row.style.color = '#48494b'; });
                row.addEventListener('click', () => {
                    scarsPreview.style.display = 'block';
                    scarsPreview.src = `${API}/history/normie/${id}/version/${row.dataset.v}/image.svg`;
                });
            });

        } catch(err) {
            if (err.name !== 'AbortError') scarsLore.textContent = `>> ERROR: ${err.message}`;
        }
    }

    win?.querySelector('.window-close')?.addEventListener('click', () => {
        abortController.abort();
        scarsAbort?.abort();
    }, { once: true });
}

window.openBrainInspector = openBrainInspector;