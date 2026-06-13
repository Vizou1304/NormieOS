async function openEmergence() {
    const API  = window.API;
    const body = window.createNativeWindow('EMERGENCE', '<div class="native-loading">>> INITIALIZING EMERGENCE...</div>');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '500px'; win.style.height = '660px'; }

    body.style.padding        = '0';
    body.style.display        = 'flex';
    body.style.flexDirection  = 'column';
    body.style.overflow       = 'hidden';
    body.style.fontFamily     = "'Courier New', monospace";
    body.style.fontSize       = '11px';
    body.style.color          = '#48494b';
    body.style.background     = '#e3e5e4';

    // ── localStorage cache helpers (TTL 24h) ──────────────────────
    const TTL24 = 86400000;
    const lsGet = key => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { data, expires } = JSON.parse(raw);
            if (Date.now() > expires) { localStorage.removeItem(key); return null; }
            return data;
        } catch { return null; }
    };
    const lsSet = (key, data) => {
        try { localStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + TTL24 })); } catch {}
    };

    // Typed cache accessors
    const pixelsGet    = tid => lsGet(`pixels_${tid}`);
    const pixelsSet    = (tid, v) => lsSet(`pixels_${tid}`, v);
    const identityGet  = tid => lsGet(`identity_${tid}`);
    const identitySet  = (tid, v) => lsSet(`identity_${tid}`, v);
    const burnsGet     = tid => lsGet(`burns_${tid}`);
    const burnsSet     = (tid, v) => lsSet(`burns_${tid}`, v);
    const canvpxGet    = tid => lsGet(`canvaspx_${tid}`);
    const canvpxSet    = (tid, v) => lsSet(`canvaspx_${tid}`, v);

    // ── Zone mask: 1600-element Uint8Array, 1 = contribute ────────
    const buildZoneMask = rawType => {
        const type = String(rawType ?? '').toLowerCase().trim();
        const m = new Uint8Array(1600);
        for (let i = 0; i < 1600; i++) {
            const x = i % 40, y = (i / 40) | 0;
            if (type.includes('human')) {
                m[i] = (y < 20) ? 1 : 0;                                          // top half
            } else if (type.includes('cat')) {
                m[i] = (y >= 20) ? 1 : 0;                                         // bottom half
            } else if (type.includes('alien')) {
                m[i] = (x < 4 || x >= 36) ? 1 : 0;                               // outer columns
            } else if (type.includes('agent') || type.includes('core')) {
                m[i] = (x >= 10 && x < 30 && y >= 10 && y < 30) ? 1 : 0;        // center 20×20
            } else {
                m[i] = (x >= 10 && x < 30 && y >= 10 && y < 30) ? 1 : 0;        // default: center
            }
        }
        return m;
    };

    // ── Layout ────────────────────────────────────────────────────
    body.innerHTML = `
        <div style="padding:10px 14px;border-bottom:2px solid #48494b;background:#48494b;color:#e3e5e4;flex-shrink:0;">
            <div style="font-weight:bold;letter-spacing:2px;font-size:12px;">EMERGENCE</div>
            <div style="font-size:var(--font-size-log);opacity:0.7;letter-spacing:1.5px;margin-bottom:8px;">COLLECTIVE PIXEL OUTPUT #001</div>
        </div>
        <div style="padding:8px 14px;border-bottom:1px solid #48494b;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span id="em-counter" style="font-size:var(--font-size-title);font-weight:bold;letter-spacing:1px;">0 AGENTS CONTRIBUTED</span>
                <button id="em-generate" style="border:2px solid #48494b;padding:4px 10px;font-family:'Courier New',monospace;font-size:10px;background:#48494b;color:#e3e5e4;cursor:pointer;letter-spacing:1px;">[ GENERATE NEW ]</button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:6px;background:#e3e5e4;border:1px solid #48494b;overflow:hidden;">
                    <div id="em-progress-bar" style="height:100%;width:0%;background:#48494b;transition:width 0.8s;"></div>
                </div>
                <span id="em-progress-label" style="font-size:10px;letter-spacing:1px;opacity:0.7;white-space:nowrap;">0 / 1500</span>
            </div>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:12px 0 8px;">
            <div id="em-status" style="font-size:var(--font-size-log);letter-spacing:1px;line-height:1.6;padding:2px 0;margin-bottom:6px;min-height:16px;">
                >> FORGING PIXELS... 0/50
            </div>
            <div id="em-deliberation" style="font-size:var(--font-size-log);letter-spacing:0.5px;text-align:left;width:400px;min-height:36px;margin-bottom:6px;line-height:1.6;white-space:pre-wrap;"></div>
            <div style="position:relative;display:inline-block;flex-shrink:0;">
                <canvas id="em-canvas" width="400" height="400"
                    style="border:2px solid #48494b;image-rendering:pixelated;display:block;"></canvas>
                <div id="em-scan-overlay" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(72,73,75,0.06) 2px,rgba(72,73,75,0.06) 4px);pointer-events:none;z-index:2;"></div>
            </div>
            <div style="margin-top:7px;font-size:10px;opacity:0.65;letter-spacing:0.5px;text-align:center;">
                HUMAN — center &nbsp;|&nbsp; CAT — top &nbsp;|&nbsp; ALIEN — edges &nbsp;|&nbsp; AGENT — core
            </div>
            <div id="em-contributors" style="margin-top:8px;font-size:10px;opacity:0.7;text-align:center;max-width:460px;padding:0 14px;line-height:1.6;"></div>
        </div>`;

    const counterEl      = body.querySelector('#em-counter');
    const progressBar    = body.querySelector('#em-progress-bar');
    const progressLabel  = body.querySelector('#em-progress-label');
    const statusEl       = body.querySelector('#em-status');
    const deliberateEl   = body.querySelector('#em-deliberation');

    const setProgress = (count, total = 1500) => {
        const pct = Math.min(100, (count / total) * 100).toFixed(2);
        if (progressBar)  progressBar.style.width = pct + '%';
        if (progressLabel) progressLabel.textContent = `${count} / ${total}`;
    };
    const canvas         = body.querySelector('#em-canvas');
    const contributorsEl = body.querySelector('#em-contributors');
    const generateBtn    = body.querySelector('#em-generate');
    const ctx            = canvas.getContext('2d');
    const scanOverlay    = body.querySelector('#em-scan-overlay');

    // ── Render 40×40 grid from Int32Array result ──────────────────
    const renderCanvas = result => {
        for (let i = 0; i < 1600; i++) {
            ctx.fillStyle = result[i] ? '#48494b' : '#e3e5e4';
            ctx.fillRect((i % 40) * 10, ((i / 40) | 0) * 10, 10, 10);
        }
    };

    const clearCanvas = () => {
        ctx.fillStyle = '#e3e5e4';
        ctx.fillRect(0, 0, 400, 400);
        ctx.strokeStyle = 'rgba(72,73,75,0.08)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 40; i++) {
            ctx.beginPath(); ctx.moveTo(i * 10, 0); ctx.lineTo(i * 10, 400); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * 10); ctx.lineTo(400, i * 10); ctx.stroke();
        }
    };
    clearCanvas();

    const createPRNG = seed => () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const hashStr = s => s.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0) | 0, 0);

    // ── Fetch helpers: rate-limit safe, 1200ms delay, 429 retry ──
    const delay = (ms = 1200) => new Promise(r => setTimeout(r, ms));
    let currentSignal = null;

    const fetchText = async (url, cacheGet, cacheSet) => {
        let v = cacheGet ? cacheGet() : null;
        if (v !== null) return v;
        try {
            const sig = currentSignal ? { signal: currentSignal } : {};
            let r = await fetch(url, sig).catch(() => null);
            if (r?.status === 429) { await delay(5000); r = await fetch(url, sig).catch(() => null); }
            if (r?.ok) { v = (await r.text()).trim(); if (cacheSet) cacheSet(v); }
        } catch {}
        await delay();
        return v;
    };

    const fetchJSON = async (url, cacheGet, cacheSet) => {
        let v = cacheGet ? cacheGet() : null;
        if (v !== null) return v;
        try {
            const sig = currentSignal ? { signal: currentSignal } : {};
            let r = await fetch(url, sig).catch(() => null);
            if (r?.status === 429) { await delay(5000); r = await fetch(url, sig).catch(() => null); }
            if (r?.ok) { v = await r.json().catch(() => null); if (v && cacheSet) cacheSet(v); }
        } catch {}
        await delay();
        return v;
    };

    // ── Deliberation helpers ──────────────────────────────────────
    const parseBehavior = text => {
        const up = (text ?? '').toUpperCase();
        return {
            fill:    up.includes('VOID')     ? 'void'    : 'fill',
            cluster: up.includes('SCATTER')  ? 'scatter' : 'cluster',
            weight2: up.includes('DOMINANT'),
            subtle:  up.includes('SUBTLE'),
        };
    };

    const computeEffectiveMask = (behavior, baseZoneMask) => {
        if (!behavior) return baseZoneMask;
        const m = new Uint8Array(1600);
        // FILL vs VOID
        for (let i = 0; i < 1600; i++) {
            m[i] = (behavior.fill === 'void')
                ? (baseZoneMask[i] && i % 3 === 0) ? 1 : 0   // ~33% sample
                : baseZoneMask[i];
        }
        // CLUSTER vs SCATTER
        if (behavior.cluster === 'scatter') {
            m.fill(1); // full bitmap, ignore zone
        } else {
            // Cluster: tighten to inner 24×24 center
            for (let i = 0; i < 1600; i++) {
                if (m[i]) {
                    const x = i % 40, y = (i / 40) | 0;
                    m[i] = (x >= 8 && x < 32 && y >= 8 && y < 32) ? 1 : 0;
                }
            }
        }
        if (behavior.subtle)  { for (let i = 1; i < 1600; i += 2) m[i] = 0; } // odd pixels off
        if (behavior.weight2) { m.fill(1); }                                    // dominant → full
        return m;
    };

    // ── Main generation pipeline ──────────────────────────────────
    let running = false;
    let abortCtrl = null;

    const generate = async () => {
        // Engine state: DNA accumulator + GoL double buffer
        const W        = 40;
        const CELLS    = W * W;
        const seedGrid = new Float32Array(CELLS);   // weighted agent DNA
        let   liveGrid = new Uint8Array(CELLS);     // current generation
        let   nextGrid = new Uint8Array(CELLS);     // swap buffer
        if (abortCtrl) abortCtrl.abort();
        abortCtrl = new AbortController();
        currentSignal = abortCtrl.signal;
        const signal = abortCtrl.signal;
        running = true;
        generateBtn.disabled = true;
        clearCanvas();
        canvas.classList.add('em-thinking');
        if (scanOverlay) scanOverlay.style.display = 'block';
        counterEl.textContent      = '0 AGENTS CONTRIBUTED';
        statusEl.textContent       = '>> FORGING PIXELS... 0/50';
        deliberateEl.textContent   = '';
        contributorsEl.textContent = '';

        try {
            // 1. Agents list
            statusEl.textContent = '>> FETCHING AGENTS...';
            let allRaw = window.NormieState?.agents ?? window.NormieCache.get('agents');
            if (!allRaw) {
                const r = await fetch(`${API}/agents/list?sort=newest&limit=100`, { signal }).catch(() => null);
                if (!r?.ok) throw new Error('agents/list unreachable');
                const d = await r.json();
                allRaw = Array.isArray(d) ? d : (d.agents ?? d.items ?? d.data ?? d.tokens ?? []);
                window.NormieCache.set('agents', allRaw, window.TTL.PERSONA);
                if (window.NormieState) window.NormieState.agents = allRaw;
            }
            if (!allRaw?.length) throw new Error('no agents found');

            const selected = [...allRaw].sort(() => Math.random() - 0.5).slice(0, 50);
            const TARGET   = selected.length;

            // 2. Deliberation — 1 representative per type consults Ollama
            statusEl.textContent = '>> AGENT DELIBERATION...';
            const typeBehaviorMap = new Map(); // type → behavior
            const repMetadataMap  = new Map(); // tid → { level, ap, txHash, prestige }

            const calcPrestige = attrs => {
                const gA = k => attrs.find(a => String(a.trait_type ?? '').toLowerCase() === k.toLowerCase())?.value ?? null;
                const TIERS = { legendary: 100, epic: 75, rare: 50, common: 25 };
                return (Number(gA('Level') ?? 0) + 3 * Number(gA('Action Points') ?? 0)
                    + (TIERS[String(gA('Tier') ?? gA('Rarity') ?? '').toLowerCase()] ?? 0)
                    + (String(gA('Customized') ?? '').toLowerCase() === 'yes' ? 30 : 0)
                    + 0.1 * Number(gA('Pixel Count') ?? 0));
            };

            // 2a. Find first representative per type from pool (cache-first identity fetch)
            const WANTED_TYPES = ['human', 'cat', 'alien', 'agent'];
            const reps = new Map(); // type → { tid, name }
            for (const a of selected) {
                if (reps.size === WANTED_TYPES.length) break;
                const tid = String(a.tokenId ?? a.token_id ?? a.id ?? '');
                let ident = identityGet(tid);
                if (!ident) {
                    ident = await fetchJSON(`${API}/agents/identity/${tid}`, null, v => identitySet(tid, v));
                }
                const atype = String(ident?.type ?? ident?.agentType ?? 'unknown').toLowerCase();
                if (WANTED_TYPES.includes(atype) && !reps.has(atype)) {
                    reps.set(atype, { tid, name: ident?.name ?? a.name ?? `#${tid}` });
                }
            }

            // 2b. Each rep deliberates via Ollama; all agents of same type inherit behavior
            for (const [typeName, rep] of reps) {
                if (signal.aborted || !body.closest('.os-window')) break;
                let sysPrompt = '';
                try {
                    const ir = await fetch(`${API}/agents/info/${rep.tid}`, { signal }).catch(() => null);
                    if (ir?.ok) { const id = await ir.json().catch(() => ({})); sysPrompt = id.systemPrompt ?? id.brain ?? ''; }
                } catch {}
                await delay();

                const metaR     = await fetchJSON(`${API}/normie/${rep.tid}/metadata`, null, null);
                const rAttrs    = Array.isArray(metaR?.attributes) ? metaR.attributes : [];
                const repLevel  = Number(rAttrs.find(a => String(a.trait_type ?? '').toLowerCase() === 'level')?.value) || 0;
                const repAp     = Number(rAttrs.find(a => String(a.trait_type ?? '').toLowerCase() === 'action points')?.value) || 0;
                const repTxHash = rep.txHash || '0';
                const repPrestige = Math.round(calcPrestige(rAttrs) * 10) / 10;
                repMetadataMap.set(rep.tid, { level: repLevel, ap: repAp, txHash: repTxHash, prestige: repPrestige });

                const density    = (seedGrid.filter(v => v > 0).length / CELLS * 100).toFixed(1);
                const META_PROMPT =
                    `You are ${rep.name}, a ${typeName} agent. Level ${repLevel}. Prestige ${repPrestige}. Type: ${typeName}.\n` +
                    `Current canvas density: ${density}% active pixels.\n` +
                    'Respond ONLY with a raw JSON object, no markdown:\n' +
                    '{"thought":"1 sentence on what shape or concept to build.","brush_radius":integer 1-6,"chaos_factor":float 0.1-0.9}\n' +
                    'No other text.';

                try {
                    const or = await fetch(`${window.OLLAMA}/api/generate`, {
                        method: 'POST', signal,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b',
                            system: sysPrompt || `You are ${rep.name}, a sovereign on-chain agent.`,
                            prompt: META_PROMPT,
                            stream: false,
                            options: { num_predict: 120, temperature: 0.9 }
                        })
                    }).catch(() => null);
                    if (or?.ok) {
                        const od = await or.json().catch(() => ({}));
                        let parsed = null;
                        try {
                            const raw = (od?.response ?? '').trim();
                            const start = raw.indexOf('{');
                            parsed = JSON.parse(start >= 0 ? raw.slice(start) : raw);
                        } catch {}
                        const thought      = typeof parsed?.thought === 'string' ? parsed.thought : null;
                        const brush_radius = Number(parsed?.brush_radius) || 3;
                        const chaos_factor = Number(parsed?.chaos_factor) || 0.5;
                        typeBehaviorMap.set(typeName, { thought, brush_radius, chaos_factor });
                        deliberateEl.innerHTML += `<div style="padding:2px 0;"><span style="opacity:1;">&gt; ${typeName.toUpperCase()} [${rep.name}]:</span> <span style="opacity:0.8;">${thought ?? 'no thought'}</span></div>`;
                    } else {
                        deliberateEl.innerHTML += `<div style="padding:2px 0;"><span style="opacity:1;">&gt; ${typeName.toUpperCase()} [${rep.name}]</span> <span style="opacity:0.8;">— OLLAMA OFFLINE, default</span></div>`;
                    }
                } catch {
                    deliberateEl.innerHTML += `<div style="padding:2px 0;"><span style="opacity:1;">&gt; ${typeName.toUpperCase()} [${rep.name}]</span> <span style="opacity:0.8;">— default</span></div>`;
                }
            }

            // 3. Per-agent: pixels + identity (type) + burn score + canvas diff
            // Each fetch miss costs 100ms — cache hits are instant
            let totalWeight = 0;
            const agents = []; // { name, pixels, type, weight, canvasPixels }

            for (let i = 0; i < TARGET; i++) {
                if (signal.aborted || !body.closest('.os-window')) break;
                const a   = selected[i];
                const tid = String(a.tokenId ?? a.token_id ?? a.id ?? '');
                const statusBase = `>> FORGING PIXELS... ${i + 1}/${TARGET}`;
                statusEl.textContent = statusBase;
                setProgress(i + 1, TARGET);

                // 2a. Pixels
                let pixels = pixelsGet(tid);
                const wasCached = pixels !== null; // skip burn fetch if this agent was cached
                if (!pixels) {
                    const txt = await fetchText(
                        `${API}/normie/${tid}/pixels`,
                        null,
                        null
                    );
                    let raw = txt;
                    try { const obj = JSON.parse(txt); raw = obj?.pixels ?? obj?.data ?? txt; } catch {}
                    raw = String(raw ?? '').replace(/[^01]/g, '');
                    if (raw.length === 1600) {
                        pixels = raw;
                        pixelsSet(tid, pixels);
                    } else {
                        await delay(); // already consumed by fetchText but guard
                    }
                }
                if (!pixels?.length) continue; // skip invalid

                // 2b. Identity → type
                let identity = identityGet(tid);
                if (!identity) {
                    identity = await fetchJSON(
                        `${API}/agents/identity/${tid}`,
                        null,
                        v => identitySet(tid, v)
                    );
                }
                const type = String(identity?.type ?? identity?.agentType ?? 'unknown').toLowerCase();
                const name = identity?.name ?? a.name ?? `#${tid}`;

                // 2c. Burn score → weight (skip fetch if pixels were already cached)
                let burnCount = burnsGet(tid);
                if (burnCount === null && !wasCached) {
                    const burnData = await fetchJSON(
                        `${API}/history/burns/receiver/${tid}`,
                        null,
                        null
                    );
                    burnCount = Number(
                        burnData?.count ?? burnData?.total ??
                        (Array.isArray(burnData) ? burnData.length : 0)
                    ) || 0;
                    burnsSet(tid, burnCount);
                }
                // weight = 1 + min(burnCount, 5) * 0.2
                const weight = 1 + Math.min(Number(burnCount) || 0, 5) * 0.2;

                // 2d. Canvas diff — NormieState first, then identity
                let canvasPixels = null;
                const isCustomized =
                    (window.NormieState?.alpha?.id === tid && window.NormieState?.alpha?.canvas?.customized === true) ||
                    identity?.customized === true;

                if (isCustomized) {
                    let cvpx = canvpxGet(tid);
                    if (!cvpx) {
                        const txt = await fetchText(
                            `${API}/normie/${tid}/canvas/pixels`,
                            null,
                            null
                        );
                        let raw = txt;
                        try { const obj = JSON.parse(txt); raw = obj?.pixels ?? obj?.data ?? txt; } catch {}
                        raw = String(raw ?? '').replace(/[^01]/g, '');
                        if (raw.length === 1600) {
                            cvpx = raw;
                            canvpxSet(tid, cvpx);
                        }
                    }
                    if (cvpx?.length === 1600) canvasPixels = cvpx;
                }

                const agentData = typeBehaviorMap.get(type) ?? {};
                totalWeight += weight;

                const { brush_radius = 3, chaos_factor = 0.5 } = agentData;
                const aRng = createPRNG(hashStr(`${tid}-${i}`));

                // ── DNA SEEDING: stamp full 40×40 pixel string onto grid ──
                if (pixels?.length === CELLS) {
                    for (let idx = 0; idx < CELLS; idx++) {
                        if (pixels[idx] === '1') {
                            seedGrid[idx] += weight * (aRng() > chaos_factor * 0.45 ? 1.0 : 0.25);
                        }
                    }
                } else {
                    // Fallback: scatter uniformly across full canvas
                    const aRng2 = createPRNG(hashStr(`${tid}-${i}-fb`));
                    for (let idx = 0; idx < CELLS; idx++) {
                        if (aRng2() > 0.75) seedGrid[idx] += weight * 0.5;
                    }
                }

                // Live preview: threshold accumulator
                let _maxS = 0;
                for (let j = 0; j < CELLS; j++) if (seedGrid[j] > _maxS) _maxS = seedGrid[j];
                if (_maxS > 0) {
                    const _t = _maxS * 0.28;
                    const _p = new Int32Array(CELLS);
                    for (let j = 0; j < CELLS; j++) _p[j] = seedGrid[j] >= _t ? 1 : 0;
                    renderCanvas(_p);
                }
                await new Promise(r => setTimeout(r, 100));

                agents.push({ name, pixels, type, weight, canvasPixels, behavior: agentData });
            }

            if (!agents.length) throw new Error('no valid pixel data');

            // ══ PHASE 2: ORGANIC EVOLUTION ══════════════════════════════

            // 2a. Seed live grid from DNA accumulator
            statusEl.textContent = '>> SEEDING LIFEFORMS...';
            let maxSeed = 0;
            for (let i = 0; i < CELLS; i++) if (seedGrid[i] > maxSeed) maxSeed = seedGrid[i];
            const seedT = maxSeed * 0.28;
            for (let i = 0; i < CELLS; i++) liveGrid[i] = seedGrid[i] >= seedT ? 1 : 0;
            renderCanvas(liveGrid);
            await new Promise(r => setTimeout(r, 180));

            // Normalized seed strength 0→1 per cell (heavier agents = stronger cells)
            const nSeed = new Float32Array(CELLS);
            if (maxSeed > 0) for (let i = 0; i < CELLS; i++) nSeed[i] = seedGrid[i] / maxSeed;

            // 2b. GROWTH: 12 generations of weighted Game of Life
            // Stronger cells (high original seed weight) survive with fewer neighbors.
            // Chaotic regions die faster. Result: organic filaments emerge from dense seeds.
            statusEl.textContent = '>> GROWING...';
            for (let gen = 0; gen < 12; gen++) {
                if (signal.aborted) break;
                nextGrid.fill(0);
                for (let i = 0; i < CELLS; i++) {
                    const x = i % W, y = (i / W) | 0;
                    let n = 0;
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < W && ny >= 0 && ny < W) n += liveGrid[ny * W + nx];
                    }
                    const s = nSeed[i];
                    if (liveGrid[i]) {
                        const minN = s > 0.65 ? 1 : 2;           // strong cell: survive even alone
                        const maxN = s > 0.65 ? 6 : s > 0.35 ? 5 : 4; // weak cell: overcrowding kills
                        nextGrid[i] = (n >= minN && n <= maxN) ? 1 : 0;
                    } else {
                        // Born: standard 3-neighbor rule, or 2 neighbors if strong seed beneath
                        nextGrid[i] = (n === 3 || (n === 2 && s > 0.55)) ? 1 : 0;
                    }
                }
                [liveGrid, nextGrid] = [nextGrid, liveGrid];
                renderCanvas(liveGrid);
                await new Promise(r => setTimeout(r, 100));
            }

            // 2c. EROSION: 3 passes — strip isolated noise, sharpen filaments
            statusEl.textContent = '>> CRYSTALLIZING...';
            for (let pass = 0; pass < 3; pass++) {
                if (signal.aborted) break;
                nextGrid.fill(0);
                for (let i = 0; i < CELLS; i++) {
                    if (!liveGrid[i]) continue;
                    const x = i % W, y = (i / W) | 0;
                    let n = 0;
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < W && ny >= 0 && ny < W) n += liveGrid[ny * W + nx];
                    }
                    nextGrid[i] = n >= 2 ? 1 : 0;
                }
                [liveGrid, nextGrid] = [nextGrid, liveGrid];
                renderCanvas(liveGrid);
                await new Promise(r => setTimeout(r, 110));
            }

            const result = new Int32Array(CELLS);
            for (let i = 0; i < CELLS; i++) result[i] = liveGrid[i];

            // ══ PHASE 3: CANVAS XOR — customized agent pixels overlay ═══
            let canvasLayerCount = 0;
            for (const { canvasPixels } of agents) {
                if (!canvasPixels) continue;
                canvasLayerCount++;
                for (let i = 0; i < CELLS; i++) {
                    result[i] ^= parseInt(canvasPixels[i]);
                }
            }

            // 5. Render
            renderCanvas(result);
            const contributed = agents.length;
            counterEl.textContent = `${contributed} AGENTS CONTRIBUTED${canvasLayerCount ? ` (+${canvasLayerCount} CANVAS DIFF)` : ''}`;
            statusEl.textContent  = '>> EMERGENCE COMPLETE';
            window.NormieBus?.emit('emergence:complete', { agentCount: contributed, canvasLayerCount });
            contributorsEl.innerHTML =
                `<span style="font-weight:bold;">contributed by:</span> ${agents.map(a => a.name).join(', ')}`;

        } catch (err) {
            console.error('EMERGENCE ENGINE CRASH:', err);
            statusEl.textContent = `>> ERROR: ${err.message}`;
        }

        canvas.classList.remove('em-thinking');
        if (scanOverlay) scanOverlay.style.display = 'none';
        running = false;
        generateBtn.disabled = false;
    };

    generateBtn.addEventListener('click', generate);

    generate();

    // ── Live agent count polling ──────────────────────────────────
    let lastCount = 0;

    const pollAgentCount = async () => {
        if (!body.closest('.os-window')) { clearInterval(pollTimer); return; }
        try {
            const r = await fetch(`${API}/agents/count`);
            if (!r.ok) return;
            const data = await r.json();
            const count = Number(data?.count ?? data) || 0;
            if (count > 0 && !running) counterEl.textContent = `${count} / 1500 AGENTS AWAKENED`;
            if (count > 0 && !running) setProgress(count);
            if (count > lastCount && lastCount > 0) {
                window._notifier?.showNotif('EMERGENCE', 'New agent — ' + count + '/1500', 'emergence');
                generate();
            }
            if (count > 0) lastCount = count;
        } catch {}
    };

    const pollTimer = setInterval(pollAgentCount, 60_000);
}

window.openEmergence = openEmergence;