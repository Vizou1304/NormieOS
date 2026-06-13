function openNormieGuard() {
    const SHIELD = `<svg viewBox="0 0 16 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" style="width:40px;height:40px;fill:#e3e5e4;">
        <rect x="4" y="0" width="8" height="1"/><rect x="2" y="1" width="12" height="1"/>
        <rect x="1" y="2" width="14" height="6"/><rect x="2" y="8" width="12" height="1"/>
        <rect x="3" y="9" width="10" height="1"/><rect x="4" y="10" width="8" height="1"/>
        <rect x="5" y="11" width="6" height="1"/><rect x="6" y="12" width="4" height="1"/>
        <rect x="7" y="13" width="2" height="1"/>
    </svg>`;
    const body = window.createNativeWindow('GUARD', `
        <div style="font-family:'Courier New',monospace;color:#48494b;font-size:11px;padding:0;">
            <div style="background:#48494b;color:#e3e5e4;padding:10px 14px;display:flex;align-items:center;gap:14px;">
                ${SHIELD}
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:bold;letter-spacing:2px;">NORMIE GUARD</div>
                    <div style="font-size:10px;letter-spacing:1px;margin-top:2px;">● ACTIVE — WALLET PROTECTION</div>
                </div>
                <div style="font-size:10px;text-align:right;opacity:0.7;" id="ng-uptime">UPTIME 00:00</div>
            </div>
            <div style="padding:10px 14px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #48494b;">
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);border-right:1px solid rgba(72,73,75,0.2);font-weight:bold;font-size:10px;">WALLET SCAN</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);" id="ng-lastscan">--</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);border-right:1px solid rgba(72,73,75,0.2);font-weight:bold;font-size:10px;">NFT INTEGRITY</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);" id="ng-nftcount">--</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);border-right:1px solid rgba(72,73,75,0.2);font-weight:bold;font-size:10px;">APPROVALS</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);" id="ng-approvals">OK</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);border-right:1px solid rgba(72,73,75,0.2);font-weight:bold;font-size:10px;">CANVAS WATCH</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);" id="ng-canvas">OK</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);border-right:1px solid rgba(72,73,75,0.2);font-weight:bold;font-size:10px;">BURN ACTIVITY</div>
                    <div style="padding:6px 10px;border-bottom:1px solid rgba(72,73,75,0.2);" id="ng-burn">--</div>
                    <div style="padding:6px 10px;border-right:1px solid rgba(72,73,75,0.2);font-weight:bold;font-size:10px;">LAST THREAT</div>
                    <div style="padding:6px 10px;" id="ng-threat">NONE</div>
                </div>
            </div>
        </div>
    `);

    const win = body.closest('.os-window');
    if (win) { win.style.width = '340px'; win.style.height = 'auto'; }

    const startTs = Date.now();

    const fmt = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-GB', { hour12: false });
    };
    const fmtUptime = () => {
        const s = Math.floor((Date.now() - startTs) / 1000);
        return `UPTIME ${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    };

    const poll = async () => {
        const addr = window.currentWalletAddress;
        if (!addr) return;
        try {
            const ids = await window.fetchHolderTokenIds(addr);
            const el = body.querySelector('#ng-nftcount');
            if (el) el.textContent = `${ids.length} NORMIE${ids.length !== 1 ? 'S' : ''} — INTACT`;
        } catch { const el = body.querySelector('#ng-nftcount'); if (el) el.textContent = 'API ERROR'; }
        const ls = body.querySelector('#ng-lastscan');
        if (ls) ls.textContent = fmt(Date.now());
    };

    if (window._normieGuard) {
        window._normieGuard.onAlert(alert => {
            const el = body.querySelector('#ng-threat');
            if (el) el.textContent = `NORMIE #${alert.tokenId} GONE — ${fmt(alert.ts)}`;
            if (el) { el.style.fontWeight = 'bold'; el.style.letterSpacing = '2px'; el.style.animation = 'blink 0.8s step-end infinite'; }
            window.NormieBus?.emit('guard:alert', { tokenId: alert.tokenId, type: 'NFT_GONE', ts: Date.now() });
        });
    }

    poll();
    const scanTimer = setInterval(poll, 30_000);
    const uptimeTimer = setInterval(() => {
        const el = body.querySelector('#ng-uptime');
        if (el) el.textContent = fmtUptime();
    }, 1000);

    const closeBtn = win?.querySelector('.window-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        clearInterval(scanTimer);
        clearInterval(uptimeTimer);
    }, { once: true });
}
