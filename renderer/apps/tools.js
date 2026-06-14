// renderer/apps/tools.js — TOOLS Hub (ERC-8257 Registry)

// ── Persistent cache (survives window close/reopen) ───────────────
window._nexusState = window._nexusState ?? { tools: {}, loading: {} };

// ── Centralized launch — called from TOOLS or any other app ──────
window.launchTool = async (toolId, chain = 'base') => {
    const reg   = window.ERC8257;
    const cache = window._nexusState.tools[chain] ?? [];
    const tool  = cache.find(t => t.id === toolId);

    if (!tool) {
        if (reg) {
            try {
                const config   = await reg.getToolConfig(toolId, chain);
                const manifest = config ? await reg.fetchManifest(config.metadataURI) : null;
                if (config) {
                    const t = { id: toolId, ...config, manifest,
                        name: manifest?.name?.trim() ?? `TOOL #${toolId}`,
                        desc: manifest?.description?.trim() || `Tool | ID: #${toolId}`,
                        endpoint: manifest?.endpoint ?? config.metadataURI,
                        chainId: chain === 'base' ? 8453 : 1, chain };
                    _launchWithTool(t, chain);
                    return;
                }
            } catch {}
        }
        window.log?.(`>> TOOL #${toolId} not found`);
        return;
    }
    _launchWithTool(tool, chain);
};

const _launchWithTool = async (tool, chain) => {
    const reg    = window.ERC8257;
    const wallet = window.currentWalletAddress ?? '';

    if (tool.isGated && reg && wallet) {
        let denied = false;
        try {
            const { ok, granted } = await reg.checkAccess(tool.id, wallet, chain);
            if (ok && !granted) denied = true;
        } catch {}
        if (denied) { _showDeniedModal(tool); return; }
    }

    const endpoint = tool.manifest?.endpoint ?? tool.endpoint ?? '';
    if (!endpoint.startsWith('http')) {
        _showErrorModal(`No valid endpoint for Tool #${tool.id}`);
        return;
    }
    _openAppContainer(tool, endpoint, wallet);
};

// ── AppContainer ──────────────────────────────────────────────────
const _openAppContainer = async (tool, endpoint, wallet) => {
    const title = (tool.name ?? `TOOL #${tool.id}`).toUpperCase().slice(0, 28);
    const cBody = window.createNativeWindow(title, '<div class="native-loading">>> CONNECTING...</div>');
    const cWin  = cBody.closest('.os-window');
    if (cWin) { cWin.style.width = '680px'; cWin.style.height = '540px'; }
    cBody.style.cssText = "padding:0;display:flex;flex-direction:column;font-family:'Courier New',monospace;font-size:11px;color:#48494b;background:#e3e5e4;overflow:hidden;";

    const abort = new AbortController();
    cWin?.querySelector('.window-close')?.addEventListener('click', () => abort.abort(), { once: true });

    const headers = { Accept: 'application/json, text/html, */*' };
    if (wallet) headers['X-Wallet-Address'] = wallet;
    const binding = window.NormieState?.alpha?.agent_binding;
    if (binding?.agentId) headers['X-Agent-Id'] = String(binding.agentId);

    let url = endpoint;
    const manifestAuth = tool.manifest?.access?.requirements?.length > 0;
    if (wallet && !tool.isGated && !manifestAuth) {
        url += (url.includes('?') ? '&' : '?') + 'holder=' + encodeURIComponent(wallet);
    }

    try {
        const res = await fetch(url, { method: 'GET', headers, signal: abort.signal });

        if (res.status === 403) { cBody.innerHTML = _deniedHtml(tool, 'Server returned 403 — NFT gate enforced.'); return; }

        if (res.status === 405) {
            const allowed  = res.headers.get('Allow') ?? 'POST';
            const inputs   = tool.manifest?.inputs;
            const hasProps = inputs?.properties && Object.keys(inputs.properties).length > 0;
            if (allowed.toUpperCase().includes('POST') && hasProps) {
                _renderPayloadForm(cBody, tool, url, wallet, inputs, abort);
            } else {
                _renderPostFallback(cBody, tool, url, allowed);
            }
            return;
        }

        if (!res.ok) {
            cBody.innerHTML = `<div style="padding:20px;"><div style="font-weight:bold;margin-bottom:6px;">HTTP ${res.status} ${res.statusText}</div><div style="opacity:0.6;font-size:10px;">${url}</div></div>`;
            return;
        }

        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
            _renderJsonContainer(cBody, tool, await res.json().catch(() => null), url);
        } else if (ct.includes('text/html')) {
            _renderIframeContainer(cBody, url, wallet);
        } else {
            _renderTextContainer(cBody, tool, await res.text().catch(() => ''), url);
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        cBody.innerHTML = `<div style="padding:20px;"><div style="font-weight:bold;margin-bottom:6px;">CONNECTION FAILED</div><div style="opacity:0.6;font-size:10px;">${window.escapeHTML(err.message)}</div><div style="margin-top:8px;opacity:0.6;font-size:10px;">${url}</div></div>`;
    }
};

