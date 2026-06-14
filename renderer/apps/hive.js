async function openHive() {
    const body = window.createNativeWindow('HIVE', '<div class="native-loading">>> LINKING AGENTS...</div>');
    if (body._hiveReady) return;
    body._hiveReady = true;
    const win = body.closest('.os-window');
    if (win) { win.style.width = '760px'; win.style.height = '600px'; }

    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.padding = '0';
    body.style.height = '100%';

    const API    = window.API;
    const OLLAMA = window.OLLAMA;
    const SYSTEM_SUFFIX = '\n\nIMPORTANT: Keep ALL responses under 3 sentences. Be direct and in character. No long introductions.';

    // ── A2A Protocol: try live endpoint, generate synthetic manifest on 404 ──
    const tryA2A = async (tid) => {
        try {
            const r = await fetch(`${API}/agents/a2a/${tid}`, { signal: AbortSignal.timeout(4000) });
            if (r.ok) return { ...(await r.json()), source: 'live' };
        } catch {}
        // Generate synthetic A2A manifest from on-chain traits
        const meta  = await fetch(`${API}/normie/${tid}/metadata`).then(r => r.ok ? r.json() : null).catch(() => null);
        const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
        const getA  = k => attrs.find(a => String(a.trait_type).toLowerCase() === k.toLowerCase())?.value ?? null;
        const ap    = Number(getA('Action Points')) || 0;
        return {
            schemaVersion: '0.1',
            source:        'synthetic',
            tokenId:       String(tid),
            name:          meta?.name ?? `Normie #${tid}`,
            description:   `${getA('Type') ?? 'Unknown'} agent. Level ${getA('Level') ?? '?'}. Mood: ${getA('Mood') ?? '?'}.`,
            url:           `${API}/agents/a2a/${tid}`,
            capabilities:  { streaming: false, chat: true, pixelCanvas: ap > 0, a2aReady: false },
            defaultInputModes:  ['text/plain'],
            defaultOutputModes: ['text/plain'],
            traits: {
                type:       getA('Type'),
                level:      Number(getA('Level')) || 0,
                ap,
                mood:       getA('Mood'),
                pixelCount: Number(getA('Pixel Count')) || 0,
                customized: getA('Customized') === 'Yes',
            },
            binding: {
                contract: '0x9Eb6E2025B64f340691e424b7fe7022fFDE12438',
                tokenId:  String(tid),
                standard: 'ERC-8217',
                note:     'NFT transfer = agent ownership transfer',
            },
        };
    };

    // ── Fetch all agents + 3 conversation agents ──────────────────
    let agents = [];
    let allRaw = [];
    try {
        allRaw = window.NormieState?.agents ?? window.NormieCache.get('agents');
        if (!allRaw) {
            const r = await fetch(`${API}/agents/list?sort=newest&limit=100`).catch(() => null);
            if (!r || !r.ok) throw new Error('agents/list unreachable');
            const d = await r.json();
            allRaw = Array.isArray(d) ? d : (d.agents ?? d.items ?? d.data ?? d.tokens ?? []);
            window.NormieCache.set('agents', allRaw, window.TTL.PERSONA);
            if (window.NormieState) window.NormieState.agents = allRaw;
        }
        const shuffled = [...allRaw].sort(() => Math.random() - 0.5).slice(0, 3);
        agents = await Promise.all(shuffled.map(async a => {
            const tid = a.tokenId ?? a.token_id ?? a.id ?? a;
            try {
                const info = await (await fetch(`${API}/agents/info/${tid}`)).json();
                return { tid, name: info.name ?? `#${tid}`, type: info.type ?? '?', systemPrompt: info.systemPrompt ?? info.brain ?? `You are Normie #${tid}, a sovereign on-chain agent.` };
            } catch { return { tid, name: `#${tid}`, type: '?', systemPrompt: `You are Normie #${tid}, a sovereign on-chain agent.` }; }
        }));
    } catch (err) {
        body.innerHTML = `<div class="native-loading">>> ERROR: ${err.message}</div>`;
        return;
    }

    // ── Build dot data from all agents ────────────────────────────
    const allDots = (allRaw ?? []).map(a => {
        const tid  = String(a.tokenId ?? a.token_id ?? a.id ?? '');
        const type = String(a.type ?? a.agentType ?? 'unknown').toLowerCase();
        const lvl  = Number(a.level ?? a.lvl ?? 0);
        return { tid, name: a.name ?? `#${tid}`, type, lvl };
    }).filter(d => d.tid);

    let realAgentCount = allDots.length;
    try {
        const cr = await fetch(`${API}/agents/count`);
        if (cr.ok) { const cd = await cr.json(); realAgentCount = cd.count ?? cd.total ?? allDots.length; }
    } catch {}

    // ── Layout: tab bar + AGENTS panel + NETWORK panel ────────────
    const TAB_BTN = 'border:none;padding:6px 14px;font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;';

    body.innerHTML = `
        <div style="display:flex;flex-direction:column;flex:1;overflow:hidden;font-family:'Courier New',monospace;font-size:11px;color:#48494b;">
            <div style="display:flex;flex-shrink:0;border-bottom:2px solid #48494b;background:#e3e5e4;">
                <button id="tab-agents"  style="${TAB_BTN}background:#48494b;color:#e3e5e4;">[ AGENTS ]</button>
                <button id="tab-network" style="${TAB_BTN}background:#e3e5e4;color:#48494b;">[ NETWORK ]</button>
                <button id="tab-chat"    style="${TAB_BTN}background:#e3e5e4;color:#48494b;">[ CHAT ]</button>
            </div>

            <div id="hive-agents-panel" style="display:flex;flex:1;overflow:hidden;">
                <div id="hive-sidebar" style="width:160px;flex-shrink:0;border-right:2px solid #48494b;display:flex;flex-direction:column;background:#e3e5e4;">
                    <div style="padding:6px 8px;font-weight:bold;border-bottom:2px solid #48494b;font-size:10px;letter-spacing:1px;flex-shrink:0;">AGENTS</div>
                    <div id="hive-cards" style="flex:1;overflow-y:auto;"></div>
                    <div style="border-top:2px solid #48494b;padding:6px 8px;font-size:10px;flex-shrink:0;">
                        <div style="font-weight:bold;letter-spacing:1px;margin-bottom:4px;">LORE</div>
                        <div id="lore-step-weaver" style="padding:2px 0;opacity:0.6;">▸ STORY WEAVER</div>
                        <div id="lore-step-analyst" style="padding:2px 0;opacity:0.6;">▸ ANALYST</div>
                        <div id="lore-step-narrator" style="padding:2px 0;opacity:0.6;">▸ NARRATOR</div>
                    </div>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                    <div id="hive-theater" style="display:none;border-bottom:1px solid #48494b;padding:16px;background:#e3e5e4;font-family:'Courier New',monospace;font-size:15px;min-height:72px;overflow:hidden;"></div>
                    <div id="hive-log" style="flex:1;overflow-y:auto;padding:10px;line-height:1.7;white-space:pre-wrap;background:#e3e5e4;"></div>
                    <div style="display:flex;gap:6px;padding:8px;border-top:2px solid #48494b;background:#e3e5e4;flex-shrink:0;">
                        <input id="hive-input" type="text" placeholder="Enter a topic or question..." autocomplete="off"
                            style="flex:1;border:2px solid #48494b;padding:5px 8px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;outline:none;">
                        <button id="hive-send"     style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#48494b;color:#e3e5e4;cursor:pointer;white-space:nowrap;">[ CHAIN ]</button>
                        <button id="hive-query"    style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;cursor:pointer;white-space:nowrap;">[ QUERY ALL ]</button>
                        <button id="hive-lore"     style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;cursor:pointer;white-space:nowrap;">[ LORE ]</button>
                        <button id="hive-reshuffle" style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;cursor:pointer;white-space:nowrap;">[ NEW AGENTS ]</button>
                    </div>
                </div>
            </div>

            <div id="hive-network-panel" style="display:none;flex-direction:column;flex:1;overflow:hidden;position:relative;background:#e3e5e4;">
                <div id="hive-net-counter" style="padding:5px 10px;font-size:10px;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #48494b;flex-shrink:0;background:#e3e5e4;">[ ${realAgentCount} AGENTS IN THE HIVE ]</div>
                <canvas id="hive-canvas" style="flex:1;display:block;cursor:crosshair;min-height:0;width:100%;"></canvas>
            </div>

            <div id="hive-chat-panel" style="display:none;flex-direction:column;flex:1;overflow:hidden;background:#e3e5e4;">
                <div id="chat-agent-bar" style="padding:5px 10px;font-size:10px;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #48494b;flex-shrink:0;background:#e3e5e4;"></div>
                <div id="hive-chat-log" style="flex:1;overflow-y:auto;padding:10px;line-height:1.7;white-space:pre-wrap;background:#e3e5e4;font-family:'Courier New',monospace;font-size:11px;color:#48494b;"></div>
                <div style="display:flex;gap:6px;padding:8px;border-top:2px solid #48494b;background:#e3e5e4;flex-shrink:0;">
                    <input id="chat-input" type="text" placeholder="Message the active agent..." autocomplete="off"
                        style="flex:1;border:2px solid #48494b;padding:5px 8px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;outline:none;">
                    <button id="chat-send" style="border:2px solid #48494b;padding:5px 10px;font-family:'Courier New',monospace;font-size:11px;background:#48494b;color:#e3e5e4;cursor:pointer;white-space:nowrap;">[ SEND ]</button>
                </div>
            </div>
        </div>`;

    const tabAgentsBtn  = body.querySelector('#tab-agents');
    const tabNetworkBtn = body.querySelector('#tab-network');
    const tabChatBtn    = body.querySelector('#tab-chat');
    const agentsPanel   = body.querySelector('#hive-agents-panel');
    const networkPanel  = body.querySelector('#hive-network-panel');
    const chatPanel     = body.querySelector('#hive-chat-panel');
    const canvas        = body.querySelector('#hive-canvas');
    const log           = body.querySelector('#hive-log');
    const input         = body.querySelector('#hive-input');
    const send          = body.querySelector('#hive-send');
    const queryBtn      = body.querySelector('#hive-query');
    const reshuf        = body.querySelector('#hive-reshuffle');

    // ── Active chat agent ─────────────────────────────────────────
    let activeAgent = agents[0] ?? null;
    const updateAgentBar = () => {
        const bar = body.querySelector('#chat-agent-bar');
        if (!bar) return;
        bar.textContent = activeAgent
            ? `ACTIVE: ${activeAgent.name}  #${activeAgent.tid}  [${activeAgent.type}]`
            : 'ACTIVE: none — click an agent card to select';
    };

    // ── Agent cards (AGENTS tab sidebar) ─────────────────────────
    const buildAgentCards = () => {
        const cards = body.querySelector('#hive-cards');
        if (!cards) return;
        cards.innerHTML = agents.map(a => `
            <div data-tid="${a.tid}" style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px dashed #48494b;cursor:pointer;">
                <img src="${API}/agents/image/${a.tid}" onerror="this.src='${API}/normie/${a.tid}/image.svg'"
                     style="width:48px;height:48px;image-rendering:pixelated;border:1px solid #48494b;flex-shrink:0;">
                <div style="font-size:10px;line-height:1.5;overflow:hidden;flex:1;min-width:0;">
                    <div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHTML(a.name)}</div>
                    <div style="opacity:0.65;">#${a.tid}</div>
                    <div>● AWAKENED</div>
                </div>
                <button class="a2a-btn" data-tid="${a.tid}" title="View A2A manifest"
                    style="border:1px solid #48494b;background:transparent;color:#48494b;font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;padding:2px 5px;cursor:pointer;flex-shrink:0;">A2A</button>
            </div>`).join('');
        cards.querySelectorAll('[data-tid]').forEach(el => {
            if (String(activeAgent?.tid) === el.dataset.tid) { el.style.background = '#48494b'; el.style.color = '#e3e5e4'; }
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('a2a-btn')) return; // handled below
                activeAgent = agents.find(a => String(a.tid) === el.dataset.tid) ?? activeAgent;
                cards.querySelectorAll('[data-tid]').forEach(c => { c.style.background = ''; c.style.color = ''; });
                el.style.background = '#48494b'; el.style.color = '#e3e5e4';
                updateAgentBar();
            });
        });
        // ── A2A manifest viewer ───────────────────────────────────────
        cards.querySelectorAll('.a2a-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const tid = btn.dataset.tid;
                const tabAgents = body.querySelector('#tab-agents');
                // Switch to AGENTS tab and show in log
                body.querySelector('#tab-chat')?.click();
                const logEl = body.querySelector('#hive-log');
                if (logEl) logEl.innerHTML = '<div style="opacity:0.65;font-size:10px;">>> FETCHING A2A MANIFEST...</div>';
                const manifest = await tryA2A(tid);
                const src = manifest.source === 'live' ? '[ LIVE ]' : '[ SYNTHETIC — /a2a endpoint pending ]';
                if (logEl) logEl.innerHTML = `
                    <div style="border-bottom:1px dashed #48494b;padding-bottom:6px;margin-bottom:8px;">
                        <span style="font-weight:bold;letter-spacing:2px;">A2A MANIFEST</span>
                        <span style="font-size:10px;opacity:0.65;margin-left:8px;">${src}</span>
                    </div>
                    <pre style="font-size:10px;line-height:1.6;white-space:pre-wrap;word-break:break-all;">${window.escapeHTML(JSON.stringify(manifest, null, 2))}</pre>`;
            });
        });
        updateAgentBar();
    };
    buildAgentCards();

    // ── Constellation engine ──────────────────────────────────────
    const tidHash = tid => String(tid).split('').reduce((h, c) => ((h * 31 + c.charCodeAt(0)) & 0xFFFF), 0);

    const dotPos = (dot, cw, ch) => {
        const tid = Number(dot.tid) || 0;
        return {
            x: ((tid * 2654435761) >>> 0) % (cw - 20) + 10,
            y: ((tid * 2246822519) >>> 0) % (ch - 20) + 10
        };
    };

    // Min 4px — level bumps size
    const dotRadius = dot => dot.lvl >= 4 ? 6 : dot.lvl >= 2 ? 5 : 4;
    const dotPhase  = dot => ((tidHash(dot.tid) & 0xFF) / 255) * Math.PI * 2;
    const dotSpeed  = dot => 0.3 + ((tidHash(dot.tid) >> 8) & 0xFF) / 600;

    const TYPE_COLORS = {
        human: [72, 73, 75, 0.70],
        cat:   [72, 73, 75, 0.85],
        alien: [72, 73, 75, 1.00],
    };
    const dotColor = (type, opacity) => {
        const c = TYPE_COLORS[type];
        if (c) return `rgba(${c[0]},${c[1]},${c[2]},${(opacity * c[3]).toFixed(2)})`;
        return `rgba(72,73,75,${(opacity * 0.9).toFixed(2)})`;
    };

    let loreAgentTids = new Set();
    let rafId = null;
    let networkReady = false;

    const drawFrame = t => {
        if (!canvas.parentElement) return;
        const ctx = canvas.getContext('2d');
        const cw = canvas.width, ch = canvas.height;
        if (!cw || !ch) return;

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#e3e5e4';
        ctx.fillRect(0, 0, cw, ch);

        // Thin connections between active conversation agents
        if (agents.length >= 2) {
            const convPts = agents
                .map(a => { const d = allDots.find(d => String(d.tid) === String(a.tid)); return d ? dotPos(d, cw, ch) : null; })
                .filter(Boolean);
            if (convPts.length >= 2) {
                ctx.save();
                ctx.strokeStyle = 'rgba(72,73,75,0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(convPts[0].x, convPts[0].y);
                for (let i = 1; i < convPts.length; i++) ctx.lineTo(convPts[i].x, convPts[i].y);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Connecting lines during LORE
        if (loreAgentTids.size > 1) {
            const lorePts = agents
                .filter(a => loreAgentTids.has(String(a.tid)))
                .map(a => {
                    const d = allDots.find(d => String(d.tid) === String(a.tid));
                    return d ? dotPos(d, cw, ch) : null;
                })
                .filter(Boolean);
            if (lorePts.length >= 2) {
                ctx.save();
                ctx.strokeStyle = 'rgba(72,73,75,0.55)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 5]);
                ctx.beginPath();
                ctx.moveTo(lorePts[0].x, lorePts[0].y);
                for (let i = 1; i < lorePts.length; i++) ctx.lineTo(lorePts[i].x, lorePts[i].y);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw dots — pixel nodes 2×2 idle / 3×3 active
        const pts = allDots.map(d => dotPos(d, cw, ch));
        for (let i = 0; i < allDots.length; i++) {
            const dot    = allDots[i];
            const pos    = pts[i];
            const isLore = loreAgentTids.has(String(dot.tid));
            const isConv = agents.some(a => String(a.tid) === String(dot.tid));
            const size   = (isLore || isConv) ? 3 : 2;

            let opacity;
            if (isLore) {
                opacity = 0.9 + 0.1 * Math.sin(t * 4 + dotPhase(dot));
            } else if (isConv) {
                opacity = 0.75 + 0.25 * Math.sin(t * 3 + dotPhase(dot));
            } else {
                opacity = 0.5 + 0.5 * Math.abs(Math.sin(t * dotSpeed(dot) + dotPhase(dot)));
            }

            ctx.fillStyle = dotColor(dot.type, opacity);
            ctx.fillRect(pos.x, pos.y, size, size);

            if (isLore || isConv) {
                ctx.strokeStyle = dotColor(dot.type, isLore ? 0.7 : 0.35);
                ctx.lineWidth = 1;
                ctx.strokeRect(pos.x - 1, pos.y - 1, size + 2, size + 2);
            }
        }

        ctx.lineWidth = 1;
        const maxDist = 45;
        const maxDistSq = maxDist * maxDist;

        for (let i = 0; i < allDots.length; i++) {
            for (let j = i + 1; j < allDots.length; j++) {
                const dx = allDots[i].x - allDots[j].x;
                const dy = allDots[i].y - allDots[j].y;
                const distSq = dx * dx + dy * dy;
                if (distSq < maxDistSq) {
                    const dist = Math.sqrt(distSq);
                    const opacity = 0.15 * (1 - (dist / maxDist));
                    ctx.strokeStyle = `rgba(72, 73, 75, ${opacity.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(allDots[i].x, allDots[i].y);
                    ctx.lineTo(allDots[j].x, allDots[j].y);
                    ctx.stroke();
                }
            }
        }
    };

    const startRaf = () => {
        if (rafId) return;
        const t0 = performance.now();
        const frame = now => {
            drawFrame((now - t0) / 1000);
            rafId = requestAnimationFrame(frame);
        };
        rafId = requestAnimationFrame(frame);
    };

    const stopRaf = () => {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    };

    // Tooltip (inside network panel, position:relative)
    const tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:absolute;pointer-events:none;background:#48494b;color:#e3e5e4;font-family:\'Courier New\',monospace;font-size:10px;padding:3px 6px;white-space:nowrap;z-index:10;display:none;border:1px solid #48494b;';
    networkPanel.appendChild(tooltip);

    const hitTest = (mx, my) => {
        const cw = canvas.width, ch = canvas.height;
        let best = null, bestD = 12;
        for (const dot of allDots) {
            const p = dotPos(dot, cw, ch);
            const d = Math.hypot(mx - p.x, my - p.y);
            if (d < bestD) { bestD = d; best = dot; }
        }
        return best;
    };

    // Lazy canvas init — called first time NETWORK tab is shown
    const initCanvas = () => {
        if (networkReady) return;
        networkReady = true;
        requestAnimationFrame(() => {
            canvas.width  = networkPanel.offsetWidth  || 740;
            canvas.height = (networkPanel.offsetHeight - (body.querySelector('#hive-net-counter').offsetHeight || 24)) || 520;

            canvas.addEventListener('mousemove', e => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const canvasX = (e.clientX - rect.left) * scaleX;
                const canvasY = (e.clientY - rect.top)  * scaleY;
                const hit = hitTest(canvasX, canvasY);
                if (hit) {
                    canvas.style.cursor = 'pointer';
                    tooltip.style.display = 'block';
                    tooltip.textContent = `${hit.name}  #${hit.tid}`;
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top  = (e.clientY - 15) + 'px';
                } else {
                    canvas.style.cursor = 'crosshair';
                    tooltip.style.display = 'none';
                }
            });

            canvas.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
                canvas.style.cursor = 'crosshair';
            });

            canvas.addEventListener('click', e => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const canvasX = (e.clientX - rect.left) * scaleX;
                const canvasY = (e.clientY - rect.top)  * scaleY;
                const hit = hitTest(canvasX, canvasY);
                if (!hit) return;
                tooltip.style.display = 'block';
                tooltip.textContent = `${hit.name}  #${hit.tid}`;
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top  = (e.clientY - 15) + 'px';
                setTimeout(() => { tooltip.style.display = 'none'; }, 2500);
            });

            startRaf();
        });
    };

    // ── Tab switching ─────────────────────────────────────────────
    const showTab = name => {
        agentsPanel.style.display  = name === 'agents'  ? 'flex' : 'none';
        networkPanel.style.display = name === 'network' ? 'flex' : 'none';
        chatPanel.style.display    = name === 'chat'    ? 'flex' : 'none';
        [[tabAgentsBtn,'agents'],[tabNetworkBtn,'network'],[tabChatBtn,'chat']].forEach(([b, n]) => {
            b.style.background = n === name ? '#48494b' : '#e3e5e4';
            b.style.color      = n === name ? '#e3e5e4' : '#48494b';
        });
        if (name === 'network') { initCanvas(); startRaf(); }
        else                    { stopRaf(); }
    };

    tabAgentsBtn.addEventListener('click',  () => showTab('agents'));
    tabNetworkBtn.addEventListener('click', () => showTab('network'));
    tabChatBtn.addEventListener('click',    () => showTab('chat'));

    // ── Log helper ────────────────────────────────────────────────
    const addLine = (text, style = '') => {
        const div = document.createElement('div');
        div.style.cssText = style;
        div.innerText = text;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
        return div;
    };

    addLine(`>> HIVE INITIALIZED — ${realAgentCount} AGENTS IN CONSTELLATION`, 'font-weight:bold;border-bottom:1px dashed #48494b;padding-bottom:6px;margin-bottom:6px;');
    agents.forEach(a => addLine(`   ${a.name} (#${a.tid}) — AWAKENED`));
    addLine('');

    let abortController = new AbortController();

    // ── Streaming Ollama call ─────────────────────────────────────
    const streamOllama = async (systemPrompt, prompt, targetDiv, scrollEl = log) => {
        const res = await fetch(`${OLLAMA}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({
                model: window.NormieState?.ollama?.model ?? window.OLLAMA_MODEL ?? 'mistral:7b',
                system: systemPrompt + SYSTEM_SUFFIX,
                prompt,
                stream: true,
                options: { num_predict: 120, temperature: 0.9 }
            })
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop();
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.response) {
                        targetDiv.innerText += json.response;
                        scrollEl.scrollTop = scrollEl.scrollHeight;
                    }
                } catch {}
            }
        }
    };

    // ── Send to HIVE ──────────────────────────────────────────────
    let busy = false;
    const sendToHive = async () => {
        if (busy) return;
        const topic = input.value.trim();
        if (!topic) return;
        input.value = '';
        abortController.abort();
        abortController = new AbortController();
        if (window.NormieStreams) window.NormieStreams.HIVE = abortController;
        busy = true;
        send.disabled = true;

        addLine(`> USER: ${topic}`, 'color:#48494b;font-weight:bold;margin-top:8px;');
        addLine('');

        let lastMsg = topic;
        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            const prompt = i === 0
                ? `Topic: ${lastMsg}`
                : `${agents[i-1].name} said: "${lastMsg}"\n\nReact or respond as yourself.`;

            addLine(`> ${a.name} (#${a.tid})`, 'font-weight:bold;margin-top:6px;');
            const respDiv = addLine('', '');
            try {
                await streamOllama(a.systemPrompt, prompt, respDiv);
                lastMsg = respDiv.innerText.trim();
            } catch (err) {
                respDiv.innerText = `[OLLAMA OFFLINE — ${err.message}]`;
                break;
            }
            addLine('');
        }

        busy = false;
        send.disabled = false;
        input.focus();
    };

    send.addEventListener('click', sendToHive);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendToHive(); });

    // ── QUERY ALL — parallel responses ───────────────────────────
    const queryHive = async () => {
        if (busy) return;
        const topic = input.value.trim();
        if (!topic) return;
        input.value = '';
        abortController.abort();
        abortController = new AbortController();
        if (window.NormieStreams) window.NormieStreams.HIVE = abortController;
        busy = true;
        send.disabled = true;
        queryBtn.disabled = true;

        addLine(`> QUERY: ${topic}`, 'color:#48494b;font-weight:bold;margin-top:8px;border-top:1px dashed #48494b;padding-top:6px;');
        addLine('');

        const agentDivs = agents.map(a => {
            addLine(`> ${a.name} (#${a.tid})`, 'font-weight:bold;');
            return { a, div: addLine('...', 'opacity:0.65;') };
        });
        addLine('');

        await Promise.all(agentDivs.map(({ a, div }) =>
            streamOllama(a.systemPrompt, `Question for you: ${topic}\n\nAnswer in 1-2 sentences, in character.`, div).catch(err => {
                div.innerText = `[OFFLINE — ${err.message}]`;
            })
        ));

        busy = false;
        send.disabled = false;
        queryBtn.disabled = false;
        input.focus();
    };

    queryBtn.addEventListener('click', queryHive);

    win?.querySelector('.window-close')?.addEventListener('click', () => {
        abortController.abort();
        stopRaf();
    }, { once: true });

    const setLoreStep = (id, active) => {
        const el = body.querySelector(id);
        if (!el) return;
        el.style.opacity    = active ? '1' : '0.4';
        el.style.fontWeight = active ? 'bold' : 'normal';
    };

    // ── LORE Pipeline ─────────────────────────────────────────────
    const runLorePipeline = async () => {
        if (busy) return;
        abortController.abort();
        abortController = new AbortController();
        if (window.NormieStreams) window.NormieStreams.HIVE = abortController;
        busy = true;
        const loreBtn = body.querySelector('#hive-lore');
        const sendBtn = body.querySelector('#hive-send');
        const theater = body.querySelector('#hive-theater');
        if (loreBtn) loreBtn.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        theater.style.display = 'block';
        theater.innerHTML = '<div style="opacity:0.65;font-style:italic;">LORE PIPELINE INITIALIZING...</div>';

        // Light up active agents + draw connecting lines in NETWORK tab
        loreAgentTids = new Set(agents.map(a => String(a.tid)));

        try {
            // ── STORY WEAVER ──────────────────────────────────────
            setLoreStep('#lore-step-weaver', true);
            let burns = [], stats = {};
            try {
                const res = await fetch(`${API}/history/burns?limit=10`);
                const d = await res.json();
                burns = Array.isArray(d) ? d : (d.burns ?? d.data ?? []);
            } catch {}
            try { const sr = await fetch(`${API}/history/stats`); stats = await sr.json(); } catch {}
            let firstBurn = null;
            try {
                const burnedRes = await fetch(`${API}/history/burned-tokens?limit=100`);
                const burnedList = await burnedRes.json();
                const randomBurned = burnedList[Math.floor(Math.random() * burnedList.length)];
                firstBurn = randomBurned?.tokenId ?? randomBurned?.token_id ?? null;
            } catch { console.warn('history/burned-tokens endpoint failed, falling back to null'); }
            const topBurns = burns.slice(0, 5).map(b => ({
                id:     b.burnedTokens?.[0]?.tokenId ?? b.tokenId ?? b.token_id ?? b.id ?? '?',
                burner: window.fmtWallet(String(b.burner ?? b.owner ?? '?')),
                count:  b.tokenCount ?? b.token_count ?? 1
            }));
            const storyData = {
                totalBurned:  stats.totalBurned ?? stats.total_burned ?? stats.burned ?? '?',
                topBurns,
                latestBurnId: firstBurn
            };
            theater.style.display = 'block';
            if (firstBurn) {
                theater.innerHTML = `<img src="https://api.normies.art/history/burned/${firstBurn}/image.svg" style="width:80px;height:80px;image-rendering:pixelated;border:1px solid #48494b;margin-bottom:12px;display:block;">`;
            }
            setLoreStep('#lore-step-weaver', false);

            // ── ANALYST ───────────────────────────────────────────
            setLoreStep('#lore-step-analyst', true);
            const analRes = await fetch(`${OLLAMA}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({
                    model: window.NormieState?.ollama?.model ?? window.OLLAMA_MODEL ?? 'mistral:7b',
                    system: 'You are ANALYST. You receive on-chain Normies data and identify which burns are legendary, which Normies are rising, which are forgotten. Output 3 flags: LEGENDARY / RISING / FORGOTTEN with token IDs and reasons.',
                    prompt: `On-chain Normies data: ${JSON.stringify(storyData)}\n\nOutput exactly 3 flags with token IDs and one-line reasons.`,
                    stream: false,
                    options: { num_predict: 120, temperature: 0.8 }
                })
            });
            const analData = await analRes.json();
            const analysis = analData.response ?? '';
            setLoreStep('#lore-step-analyst', false);

            // ── NARRATOR ──────────────────────────────────────────
            setLoreStep('#lore-step-narrator', true);
            theater.style.display = 'block';
            theater.innerHTML = '';
            if (storyData.latestBurnId && storyData.latestBurnId !== '?') {
                const img = document.createElement('img');
                img.src = `${API}/history/burned/${storyData.latestBurnId}/image.svg`;
                img.style.cssText = 'display:block;width:80px;height:80px;image-rendering:pixelated;border:1px solid #48494b;margin-bottom:12px;';
                theater.appendChild(img);
            }
            const narDiv = document.createElement('div');
            narDiv.style.cssText = 'font-style:italic;line-height:1.8;font-size:15px;';
            theater.appendChild(narDiv);

            const narRes = await fetch(`${OLLAMA}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({
                    model: window.NormieState?.ollama?.model ?? window.OLLAMA_MODEL ?? 'mistral:7b',
                    system: 'You are NARRATOR. You receive Normies on-chain data and analysis. Write an epic 4-line pixel theater narration of what happened on-chain. Dramatic, poetic, Normies universe. Reference specific token IDs.',
                    prompt: `Data: ${JSON.stringify(storyData)}\nAnalysis: ${analysis}\n\nWrite your 4-line epic narration.`,
                    stream: true,
                    options: { num_predict: 250, temperature: 0.9 }
                })
            });
            const reader = narRes.body.getReader();
            const dec = new TextDecoder();
            let nbuf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                nbuf += dec.decode(value, { stream: true });
                const lines = nbuf.split('\n');
                nbuf = lines.pop();
                for (const ln of lines) {
                    if (!ln.trim()) continue;
                    try { const j = JSON.parse(ln); if (j.response) narDiv.innerText += j.response; } catch {}
                }
            }
            setLoreStep('#lore-step-narrator', false);

        } catch (err) {
            if (err.name !== 'AbortError') theater.innerHTML += `<div style="opacity:0.6;">[ERROR: ${err.message}]</div>`;
        }

        loreAgentTids = new Set();
        busy = false;
        if (loreBtn) loreBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
    };

    body.querySelector('#hive-lore').addEventListener('click', runLorePipeline);

    // ── CHAT tab ──────────────────────────────────────────────────
    const chatLog   = body.querySelector('#hive-chat-log');
    const chatInput = body.querySelector('#chat-input');
    const chatSend  = body.querySelector('#chat-send');

    const addChatLine = (text, style = '') => {
        const div = document.createElement('div');
        div.style.cssText = style;
        div.innerText = text;
        chatLog.appendChild(div);
        chatLog.scrollTop = chatLog.scrollHeight;
        return div;
    };

    let chatBusy = false;
    const sendToChat = async () => {
        if (chatBusy || !activeAgent) return;
        const msg = chatInput.value.trim();
        if (!msg) return;
        chatInput.value = '';
        chatBusy = true;
        chatSend.disabled = true;
        abortController.abort();
        abortController = new AbortController();
        if (window.NormieStreams) window.NormieStreams.HIVE = abortController;

        addChatLine('> YOU', 'font-weight:bold;margin-top:8px;opacity:0.6;');
        addChatLine(msg, 'padding-left:8px;margin-bottom:6px;');
        addChatLine(`> ${activeAgent.name}  #${activeAgent.tid}  [${activeAgent.type}]`, 'font-weight:bold;margin-top:4px;');
        const respDiv = addChatLine('', 'padding-left:8px;margin-bottom:6px;');

        try {
            await streamOllama(activeAgent.systemPrompt, msg, respDiv, chatLog);
        } catch (err) {
            respDiv.innerText = `[OLLAMA OFFLINE — ${err.message}]`;
        }

        chatBusy = false;
        chatSend.disabled = false;
        chatInput.focus();
    };

    chatSend.addEventListener('click', sendToChat);
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendToChat(); });

    // ── NEW AGENTS ────────────────────────────────────────────────
    reshuf.addEventListener('click', async () => {
        if (busy) return;
        addLine('>> SHUFFLING AGENTS...', 'opacity:0.6;margin-top:8px;');
        try {
            let all = window.NormieState?.agents ?? window.NormieCache.get('agents');
            if (!all) {
                const r = await fetch(`${API}/agents/list?sort=newest&limit=100`).catch(() => null);
                if (!r || !r.ok) throw new Error('agents/list unreachable');
                const d = await r.json();
                all = Array.isArray(d) ? d : (d.agents ?? d.items ?? d.data ?? d.tokens ?? []);
                window.NormieCache.set('agents', all, window.TTL.PERSONA);
            }
            const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
            agents = await Promise.all(shuffled.map(async a => {
                const tid = a.tokenId ?? a.token_id ?? a.id ?? a;
                try {
                    const info = await (await fetch(`${API}/agents/info/${tid}`)).json();
                    return { tid, name: info.name ?? `#${tid}`, type: info.type ?? '?', systemPrompt: info.systemPrompt ?? info.brain ?? `You are Normie #${tid}, a sovereign on-chain agent.` };
                } catch { return { tid, name: `#${tid}`, type: '?', systemPrompt: `You are Normie #${tid}, a sovereign on-chain agent.` }; }
            }));
        } catch (err) { addLine(`>> ERROR: ${err.message}`, 'opacity:0.6;'); return; }

        buildAgentCards();
        addLine(`>> HIVE RELINKED — ${agents.length} NEW AGENTS`, 'font-weight:bold;border-bottom:1px dashed #48494b;padding-bottom:6px;margin-bottom:6px;');
        agents.forEach(a => addLine(`   ${a.name} (#${a.tid})`));
        addLine('');
    });
}
window.openHive = openHive;
