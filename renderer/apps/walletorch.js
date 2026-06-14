async function openWalletOrchestrator() {
    const body = window.createNativeWindow('CONDUCTOR', '');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '720px'; win.style.height = '520px'; }

    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.padding = '0';
    body.innerHTML = `
        <div style="padding:10px 14px;border-bottom:2px dashed #48494b;font-family:'Courier New',monospace;font-size:11px;display:flex;gap:8px;align-items:center;">
            <input id="wo-addr-input" placeholder="0x... add wallet address" autocomplete="off"
                style="flex:1;border:2px solid #48494b;padding:4px 8px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;outline:none;">
            <button id="wo-add-btn" style="border:2px solid #48494b;padding:4px 10px;font-family:'Courier New',monospace;font-size:11px;background:#48494b;color:#e3e5e4;cursor:pointer;">[ ADD ]</button>
            <button id="wo-scan-btn" style="border:2px solid #48494b;padding:4px 10px;font-family:'Courier New',monospace;font-size:11px;background:#e3e5e4;color:#48494b;cursor:pointer;">[ SCAN ALL ]</button>
        </div>
        <div id="wo-list" style="flex:1;overflow-y:auto;font-family:'Courier New',monospace;font-size:11px;"></div>
        <div style="padding:8px 14px;border-top:2px dashed #48494b;font-size:10px;opacity:0.65;font-family:'Courier New',monospace;">
            DELEGATION & BURN TRANSACTIONS — WALLETCONNECT REQUIRED
        </div>`;

    const wallets  = [];
    const list     = body.querySelector('#wo-list');
    const addBtn   = body.querySelector('#wo-add-btn');
    const scanBtn  = body.querySelector('#wo-scan-btn');
    const addrInput= body.querySelector('#wo-addr-input');

    const renderList = () => {
        list.innerHTML = wallets.length
            ? wallets.map((w, i) => `
                <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px dashed rgba(72,73,75,0.25);">
                    <span style="flex:1;word-break:break-all;">${w.address}</span>
                    <span style="color:#48494b;">${w.count != null ? `${w.count} Normie(s)` : '...'}</span>
                    <span style="color:#48494b;font-size:10px;">${w.delegated === null ? '[UNKNOWN]' : (w.delegated ? '[DELEGATED]' : '[NO DELEG]')}</span>
                    <button data-idx="${i}" class="wo-remove" style="border:1px solid #48494b;padding:2px 6px;font-family:'Courier New',monospace;font-size:10px;background:transparent;cursor:pointer;">×</button>
                </div>`).join('')
            : '<div style="padding:20px;opacity:0.65;">No wallets added. Enter an address above.</div>';
        list.querySelectorAll('.wo-remove').forEach(btn =>
            btn.addEventListener('click', () => { wallets.splice(parseInt(btn.dataset.idx), 1); renderList(); })
        );
    };

    const scanWallet = async (w) => {
        try {
            const res  = await fetch(`${window.API}/holders/${w.address}`);
            const data = await res.json();
            const ids  = data.tokenIds ?? data.ids ?? (Array.isArray(data) ? data : []);
            w.count = ids.length;
            if (ids.length > 0) {
                const info = await (await fetch(`${window.API}/normie/${ids[0]}/canvas/info`)).json();
                w.delegated = !!(info.delegate && info.delegate !== '0x0000000000000000000000000000000000000000');
            } else { w.delegated = false; }
        } catch { w.count = '?'; w.delegated = null; }
        renderList();
    };

    addBtn.addEventListener('click', () => {
        const addr = addrInput.value.trim();
        if (!addr.match(/^0x[0-9a-fA-F]{40}$/)) return;
        if (wallets.find(w => w.address.toLowerCase() === addr.toLowerCase())) return;
        wallets.push({ address: addr, count: null, delegated: null });
        addrInput.value = '';
        renderList();
        scanWallet(wallets[wallets.length - 1]);
    });
    addrInput.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
    scanBtn.addEventListener('click', () => wallets.forEach(scanWallet));
    renderList();
}
