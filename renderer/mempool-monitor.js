// mempool-monitor.js
// MempoolMonitor — WebSocket, LED flashes on Normies contract activity
// NormieGuard    — REST polling, detects NFT disappearance
// NormiesActivityWatcher — REST polling, LED on burn/transform/agent changes

const METHOD_LABELS = {
    '0xa9059cbb': 'TRANSFER',
    '0x23b872dd': 'TRANSFER_FROM',
    '0x42842e0e': 'SAFE_TRANSFER',
    '0x095ea7b3': 'APPROVE',
    '0xa22cb465': 'SET_APPROVAL_ALL',
    '0x7b7d6a71': 'CANVAS_EDIT',
    '0x42966c68': 'BURN',
    '0x6352211e': 'DELEGATE',
};

const NORMIES_CONTRACTS = new Set([
    '0x9eb6e2025b64f340691e424b7fe7022ffde12438',
    '0x64951d92e345c50381267380e2975f66810e869c',
]);

// ── LED helper ────────────────────────────────────────────────────────────────
function flashLED() {
    const led = document.getElementById('mempool-led');
    if (!led) return;
    led.style.opacity    = '1';
    led.style.background = '#e3e5e4';
    setTimeout(() => { led.style.opacity = '0.3'; led.style.background = '#48494b'; }, 200);
}

// ── MempoolMonitor ────────────────────────────────────────────────────────────
// WebSocket subscription — emits TICK on each pending tx (used by wallpaper).
// Configure: window.MEMPOOL_WS_URL = 'wss://...'

export class MempoolMonitor {
    constructor(wsUrl) {
        this.wsUrl     = wsUrl || '';
        this.ws        = null;
        this.callbacks = [];
        this.connected = false;
        this._subId    = null;
        this._idCtr    = 1;   // subscription uses id:1; _checkTx starts at 2
        this._pending  = new Map();
    }

    onActivity(cb) { this.callbacks.push(cb); }
    _emit(event)   { this.callbacks.forEach(cb => cb(event)); }

    connect() {
        if (!this.wsUrl) {
            console.warn('[Mempool] No WS URL. Set window.MEMPOOL_WS_URL.');
            return false;
        }
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            this.connected = true;
            this.ws.send(JSON.stringify({
                jsonrpc: '2.0', id: 1, method: 'eth_subscribe',
                params: ['newPendingTransactions'],
            }));
        };

        this.ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data);

                if (msg.id === 1 && msg.result) {
                    this._subId = msg.result;
                    return;
                }

                if (msg.id && this._pending.has(msg.id)) {
                    this._pending.get(msg.id)(msg.result);
                    this._pending.delete(msg.id);
                    return;
                }

                if (msg.method === 'eth_subscription' && msg.params?.result) {
                    const hash = msg.params.result;
                    this._emit({ type: 'TICK', ts: Date.now() });
                    this._checkTx(hash);
                }
            } catch {}
        };

        this.ws.onclose = () => { this.connected = false; };
        this.ws.onerror = (e) => { console.error('[Mempool] WS error', e); };
        return true;
    }

    _checkTx(hash) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const id = ++this._idCtr;
        this._pending.set(id, (tx) => {
            if (tx?.to && NORMIES_CONTRACTS.has(tx.to.toLowerCase())) {
                flashLED();
            }
        });
        this.ws.send(JSON.stringify({
            jsonrpc: '2.0', id, method: 'eth_getTransactionByHash', params: [hash],
        }));
    }

    disconnect() {
        if (this.ws) { this.ws.close(); this.ws = null; }
        this.connected = false;
        this._pending.clear();
    }
}

// ── NormieGuard ───────────────────────────────────────────────────────────────
// Polls /holders/:address every 30s via REST.
// Emits { type: 'NFT_GONE', tokenId, ts } when a token disappears from wallet.

export class NormieGuard {
    constructor(walletAddress, apiBase) {
        this.address   = walletAddress;
        this.apiBase   = apiBase || 'https://api.normies.art';
        this._snapshot = null; // Set<number>
        this._interval = null;
        this.callbacks = [];
    }

    onAlert(cb) { this.callbacks.push(cb); }
    _emit(alert) { this.callbacks.forEach(cb => cb(alert)); }

    start() {
        if (this._interval) return;
        this._poll();
        this._interval = setInterval(() => this._poll(), 30_000);
    }

    stop() {
        if (this._interval) { clearInterval(this._interval); this._interval = null; }
    }

