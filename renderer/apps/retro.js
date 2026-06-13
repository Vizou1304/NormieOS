function openRetro() {
    const CORES = [
        { id: 'nes',  label: 'NES',  exts: '.nes' },
        { id: 'snes', label: 'SNES', exts: '.sfc,.smc' },
        { id: 'gb',   label: 'GB',   exts: '.gb,.gbc' },
        { id: 'gba',  label: 'GBA',  exts: '.gba' },
        { id: 'sega', label: 'SEGA', exts: '.md,.bin,.sms' },
        { id: 'psx',  label: 'PSX',  exts: '.bin,.cue,.iso' },
    ];

    const LS_CORE = 'retro_last_core';

    const body = window.createNativeWindow('RETRO', `
        <div id="retro-root" style="height:100%;display:flex;flex-direction:column;background:#e3e5e4;color:#48494b;font-family:'Courier New',monospace;font-size:11px;box-sizing:border-box;">
            <div id="retro-launcher-view" style="display:flex;padding:14px;flex-direction:column;gap:12px;justify-content:flex-start;">
                <div style="font-weight:bold;letter-spacing:1px;">// RETROARCH LAUNCHER</div>

                <div>
                    <div style="margin-bottom:4px;letter-spacing:1px;">[ LOAD ROM ]</div>
                    <button id="retro-select-rom-btn" style="width:100%;box-sizing:border-box;font-family:'Courier New',monospace;font-size:11px;color:#e3e5e4;background:#48494b;border:2px solid #48494b;padding:6px;cursor:pointer;letter-spacing:1px;font-weight:bold;transition:none;">[ SELECT ROM FILE ]</button>
                    <div id="retro-rom-name" style="margin-top:4px;font-size:10px;opacity:0.6;letter-spacing:0.5px;"></div>
                </div>

                <div>
                    <div style="margin-bottom:6px;letter-spacing:1px;">[ SELECT CORE ]</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;" id="retro-core-btns">
                        ${CORES.map(c => `<button class="retro-core-btn" data-core="${c.id}"
                            style="background:#e3e5e4;border:2px solid #48494b;color:#48494b;font-family:'Courier New',monospace;font-size:11px;padding:4px 10px;cursor:pointer;letter-spacing:1px;transition:none;font-weight:bold;">[ ${c.label} ]</button>`).join('')}
                    </div>
                    <div id="retro-core-label" style="margin-top:6px;font-size:10px;opacity:0.6;">>> CORE: none</div>
                </div>

                <button id="retro-launch-btn" style="background:#48494b;color:#e3e5e4;border:2px solid #48494b;font-family:'Courier New',monospace;font-size:11px;padding:8px;cursor:pointer;letter-spacing:2px;font-weight:bold;transition:none;">[ LAUNCH ]</button>
                <div id="retro-status" style="font-size:10px;opacity:0.6;"></div>
            </div>
        </div>
    `);

    const win = body.closest('.os-window');
    if (win) { win.style.width = '620px'; win.style.height = '420px'; }

    const $ = id => body.querySelector('#' + id);

    function initLauncher() {
        let _romPath = null;
        let _core    = localStorage.getItem(LS_CORE) || null;

        const _setCore = (id) => {
            body.querySelectorAll('.retro-core-btn').forEach(b => {
                b.style.background  = '#e3e5e4';
                b.style.color       = '#48494b';
                b.style.borderWidth = '2px';
            });
            const active = body.querySelector(`.retro-core-btn[data-core="${id}"]`);
            if (active) { active.style.background = '#48494b'; active.style.color = '#e3e5e4'; }
            _core = id;
            localStorage.setItem(LS_CORE, _core);
            $('retro-core-label').innerText = `>> CORE: ${id.toUpperCase()}`;
        };

        if (_core) _setCore(_core);

        $('retro-select-rom-btn').addEventListener('click', async () => {
            const filePath = await window.retroAPI.selectRom();
            if (!filePath) return;
            _romPath = filePath;
            const nameEl = $('retro-rom-name');
            nameEl.innerText           = `>> ${filePath.split('/').pop()}`;
            nameEl.style.opacity       = '1';
            nameEl.style.fontWeight    = 'bold';
            nameEl.style.letterSpacing = '0.5px';
        });

        body.querySelectorAll('.retro-core-btn').forEach(btn => {
            btn.addEventListener('click', () => _setCore(btn.dataset.core));
        });

        $('retro-launch-btn').addEventListener('click', () => {
            if (!_romPath) { $('retro-status').innerText = '>> ERROR: no ROM loaded'; return; }
            if (!_core)    { $('retro-status').innerText = '>> ERROR: no core selected'; return; }
            $('retro-status').innerText = '>> LAUNCHING...';
            window.retroAPI.launch(_romPath, _core).then(r => {
                $('retro-status').innerText = `>> ${r.toUpperCase()}`;
            }).catch(err => {
                $('retro-status').innerText = `>> ERROR: ${err?.message ?? err}`;
            });
        });
    }

    initLauncher();
}

window.openRetro = openRetro;
