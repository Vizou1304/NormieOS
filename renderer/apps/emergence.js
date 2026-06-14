async function openEmergence() {
    const API  = window.API;
    const body = window.createNativeWindow('PIXEL RITUAL', '<div class="native-loading">>> INITIALIZING EMERGENCE...</div>');
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
            <div style="font-weight:bold;letter-spacing:2px;font-size:12px;">PIXEL RITUAL</div>
            <div style="font-size:var(--font-size-log);opacity:0.7;letter-spacing:1.5px;margin-bottom:8px;">>> 1500 AGENTS ENTWINED — ONE CANVAS BORN</div>
        </div>
        <div style="padding:8px 14px;border-bottom:1px solid #48494b;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span id="em-counter" style="font-size:var(--font-size-title);font-weight:bold;letter-spacing:1px;">0 AGENTS CONTRIBUTED</span>
                <button id="em-generate" disabled style="border:2px solid #48494b;padding:4px 10px;font-family:'Courier New',monospace;font-size:10px;background:#48494b;color:#e3e5e4;cursor:pointer;letter-spacing:1px;">[ AWAKENING HIVE... ]</button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:6px;background:#e3e5e4;border:1px solid #48494b;overflow:hidden;">
                    <div id="em-progress-bar" style="height:100%;width:0%;background:#48494b;transition:width 0.8s;"></div>
                </div>
                <span id="em-progress-label" style="font-size:10px;letter-spacing:1px;opacity:0.7;white-space:nowrap;">0 / 1500</span>
            </div>
        </div>
        <div style="flex:1;overflow-y:hidden;position:relative;display:flex;flex-direction:column;align-items:center;padding:12px 0 8px;">
            <div id="em-status" style="font-size:var(--font-size-log);letter-spacing:1px;line-height:1.6;padding:2px 0;margin-bottom:6px;min-height:16px;">
                >> FORGING PIXELS... 0/50
            </div>
            <div style="position:relative;display:inline-block;flex-shrink:0;">
                <canvas id="em-canvas" width="400" height="400"
                    style="border:2px solid #48494b;image-rendering:pixelated;display:block;"></canvas>
                <div id="em-scan-overlay" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(72,73,75,0.12) 2px,rgba(72,73,75,0.12) 4px);pointer-events:none;z-index:2;"></div>
            </div>
            <div style="margin-top:7px;font-size:10px;opacity:0.65;letter-spacing:0.5px;text-align:center;">
                HUMAN — center &nbsp;|&nbsp; CAT — top &nbsp;|&nbsp; ALIEN — edges &nbsp;|&nbsp; AGENT — core
            </div>
            <div id="em-contributors" style="position:absolute;bottom:10px;width:90%;left:5%;font-size:10px;opacity:0.7;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.6;"></div>
        </div>
        <div style="display:flex;gap:6px;padding:8px 14px;border-top:1px solid #48494b;flex-shrink:0;background:#e3e5e4;">
            <button id="em-save" style="flex:1;border:2px solid #48494b;padding:5px 0;font-family:'Courier New',monospace;font-size:10px;background:transparent;color:#48494b;cursor:pointer;letter-spacing:1px;transition:none;">[ SAVE EMERGENCE ]</button>
            <button id="em-push" style="flex:1;border:2px solid #48494b;padding:5px 0;font-family:'Courier New',monospace;font-size:10px;background:transparent;color:#48494b;cursor:pointer;letter-spacing:1px;transition:none;">[ PUSH TO CANVAS ]</button>
        </div>`;

    const counterEl      = body.querySelector('#em-counter');
    const progressBar    = body.querySelector('#em-progress-bar');
    const progressLabel  = body.querySelector('#em-progress-label');
    const statusEl       = body.querySelector('#em-status');

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

    // ── Pre-fetch agent pool on window open — unlocks GENERATE when ready ──
    (async () => {
        let allRaw = window.NormieCache.get('agents_pool');
        if (!allRaw || allRaw.length < 200) {
            allRaw = [];
            let cursor = null;
            for (let page = 0; page < 5 && allRaw.length < 500; page++) {
                if (!body.closest('.os-window')) return;
                const url = cursor
                    ? `${API}/agents/list?sort=newest&limit=100&cursor=${encodeURIComponent(cursor)}`
                    : `${API}/agents/list?sort=newest&limit=100`;
                const r = await fetch(url).catch(() => null);
                if (!r?.ok) break;
                const d = await r.json().catch(() => null);
                if (!d) break;
                const items = Array.isArray(d) ? d : (d.agents ?? d.items ?? d.data ?? d.tokens ?? []);
                allRaw.push(...items);
                cursor = d.cursor ?? d.nextCursor ?? d.next ?? null;
                if (!cursor || items.length < 100) break;
            }
            if (allRaw.length) window.NormieCache.set('agents_pool', allRaw, window.TTL.PERSONA);
        }
        if (!body.closest('.os-window')) return;
        if (allRaw.length) {
            generateBtn.disabled = false;
            generateBtn.textContent = '[ GENERATE NEW ]';
        } else {
            statusEl.textContent = '>> HIVE UNREACHABLE — RETRY LATER';
        }
    })();

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

    // ── Lore glyph matrices — [dx,dy] offsets from anchor [0,0] ────
    const GLYPH_MATRICES = {
        human: [ // Fractal Pulse 5x5
            [-1,-2],[1,-2],
            [-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
            [-1,0],[0,0],[1,0],
            [-2,1],[-1,1],[0,1],[1,1],[2,1],
            [-1,2],[1,2],
        ],
        cat: [ // Multi-Layered Shield 4x4
            [-1,-1],[0,-1],[1,-1],[2,-1],
            [-1,0],[2,0],
            [-1,1],[1,1],[2,1],
            [-1,2],[0,2],[1,2],[2,2],
        ],
        alien: [ // Quantum Entanglement 5x5
            [-2,-2],[2,-2],
            [-1,-1],[1,-1],
            [0,0],
            [-1,1],[1,1],
            [-2,2],[2,2],
        ],
        agent: [ // Prismatic Nexus 5x5
            [0,-2],
            [-1,-1],[1,-1],
            [-2,0],[2,0],
            [-1,1],[1,1],
            [0,2],
        ],
    };

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
    let _lastResult       = null;
    let _lastAgents       = [];
    let _lastTotalWeight  = 0;

    let running = false;
    let abortCtrl = null;

    const generate = async () => {
        const sessionSalt = Date.now();
        // Engine state: DNA accumulator + GoL double buffer
        const W        = 40;
        const CELLS    = W * W;
        const seedGrid = new Float32Array(CELLS);   // weighted agent DNA
        const burnGrid = new Float32Array(CELLS);   // burn resonance per cell
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
        contributorsEl.textContent = '';

        try {
            const displayGrid = new Uint8Array(CELLS); // tracks canvas state; reset on each generate()
            // 1. Agents pool — pre-fetched on window open, retrieved from cache synchronously
            const allRaw = window.NormieCache.get('agents_pool');
            if (!allRaw?.length) throw new Error('no agents found');

            // Weighted-random sampling seeded by sessionSalt
            // pick-probability ∝ 1/(tokenId+1) — OG agents favoured, different subset each run
            const _sampleRng = createPRNG(hashStr('sample-' + sessionSalt));
            const _pool = allRaw.map(a => ({
                agent: a,
                w: 1 / (Number(a.tokenId ?? a.token_id ?? a.id ?? 1000) + 1)
            }));
            const selected = [];
            const _remaining = [..._pool];
            while (selected.length < Math.min(80, _remaining.length)) {
                const _tw = _remaining.reduce((s, p) => s + p.w, 0);
                let _r = _sampleRng() * _tw;
                let _idx = _remaining.length - 1;
                for (let _k = 0; _k < _remaining.length; _k++) {
                    _r -= _remaining[_k].w;
                    if (_r <= 0) { _idx = _k; break; }
                }
                selected.push(_remaining[_idx].agent);
                _remaining.splice(_idx, 1);
            }
            const TARGET = selected.length;

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
                            model: window.NormieState?.ollama?.model ?? window.OLLAMA_MODEL ?? 'mistral:7b',
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
                        const brush_radius = Number(parsed?.brush_radius) || 3;
                        const chaos_factor = Number(parsed?.chaos_factor) || 0.5;
                        typeBehaviorMap.set(typeName, { brush_radius, chaos_factor });
                    }
                } catch {}
            }

            // ══ CONSENSUS ACCUMULATION ENGINE ═══════════════════════════

            // ── Consensus accumulation ──────────────────────────────────
            const accGrid        = new Float32Array(CELLS);
            const glyphData      = []; // { cx, cy, cells[] } per agent, for placement count + constellation
            const jitterRng = createPRNG(hashStr('jitter-' + sessionSalt));
            let totalWeight = 0;
            const agents    = [];

            statusEl.textContent = `>> USING ${TARGET} AWAKENED AGENTS`;

            for (let i = 0; i < TARGET; i++) {
                if (signal.aborted || !body.closest('.os-window')) break;
                const a   = selected[i];
                const tid = String(a.tokenId ?? a.token_id ?? a.id ?? '');
                statusEl.textContent = `>> INSCRIBING GLYPH... ${i + 1}/${TARGET}`;
                setProgress(i + 1, TARGET);

                let identity = identityGet(tid);
                if (!identity) identity = await fetchJSON(`${API}/agents/identity/${tid}`, null, v => identitySet(tid, v));
                const type = String(identity?.type ?? identity?.agentType ?? 'unknown').toLowerCase();
                const name = identity?.name ?? a.name ?? `#${tid}`;

                let burnCount = burnsGet(tid);
                if (burnCount === null) {
                    const burnData = await fetchJSON(`${API}/history/burns/receiver/${tid}`, null, null);
                    burnCount = Number(burnData?.count ?? burnData?.total ?? (Array.isArray(burnData) ? burnData.length : 0)) || 0;
                    burnsSet(tid, burnCount);
                }
                const burnRaw   = Math.min(Number(burnCount) || 0, 5);
                const burnBonus = burnRaw > 0 ? Math.pow(1.25, burnRaw) - 1 : 0;
                const isCustomized = (window.NormieState?.alpha?.id === tid && window.NormieState?.alpha?.canvas?.customized === true) || identity?.customized === true;

                let prestige = 0;
                const cachedMeta = window.NormieState?.allMetadata?.[String(tid)];
                if (cachedMeta?.attributes) {
                    prestige = calcPrestige(cachedMeta.attributes);
                }

                const jitter = 0.85 + jitterRng() * 0.3;
                const weight = (1 + burnBonus + (prestige / 200) + (isCustomized ? 0.5 : 0)) * jitter;
                totalWeight += weight;

                // ── ON-CHAIN GLYPH STAMP — pure lore binary matrices ─────
                // Two independent Knuth hashes — decorrelated so cx and cy spread uniformly
                const _h = hashStr(tid + '-' + sessionSalt);
                const cx = ((_h * 2654435761) >>> 0) % 40;
                const cy = ((_h * 2246822519) >>> 0) % 40;
                const agentPrng = createPRNG(hashStr(tid + '-' + sessionSalt));
                const cells     = []; // cell indices stamped for this agent's glyph

                let matrix, behaviorType;
                if (type.includes('human'))      { matrix = GLYPH_MATRICES.human; behaviorType = 'human'; }
                else if (type.includes('cat'))   { matrix = GLYPH_MATRICES.cat;   behaviorType = 'cat';   }
                else if (type.includes('alien')) { matrix = GLYPH_MATRICES.alien; behaviorType = 'alien'; }
                else                              { matrix = GLYPH_MATRICES.agent; behaviorType = 'agent'; }

                // Chaos erosion: higher chaos_factor → more pixels skipped, battle-worn glyph
                const chaos_factor  = typeBehaviorMap.get(behaviorType)?.chaos_factor ?? 0.3;
                const erosionChance = chaos_factor * 0.4;

                for (const [dx, dy] of matrix) {
                    if (agentPrng() < erosionChance) continue; // eroded into nothing
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || nx >= W || ny < 0 || ny >= W) continue;
                    accGrid[ny * W + nx] += weight; // full weight, no falloff
                    cells.push(ny * W + nx);
                }

                glyphData.push({ cx, cy, cells });
                agents.push({ name, type, weight });
                counterEl.textContent = `${agents.length} GLYPHS INSCRIBED`;

                // Progressive heat preview every 10 agents
                if (agents.length % 10 === 0 || i === TARGET - 1) {
                    let maxA = 0;
                    for (let j = 0; j < CELLS; j++) if (accGrid[j] > maxA) maxA = accGrid[j];
                    if (maxA > 0) {
                        for (let j = 0; j < CELLS; j++) {
                            const on = accGrid[j] / maxA >= 0.5;
                            ctx.fillStyle = on ? '#48494b' : '#e3e5e4';
                            ctx.fillRect((j % W) * 10, ((j / W) | 0) * 10, 10, 10);
                            displayGrid[j] = on ? 1 : 0;
                        }
                    }
                    await new Promise(r => setTimeout(r, 60));
                }
            }

            if (!agents.length) throw new Error('no valid pixel data');

            // ── BASELINE SUBTRACTION — surface group-distinctive pixels ─
            // freq[i] = fraction of total weight active at this pixel
            for (let i = 0; i < CELLS; i++) {
                if (!accGrid[i]) continue;
                const freq = accGrid[i] / totalWeight;
                if (freq > 0.85)        accGrid[i] *= 0.35; // dampen universal silhouette
                else if (freq >= 0.25)  accGrid[i] *= 1.4;  // boost group-distinctive pixels
                // freq < 0.25: leave unchanged (low-frequency, let threshold decide)
            }

            // ── NORMALIZE + THRESHOLD ───────────────────────────────────
            statusEl.textContent = '>> CRYSTALLIZING...';
            let maxAcc = 0;
            for (let i = 0; i < CELLS; i++) if (accGrid[i] > maxAcc) maxAcc = accGrid[i];

            // Build thresholded + majority-filtered grid for a given threshold ratio
            const buildResult = mult => {
                const t = maxAcc * mult;
                const r = new Int32Array(CELLS);
                for (let i = 0; i < CELLS; i++) r[i] = accGrid[i] >= t ? 1 : 0;
                // SINGLE MAJORITY FILTER (lone-pixel noise removal)
                for (let i = 0; i < CELLS; i++) {
                    if (!r[i]) continue;
                    const x = i % W, y = (i / W) | 0;
                    let n = 0;
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < W && ny >= 0 && ny < W) n += r[ny * W + nx];
                    }
                    if (n < 2) r[i] = 0;
                }
                return r;
            };

            // Lower the threshold ratio until enough individual glyphs survive (target ~50-65)
            let result      = buildResult(0.35);
            let placedGlyphs = glyphData.filter(g => g.cells.some(c => result[c]));
            for (let mult = 0.32; placedGlyphs.length < 50 && mult > 0.05; mult -= 0.03) {
                result      = buildResult(mult);
                placedGlyphs = glyphData.filter(g => g.cells.some(c => result[c]));
            }
            console.log(`[PIXEL RITUAL] placed glyphs: ${placedGlyphs.length} / ${agents.length} agents`);

            let canvasLayerCount = 0; // kept for export string compat

            // 5. Render + store for export
            renderCanvas(result);

            // ── CONSTELLATION MESH — connect nearby glyph centers ───────
            ctx.lineWidth = 1;
            const MESH_DIST = 12;
            for (let i = 0; i < placedGlyphs.length; i++) {
                for (let j = i + 1; j < placedGlyphs.length; j++) {
                    const dx = placedGlyphs[i].cx - placedGlyphs[j].cx;
                    const dy = placedGlyphs[i].cy - placedGlyphs[j].cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist >= MESH_DIST) continue;
                    const opacity = 0.15 * (1 - dist / MESH_DIST);
                    ctx.strokeStyle = `rgba(72,73,75,${opacity.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(placedGlyphs[i].cx * 10 + 5, placedGlyphs[i].cy * 10 + 5);
                    ctx.lineTo(placedGlyphs[j].cx * 10 + 5, placedGlyphs[j].cy * 10 + 5);
                    ctx.stroke();
                }
            }

            _lastResult      = result;
            _lastAgents      = [...agents];
            _lastTotalWeight = Math.round(totalWeight * 100) / 100;
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

    // ── Export button hover inversions ────────────────────────
    [body.querySelector('#em-save'), body.querySelector('#em-push')].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('mouseenter', () => { btn.style.background = '#48494b'; btn.style.color = '#e3e5e4'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = '#48494b'; });
    });

    // ── [ SAVE EMERGENCE ] ────────────────────────────────────
    body.querySelector('#em-save')?.addEventListener('click', () => {
        if (!_lastResult) { statusEl.textContent = '>> GENERATE FIRST'; return; }
        const meta = {
            name: 'PIXEL RITUAL #001',
            generation: _lastAgents.length,
            algorithm: 'DNA-Seed + GoL-Evolution + Erosion + Veil(0.05)',
            totalWeight: _lastTotalWeight,
            contributors: _lastAgents.map(a => a.name)
        };
        const jsonBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
        const jsonUrl  = URL.createObjectURL(jsonBlob);
        const jsonA    = document.createElement('a');
        jsonA.href = jsonUrl; jsonA.download = 'pixel-ritual-metadata.json'; jsonA.click();
        URL.revokeObjectURL(jsonUrl);

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 400; exportCanvas.height = 400;
        const ectx = exportCanvas.getContext('2d');
        ectx.imageSmoothingEnabled = false;
        for (let i = 0; i < 1600; i++) {
            ectx.fillStyle = _lastResult[i] ? '#48494b' : '#e3e5e4';
            ectx.fillRect((i % 40) * 10, ((i / 40) | 0) * 10, 10, 10);
        }
        exportCanvas.toBlob(blob => {
            const pngUrl = URL.createObjectURL(blob);
            const pngA   = document.createElement('a');
            pngA.href = pngUrl; pngA.download = 'pixel-ritual.png'; pngA.click();
            URL.revokeObjectURL(pngUrl);
        });
    });

    // ── [ PUSH TO CANVAS ] ────────────────────────────────────
    body.querySelector('#em-push')?.addEventListener('click', () => {
        window._notifier?.showNotif('PIXEL RITUAL', '[ PUSH TO CANVAS ] — ERC-8257 pending', 'emergence');
    });

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
            }
            if (count > 0) lastCount = count;
        } catch {}
    };

    const pollTimer = setInterval(pollAgentCount, 60_000);
}

window.openEmergence = openEmergence;