    async _poll() {
        if (!this.address) return;
        try {
            const res  = await fetch(`${this.apiBase}/holders/${this.address}`);
            if (!res.ok) return;
            const data = await res.json();
            const ids  = new Set(
                (Array.isArray(data) ? data : (data.tokenIds ?? data.ids ?? []))
                .map(String)
            );

            if (this._snapshot === null) {
                this._snapshot = ids;
                return;
            }

            for (const id of this._snapshot) {
                if (!ids.has(id)) {
                    this._emit({ type: 'NFT_GONE', tokenId: id, ts: Date.now() });
                }
            }

            this._snapshot = ids;
        } catch (e) {
            console.warn('[NormieGuard] poll error', e);
        }
    }
}

// ── NormiesActivityWatcher ────────────────────────────────────────────────────
// Polls /history/stats and /agents/count every 30s.
// On first poll: stores snapshot. On change: flashes LED + emits { type, delta }.

export class NormiesActivityWatcher {
    constructor(apiBase) {
        this.apiBase   = apiBase || 'https://api.normies.art';
        this._snapshot = null;
        this._interval = null;
        this.callbacks = [];
    }

    onActivity(cb) { this.callbacks.push(cb); }
    _emit(event)   { this.callbacks.forEach(cb => cb(event)); }

    start() {
        if (this._interval) return;
        this._poll();
        this._interval = setInterval(() => this._poll(), 30_000);
    }

    stop() {
        if (this._interval) { clearInterval(this._interval); this._interval = null; }
    }

    async _poll() {
        try {
            const [statsRes, countRes] = await Promise.all([
                fetch(`${this.apiBase}/history/stats`),
                fetch(`${this.apiBase}/agents/count`),
            ]);
            if (!statsRes.ok || !countRes.ok) return;
            const stats     = await statsRes.json();
            const countData = await countRes.json();

            const current = {
                totalBurnedTokens: stats.totalBurnedTokens ?? stats.burned        ?? 0,
                totalTransforms:   stats.totalTransforms   ?? stats.transforms    ?? 0,
                count:             countData.count         ?? countData.total      ?? 0,
            };

            if (this._snapshot === null) {
                this._snapshot = current;
                return;
            }

            const events = [];
            if (current.totalBurnedTokens !== this._snapshot.totalBurnedTokens)
                events.push({ type: 'BURN',      delta: current.totalBurnedTokens - this._snapshot.totalBurnedTokens });
            if (current.totalTransforms !== this._snapshot.totalTransforms)
                events.push({ type: 'TRANSFORM', delta: current.totalTransforms   - this._snapshot.totalTransforms });
            if (current.count !== this._snapshot.count)
                events.push({ type: 'AGENT',     delta: current.count             - this._snapshot.count });

            if (events.length > 0) {
                flashLED();
                events.forEach(e => this._emit(e));
            }

            this._snapshot = current;
        } catch (e) {
            console.warn('[NormiesActivityWatcher] poll error', e);
        }
    }
}

// ── showMempoolAlert ──────────────────────────────────────────────────────────

export function showMempoolAlert(event) {
    const existing = document.getElementById('mempool-alert');
    if (existing) existing.remove();

    const isDrain = event.isOwner && (event.method === 'APPROVE' || event.method === 'SET_APPROVAL_ALL');
    const border  = '#e3e5e4';
    const size    = event.isOwner ? '13px' : '11px';
    const prefix  = isDrain
        ? '<strong>🚨 DRAIN RISK — APPROVAL DETECTED</strong><br>'
        : event.isOwner
            ? '<strong>⚠️ YOUR WALLET —</strong><br>'
            : '⚡ MEMPOOL ACTIVITY<br>';

    const el = document.createElement('div');
    el.id = 'mempool-alert';
    el.style.cssText = `
        position:fixed; bottom:50px; right:16px; z-index:9000;
        background:#48494b; color:#e3e5e4;
        font-family:'Courier New',monospace; font-size:${size};
        padding:10px 14px; border:2px solid ${border};
        animation:blink 0.4s step-end 3;
        max-width:320px; line-height:1.6;
    `;
    el.innerHTML = `
        ${prefix}
        CONTRACT: ${event.contract}<br>
        METHOD: ${event.method}<br>
        FROM: ${event.from.slice(0, 10)}...<br>
        TX: ${event.hash.slice(0, 14)}...
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), event.isOwner ? 12000 : 6000);
}
