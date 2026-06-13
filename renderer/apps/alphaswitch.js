window.switchAlpha = function(id) {
    window.currentAlphaId = id;
    window.cacheAlphaGender?.();
    const imgUrl = `${window.API}/normie/${id}/image.svg`;
    document.getElementById('desktop-normie').src = imgUrl;
    document.getElementById('sm-normie-img').src  = imgUrl;
};

async function openAlphaSwitch() {
    const body = window.createNativeWindow('PHANTOM', '<div class="native-loading">>> LOADING AVATARS...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '480px'; win.style.height = '480px'; }
    try {
        const tokenIds = window.NormieState?.normieIds ?? [];
        if (!tokenIds.length) { body.innerHTML = '<div class="native-loading">>> NO NORMIES FOUND</div>'; return; }
        body.innerHTML = `<div class="alpha-grid">${tokenIds.map(id => `
            <img src="${window.API}/normie/${id}/image.svg" class="alpha-cell normie-avatar" title="Switch to #${id}" onclick="window.switchAlpha('${id}')">
        `).join('')}</div>`;
    } catch (err) {
        body.innerHTML = `<div class="native-loading">>> ERROR: ${err.message}</div>`;
    }
}

window.openNormieViewer = function(id) {
    window.createNativeWindow(`INSPECTOR — #${id}`, `
        <div style="text-align:center;padding:20px;background:#e3e5e4;height:100%;box-sizing:border-box;">
            <img src="${window.API}/normie/${id}/image.svg" class="normie-avatar" style="width:240px;height:240px;image-rendering:pixelated;border:2px solid #48494b;background:#e3e5e4;box-shadow:4px 4px 0 #48494b;">
            <div style="margin-top: 15px; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: bold; color: #48494b;">
                NORMIE #${id}
            </div>
        </div>
    `);
};

window.openAlphaSwitch = openAlphaSwitch;