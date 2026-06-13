async function openPortfolio() {
    const body = window.createNativeWindow('LEDGER', '<div class="native-loading">>> ANALYZING WALLET PRESTIGE...</div>');
    try {
        const ns = window.NormieState;
        const tokenIds = ns?.normieIds?.length ? ns.normieIds : (() => { throw new Error('NormieState not ready'); })();

        if (!tokenIds.length) {
            body.innerHTML = '<div class="native-loading">>> NO NORMIES FOUND</div>';
            return;
        }

        const metas = tokenIds.map(id => ns.allMetadata?.[String(id)] ?? window.NormieCache.get(`meta_${id}`));

        const valid    = metas.filter(Boolean);
        const getAttr  = (m, key) => Number(m?.attributes?.find(a => String(a.trait_type).toLowerCase() === key.toLowerCase())?.value ?? 0);

        const totalAP     = valid.reduce((s, m) => s + getAttr(m, 'Action Points'), 0);
        const totalPixels = valid.reduce((s, m) => s + getAttr(m, 'Pixel Count'), 0);
        const avgLvl      = valid.length ? (valid.reduce((s, m) => s + getAttr(m, 'Level'), 0) / valid.length).toFixed(1) : 0;

        const makeBar = (val, max, length = 15) => {
            const filled = Math.min(length, Math.floor((val / max) * length));
            return '█'.repeat(filled) + '░'.repeat(length - filled);
        };

        const walletAddr = window.currentWalletAddress || '';

        const loadingEl = body.querySelector('.native-loading');

        // Collector profile from on-chain behavior
        let burnCount = 0, awakenedCount = 0;

        if (loadingEl) loadingEl.textContent = '>> SYNCING BURNS PROTOCOL...';
        try {
            const burnsRes = await fetch(`${window.API}/history/burns/address/${walletAddr}`);
            const bd = await burnsRes.json();
            const all = Array.isArray(bd) ? bd : (bd.burns ?? bd.data ?? []);
            burnCount = all.reduce((s,b) => s + Number(b.tokenCount ?? b.token_count ?? 1), 0);
        } catch {}

        if (loadingEl) loadingEl.textContent = '>> FETCHING AGENT BINDINGS...';
        try {
            const agentsRes = await fetch(`${window.API}/agents/binding/${window.currentAlphaId}`);
            const ad = await agentsRes.json();
            awakenedCount = ad?.binding ? 1 : 0;
        } catch {}

        const score = (tokenIds.length * 50) + (burnCount * 40) + (totalAP * 1.5) + (Math.log1p(totalPixels) * 150);
        let tierName = 'IRON';
        if (score >= 10000)     tierName = 'MYTHIC';
        else if (score >= 3000) tierName = 'GOLD';
        else if (score >= 1000) tierName = 'SILVER';

        let profile, profileDesc;
        if (score >= 10000)             { profile = 'MAÎTRE PIXELISTE';   profileDesc = 'Légende du canvas, sculpteur d\'âmes numériques.'; }
        else if (burnCount >= 15)       { profile = 'BRÛLEUR LÉGENDAIRE'; profileDesc = 'Sacrifice et création — tes pixels vivent deux fois.'; }
        else if (tokenIds.length >= 30) { profile = 'GARDIEN DU LEDGER';  profileDesc = 'Gardien des Normies, moteur de l\'écosystème.'; }
        else if (totalPixels >= 600)    { profile = 'ARTISTE ÉVEILLÉ';    profileDesc = 'Tes pixels parlent pour toi. Art et action fusionnent.'; }
        else                            { profile = 'INITIATE';            profileDesc = 'Bienvenue dans le pixel. Chaque Normie compte, chaque pixel compte.'; }

        body.innerHTML = `
            <div class="pf-container">
                <div class="pf-header">
                    <div class="pf-rank">${tierName}</div>
                    <div class="pf-address">${window.fmtWallet(walletAddr)}</div>
                </div>
                <div class="pf-stats">
                    <div class="pf-row">
                        <span>HOLDINGS</span>
                        <span>${tokenIds.length} NORMIES</span>
                    </div>
                    <div class="pf-row">
                        <span>ACTION POINTS</span>
                        <span class="pf-bar">${makeBar(totalAP, 150)} ${totalAP}</span>
                    </div>
                    <div class="pf-row">
                        <span>PIXELS PAINTED</span>
                        <span class="pf-bar">${makeBar(totalPixels, 1600)} ${totalPixels}</span>
                    </div>
                    <div class="pf-row">
                        <span>AVG LEVEL</span>
                        <span class="pf-bar">${makeBar(avgLvl, 10, 10)} Lvl ${avgLvl}</span>
                    </div>
                    <div class="pf-row">
                        <span>BURNS</span>
                        <span>${burnCount} sacrifice${burnCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div style="margin:8px 12px;padding:8px;border:2px solid #48494b;font-family:'Courier New',monospace;font-size:10px;color:#48494b;">
                    <div style="font-size:12px;font-weight:bold;letter-spacing:2px;margin-bottom:4px;">${profile}</div>
                    <div style="opacity:0.7;">${profileDesc}</div>
                </div>
                <div class="pf-footer">
                    >> STATUS: ${totalAP > 0 ? 'ACTIVE BUILDER' : 'PASSIVE HOLDER'}
                </div>
                <div id="pf-live-feed" style="padding:6px 12px;font-size:10px;letter-spacing:1px;opacity:0.6;border-top:1px dashed rgba(72,73,75,0.3);min-height:18px;"></div>
            </div>`;

        // ── Live feed: réagit aux events inter-app via NormieBus ──
        const feed = body.querySelector('#pf-live-feed');
        const showFeed = msg => { if (feed) feed.textContent = msg; };
        const unsub = [];
        if (window.NormieBus) {
            unsub.push(window.NormieBus.on('combat:result', d => showFeed(`LAST COMBAT: ${d.winner} defeated ${d.loser}`)));
            unsub.push(window.NormieBus.on('guard:alert',   d => showFeed(`!! ALERT: NORMIE #${d.tokenId} LEFT WALLET`)));
            unsub.push(window.NormieBus.on('emergence:complete', d => showFeed(`EMERGENCE: ${d.agentCount} agents forged canvas`)));
        }
        // Cleanup on window close
        body.closest('.os-window')?.querySelector('.window-close')?.addEventListener('click', () => unsub.forEach(u => u()), { once: true });

    } catch (err) {
        body.innerHTML = `<div class="native-loading">>> ERROR: ${err.message}</div>`;
    }
}

window.openPortfolio = openPortfolio;