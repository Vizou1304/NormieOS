async function openAwakening() {
    const body = window.createNativeWindow('AWAKENING', '<div class="native-loading">>> SCANNING AGENTS...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '560px'; win.style.height = '520px'; }

    const ids = window.allNormieIds ?? (window.currentAlphaId ? [window.currentAlphaId] : []);
    if (!ids.length) {
        body.innerHTML = '<div class="native-loading">>> NO NORMIES FOUND</div>';
        return;
    }

    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.padding = '0';
    body.innerHTML = '<div class="native-loading">>> CHECKING BINDINGS...</div>';

    const wallet = window.currentWalletAddress ?? '';
    const walletShort = wallet ? window.fmtWallet(wallet) : '???';

    const [rows, statsRes] = await Promise.all([
        Promise.all(ids.map(async id => {
            let awakened = false;
            let name = `NORMIE #${id}`;
            try {
                const meta = window.NormieState?.allMetadata?.[String(id)] ?? await fetch(`${window.API}/normie/${id}/metadata`).then(r => r.json());
                if (meta?.name) name = meta.name;
            } catch {}
            try {
                const data = await window.fetchAgentBinding(id);
                const agentId = data?.binding?.agentId ?? data?.agentId;
                awakened = !!agentId;
            } catch {}
            return { id, name, awakened };
        })),
        fetch(`${window.API}/history/stats`).catch(() => null)
    ]);

    let stats = null;
    try { stats = await statsRes?.json(); } catch {}

    body.innerHTML = `
        <div style="padding:8px 12px;border-bottom:2px dashed #48494b;font-family:'Courier New',monospace;font-size:11px;color:#48494b;">
            NORMIE AGENTS — ${walletShort}
        </div>
        <div style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;">
            ${rows.map(({ id, name, awakened }) => `
                <div style="width:130px;text-align:center;font-family:'Courier New',monospace;font-size:10px;color:#48494b;border:1px solid #48494b;padding:6px;background:#e3e5e4;">
                    <img src="${window.API}/normie/${id}/image.svg" class="normie-avatar" style="image-rendering:pixelated;display:block;margin:0 auto 4px;">
                    <div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
                    ${awakened
                        ? `<div style="color:#48494b;margin-top:4px;">● AWAKENED</div>`
                        : `<div style="color:#48494b;margin-top:3px;">○ DORMANT</div>
                           <a href="#" style="color:#48494b;font-size:10px;text-decoration:underline;" onclick="window.open('https://www.normies.art/lab');return false;">AWAKEN →</a>`
                    }
                </div>
            `).join('')}
        </div>
        <div style="padding:6px 12px;border-top:2px dashed #48494b;font-family:'Courier New',monospace;font-size:10px;color:#48494b;display:flex;gap:16px;">
            <span>BURNED: ${stats?.totalBurnedTokens ?? '—'}</span>
            <span>TRANSFORMS: ${stats?.totalTransforms ?? '—'}</span>
            <span>AP DISTRIB: ${stats?.totalActionPointsDistributed ?? '—'}</span>
        </div>`;
}