// ── Render modes ──────────────────────────────────────────────────
const _containerHeader = (tool) => `
    <div style="padding:6px 14px;border-bottom:2px solid #48494b;background:#48494b;color:#e3e5e4;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;letter-spacing:1px;font-size:11px;">${(tool.name ?? '#'+tool.id).toUpperCase()}</span>
        <span style="font-size:10px;opacity:0.65;">ERC-8257 #${tool.id} — ${tool.isGated ? 'NFT-GATED' : 'OPEN'}</span>
    </div>`;

const _renderJsonContainer = (body, tool, data, url) => {
    const pretty = JSON.stringify(data, null, 2);
    const lines  = pretty.split('\n').length;
    body.innerHTML = _containerHeader(tool) + `
        <div style="padding:5px 14px;border-bottom:1px dashed rgba(72,73,75,0.2);display:flex;align-items:center;gap:8px;flex-shrink:0;background:#e3e5e4;">
            <span style="font-size:10px;opacity:0.6;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${url}">${url}</span>
            <button onclick="window.open('${url}')" style="border:1px solid rgba(72,73,75,0.4);padding:2px 8px;font-family:'Courier New',monospace;font-size:10px;background:transparent;cursor:pointer;letter-spacing:1px;white-space:nowrap;transition:none;">[ RAW ]</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:10px 14px;">
            <pre style="font-size:10px;line-height:1.6;white-space:pre-wrap;word-break:break-all;margin:0;">${pretty}</pre>
        </div>
        <div style="padding:4px 14px;border-top:1px dashed rgba(72,73,75,0.3);font-size:10px;opacity:0.6;flex-shrink:0;">${lines} lines · application/json · proxy mode</div>`;
};

const _renderIframeContainer = (body, url, wallet) => {
    const src = wallet && !url.includes('holder=')
        ? url + (url.includes('?') ? '&' : '?') + 'holder=' + encodeURIComponent(wallet)
        : url;
    body.innerHTML = `
        <div style="padding:5px 14px;border-bottom:1px dashed rgba(72,73,75,0.2);display:flex;align-items:center;gap:8px;flex-shrink:0;background:#e3e5e4;">
            <span style="font-size:10px;opacity:0.6;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${src}</span>
            <button onclick="window.open('${src}')" style="border:1px solid rgba(72,73,75,0.4);padding:2px 8px;font-family:'Courier New',monospace;font-size:10px;background:transparent;cursor:pointer;letter-spacing:1px;transition:none;">[ OPEN ]</button>
        </div>
        <iframe src="${src}" style="flex:1;border:none;width:100%;min-height:0;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`;
    body.style.cssText += 'display:flex;flex-direction:column;';
};

