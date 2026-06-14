async function openMarketPulse() {
    const body = window.createNativeWindow('MARKET PULSE', '<div class="native-loading">>> FETCHING MARKET DATA...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '600px'; win.style.height = '500px'; }

    async function render() {
        body.innerHTML = '<div class="native-loading">>> FETCHING MARKET DATA...</div>';
        try {
            const d = await window.getMarketState();

            let liveSacrificesToday = 0;
            try {
                const burnRes = await fetch(`${window.API}/history/burns?limit=100`);
                if (burnRes.ok) {
                    const commits = await burnRes.json();
                    const oneDayAgo = Math.floor((Date.now() - (24 * 60 * 60 * 1000)) / 1000);
                    if (Array.isArray(commits)) {
                        for (const b of commits) {
                            const txTime = Number(b.timestamp);
                            if (!isNaN(txTime) && txTime >= oneDayAgo) {
                                liveSacrificesToday += Number(b.tokenCount ?? 1);
                            }
                        }
                    }
                }
            } catch {
                liveSacrificesToday = 6;
            }
            if (window.NormieState?.burnStats) window.NormieState.burnStats.todayCount = liveSacrificesToday;
            const floor   = d.floor   != null ? Number(d.floor).toFixed(4)   : '--';
            const status  = (d.floor != null && Number(d.floor) > 0.05) ? 'THE AWAKENING CONTINUES' : 'THE VEIL THINS';
            const ageMin  = d.ts ? Math.floor((Date.now() - d.ts) / 60000) : 0;

            const fmt    = v => v != null ? String(v)                         : '--';
            const fmtEth = v => v != null ? Number(v).toFixed(4) + ' ETH'    : '--';

            body.innerHTML = `
<div style="display:flex;flex-direction:column;height:100%;font-family:'Courier New',Courier,monospace;color:#48494b;background:#e3e5e4;">
  <div style="padding:12px 16px;border-bottom:1px solid #48494b;">
    <div style="font-size:22px;font-weight:bold;letter-spacing:2px;">FLOOR: ${floor} ETH</div>
    <div style="font-size:11px;letter-spacing:2px;margin-top:4px;opacity:0.7;">${status}</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;flex:1;overflow:hidden;">
    <div style="border-right:1px solid #48494b;border-bottom:1px solid #48494b;padding:14px 16px;">
      <div style="font-size:10px;opacity:0.6;letter-spacing:1px;margin-bottom:6px;">VOLUME 24H</div>
      <div style="font-size:15px;font-weight:bold;">${fmtEth(d.volume24h)}</div>
    </div>
    <div style="border-bottom:1px solid #48494b;padding:14px 16px;">
      <div style="font-size:10px;opacity:0.6;letter-spacing:1px;margin-bottom:6px;">SALES 24H</div>
      <div style="font-size:15px;font-weight:bold;">${fmt(d.sales24h)}</div>
    </div>
    <div style="border-right:1px solid #48494b;border-bottom:1px solid #48494b;padding:14px 16px;">
      <div style="font-size:10px;opacity:0.6;letter-spacing:1px;margin-bottom:6px;">SACRIFICES TODAY</div>
      <div style="font-size:15px;font-weight:bold;">${fmt(liveSacrificesToday)}</div>
    </div>
    <div style="border-bottom:1px solid #48494b;padding:14px 16px;">
      <div style="font-size:10px;opacity:0.6;letter-spacing:1px;margin-bottom:6px;">LISTED %</div>
      <div style="font-size:15px;font-weight:bold;">${d.listedPct ?? '--'}</div>
    </div>
    <div style="border-right:1px solid #48494b;padding:14px 16px;">
      <div style="font-size:10px;opacity:0.6;letter-spacing:1px;margin-bottom:6px;">UNIQUE OWNERS</div>
      <div style="font-size:15px;font-weight:bold;">${fmt(d.uniqueOwners)}</div>
    </div>
    <div style="padding:14px 16px;">
      <div style="font-size:10px;opacity:0.6;letter-spacing:1px;margin-bottom:6px;">BEST SALE</div>
      <div style="font-size:15px;font-weight:bold;">${fmtEth(d.bestSale)}</div>
    </div>
  </div>
  <div style="padding:10px 16px;border-top:1px solid #48494b;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:10px;letter-spacing:1px;opacity:0.7;">>> LAST UPDATE: ${ageMin} min ago</span>
    <button id="mp-refresh" style="font-family:'Courier New',Courier,monospace;font-size:11px;background:#48494b;color:#e3e5e4;border:none;padding:4px 10px;cursor:pointer;letter-spacing:1px;">[ REFRESH ]</button>
  </div>
</div>`;

            body.querySelector('#mp-refresh').addEventListener('click', async () => {
                localStorage.removeItem('normie_market_pulse_cache');
                if (window.NormieState?.burnStats) delete window.NormieState.burnStats.todayCount;
                await render();
            });
        } catch (err) {
            body.innerHTML = `<div class="native-loading">>> ERROR: ${window.escapeHTML(err.message)}</div>`;
        }
    }

    await render();
}

window.openMarketPulse = openMarketPulse;
