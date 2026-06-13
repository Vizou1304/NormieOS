function openDredge() {
    const body = window.createNativeWindow('DREDGE', '');
    if (!body) return;
    const win = body.closest('.os-window');
    if (win) { win.style.width = '600px'; win.style.height = '400px'; }

    const S = 'font-family:"Courier New",Courier,monospace;';

    body.style.cssText = 'display:flex;flex-direction:column;padding:0;height:100%;box-sizing:border-box;';
    body.innerHTML = `
        <div style="display:flex;flex:1;overflow:hidden;">
            <div id="dr-sidebar" style="width:150px;flex-shrink:0;border-right:1px solid #48494b;overflow-y:auto;background:#e3e5e4;">
                <button id="dr-btn-docs" style="display:block;width:100%;background:#48494b;color:#e3e5e4;border:none;border-bottom:1px solid #48494b;${S}font-size:10px;font-weight:bold;padding:9px 10px;cursor:pointer;text-align:left;letter-spacing:1px;">[ MY DOCUMENTS ]</button>
                <button id="dr-btn-logs" style="display:block;width:100%;background:#e3e5e4;color:#48494b;border:none;border-bottom:1px solid #48494b;${S}font-size:10px;font-weight:bold;padding:9px 10px;cursor:pointer;text-align:left;letter-spacing:1px;">[ SYSTEM_LOGS ]</button>
            </div>
            <div id="dr-pane" style="flex:1;overflow-y:auto;padding:10px;background:#e3e5e4;${S}font-size:11px;color:#48494b;"></div>
        </div>`;

    const pane    = body.querySelector('#dr-pane');
    const btnDocs = body.querySelector('#dr-btn-docs');
    const btnLogs = body.querySelector('#dr-btn-logs');

    function setActive(active, inactive) {
        active.style.background   = '#48494b';
        active.style.color        = '#e3e5e4';
        inactive.style.background = '#e3e5e4';
        inactive.style.color      = '#48494b';
    }

    function renderDocs() {
        setActive(btnDocs, btnLogs);
        pane.innerHTML = '';
        const saved = localStorage.getItem('normie_notepad') || '';
        if (saved.trim()) {
            pane.appendChild(_dredgeFileRow('notepad_autosave.txt', 'TXT', () => window.openNotepad?.()));
        } else {
            pane.innerHTML = `<div style="opacity:0.5;font-size:10px;letter-spacing:1px;padding:4px 2px;">>> NO FILES FOUND</div>`;
        }
    }

    function renderLogs() {
        setActive(btnLogs, btnDocs);
        pane.innerHTML = '';
        pane.appendChild(_dredgeFileRow('session_audit.log', 'LOG', _dredgeOpenLog));
    }

    btnDocs.addEventListener('click', renderDocs);
    btnLogs.addEventListener('click', renderLogs);
    renderDocs();
}

function _dredgeFileRow(filename, badge, onDblClick) {
    const row = document.createElement('div');
    row.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 8px;cursor:pointer;font-family:'Courier New',Courier,monospace;font-size:11px;color:#48494b;border-bottom:1px solid rgba(72,73,75,0.2);user-select:none;";

    const badgeEl = document.createElement('span');
    badgeEl.style.cssText = 'font-size:9px;letter-spacing:1px;border:1px solid #48494b;padding:1px 3px;flex-shrink:0;';
    badgeEl.textContent = badge;

    const nameEl = document.createElement('span');
    nameEl.textContent = filename;

    row.appendChild(badgeEl);
    row.appendChild(nameEl);

    row.addEventListener('mouseenter', () => {
        row.style.background      = '#48494b';
        row.style.color           = '#e3e5e4';
        badgeEl.style.borderColor = '#e3e5e4';
    });
    row.addEventListener('mouseleave', () => {
        row.style.background      = '';
        row.style.color           = '#48494b';
        badgeEl.style.borderColor = '#48494b';
    });
    row.addEventListener('dblclick', onDblClick);
    return row;
}

function _dredgeOpenLog() {
    let content = 'NORMIEOS SESSION LOG\n' + '='.repeat(40) + '\n';
    content += `Session start : ${new Date(window.NormieState?.sessionStart || Date.now()).toISOString()}\n`;
    content += `Wallet        : ${window.NormieState?.wallet || '-- not connected --'}\n`;
    content += `Alpha ID      : ${window.NormieState?.alpha?.id ?? 'none'}\n`;
    content += `Agents loaded : ${window.NormieState?.agents?.length ?? 0}\n`;
    content += '\n';

    content += 'AUDIT LOG\n' + '-'.repeat(40) + '\n';
    content += `Generated  : ${new Date().toISOString()}\n`;
    content += `Uptime     : ${Math.round((Date.now() - (window.NormieState?.sessionStart || Date.now())) / 1000)}s\n`;

    const logBody = window.createNativeWindow('SESSION LOG', '');
    if (!logBody) return;
    const logWin = logBody.closest('.os-window');
    if (logWin) { logWin.style.width = '520px'; logWin.style.height = '340px'; }
    logBody.style.cssText = 'padding:0;height:100%;box-sizing:border-box;';
    logBody.innerHTML = `<pre style="margin:0;padding:10px 12px;background:#48494b;color:#e3e5e4;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.55;overflow:auto;height:100%;box-sizing:border-box;white-space:pre-wrap;word-break:break-all;">${content.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`;
}
