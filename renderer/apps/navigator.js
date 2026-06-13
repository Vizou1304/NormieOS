function openNavigateur() {
    window._smLastIcon = 'navigateur';
    const body = createNativeWindow('NAVIGATOR', '');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '1024px'; win.style.height = '700px'; }
    body.style.padding = '0';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.overflow = 'hidden';

    const startUrl = 'https://google.com';
    const navBtnStyle = "background:transparent;border:1px solid #e3e5e4;color:#e3e5e4;font-family:'Courier New',monospace;font-size:11px;padding:3px 8px;cursor:pointer;transition:none;letter-spacing:1px;";

    body.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;padding:5px 8px;background:#48494b;flex-shrink:0;">
            <button id="nav-back"    style="${navBtnStyle}">&#9664;</button>
            <button id="nav-forward" style="${navBtnStyle}">&#9654;</button>
            <button id="nav-refresh" style="${navBtnStyle}">&#8635;</button>
            <input id="nav-url" type="text" value="${startUrl}" spellcheck="false" autocomplete="off"
                style="flex:1;border:none;background:#e3e5e4;color:#48494b;font-family:'Courier New',monospace;font-size:12px;padding:4px 8px;outline:none;letter-spacing:0.5px;">
            <button id="nav-go" style="${navBtnStyle}">GO</button>
            <span id="nav-status" style="color:#e3e5e4;font-size:10px;opacity:0.65;min-width:55px;text-align:right;letter-spacing:0.5px;">READY</span>
        </div>
        <webview id="nav-wv" src="${startUrl}" style="flex:1;width:100%;min-height:0;"
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36">
        </webview>`;

    const wv      = body.querySelector('#nav-wv');
    const urlInput = body.querySelector('#nav-url');
    const status  = body.querySelector('#nav-status');

    const navigate = () => {
        let url = urlInput.value.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        urlInput.value = url;
        wv.src = url;
    };

    body.querySelector('#nav-go').addEventListener('click', navigate);
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
    body.querySelector('#nav-back').addEventListener('click',    () => wv.canGoBack()    && wv.goBack());
    body.querySelector('#nav-forward').addEventListener('click', () => wv.canGoForward() && wv.goForward());
    body.querySelector('#nav-refresh').addEventListener('click', () => wv.reload());

    wv.addEventListener('did-start-loading',  () => { status.textContent = 'LOADING'; });
    wv.addEventListener('did-stop-loading',   () => { status.textContent = 'READY'; });
    wv.addEventListener('did-navigate',           e => { urlInput.value = e.url; });
    wv.addEventListener('did-navigate-in-page',   e => { if (e.isMainFrame) urlInput.value = e.url; });

    // Hover inversion sur les boutons nav
    body.querySelectorAll('[id^="nav-"]').forEach(btn => {
        if (btn.tagName !== 'BUTTON') return;
        btn.addEventListener('mouseenter', () => { btn.style.background = '#e3e5e4'; btn.style.color = '#48494b'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = '#e3e5e4'; });
    });
}
window.openNavigateur = openNavigateur;
