function openControlPanel() {
    const AI_MODELS = [
        { id: 'mistral:7b',        label: 'GHOST',     ram: '4 GB',   desc: 'Fast generalist. Lightweight stealth agent.' },
        { id: 'llama3:8b',         label: 'ORACLE',    ram: '6 GB',   desc: 'Meta LLaMA 3. Balanced reasoning and lore.' },
        { id: 'deepseek-coder:7b', label: 'ARCHITECT', ram: '6 GB',   desc: 'Code-focused mind. Builds and deconstructs.' },
        { id: 'phi3:mini',         label: 'WHISPER',   ram: '2 GB',   desc: 'Ultra-minimal. Runs on anything.' },
        { id: 'llama3:70b',        label: 'BEHEMOTH',  ram: '40 GB+', desc: 'Maximum power. Requires GPU cluster.' },
    ];
    const aiSaved = window.NormieState?.ollama?.model || localStorage.getItem('normie_model') || 'mistral:7b';
    const aiRowsHtml = AI_MODELS.map(m => `
        <div class="mf-model-row${m.id === aiSaved ? ' mf-selected' : ''}" data-model="${m.id}"
            style="border:1px solid #48494b;padding:8px 10px;margin-bottom:6px;font-family:'Courier New',monospace;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <span class="mf-model-label" style="font-size:12px;font-weight:bold;letter-spacing:1px;">${m.label}</span>
                <span class="mf-model-ram" style="font-size:10px;opacity:0.7;">${m.ram}</span>
            </div>
            <div class="mf-model-tag" style="font-size:10px;opacity:0.6;margin-bottom:3px;">${m.id}</div>
            <div class="mf-model-desc" style="font-size:10px;opacity:0.75;">${m.desc}</div>
        </div>
    `).join('');
    const body = window.createNativeWindow('MAINFRAME', `
        <div class="window-tabs-bar">
            <button class="window-tab-btn active" data-panel="cp-hardware">[ HARDWARE ]</button>
            <button class="window-tab-btn" data-panel="cp-network">[ NETWORK ]</button>
            <button class="window-tab-btn" data-panel="cp-system">[ SYSTEM ]</button>
            <button class="window-tab-btn" data-panel="cp-ai">[ AI MODEL ]</button>
            <button class="window-tab-btn" data-panel="cp-apikeys">[ API KEYS ]</button>
        </div>

        <div class="tab-content-panel active" id="cp-hardware">
            <div class="cp-section-title">// HARDWARE MONITOR</div>
            <div class="cp-row">
                <span class="cp-label">CPU MANA</span>
                <div class="cp-gauge"><div class="cp-gauge-fill" id="cp-cpu-fill" style="width:0%"></div></div>
                <span class="cp-gauge-val" id="cp-cpu-val">--%</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">HP (BATTERY)</span>
                <div class="cp-gauge"><div class="cp-gauge-fill" id="cp-bat-fill" style="width:0%"></div></div>
                <span class="cp-gauge-val" id="cp-bat-val">--%</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">RAM USAGE</span>
                <div class="cp-gauge"><div class="cp-gauge-fill" id="cp-ram-fill" style="width:0%"></div></div>
                <span class="cp-gauge-val" id="cp-ram-val">--MB</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">VRAM</span>
                <span class="cp-value" id="cp-vram-val">--</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">CPU NAME</span>
                <span class="cp-value" id="cp-cpuname-val">--</span>
            </div>
        </div>

        <div class="tab-content-panel" id="cp-network">
            <div class="cp-section-title">// NETWORK STATUS</div>
            <div class="cp-row">
                <span class="cp-label">WIFI STATUS</span>
                <span class="cp-value" id="cp-wifi-val">${navigator.onLine ? '>> CONNECTED' : '>> OFFLINE'}</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">RPC NODE</span>
                <span class="cp-value">>> Ethereum Mainnet</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">API STATUS</span>
                <span class="cp-value">>> api.normies.art</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">OFFLINE MODE</span>
                <label class="cp-check-label">
                    <input type="checkbox" id="cp-offline" style="display:none">
                    <span class="cp-check-box" id="cp-offline-box">[ ]</span>
                    <span class="cp-value" id="cp-offline-val">DISABLED</span>
                </label>
            </div>
            <div class="cp-row">
                <span class="cp-label">OLLAMA</span>
                <span class="cp-value" id="cp-ollama-val">-- CHECKING...</span>
            </div>
            <div class="cp-row">
                <span class="cp-label">API PING</span>
                <span class="cp-value" id="cp-ping-val">-- --ms</span>
            </div>
        </div>

        <div class="tab-content-panel" id="cp-system">
            <div class="cp-section-title">// SYSTEM INFO</div>
            <div id="cp-sysinfo" style="font-family:'Courier New',monospace;font-size:11px;color:#48494b;line-height:1.9;padding:4px 0 8px 0;"></div>
            <div class="cp-section-title">// SYSTEM CONFIG</div>
            <div style="border:1px solid #48494b;padding:8px 10px;margin-bottom:6px;">
                <div class="cp-row">
                    <span class="cp-label">VOLUME</span>
                    <input type="range" class="pixel-slider" id="cp-vol" min="0" max="100" value="80">
                    <span class="cp-gauge-val" id="cp-vol-val">80</span>
                </div>
                <div style="font-size:10px;color:#48494b;opacity:0.6;padding-top:2px;">[ AUDIO CONTROL — ACTIVE ON LUBUNTU ISO ]</div>
            </div>
            <div style="border:1px solid #48494b;padding:8px 10px;margin-bottom:6px;">
                <div class="cp-row">
                    <span class="cp-label">BRIGHTNESS</span>
                    <input type="range" class="pixel-slider" id="cp-bright" min="20" max="100" value="100">
                    <span class="cp-gauge-val" id="cp-bright-val">100</span>
                </div>
                <div style="font-size:10px;color:#48494b;opacity:0.6;padding-top:2px;">[ BRIGHTNESS CONTROL — ACTIVE ON LUBUNTU ISO ]</div>
            </div>
            <div style="border:1px solid #48494b;padding:8px 10px;margin-bottom:6px;">
                <div class="cp-section-title" style="margin:0 0 6px 0;">// WALLPAPER</div>
                <div class="cp-row" style="gap:6px;">
                    <button class="cp-action-btn" id="wp-btn-normie">[ NORMIE ]</button>
                    <button class="cp-action-btn" id="wp-btn-hive">[ HIVE ]</button>
                </div>
                <div class="cp-row" style="margin-top:6px;">
                    <button class="cp-action-btn" id="cp-clear">[ CLEAR CACHE ]</button>
                </div>
            </div>
            <div style="border:1px solid #48494b;padding:8px 10px;margin-bottom:6px;">
                <div class="cp-section-title" style="margin:0 0 6px 0;">// DISPLAY</div>
                <div class="cp-row" style="align-items:center;gap:10px;">
                    <span style="font-size:10px;letter-spacing:1px;color:#48494b;">[ TEXT SIZE ]</span>
                    <div class="settings-toggle-group" id="textsize-toggle" style="display:flex;gap:4px;">
                        <button data-size="small">S</button>
                        <button data-size="medium" class="active">M</button>
                        <button data-size="large">L</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="tab-content-panel" id="cp-ai">
            <div class="cp-section-title">// NEURAL ENGINE</div>
            <div style="font-size:10px;color:#48494b;opacity:0.6;padding:0 0 10px 0;letter-spacing:1px;">SELECT OLLAMA MODEL PROFILE</div>
            <div id="cp-ai-model-list">${aiRowsHtml}</div>
            <div class="mf-status" id="cp-ai-status" style="font-family:'Courier New',monospace;font-size:11px;color:#48494b;padding:8px 0;border-top:1px solid #48494b;margin-top:4px;">>> MODEL: ${aiSaved}</div>
            <div style="display:flex;gap:8px;padding:8px 0;">
                <button class="mf-btn" id="cp-ai-activate">[ ACTIVATE ]</button>
                <button class="mf-btn" id="cp-ai-download">[ DOWNLOAD ]</button>
            </div>
            <div class="mf-pull-cmd" id="cp-ai-pull-cmd" style="display:none;font-family:'Courier New',monospace;font-size:11px;color:#48494b;padding:6px 0;"></div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:10px;border-top:1px solid #48494b;padding-top:10px;">
                <span style="font-family:'Courier New',monospace;font-size:11px;color:#48494b;letter-spacing:1px;">[ ALPHA VOICE ]</span>
                <button id="voice-toggle" class="mf-btn">VOICE: OFF</button>
            </div>
        </div>

        <div class="tab-content-panel" id="cp-apikeys">
            <div class="cp-section-title">// API KEYS</div>
            <div style="font-size:10px;color:#48494b;opacity:0.6;padding:0 0 10px 0;">[ STORED LOCALLY — NEVER TRANSMITTED ]</div>

            <div class="cp-section-title">// OPENSEA</div>
            <div class="cp-row" style="gap:6px;align-items:center;">
                <span class="cp-label">OPENSEA</span>
                <input type="password" id="cp-key-opensea" autocomplete="off" spellcheck="false"
                    style="flex:1;background:#e3e5e4;border:1px solid #48494b;color:#48494b;font-family:'Courier New',monospace;font-size:11px;padding:3px 6px;outline:none;">
                <button class="cp-action-btn" id="cp-show-opensea">[ SHOW ]</button>
                <button class="cp-action-btn" id="cp-save-opensea">[ SAVE ]</button>
            </div>
            <div style="padding:2px 0 10px 0;">
                <button class="cp-action-btn" style="font-size:10px;opacity:0.75;" id="cp-link-opensea">[ GET KEY → opensea.io/api ]</button>
            </div>

            <div class="cp-section-title">// ANTHROPIC</div>
            <div class="cp-row" style="gap:6px;align-items:center;">
                <span class="cp-label">ANTHROPIC</span>
                <input type="password" id="cp-key-anthropic" autocomplete="off" spellcheck="false"
                    style="flex:1;background:#e3e5e4;border:1px solid #48494b;color:#48494b;font-family:'Courier New',monospace;font-size:11px;padding:3px 6px;outline:none;">
                <button class="cp-action-btn" id="cp-show-anthropic">[ SHOW ]</button>
                <button class="cp-action-btn" id="cp-save-anthropic">[ SAVE ]</button>
            </div>
            <div style="padding:2px 0 10px 0;">
                <button class="cp-action-btn" style="font-size:10px;opacity:0.75;" id="cp-link-anthropic">[ GET KEY → console.anthropic.com ]</button>
            </div>

            <div class="cp-section-title">// GEMINI</div>
            <div class="cp-row" style="gap:6px;align-items:center;">
                <span class="cp-label">GEMINI</span>
                <input type="password" id="cp-key-gemini" autocomplete="off" spellcheck="false"
                    style="flex:1;background:#e3e5e4;border:1px solid #48494b;color:#48494b;font-family:'Courier New',monospace;font-size:11px;padding:3px 6px;outline:none;">
                <button class="cp-action-btn" id="cp-show-gemini">[ SHOW ]</button>
                <button class="cp-action-btn" id="cp-save-gemini">[ SAVE ]</button>
            </div>
            <div style="padding:2px 0 10px 0;">
                <button class="cp-action-btn" style="font-size:10px;opacity:0.75;" id="cp-link-gemini">[ GET KEY → aistudio.google.com ]</button>
            </div>
        </div>
    `);

    body.querySelectorAll('.window-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            body.querySelectorAll('.window-tab-btn').forEach(t => t.classList.remove('active'));
            body.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            body.querySelector('#' + tab.dataset.panel).classList.add('active');
        });
    });

    // API KEYS tab — load saved values
    const _apiKeys = [
        { name: 'opensea',   lsKey: 'normie_apikey_opensea',   url: 'https://docs.opensea.io/reference/api-keys' },
        { name: 'anthropic', lsKey: 'normie_apikey_anthropic', url: 'https://console.anthropic.com/' },
        { name: 'gemini',    lsKey: 'normie_apikey_gemini',    url: 'https://aistudio.google.com/apikey' },
    ];
    _apiKeys.forEach(({ name, lsKey, url }) => {
        const input   = body.querySelector(`#cp-key-${name}`);
        const showBtn = body.querySelector(`#cp-show-${name}`);
        const saveBtn = body.querySelector(`#cp-save-${name}`);
        const linkBtn = body.querySelector(`#cp-link-${name}`);
        const saved   = localStorage.getItem(lsKey) || '';
        if (saved) input.value = saved;
        showBtn.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            showBtn.innerText = isHidden ? '[ HIDE ]' : '[ SHOW ]';
        });
        saveBtn.addEventListener('click', () => {
            localStorage.setItem(lsKey, input.value.trim());
            saveBtn.innerText = '[ SAVED ]';
            setTimeout(() => { saveBtn.innerText = '[ SAVE ]'; }, 1500);
        });
        linkBtn.addEventListener('click', () => { window.open(url); });
    });

    let aiSelected = aiSaved;

    body.querySelectorAll('#cp-ai-model-list .mf-model-row').forEach(row => {
        row.addEventListener('click', () => {
            body.querySelectorAll('#cp-ai-model-list .mf-model-row').forEach(r => r.classList.remove('mf-selected'));
            row.classList.add('mf-selected');
            aiSelected = row.dataset.model;
            body.querySelector('#cp-ai-status').innerText = `>> MODEL: ${aiSelected}`;
            body.querySelector('#cp-ai-pull-cmd').style.display = 'none';
        });
    });

    // Fetch installed Ollama models and badge matching rows
    (async () => {
        try {
            const r = await fetch('http://localhost:11434/api/tags');
            const d = await r.json();
            const installed = new Set((d.models ?? []).map(m => m.name));
            body.querySelectorAll('#cp-ai-model-list .mf-model-row').forEach(row => {
                if (installed.has(row.dataset.model)) {
                    const labelEl = row.querySelector('.mf-model-label');
                    if (labelEl && !labelEl.querySelector('.mf-installed-badge')) {
                        labelEl.insertAdjacentHTML('beforeend', '<span class="mf-installed-badge">INSTALLED</span>');
                    }
                }
            });
        } catch {}
    })();

    body.querySelector('#cp-ai-activate').addEventListener('click', () => {
        localStorage.setItem('normie_model', aiSelected);
        window.OLLAMA_MODEL = aiSelected;
        if (window.NormieState?.ollama) window.NormieState.ollama.model = aiSelected;
        const status = body.querySelector('#cp-ai-status');
        status.innerText = `>> ACTIVATED: ${aiSelected}`;
        setTimeout(() => { status.innerText = `>> MODEL: ${aiSelected}`; }, 2000);
    });

    body.querySelector('#cp-ai-download').addEventListener('click', () => {
        const cmd = body.querySelector('#cp-ai-pull-cmd');
        cmd.innerText = `>> ollama pull ${aiSelected}`;
        cmd.style.display = 'block';
    });

    const voiceToggle = body.querySelector('#voice-toggle');
    const voiceOn = localStorage.getItem('normie_voice_enabled') === 'true';
    window.NORMIE_VOICE_ENABLED = voiceOn;
    if (voiceOn) { voiceToggle.textContent = 'VOICE: ON'; voiceToggle.classList.add('active'); }
    voiceToggle.addEventListener('click', () => {
        const next = !window.NORMIE_VOICE_ENABLED;
        window.NORMIE_VOICE_ENABLED = next;
        localStorage.setItem('normie_voice_enabled', String(next));
        voiceToggle.textContent = next ? 'VOICE: ON' : 'VOICE: OFF';
        voiceToggle.classList.toggle('active', next);
    });

    const refreshHW = () => {
        if (window.performance?.memory) {
            const used  = performance.memory.usedJSHeapSize;
            const total = performance.memory.jsHeapSizeLimit;
            const pct   = Math.round((used / total) * 100);
            const mb    = Math.round(used / 1048576);
            body.querySelector('#cp-ram-fill').style.width = pct + '%';
            body.querySelector('#cp-ram-val').innerText   = mb + 'MB';
        }
        const t0 = performance.now();
        let x = 0; for (let i = 0; i < 5e5; i++) x += i;
        const drift = Math.min(100, Math.round((performance.now() - t0) * 8));
        body.querySelector('#cp-cpu-fill').style.width = drift + '%';
        body.querySelector('#cp-cpu-val').innerText   = drift + '%';
    };

    if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
            const updateBat = () => {
                const pct = Math.round(bat.level * 100);
                body.querySelector('#cp-bat-fill').style.width = pct + '%';
                body.querySelector('#cp-bat-val').innerText   = pct + '%';
            };
            bat.addEventListener('levelchange', updateBat);
            updateBat();
        });
    }

    refreshHW();
    const hwTimer = setInterval(refreshHW, 2000);

    body.querySelector('#cp-offline-box').addEventListener('click', () => {
        const cb  = body.querySelector('#cp-offline');
        cb.checked = !cb.checked;
        body.querySelector('#cp-offline-box').innerText = cb.checked ? '[X]' : '[ ]';
        body.querySelector('#cp-offline-val').innerText = cb.checked ? 'ENABLED' : 'DISABLED';
        document.getElementById('systray-net').innerText = cb.checked ? 'WIFI:--' : 'WIFI:OK';
    });

    body.querySelector('#cp-vol').addEventListener('input', (e) => {
        body.querySelector('#cp-vol-val').innerText = e.target.value;
        window.systemVolume = Number(e.target.value);
    });
    body.querySelector('#cp-bright').addEventListener('input', (e) => {
        body.querySelector('#cp-bright-val').innerText = e.target.value;
        window.systemBrightness = Number(e.target.value);
    });
    body.querySelector('#cp-clear').addEventListener('click', () => {
        window.log('>> CACHE CLEARED');
        body.querySelector('#cp-clear').innerText = '[ DONE ]';
        setTimeout(() => { body.querySelector('#cp-clear').innerText = '[ CLEAR CACHE ]'; }, 1500);
    });

    const _wpBtnNormie = body.querySelector('#wp-btn-normie');
    const _wpBtnHive   = body.querySelector('#wp-btn-hive');
    const _updateWpBtns = mode => {
        if (_wpBtnNormie) { _wpBtnNormie.style.background = mode === 'normie' ? '#48494b' : ''; _wpBtnNormie.style.color = mode === 'normie' ? '#e3e5e4' : ''; }
        if (_wpBtnHive)   { _wpBtnHive.style.background   = mode === 'hive'   ? '#48494b' : ''; _wpBtnHive.style.color   = mode === 'hive'   ? '#e3e5e4' : ''; }
    };
    _updateWpBtns(localStorage.getItem('wallpaperMode') || 'normie');
    _wpBtnNormie?.addEventListener('click', () => { window.toggleWallpaper('normie'); _updateWpBtns('normie'); });
    _wpBtnHive?.addEventListener('click',   () => { window.toggleWallpaper('hive');   _updateWpBtns('hive');   });

    const _tsToggle = body.querySelector('#textsize-toggle');
    if (_tsToggle) {
        const _current = localStorage.getItem('normie-textsize') || 'medium';
        _tsToggle.querySelectorAll('button').forEach(b =>
            b.classList.toggle('active', b.dataset.size === _current)
        );
        _tsToggle.addEventListener('click', e => {
            const size = e.target.dataset.size;
            if (!size) return;
            document.body.setAttribute('data-textsize', size);
            localStorage.setItem('normie-textsize', size);
            _tsToggle.querySelectorAll('button').forEach(b =>
                b.classList.toggle('active', b.dataset.size === size)
            );
        });
    }

    const tmpCanvas = document.createElement('canvas');
    const gl = tmpCanvas.getContext('webgl') || tmpCanvas.getContext('experimental-webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const gpuRaw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'N/A');
    const gpuShort = (() => {
        const m = gpuRaw.match(/((?:RTX|GTX|RX|Arc)\s+\d+\w*(?:\s+Ti)?)/i)
               || gpuRaw.match(/GeForce\s+([\w\s]+?)(?:\s*\/|\s*Direct|\s*OpenGL|$)/i);
        return m ? m[1].trim() : gpuRaw.split('/')[0].trim();
    })();
    const vramStr = (() => {
        const m = gpuRaw.match(/(\d+\s*(?:GB|MB))/i);
        return m ? m[1].toUpperCase() : 'N/A';
    })();
    let cpuName = (navigator.hardwareConcurrency ?? '?') + ' cores';
    try { cpuName = require('os').cpus()[0]?.model ?? cpuName; } catch {}
    const cpu = (navigator.hardwareConcurrency ?? '?') + ' cores';
    const ramGB = performance.memory?.jsHeapSizeLimit
        ? (performance.memory.jsHeapSizeLimit / 1073741824).toFixed(1) + ' GB'
        : 'N/A';
    const res = screen.width + 'x' + screen.height;
    const network = navigator.onLine ? 'ONLINE' : 'OFFLINE';
    const osStr = navigator.platform ?? 'N/A';

    body.querySelector('#cp-vram-val').innerText = '>> ' + vramStr;
    body.querySelector('#cp-cpuname-val').innerText = '>> ' + cpuName;

    (async () => {
        const ollamaEl = body.querySelector('#cp-ollama-val');
        try {
            const r = await fetch('http://localhost:11434/api/tags');
            const d = await r.json();
            const models = d.models ?? [];
            ollamaEl.innerText = models.length > 0 ? `>> ONLINE — ${models[0].name}` : '>> ONLINE';
        } catch { ollamaEl.innerText = '>> OFFLINE'; }
    })();
    (async () => {
        const pingEl = body.querySelector('#cp-ping-val');
        const t0 = performance.now();
        try {
            await fetch('https://api.normies.art/history/stats', { cache: 'no-store' });
            pingEl.innerText = `>> ${Math.round(performance.now() - t0)}ms`;
        } catch { pingEl.innerText = '>> TIMEOUT'; }
    })();

    const pad = (s, n) => String(s).padEnd(n);
    const sysinfoEl = body.querySelector('#cp-sysinfo');

    const fmtUptime = () => {
        const s = Math.floor((Date.now() - (window.sessionStart ?? Date.now())) / 1000);
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${h}:${m}:${sec}`;
    };

    const walletShort = window.currentWalletAddress
        ? window.fmtWallet(window.currentWalletAddress)
        : 'N/A';

    const renderSysInfo = () => {
        if (!sysinfoEl || !body.closest('.os-window')) return;
        sysinfoEl.innerHTML = [
            `>> ${pad('OS', 9)}: ${osStr}`,
            `>> ${pad('VERSION', 9)}: 1.0.0`,
            `>> ${pad('CPU', 9)}: ${cpu}`,
            `>> ${pad('GPU', 9)}: ${gpuShort}`,
            `>> ${pad('RAM', 9)}: ${ramGB}`,
            `>> ${pad('RES', 9)}: ${res}`,
            `>> ${pad('UPTIME', 9)}: ${fmtUptime()}`,
            `>> ${pad('NETWORK', 9)}: ${network}`,
            `>> ${pad('WALLET', 9)}: ${walletShort}`,
            `>> ${pad('NORMIES', 9)}: ${window.allNormieIds?.length ?? '?'}`,
            `>> ${pad('PRESTIGE', 9)}: ${window.walletPrestige ?? '?'}`,
        ].map(line => `<div>${line}</div>`).join('');
    };

    renderSysInfo();
    const sysTimer = setInterval(renderSysInfo, 2000);

    const closeBtn = body.closest('.os-window')?.querySelector('.window-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { clearInterval(hwTimer); clearInterval(sysTimer); }, { once: true });
}

function openMainframe() {
    openControlPanel();
    setTimeout(() => {
        const aiTab = document.querySelector('.window-tab-btn[data-panel="cp-ai"]');
        if (aiTab) aiTab.click();
    }, 50);
}

window.openControlPanel = openControlPanel;
window.openMainframe    = openMainframe;
window.getNormieAPIKey  = (name) => localStorage.getItem('normie_apikey_' + name);