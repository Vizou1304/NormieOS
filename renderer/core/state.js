// renderer/core/state.js — NormieEventBus
// Lightweight pub/sub for cross-app communication.
// Any app can emit events; any app can subscribe.
// All event names are namespaced: 'app:action'

class NormieEventBus {
    constructor() { this._h = {}; }

    on(event, cb) {
        if (!this._h[event]) this._h[event] = [];
        this._h[event].push(cb);
        return () => this.off(event, cb); // returns unsubscribe fn
    }

    off(event, cb) {
        if (this._h[event]) this._h[event] = this._h[event].filter(f => f !== cb);
    }

    emit(event, data) {
        (this._h[event] || []).forEach(cb => { try { cb(data); } catch {} });
    }
}

window.NormieBus = new NormieEventBus();

// ── Canonical event catalog (documentation) ──────────────────
// combat:result      { winner, loser, rounds, winnerTid, loserTid }
// combat:start       { fighterA, fighterB }
// cortex:message     { role, text, agentId }
// hive:query         { topic, responses[] }
// guard:alert        { tokenId, type, ts }
// emergence:complete { agentCount, canvasLayerCount }
// ledger:update      { wallet, totalAP, burns, profile }
// burn:detected      { tokenId, txHash }
// agent:awakened     { tokenId, agentId }
// notif:show         { type, message, appTarget }
