function openTerminal() {
    const body = window.createNativeWindow('SHELL', '');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '640px'; win.style.height = '420px'; }

    body.style.padding = '0';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.background = '#e3e5e4';
    body.style.color = '#48494b';
    body.style.height = '100%';

    body.innerHTML = `
        <div id="term-output" style="flex:1;overflow-y:auto;padding:10px;font-family:'Courier New',monospace;font-size:12px;color:#48494b;white-space:pre-wrap;"></div>
        <div style="display:flex;border-top:2px solid #48494b;padding:6px 10px;gap:6px;background:#e3e5e4;">
            <span style="color:#48494b;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;">&gt;&nbsp;</span>
            <input id="term-input" type="text" autocomplete="off" spellcheck="false"
                style="flex:1;background:transparent;border:none;outline:none;color:#48494b;caret-color:#48494b;font-family:'Courier New',monospace;font-size:12px;">
        </div>
        <canvas id="term-canvas" width="40" height="40" style="display:none;image-rendering:pixelated;width:120px;height:120px;margin:10px auto;"></canvas>
    `;

    const output = body.querySelector('#term-output');
    const input  = body.querySelector('#term-input');
    const canvas = body.querySelector('#term-canvas');

    const print = (text) => {
        const div = document.createElement('div');
        div.innerText = text;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    };

    print('NORMIEOS TERMINAL v1.0');
    print('Type /help for commands.');
    print('');
    input.focus();

    input.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        const cmd = input.value.trim();
        input.value = '';
        print('> ' + cmd);

        if (cmd === '/help') {
            print('  /pixels           — redraw Alpha pixel by pixel');
            print('  /burn-stats       — total Normies burned');
            print('  /zombie-scan      — Alpha status & stamina');
            print('  /traits           — list all Alpha attributes');
            print('  /gas              — Ethereum gas prices');
            print('  /levelup          — canvas info: LVL, AP, CUSTOMIZED');
            print('  /burnlist         — last 10 burns from your wallet');
            print('  /vault            — list all Token IDs in wallet');
            print('  /rankings         — top 10 burners (last 100 burns)');
            print('  /claimzombie      — your burn rank + count vs Top 21');
            print('  /rendertoken [id] — open SVG window of any Token ID');
            print('  /forge            — open PIXELFORGE editor');
            print('  /matrix           — enter the matrix');
            print('  /stop             — stop matrix');
            print('  /audit            — display app registry audit log');
            print('  /clear            — clear terminal');

        } else if (cmd === '/clear') {
            output.innerHTML = '';

        } else if (cmd === '/stop') {
            clearInterval(window.matrixInterval);
            window.matrixInterval = null;
            print('>> MATRIX STOPPED.');

        } else if (cmd === '/pixels') {
            const alphaId = window.currentAlphaId;
            if (!alphaId) { print('ERROR: no Alpha detected. Connect wallet first.'); return; }
            const imgUrl = `${window.API}/normie/${alphaId}/image.svg`;
            canvas.style.display = 'block';
            print(`>> RENDERING ALPHA #${alphaId}...`);
            await window.animateAlphaBuild(imgUrl, canvas);
            print('>> DONE.');

        } else if (cmd === '/burn-stats') {
            print('>> FETCHING BURN DATA...');
            try {
                const res = await fetch(`${window.API}/history/stats`);
                const data = await res.json();
                const total = data.totalBurnedTokens ?? data.totalBurns ?? '?';
                print(`>> TOTAL NORMIES BURNED: ${total}`);
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/zombie-scan') {
            const alphaId = window.currentAlphaId;
            if (!alphaId) { print('ERROR: no Alpha detected.'); return; }
            print(`>> SCANNING #${alphaId}...`);
            try {
                const res = await fetch(`${window.API}/normie/${alphaId}/canvas/info`);
                const data = await res.json();
                print(`   STATUS  : ${data.customized ? 'CUSTOMIZED' : 'ORIGINAL'}`);
                print(`   STAMINA : ${data.actionPoints ?? data.action_points ?? '?'}`);
                print(`   LEVEL   : ${data.level ?? '?'}`);
                print(`   DELEGATE: ${data.delegate ?? 'none'}`);
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/traits') {
            const alphaId = window.currentAlphaId;
            if (!alphaId) { print('ERROR: no Alpha detected.'); return; }
            print(`>> FETCHING TRAITS #${alphaId}...`);
            try {
                const res = await fetch(`${window.API}/normie/${alphaId}/metadata`);
                const meta = await res.json();
                const attrs = Array.isArray(meta.attributes) ? meta.attributes : [];
                attrs.forEach(a => print(`   ${String(a.trait_type).padEnd(16)}: ${a.value}`));
                if (!attrs.length) print('   (no traits found)');
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/gas') {
            print('>> FETCHING GAS...');
            try {
                const res = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
                const data = await res.json();
                const r = data.result;
                print(`   SAFE    : ${r.SafeGasPrice} gwei`);
                print(`   PROPOSE : ${r.ProposeGasPrice} gwei`);
                print(`   FAST    : ${r.FastGasPrice} gwei`);
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/matrix') {
            if (document.getElementById('matrix-overlay')) return;

            const COL_W = 8;
            const PX    = 6;

            const matCanvas = document.createElement('canvas');
            matCanvas.id = 'matrix-overlay';
            matCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;transition:opacity 1s;';
            matCanvas.width  = window.innerWidth;
            matCanvas.height = window.innerHeight;
            document.body.appendChild(matCanvas);
            const ctx = matCanvas.getContext('2d');

            const cols  = Math.floor(matCanvas.width / COL_W);
            const drops = Array.from({ length: cols }, () => Math.random() * -(matCanvas.height / PX));

            window.matrixInterval = setInterval(() => {
                ctx.fillStyle = 'rgba(227,229,228,0.08)';
                ctx.fillRect(0, 0, matCanvas.width, matCanvas.height);
                ctx.fillStyle = '#48494b';
                for (let i = 0; i < drops.length; i++) {
                    const y = Math.floor(drops[i]) * PX;
                    if (y >= 0) ctx.fillRect(i * COL_W, y, PX, PX);
                    if (y > matCanvas.height && Math.random() > 0.95) drops[i] = 0;
                    drops[i] += 0.5 + Math.random() * 0.5;
                }
            }, 30);

            setTimeout(() => { matCanvas.style.opacity = '0'; }, 9000);
            setTimeout(() => {
                clearInterval(window.matrixInterval);
                window.matrixInterval = null;
                matCanvas.remove();
            }, 10000);
            print('>> NORMIES MATRIX — 10s. /stop to exit.');

        } else if (cmd === '/levelup') {
            const alphaId = window.currentAlphaId;
            if (!alphaId) { print('ERROR: no Alpha detected.'); return; }
            print(`>> CANVAS INFO #${alphaId}...`);
            try {
                const res = await fetch(`${window.API}/normie/${alphaId}/canvas/info`);
                const d = await res.json();
                print(`   LVL        : ${d.level ?? '?'}`);
                print(`   AP         : ${d.actionPoints ?? d.action_points ?? '?'}`);
                print(`   CUSTOMIZED : ${d.customized ? 'YES' : 'NO'}`);
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/burnlist') {
            const addr = window.currentWalletAddress;
            if (!addr) { print('ERROR: no wallet connected.'); return; }
            print(`>> BURNS FOR ${window.fmtWallet(addr)}`);
            try {
                const res = await fetch(`${window.API}/history/burns/address/${addr}`);
                const bd = await res.json();
                const all = Array.isArray(bd) ? bd : (bd.burns ?? bd.data ?? []);
                if (!all.length) { print('   (no burns found)'); return; }
                all.slice(0, 10).forEach((b, i) => {
                    const id = b.id ?? b.commitId ?? (i + 1);
                    const tc = b.tokenCount ?? b.token_count ?? '?';
                    const ts = b.timeStamp ?? b.timestamp ?? b.date ?? '';
                    const d  = ts ? new Date(Number(ts) < 1e12 ? Number(ts)*1000 : ts) : null;
                    const time = d && !isNaN(d) ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '—';
                    print(`   #${id}  tokens:${tc}  ${time}`);
                });
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/vault') {
            const addr = window.currentWalletAddress;
            if (!addr) { print('ERROR: no wallet connected.'); return; }
            print(`>> VAULT ${window.fmtWallet(addr)}`);
            try {
                const res = await fetch(`${window.API}/holders/${addr}`);
                const d = await res.json();
                const ids = d.tokenIds ?? d.ids ?? (Array.isArray(d) ? d : []);
                print(`   ${ids.length} Normie(s) : ${ids.join(', ')}`);
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/rankings') {
            print('>> TOP 10 BURNERS (last 100 burns)...');
            try {
                const res = await fetch(`${window.API}/history/burns?limit=100`);
                const data = await res.json();
                const commits = Array.isArray(data) ? data : (data.burns ?? data.data ?? []);
                const tally = {};
                commits.forEach(b => {
                    const addr = (b.burner ?? b.owner ?? b.from ?? b.address ?? '?').toLowerCase();
                    tally[addr] = (tally[addr] || 0) + (Number(b.tokenCount ?? b.token_count ?? 1));
                });
                Object.entries(tally).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([addr, n], i) => {
                    print(`   ${String(i+1).padStart(2,'0')}. ${window.fmtWallet(addr)}  ${n} burn(s)`);
                });
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd === '/claimzombie') {
            const alphaId = window.currentAlphaId;
            const addr = window.currentWalletAddress;
            if (!alphaId || !addr) { print('ERROR: no Alpha detected.'); return; }
            print('>> ZOMBIE ELIGIBILITY CHECK...');
            try {
                const burnsRes = await fetch(`${window.API}/history/burns/address/${addr}`);
                const bd = await burnsRes.json();
                const all = Array.isArray(bd) ? bd : (bd.burns ?? bd.data ?? []);
                const burnCount = all.reduce((s,b) => s + Number(b.tokenCount ?? b.token_count ?? 1), 0);
                const awakened = !!(window.NormieState?.bindings?.[String(alphaId)]);
                const THRESHOLD = 20;
                print(`   BURNS      : ${burnCount} / ${THRESHOLD}`);
                print(`   AGENT      : ${awakened ? '● AWAKENED' : '○ DORMANT'}`);
                print(`   STATUS     : ${burnCount >= THRESHOLD ? '[OK ELIGIBLE]' : `[X NOT YET] — ${THRESHOLD - burnCount} remaining`}`);
            } catch (err) { print(`ERROR: ${err.message}`); }

        } else if (cmd.startsWith('/rendertoken')) {
            const parts = cmd.split(/\s+/);
            const tid = parts[1] ?? window.currentAlphaId;
            if (!tid) { print('Usage: /rendertoken [id]'); return; }
            print(`>> OPENING #${tid}...`);
            const rb = window.createNativeWindow(`NORMIE #${tid}`, `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#e3e5e4;"><img src="${window.API}/normie/${tid}/image.svg" style="width:200px;height:200px;image-rendering:pixelated;border:2px solid #48494b;"></div>`);
            const rw = rb.closest('.os-window');
            if (rw) { rw.style.width = '260px'; rw.style.height = '280px'; }

        } else if (cmd === '/forge') {
            window.openPixelEditor();
            print('>> PIXELFORGE OPENED.');

        } else if (cmd === '/audit') {
            print('>> AUDIT LOG — use DREDGE app to view session logs');

        } else if (cmd === '/raw-decode') {
            print('>> SIMULATING SSTORE2 BUFFER (200 bytes)...');
            const rawData = new Uint8Array(200);
            crypto.getRandomValues(rawData);
            for (let y = 0; y < 40; y++) {
                let row = '';
                for (let x = 0; x < 40; x++) {
                    const flatIndex = y * 40 + x;
                    const bit = (rawData[flatIndex >> 3] >> (7 - (flatIndex & 7))) & 1;
                    row += bit ? '#' : '.';
                }
                print(row);
            }
            print('>> MSB-FIRST DECODE COMPLETE.');

        } else if (cmd) {
            print(`UNKNOWN COMMAND: ${cmd}`);
        }
    });
}