const _renderTextContainer = (body, tool, text, url) => {
    body.innerHTML = _containerHeader(tool) + `
        <div style="flex:1;overflow-y:auto;padding:10px 14px;">
            <div style="font-size:10px;opacity:0.6;margin-bottom:6px;">${url}</div>
            <pre style="font-size:10px;line-height:1.6;white-space:pre-wrap;word-break:break-all;margin:0;">${text.slice(0, 8000)}</pre>
        </div>`;
};

// ── Payload form ──────────────────────────────────────────────────
const _INPUT_STYLE    = "width:100%;box-sizing:border-box;border:2px solid #48494b;background:#e3e5e4;color:#48494b;font-family:'Courier New',monospace;font-size:11px;padding:4px 8px;outline:none;";
const _TEXTAREA_STYLE = _INPUT_STYLE + 'resize:vertical;min-height:56px;';

const _buildField = (key, schema, required) => {
    const label  = (schema.title ?? key).toUpperCase();
    const hint   = schema.description ?? '';
    const isReq  = required.has(key);
    const defVal = schema.default ?? '';
    const safeId = `pf-${key.replace(/[^a-z0-9]/gi, '_')}`;
    let input;
    switch (schema.type) {
        case 'boolean':
            input = `<div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="${safeId}" data-key="${key}" data-type="boolean" ${defVal ? 'checked' : ''} style="width:14px;height:14px;cursor:pointer;accent-color:#48494b;"><span style="font-size:10px;opacity:0.7;">${hint || 'true / false'}</span></div>`;
            break;
        case 'integer': case 'number':
            input = `<input type="number" id="${safeId}" data-key="${key}" data-type="${schema.type}" value="${defVal}" placeholder="${hint}" ${schema.minimum !== undefined ? `min="${schema.minimum}"` : ''} ${schema.maximum !== undefined ? `max="${schema.maximum}"` : ''} style="${_INPUT_STYLE}">`;
            break;
        case 'array': case 'object':
            input = `<textarea id="${safeId}" data-key="${key}" data-type="${schema.type}" placeholder="${hint || 'JSON value'}" style="${_TEXTAREA_STYLE}">${defVal ? JSON.stringify(defVal, null, 2) : ''}</textarea>`;
            break;
        default:
            if (schema.enum?.length) {
                input = `<select id="${safeId}" data-key="${key}" data-type="string" style="${_INPUT_STYLE}cursor:pointer;">${schema.enum.map(v => `<option value="${v}" ${v === defVal ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
            } else {
                input = `<input type="text" id="${safeId}" data-key="${key}" data-type="string" value="${defVal}" placeholder="${hint}" style="${_INPUT_STYLE}">`;
            }
    }
    return `<div style="margin-bottom:14px;"><label for="${safeId}" style="display:block;font-size:10px;font-weight:bold;letter-spacing:1px;margin-bottom:4px;">${label}${isReq ? ' <span style="opacity:0.6;font-weight:normal;">*required</span>' : ''}</label>${hint && schema.type !== 'boolean' ? `<div style="font-size:10px;opacity:0.65;margin-bottom:4px;">${hint}</div>` : ''}${input}</div>`;
};

const _renderPayloadForm = (cBody, tool, url, wallet, inputsSchema, abort) => {
    const props    = inputsSchema?.properties ?? {};
    const required = new Set(inputsSchema?.required ?? []);
    cBody.innerHTML = _containerHeader(tool) + `
        <div style="flex:1;overflow-y:auto;padding:14px 16px;">
            <div style="font-size:10px;opacity:0.65;letter-spacing:1px;margin-bottom:14px;border-bottom:1px dashed rgba(72,73,75,0.2);padding-bottom:8px;">POST ${url}</div>
            <div id="pf-fields">${Object.entries(props).map(([k, s]) => _buildField(k, s, required)).join('')}</div>
            <div id="pf-error" style="display:none;font-size:10px;font-weight:bold;letter-spacing:1px;margin-bottom:8px;"></div>
        </div>
        <div style="padding:10px 16px;border-top:1px dashed rgba(72,73,75,0.25);display:flex;gap:8px;align-items:center;flex-shrink:0;background:#e3e5e4;">
            <button id="pf-execute" style="border:2px solid #48494b;padding:6px 18px;font-family:'Courier New',monospace;font-size:11px;font-weight:bold;background:#48494b;color:#e3e5e4;cursor:pointer;letter-spacing:1px;transition:none;">[ EXECUTE ]</button>
            <button onclick="window.open('${url}')" style="border:2px solid #48494b;padding:6px 18px;font-family:'Courier New',monospace;font-size:11px;background:transparent;color:#48494b;cursor:pointer;letter-spacing:1px;transition:none;">[ OPEN IN BROWSER ]</button>
            <span style="flex:1;font-size:10px;opacity:0.6;text-align:right;">${Object.keys(props).length} field${Object.keys(props).length !== 1 ? 's' : ''}</span>
        </div>`;

    const execBtn = cBody.querySelector('#pf-execute');
    const errEl   = cBody.querySelector('#pf-error');
    execBtn.addEventListener('mouseenter', () => { execBtn.style.background = '#e3e5e4'; execBtn.style.color = '#48494b'; });
    execBtn.addEventListener('mouseleave', () => { execBtn.style.background = '#48494b'; execBtn.style.color = '#e3e5e4'; });

    execBtn.addEventListener('click', async () => {
        const payload = {};
        let invalid = [];
        cBody.querySelectorAll('#pf-fields [data-key]').forEach(el => {
            const key  = el.dataset.key;
            const type = el.dataset.type;
            let val;
            if (type === 'boolean')                       val = el.checked;
            else if (type === 'integer')                  val = el.value !== '' ? parseInt(el.value, 10) : undefined;
            else if (type === 'number')                   val = el.value !== '' ? parseFloat(el.value)   : undefined;
            else if (type === 'array' || type === 'object') { try { val = JSON.parse(el.value); } catch { val = el.value; } }
            else                                          val = el.value;
            if (required.has(key) && (val === undefined || val === '')) invalid.push(key.toUpperCase());
            if (val !== undefined && val !== '') payload[key] = val;
        });
        if (invalid.length) { errEl.textContent = `!! Required: ${invalid.join(', ')}`; errEl.style.display = 'block'; return; }
        errEl.style.display = 'none';
        execBtn.textContent = '[ LOADING... ]';
        execBtn.disabled = true;
        const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/html, */*' };
        if (wallet) headers['X-Wallet-Address'] = wallet;
        try {
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: abort.signal });
            if (res.status === 403) { cBody.innerHTML = _deniedHtml(tool, 'POST returned 403.'); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const ct = res.headers.get('content-type') ?? '';
            if (ct.includes('application/json'))   { _renderJsonContainer(cBody, tool, await res.json().catch(() => null), url); }
            else if (ct.includes('text/html'))      { _renderIframeContainer(cBody, url, wallet); }
            else                                    { _renderTextContainer(cBody, tool, await res.text().catch(() => ''), url); }
        } catch (err) {
            if (err.name === 'AbortError') return;
            execBtn.textContent = '[ EXECUTE ]';
            execBtn.disabled = false;
            errEl.textContent = `!! ${err.message}`;
            errEl.style.display = 'block';
        }
    });
};

const _renderPostFallback = (cBody, tool, url, allowedMethods) => {
    cBody.innerHTML = _containerHeader(tool) + `
        <div style="padding:24px;">
            <div style="font-weight:bold;letter-spacing:1px;margin-bottom:8px;">METHOD NOT ALLOWED (405)</div>
            <div style="font-size:10px;opacity:0.65;margin-bottom:6px;line-height:1.6;">Endpoint requires: <strong>${allowedMethods}</strong><br>No <code>inputs</code> schema in manifest — cannot auto-generate form.</div>
            <div style="font-size:10px;opacity:0.6;margin-bottom:16px;">${url}</div>
            <button onclick="window.open('${url}')" style="border:2px solid #48494b;padding:8px 20px;font-family:'Courier New',monospace;font-size:11px;font-weight:bold;background:#48494b;color:#e3e5e4;cursor:pointer;letter-spacing:1px;transition:none;">[ OPEN IN BROWSER ]</button>
        </div>`;
};

// ── Modal helpers ─────────────────────────────────────────────────
const _deniedHtml = (tool, detail = '') => `
    <div style="padding:28px;text-align:center;font-family:'Courier New',monospace;">
        <div style="font-weight:bold;letter-spacing:2px;margin-bottom:12px;">ACCESS DENIED</div>
        <div style="opacity:0.65;font-size:10px;margin-bottom:6px;">You are not a holder of the required NFT.</div>
        ${detail ? `<div style="opacity:0.6;font-size:10px;margin-bottom:8px;">${detail}</div>` : ''}
        <div style="opacity:0.6;font-size:10px;">Tool: ${window.escapeHTML(tool.name ?? '#'+tool.id)}</div>
        ${tool.accessPredicate ? `<div style="opacity:0.6;font-size:10px;margin-top:3px;">predicate: ${window.escapeHTML(tool.accessPredicate.slice(0,10))}...${window.escapeHTML(tool.accessPredicate.slice(-4))}</div>` : ''}
        <div style="margin-top:16px;"><button onclick="this.closest('.os-window')?.querySelector('.window-close')?.click()" style="border:2px solid #48494b;padding:5px 14px;font-family:'Courier New',monospace;font-size:10px;background:transparent;cursor:pointer;letter-spacing:1px;transition:none;">[ CLOSE ]</button></div>
    </div>`;

const _showDeniedModal = (tool) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(72,73,75,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;';
    el.innerHTML = `<div style="background:#e3e5e4;border:2px solid #48494b;box-shadow:4px 4px 0 #48494b;min-width:300px;max-width:400px;font-family:'Courier New',monospace;">${_deniedHtml(tool)}</div>`;
    el.querySelector('button')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
};

const _showErrorModal = (msg) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(72,73,75,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
    el.innerHTML = `<div style="background:#e3e5e4;border:2px solid #48494b;padding:20px 24px;font-family:'Courier New',monospace;font-size:11px;max-width:360px;"><div style="font-weight:bold;margin-bottom:8px;">ERROR</div><div style="opacity:0.7;font-size:10px;">${msg}</div><button onclick="this.closest('div').parentElement.remove()" style="margin-top:12px;border:2px solid #48494b;padding:4px 12px;font-family:'Courier New',monospace;font-size:10px;background:transparent;cursor:pointer;">[ OK ]</button></div>`;
    document.body.appendChild(el);
};

// ── Helpers ───────────────────────────────────────────────────────
const _toolsDedupe = (tools) => {
    const seen = new Map();
    for (const t of tools) {
        const key = `${t.name.toLowerCase()}|${(t.creator ?? '').toLowerCase()}`;
        if (!seen.has(key) || seen.get(key).id < t.id) seen.set(key, t);
    }
    return [...seen.values()].sort((a, b) => a.id - b.id);
};

const _isNormiesLinked = (t) => {
    const m = t.manifest;
    if (!m) return false;
    return `${m.name ?? ''} ${(m.tags ?? []).join(' ')} ${m.description ?? ''}`.toLowerCase().includes('normie');
};

// ── openTools ─────────────────────────────────────────────────────
function openTools() {
    const body = window.createNativeWindow('TOOLS', '<div class="native-loading">>> LOADING REGISTRY...</div>');
    if (!body) return;
    const win = body.closest('.os-window');
    if (win) { win.style.width = '750px'; win.style.height = '500px'; }
    body.style.cssText = 'padding:0;display:flex;flex-direction:column;height:100%;box-sizing:border-box;overflow:hidden;';

    const agentName = window.NormieState?.alpha?.metadata?.name ?? null;
    const launchLabel = agentName ? `[ LAUNCH WITH ${agentName.toUpperCase()} ]` : '[ LAUNCH WITH AGENT ]';

    body.innerHTML = `
        <div class="window-tabs-bar">
            <button class="window-tab-btn active" data-tab="store">[ TOOLS STORE ]</button>
            <button class="window-tab-btn" data-tab="agents">[ MY AGENTS ]</button>
            <span id="tools-count" style="flex:1;padding:6px 12px;font-size:10px;opacity:0.6;letter-spacing:1px;text-align:right;font-family:'Courier New',monospace;"></span>
        </div>

        <div id="tools-tab-store" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
            <div style="display:flex;align-items:center;gap:0;flex-shrink:0;border-bottom:1px solid #48494b;background:#e3e5e4;padding:6px 12px;flex-wrap:wrap;gap:6px;">
                <span style="font-size:10px;letter-spacing:1px;opacity:0.7;margin-right:4px;">NETWORK:</span>
                <button class="tools-filter-btn" data-filter-type="chain" data-filter-val="all">[ ALL ]</button>
                <button class="tools-filter-btn active" data-filter-type="chain" data-filter-val="base">[ BASE ]</button>
                <button class="tools-filter-btn" data-filter-type="chain" data-filter-val="ethereum">[ ETH ]</button>
                <span style="width:1px;height:16px;background:rgba(72,73,75,0.3);margin:0 4px;"></span>
                <span style="font-size:10px;letter-spacing:1px;opacity:0.7;margin-right:4px;">ACCESS:</span>
                <button class="tools-filter-btn active" data-filter-type="access" data-filter-val="all">[ ALL ]</button>
                <button class="tools-filter-btn" data-filter-type="access" data-filter-val="open">[ OPEN ]</button>
                <button class="tools-filter-btn" data-filter-type="access" data-filter-val="gated">[ GATED ]</button>
            </div>
            <div id="tools-grid" class="tools-grid"></div>
        </div>

        <div id="tools-tab-agents" style="display:none;flex:1;overflow-y:auto;padding:14px;">
        </div>`;

    const countEl   = body.querySelector('#tools-count');
    const gridEl    = body.querySelector('#tools-grid');
    const agentsTab = body.querySelector('#tools-tab-agents');

    // ── Filter state ─────────────────────────────────────────────
    let activeChain  = 'base';
    let activeAccess = 'all';

    body.querySelectorAll('.tools-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.filterType;
            const val  = btn.dataset.filterVal;
            if (type === 'chain')  activeChain  = val;
            else                   activeAccess = val;

            body.querySelectorAll(`.tools-filter-btn[data-filter-type="${type}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (type === 'chain' && val === 'ethereum') _loadChain('ethereum');
            _renderGrid();
        });
    });

    // ── Tab switching ─────────────────────────────────────────────
    body.querySelectorAll('.window-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            body.querySelectorAll('.window-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            body.querySelector('#tools-tab-store').style.display  = btn.dataset.tab === 'store'  ? 'flex' : 'none';
            body.querySelector('#tools-tab-agents').style.display = btn.dataset.tab === 'agents' ? 'block' : 'none';
            if (btn.dataset.tab === 'agents') _renderAgents();
        });
    });

    // ── Collect all cached tools ──────────────────────────────────
    const _allTools = () => {
        const all = [];
        for (const chain of ['base', 'ethereum']) {
            const list = window._nexusState.tools[chain] ?? [];
            list.forEach(t => { if (!all.find(x => x.id === t.id && x.chain === t.chain)) all.push(t); });
        }
        return all;
    };

    // ── Grid renderer ─────────────────────────────────────────────
    const _renderGrid = () => {
        let tools = _allTools();

        if (activeChain  !== 'all')   tools = tools.filter(t => t.chain === activeChain);
        if (activeAccess === 'open')  tools = tools.filter(t => !t.isGated);
        if (activeAccess === 'gated') tools = tools.filter(t =>  !!t.isGated);

        if (!tools.length) {
            const isLoading = window._nexusState.loading?.base || window._nexusState.loading?.ethereum;
            gridEl.innerHTML = `<div style="padding:20px;font-size:10px;letter-spacing:1px;opacity:0.6;">${isLoading ? '>> SCANNING...' : '>> NO TOOLS FOUND'}</div>`;
            countEl.textContent = '';
            return;
        }

        countEl.textContent = `${tools.length} TOOLS`;
        gridEl.innerHTML = tools.map(t => {
            const kind      = (t.manifest?.type ?? 'headless').toUpperCase();
            const isGated   = !!t.isGated;
            const gateBadge = isGated
                ? `<span class="tools-badge tools-badge-gated">[GATED]</span>`
                : `<span class="tools-badge tools-badge-free">[FREE]</span>`;
            const normBadge = _isNormiesLinked(t)
                ? `<span class="tools-badge" style="border:1px solid #48494b;padding:1px 5px;font-size:9px;letter-spacing:0.5px;">[NORMIES]</span>`
                : '';
            const creator = t.creator ? `${t.creator.slice(0,6)}...${t.creator.slice(-4)}` : '—';
            return `
            <div class="tools-card" data-tool-id="${t.id}" data-chain="${t.chain}">
                <div class="tools-card-header">
                    <span class="tools-card-name">${t.name.toUpperCase()}</span>
                    <span style="font-size:9px;letter-spacing:0.5px;opacity:0.65;">${kind}</span>
                </div>
                <div class="tools-card-creator">by ${creator} · #${t.id} · ${t.chain.toUpperCase()}</div>
                <div class="tools-card-desc">${t.desc ?? '—'}</div>
                <div class="tools-card-footer">
                    <div style="display:flex;gap:5px;align-items:center;">${gateBadge}${normBadge}</div>
                    <button class="tools-launch-btn">${launchLabel}</button>
                </div>
            </div>`;
        }).join('');

        gridEl.querySelectorAll('.tools-card').forEach(card => {
            const tid = parseInt(card.dataset.toolId);
            const ch  = card.dataset.chain;
            card.querySelector('.tools-launch-btn')?.addEventListener('click', () => window.launchTool(tid, ch));
        });
    };

    // ── MY AGENTS renderer ────────────────────────────────────────
    const _renderAgents = () => {
        const alpha  = window.NormieState?.alpha;
        const linked = _allTools().filter(_isNormiesLinked);

        let html = '';
        if (alpha?.id) {
            const attrs     = alpha.metadata?.attributes ?? [];
            const agentName = window.currentAgentPersona?.name ?? `NORMIE #${alpha.id}`;
            const level     = window.currentAlphaLevel ?? attrs.find(a => a.trait_type === 'Level')?.value ?? 1;
            const ap        = window.currentAlphaAP ?? attrs.find(a => a.trait_type === 'Action Points')?.value ?? 100;
            html += `
            <div style="border:2px solid #48494b;padding:12px 14px;margin-bottom:14px;">
                <div style="font-size:10px;letter-spacing:1px;opacity:0.6;margin-bottom:6px;">ALPHA AGENT</div>
                <div style="font-weight:bold;letter-spacing:1px;font-size:13px;margin-bottom:4px;">${agentName.toUpperCase()}</div>
                <div style="font-size:10px;opacity:0.7;">ID: #${alpha.id} · Level ${level} · AP ${ap}</div>
                ${alpha.agent_binding?.agentId ? `<div style="font-size:10px;opacity:0.7;margin-top:2px;">Agent: #${alpha.agent_binding.agentId} · <span style="font-weight:bold;">AWAKENED</span></div>` : '<div style="font-size:10px;opacity:0.55;margin-top:2px;">DORMANT — no agent binding</div>'}
            </div>`;
        } else {
            html += `<div style="font-size:10px;opacity:0.6;margin-bottom:14px;letter-spacing:1px;">NO WALLET CONNECTED</div>`;
        }

        if (linked.length) {
            html += `<div style="font-size:10px;letter-spacing:1px;opacity:0.6;margin-bottom:8px;">NORMIES-LINKED TOOLS — ${linked.length}</div>`;
            html += linked.map(t => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(72,73,75,0.18);cursor:default;" data-tool-id="${t.id}" data-chain="${t.chain}">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:11px;font-weight:bold;letter-spacing:0.5px;">${t.name.toUpperCase()}</div>
                    <div style="font-size:10px;opacity:0.65;">#${t.id} · ${t.chain.toUpperCase()} · ${t.isGated ? 'GATED' : 'FREE'}</div>
                </div>
                <button class="tools-launch-btn" style="font-size:10px;padding:4px 10px;">${launchLabel}</button>
            </div>`).join('');
        } else {
            html += `<div style="font-size:10px;opacity:0.6;letter-spacing:1px;">>> NO NORMIES-LINKED TOOLS IN CACHE<br><span style="opacity:0.7;font-size:9px;">Open TOOLS STORE to load the registry first.</span></div>`;
        }

        agentsTab.innerHTML = html;
        agentsTab.querySelectorAll('[data-tool-id]').forEach(row => {
            const tid = parseInt(row.dataset.toolId);
            const ch  = row.dataset.chain;
            row.querySelector('.tools-launch-btn')?.addEventListener('click', () => window.launchTool(tid, ch));
        });
    };

    // ── Initial load ──────────────────────────────────────────────
    const _loadChain = async (chain) => {
        const reg = window.ERC8257;
        if (!reg || window._nexusState.loading[chain]) return;
        if (window._nexusState.tools[chain]?.length) { _renderGrid(); return; }

        window._nexusState.loading[chain] = true;
        _renderGrid();

        const wallet = window.currentWalletAddress ?? '';
        const tools  = [];

        try {
            const total = await reg.getToolCount(chain);
            countEl.textContent = `[ SCANNING 0 / ${total} ]`;

            for (let i = 1; i <= Math.min(total, 60); i++) {
                if (!body.closest('.os-window')) break;
                if (i > 1) await new Promise(r => setTimeout(r, 200));
                let config, manifest;
                try {
                    config   = await reg.getToolConfig(i, chain);
                    if (!config) continue;
                    manifest = await reg.fetchManifest(config.metadataURI);
                } catch { continue; }
                if (!manifest?.name?.trim()) continue;
                if (/^tool\s*#?\d+$/i.test(manifest.name.trim()) && !manifest.description) continue;

                const name     = manifest.name.trim();
                const desc     = manifest.description?.trim().slice(0, 160) || `Tool | ID: #${i}`;
                const endpoint = manifest.endpoint ?? config.metadataURI;

                let access = null;
                if (wallet && config.isGated) {
                    const { ok, granted } = await reg.checkAccess(i, wallet, chain).catch(() => ({ ok: false, granted: false }));
                    if (ok) access = granted;
                }

                tools.push({ id: i, name, desc, endpoint, manifest, ...config, chainId: chain === 'base' ? 8453 : 1, chain, access });
                _renderGrid();
            }

            window._nexusState.tools[chain] = _toolsDedupe(tools);
            _renderGrid();
        } catch (err) {
            if (!tools.length) {
                gridEl.innerHTML = `<div style="padding:14px;font-size:10px;"><div style="font-weight:bold;margin-bottom:6px;letter-spacing:1px;">REGISTRY UNREACHABLE</div><div style="opacity:0.6;">${window.escapeHTML(err.message)}</div></div>`;
            }
        } finally {
            window._nexusState.loading[chain] = false;
        }
    };

    _renderGrid();
    _loadChain('base');
}

window.openTools = openTools;
