// renderer/apps/nexus.js — NEXUS App Directory (ALL / OFFICIAL / COMMUNITY)

function openAppDirectory() {
    const body = window.createNativeWindow('NEXUS', '<div class="native-loading">>> LOADING REGISTRY...</div>');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '720px'; win.style.height = '540px'; }

    const TB = "border:none;border-bottom:2px solid transparent;padding:5px 14px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;font-weight:bold;background:transparent;color:#48494b;transition:none;";
    const TA = TB + 'border-bottom-color:#48494b;';
    const TI = TB + 'opacity:0.6;';

    body.innerHTML = `
        <div class="appdir-container">
            <div style="display:flex;border-bottom:2px solid #48494b;background:#e3e5e4;flex-shrink:0;align-items:center;">
                <button id="adtab-all"       style="${TA}">[ ALL ]</button>
                <button id="adtab-official"  style="${TI}">[ OFFICIAL ]</button>
                <button id="adtab-community" style="${TI}">[ COMMUNITY ]</button>
                <span id="ad-count-label" style="flex:1;padding:5px 10px;font-size:10px;opacity:0.6;letter-spacing:1px;text-align:right;">${window.APPS.length} APPS</span>
            </div>
            <div class="appdir-list" id="appdir-list"></div>
        </div>`;

    const list       = body.querySelector('#appdir-list');
    const countLabel = body.querySelector('#ad-count-label');

    const renderApps = (filter) => {
        const filtered = filter === 'official'  ? window.APPS.filter(a => a.official === true)
                       : filter === 'community' ? window.APPS.filter(a => a.official === false)
                       : window.APPS;
        countLabel.textContent = `${filtered.length} APPS`;
        list.innerHTML = filtered.map(app => `
            <div class="appdir-row" data-app-id="${app.id}">
                <img src="${app.thumbnailUrl}" class="appdir-thumb" onerror="this.style.visibility='hidden'" alt="">
                <div class="appdir-info">
                    <div class="appdir-name">${app.name}${app.official ? ' <span class="appdir-official">[OFFICIAL]</span>' : ''}
                        <span style="font-size:10px;opacity:0.65;">${window.getAppType(app) === 'p5js' ? '[P5JS]' : window.getAppType(app) === 'pdf' ? '[LOCAL]' : '[REMOTE]'}</span>
                    </div>
                    <div class="appdir-creator">by ${app.creator}</div>
                    <div class="appdir-desc">${app.description || '—'}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <button class="appdir-launch" data-url="${app.url}">[ LAUNCH ]</button>
                    <button class="appdir-pin" data-app-id="${app.id}">${window.pinnedApps.has(app.id) ? '[ UNPIN ]' : '[ PIN ]'}</button>
                </div>
            </div>`).join('');

        list.querySelectorAll('.appdir-launch').forEach(btn => {
            btn.addEventListener('click', () => {
                window.log?.(`>> LAUNCHING ${btn.closest('.appdir-row').querySelector('.appdir-name').childNodes[0].textContent.trim()}...`);
                window.open(btn.dataset.url);
            });
        });
        list.querySelectorAll('.appdir-pin').forEach(btn => {
            const appId = parseInt(btn.dataset.appId);
            const app   = window.APPS.find(a => a.id === appId);
            if (!app) return;
            btn.addEventListener('click', () => {
                if (window.pinnedApps.has(appId)) { window.unpinAppFromDock(appId); btn.innerText = '[ PIN ]'; }
                else                              { window.pinAppToDock(app);        btn.innerText = '[ UNPIN ]'; }
            });
        });
    };

    const ALL_TABS  = ['adtab-all', 'adtab-official', 'adtab-community'];
    const setActive = (activeId) => {
        ALL_TABS.forEach(id => {
            const el = body.querySelector(`#${id}`);
            if (el) el.style.cssText = id === activeId ? TA : TI;
        });
    };

    body.querySelector('#adtab-all').addEventListener('click',       () => { setActive('adtab-all');       renderApps('all'); });
    body.querySelector('#adtab-official').addEventListener('click',  () => { setActive('adtab-official');  renderApps('official'); });
    body.querySelector('#adtab-community').addEventListener('click', () => { setActive('adtab-community'); renderApps('community'); });

    renderApps('all');
}

window.openAppDirectory = openAppDirectory;
