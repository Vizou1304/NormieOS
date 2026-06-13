async function openArenaSimulator() {
    const body = window.createNativeWindow('SIMULATOR', '<div class="native-loading">>> LOADING ARENA...</div>');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '600px'; win.style.height = '640px'; }
    body.style.cssText = 'display:flex;flex-direction:column;padding:0;overflow:hidden;height:100%;box-sizing:border-box;';

    const S        = "font-family:'Courier New',Courier,monospace;";
    const API      = window.API;
    const allMeta  = window.NormieState?.allMetadata ?? {};
    const allIds   = window.NormieState?.normieIds ?? [];
    const allAgents = window.NormieState?.agents ?? [];

    // ── Helpers ──────────────────────────────────────────────────
    const getA = (meta, key) => {
        const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
        return attrs.find(a => String(a.trait_type ?? '').toLowerCase() === key.toLowerCase())?.value ?? null;
    };
    const agentIdSet = new Set(allAgents.map(a => String(a.tokenId ?? a.id ?? '')));
    const roleLabel = n => {
        if (n.isAgent) return '[AGENT]';
        const t = String(n.type).toLowerCase();
        if (t === 'alien') return '[ALIEN]';
        if (t === 'cat')   return '[CAT]';
        if (t === 'human') return '[HUMAN]';
        return `[${String(n.type).toUpperCase().slice(0, 6)}]`;
    };
    const calcScore = (n, teamHasAgent) => {
        const t = String(n.type).toLowerCase();
        const icTier = n.pixels >= 800 ? 100 : n.pixels >= 400 ? 50 : n.pixels >= 200 ? 25 : 0;
        const prestige = n.level + (3 * n.ap) + icTier + (n.custom ? 30 : 0) + (0.1 * n.pixels);
        let base = (n.level * 10) + n.ap + Math.floor(prestige / 10);
        if (t === 'alien') base *= 0.8;
        if (t === 'human' && teamHasAgent) base *= 1.2;
        return Math.floor(base);
    };

    // ── Full roster from allMetadata ─────────────────────────────
    const metaMap = new Map(Object.entries(allMeta));
    const roster = allIds.map(id => {
        const meta   = metaMap.get(String(id)) ?? {};
        const level  = Number(getA(meta, 'Level') ?? 1);
        const ap     = Number(getA(meta, 'Action Points') ?? 0);
        const pixels = Number(getA(meta, 'Pixel Count') ?? 0);
        const type   = String(getA(meta, 'Type') ?? 'Unknown');
        const custom = String(getA(meta, 'Customized') ?? '').toLowerCase() === 'yes';
        const isAgent = agentIdSet.has(String(id));
        return { id: String(id), level, ap, pixels, type, custom, isAgent };
    });

    if (!roster.length) {
        body.innerHTML = '<div class="native-loading">>> NO NORMIES IN WALLET</div>';
        return;
    }

    // ── Enemy team (drawn once at open) ──────────────────────────
    const ePool = [...allAgents];
    for (let i = ePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ePool[i], ePool[j]] = [ePool[j], ePool[i]];
    }
    const enemyTeam = ePool.slice(0, 4).map(a => {
        const id   = String(a.tokenId ?? a.id ?? '');
        const meta = metaMap.get(id) ?? {};
        return {
            id,
            level:   Number(getA(meta, 'Level') ?? a.level ?? 1),
            ap:      Number(getA(meta, 'Action Points') ?? a.ap ?? a.actionPoints ?? 5),
            pixels:  Number(getA(meta, 'Pixel Count') ?? a.pixels ?? 0),
            type:    String(getA(meta, 'Type') ?? a.type ?? a.class ?? 'Unknown'),
            custom:  false,
            isAgent: true,
        };
    });
    const eHasAgent = true;
    let enemyBaseScore = enemyTeam.reduce((s, n) => s + calcScore(n, eHasAgent), 0);
    if (eHasAgent && enemyTeam.length) enemyBaseScore = Math.floor(enemyBaseScore * 1.15);

    // ── Team state (4 slots, start empty) ────────────────────────
    const teamSlots = [null, null, null, null];

    const computeTeamScore = () => {
        const filled    = teamSlots.filter(Boolean);
        const hasAgent  = filled.some(n => n.isAgent);
        const pCats     = filled.filter(n => n.type.toLowerCase() === 'cat').length;
        const pAliens   = filled.filter(n => n.type.toLowerCase() === 'alien').length;
        const lootMult  = 1.0 + pAliens * 0.5;
        const baseScores = teamSlots.map(n => n ? calcScore(n, hasAgent) : 0);
        let score = baseScores.reduce((s, v) => s + v, 0);
        if (hasAgent) score = Math.floor(score * 1.15);
        return { score, hasAgent, pCats, pAliens, lootMult, baseScores };
    };

    // ── Static layout ─────────────────────────────────────────────
    body.innerHTML = `
        <div style="${S}padding:8px 12px;border-bottom:2px dashed #48494b;font-size:11px;color:#48494b;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <span style="letter-spacing:2px;font-weight:bold;">[ ARENA — 4v4 ]</span>
            <span id="sim-score" style="font-size:10px;">TEAM SCORE: <strong>0</strong></span>
        </div>
        <div style="flex:1;overflow-y:auto;padding:10px 12px;${S}font-size:11px;color:#48494b;display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:10px;opacity:0.6;letter-spacing:1px;">CURRENT TEAM — click slot to remove</div>
            <div id="sim-team" style="display:flex;border:1px solid rgba(72,73,75,0.4);min-height:110px;"></div>
            <div id="sim-syn" style="display:none;font-size:10px;opacity:0.75;flex-wrap:wrap;gap:12px;padding:4px 0;border-top:1px dashed rgba(72,73,75,0.3);border-bottom:1px dashed rgba(72,73,75,0.3);"></div>
            <div style="text-align:center;">
                <button id="sim-run" style="background:#48494b;color:#e3e5e4;border:2px solid #48494b;${S}font-size:11px;padding:6px 22px;cursor:pointer;letter-spacing:1px;">[ RUN SIMULATION ]</button>
            </div>
            <div id="sim-result" style="display:none;border:1px solid #48494b;padding:10px 12px;line-height:2;font-size:11px;"></div>
            <div id="sim-log" style="display:none;padding-top:8px;border-top:1px dashed rgba(72,73,75,0.3);font-size:10px;line-height:1.9;opacity:0.85;white-space:pre-wrap;"></div>
            <div style="font-size:10px;opacity:0.6;letter-spacing:1px;border-top:2px dashed rgba(72,73,75,0.3);padding-top:8px;margin-top:2px;">AVAILABLE ROSTER — click to add</div>
            <div id="sim-roster" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
        </div>`;

    // ── Render team ───────────────────────────────────────────────
    const renderTeam = () => {
        const { score, baseScores, hasAgent, pCats, pAliens, lootMult } = computeTeamScore();
        body.querySelector('#sim-score').innerHTML = `TEAM SCORE: <strong>${score}</strong>`;

        const teamEl = body.querySelector('#sim-team');
        teamEl.innerHTML = teamSlots.map((n, i) => {
            const border = i < 3 ? 'border-right:1px dashed rgba(72,73,75,0.3);' : '';
            if (!n) return `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:1;padding:8px 4px;${border}opacity:0.3;min-height:110px;">
                    <div style="width:40px;height:40px;border:2px dashed #48494b;"></div>
                    <div style="font-size:9px;letter-spacing:1px;">[ EMPTY ]</div>
                </div>`;
            return `
                <div data-slot="${i}" style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;padding:8px 4px;${border}cursor:pointer;" title="Click to remove">
                    <img src="${API}/normie/${n.id}/image.svg" style="width:40px;height:40px;image-rendering:pixelated;border:1px solid #48494b;">
                    <div style="font-size:9px;font-weight:bold;">#${n.id}</div>
                    <div style="font-size:9px;">${roleLabel(n)}</div>
                    <div style="font-size:9px;opacity:0.75;">LVL ${n.level} | AP ${n.ap}</div>
                    <div style="font-size:10px;font-weight:bold;margin-top:2px;">▸ ${baseScores[i]}</div>
                </div>`;
        }).join('');

        teamEl.querySelectorAll('[data-slot]').forEach(el => {
            el.addEventListener('click', () => {
                teamSlots[parseInt(el.dataset.slot)] = null;
                renderTeam();
                renderRoster();
            });
        });

        const synLines = [];
        if (hasAgent) synLines.push('AGENT COMMAND +15%');
        if (hasAgent && teamSlots.some(n => n?.type.toLowerCase() === 'human')) synLines.push('HUMAN BUFF +20%');
        if (pAliens) synLines.push(`ALIEN LOOT x${lootMult.toFixed(1)}`);
        if (pCats)   synLines.push(`CAT DEFENSE -${pCats * 15}% ENEMY`);
        const synEl = body.querySelector('#sim-syn');
        synEl.style.display = synLines.length ? 'flex' : 'none';
        synEl.innerHTML = synLines.map(l => `<span>◆ ${l}</span>`).join('');
    };

    // ── Render roster ─────────────────────────────────────────────
    const renderRoster = () => {
        const inTeam = new Set(teamSlots.filter(Boolean).map(n => n.id));
        const teamFull = teamSlots.every(Boolean);
        const rosterEl = body.querySelector('#sim-roster');
        rosterEl.innerHTML = '';
        const frag = document.createDocumentFragment();
        roster.forEach(n => {
            const sel = inTeam.has(n.id);
            const wrap = document.createElement('div');
            wrap.dataset.rid = n.id;
            wrap.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:3px;width:54px;cursor:${sel || teamFull ? 'default' : 'pointer'};opacity:${sel ? '0.25' : '1'};`;
            wrap.title = sel ? 'IN TEAM' : roleLabel(n) + ' #' + n.id;
            wrap.innerHTML = `
                <img src="${API}/normie/${n.id}/image.svg" loading="lazy" style="width:40px;height:40px;image-rendering:pixelated;border:1px solid ${sel ? 'rgba(72,73,75,0.3)' : '#48494b'};">
                <div style="font-size:8px;text-align:center;">#${n.id}</div>
                <div style="font-size:8px;opacity:0.75;">${roleLabel(n)}</div>`;
            frag.appendChild(wrap);
        });
        rosterEl.appendChild(frag);

        rosterEl.querySelectorAll('[data-rid]').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.rid;
                if (inTeam.has(id) || teamSlots.every(Boolean)) return;
                teamSlots[teamSlots.indexOf(null)] = roster.find(n => n.id === id);
                renderTeam();
                renderRoster();
            });
        });
    };

    renderTeam();
    renderRoster();

    // ── Run simulation ────────────────────────────────────────────
    body.querySelector('#sim-run').addEventListener('click', async () => {
        const filledSlots = teamSlots.filter(Boolean);
        if (!filledSlots.length) return;

        const btn = body.querySelector('#sim-run');
        btn.disabled = true;
        btn.textContent = '[ SIMULATING... ]';

        const { score: finalTeamScore, pCats, pAliens, lootMult } = computeTeamScore();
        const variance   = 0.9 + Math.random() * 0.2;
        const finalEnemy = Math.floor(Math.floor(enemyBaseScore * variance) * Math.pow(0.85, pCats));
        const victory    = finalTeamScore > finalEnemy;
        const gained     = victory ? Math.max(10, Math.floor((finalTeamScore - finalEnemy) * lootMult)) : 0;

        const result = body.querySelector('#sim-result');
        result.style.display = 'block';
        result.innerHTML = `
            <div style="font-size:13px;font-weight:bold;letter-spacing:2px;margin-bottom:6px;">${victory ? '▶ VICTORY' : '▶ DEFEAT'}</div>
            <div>TEAM SCORE    : ${finalTeamScore}</div>
            <div>ENEMY SCORE   : ${finalEnemy}</div>
            <div>PIXELS GAINED : ${victory ? '+' + gained : '0'}${victory && pAliens ? ` (LOOT x${lootMult.toFixed(1)})` : ''}</div>
            <div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(72,73,75,0.3);font-size:10px;opacity:0.8;">VS ENEMY TEAM: ${enemyTeam.map(n => `#${n.id} ${roleLabel(n)}`).join(' — ')}</div>`;

        btn.disabled = false;
        btn.textContent = '[ RUN AGAIN ]';

        // ── Ollama battle log ─────────────────────────────────────
        const model        = window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b';
        const playerClasses = filledSlots.map(n => `#${n.id} ${roleLabel(n)}`).join(', ');
        const enemyClasses  = enemyTeam.map(n => `#${n.id} ${roleLabel(n)}`).join(', ');
        const prompt = `Write a 3-line battle log auto-battler style. Player team (${playerClasses}) vs Enemy team (${enemyClasses}). Player ${victory ? 'WON' : 'LOST'}. Mention specific class interactions. No markdown, no emojis, uppercase style.`;

        const log = body.querySelector('#sim-log');
        log.style.display = 'block';
        log.textContent = '>> GENERATING BATTLE LOG...';
        const _simCtrl = new AbortController();
        win?.querySelector('.window-close')?.addEventListener('click', () => _simCtrl.abort(), { once: true });
        try {
            const res = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: true }),
                signal: _simCtrl.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            log.textContent = '';
            const reader = res.body.getReader(), decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                for (const line of decoder.decode(value, { stream: true }).split('\n')) {
                    if (!line.trim()) continue;
                    try { const o = JSON.parse(line); if (o.response) log.textContent += o.response; } catch {}
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'TimeoutError')
                log.textContent = `>> BATTLE LOG UNAVAILABLE`;
        }
    });
}

window.openArenaSimulator = openArenaSimulator;
