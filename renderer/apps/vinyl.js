function openVinyl() {
    const body = window.createNativeWindow('VINYL', '');
    const win  = body.closest('.os-window');
    if (win) { win.style.width = '420px'; win.style.height = '560px'; }

    body.style.display        = 'flex';
    body.style.flexDirection  = 'column';
    body.style.alignItems     = 'center';
    body.style.padding        = '20px';
    body.style.gap            = '14px';
    body.style.background     = '#e3e5e4';
    body.style.fontFamily     = "'Courier New', Courier, monospace";
    body.style.overflowY      = 'auto';

    const tracks = Array.from({ length: 11 }, (_, i) =>
        `<div>${String(i + 1).padStart(2, '0')}. TRACK ${String(i + 1).padStart(2, '0')}</div>`
    ).join('');

    body.innerHTML = `
        <div class="vinyl-disc" id="vinyl-disc">
            <div class="vinyl-hole"></div>
        </div>
        <div style="text-align:center;">
            <div style="font-weight:bold;font-size:14px;letter-spacing:2px;">DOPEMIND</div>
            <div style="font-size:12px;letter-spacing:1px;margin-top:4px;">NORMIES AWAKENING</div>
            <div style="font-size:11px;opacity:0.65;margin-top:2px;">11 TRACKS</div>
        </div>
        <div class="vinyl-tracklist">${tracks}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <button id="vinyl-play"    class="cp-action-btn">[ &#9654; PLAY ]</button>
            <button id="vinyl-stop"    class="cp-action-btn">[ &#9632; STOP ]</button>
            <button id="vinyl-spotify" class="cp-action-btn">[ SPOTIFY ]</button>
            <button id="vinyl-apple"   class="cp-action-btn">[ APPLE MUSIC ]</button>
        </div>`;

    const disc = body.querySelector('#vinyl-disc');
    body.querySelector('#vinyl-play').addEventListener('click', () => {
        disc.style.animationPlayState = 'running';
    });
    body.querySelector('#vinyl-stop').addEventListener('click', () => {
        disc.style.animationPlayState = 'paused';
    });
    body.querySelector('#vinyl-spotify').addEventListener('click', () => {
        window.open('https://open.spotify.com/search/Dopemind%20Normies%20Awakening');
    });
    body.querySelector('#vinyl-apple').addEventListener('click', () => {
        window.open('https://music.apple.com/search?term=Dopemind+Normies+Awakening');
    });
}
