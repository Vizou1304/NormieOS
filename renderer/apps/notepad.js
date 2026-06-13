function openNotepad() {
    const body = window.createNativeWindow('NOTEPAD', '');
    if (!body) return;
    const win = body.closest('.os-window');
    if (win) { win.style.width = '500px'; win.style.height = '400px'; }

    const saved = localStorage.getItem('normie_notepad') || '';
    const BTN = "background:transparent;border:1px solid #48494b;color:#48494b;font-family:'Courier New',Courier,monospace;font-size:10px;padding:2px 8px;cursor:pointer;";

    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.padding = '0';
    body.innerHTML = `
        <div style="display:flex;gap:6px;padding:6px 10px;border-bottom:2px solid #48494b;background:#e3e5e4;flex-shrink:0;">
            <button id="np-save"  style="${BTN}">[ SAVE ]</button>
            <button id="np-clear" style="${BTN}">[ CLEAR ]</button>
            <button id="np-copy"  style="${BTN}">[ COPY ALL ]</button>
        </div>
        <textarea id="np-area" spellcheck="false" style="flex:1;width:100%;box-sizing:border-box;background:#e3e5e4;color:#48494b;font-family:'Courier New',Courier,monospace;font-size:12px;border:none;outline:none;resize:none;padding:10px 12px;line-height:1.6;"></textarea>`;

    const area = body.querySelector('#np-area');
    area.value = saved;

    let _t = null;
    area.addEventListener('input', () => {
        clearTimeout(_t);
        _t = setTimeout(() => localStorage.setItem('normie_notepad', area.value), 500);
    });

    const btnSave  = body.querySelector('#np-save');
    const btnClear = body.querySelector('#np-clear');
    const btnCopy  = body.querySelector('#np-copy');

    btnSave.addEventListener('click',  () => { localStorage.setItem('normie_notepad', area.value); });
    btnClear.addEventListener('click', () => { area.value = ''; localStorage.setItem('normie_notepad', ''); });
    btnCopy.addEventListener('click',  () => { navigator.clipboard?.writeText(area.value).catch(() => {}); });

    [btnSave, btnClear, btnCopy].forEach(b => {
        b.addEventListener('mouseenter', () => { b.style.background = '#48494b'; b.style.color = '#e3e5e4'; });
        b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; b.style.color = '#48494b'; });
    });

    area.focus();
}
