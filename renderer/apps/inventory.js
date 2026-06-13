async function openInventory() {
    const body = window.createNativeWindow('VAULT', '<div class="native-loading">>> LOADING INVENTORY...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '520px'; win.style.height = '560px'; }
    try {
        const ns = window.NormieState;
        const tokenIds = ns?.normieIds?.length ? ns.normieIds : (() => { throw new Error('NormieState not ready'); })();

        if (!tokenIds.length) {
            body.innerHTML = '<div class="native-loading">>> NO NORMIES FOUND</div>';
            return;
        }

        const metas = tokenIds.map(id => ({ id, meta: ns.allMetadata?.[String(id)] ?? window.NormieCache.get(`meta_${id}`) ?? null }));

        body.innerHTML = `<div class="inv-grid">${metas.map(item => {
            const getAttr = (key) => item.meta?.attributes?.find(a => String(a.trait_type).toLowerCase() === key.toLowerCase())?.value ?? '?';
            const lvl = getAttr('Level');
            const ap  = getAttr('Action Points');
            return `
            <div class="inv-cell" onclick="window.openNormieViewer('${item.id}')">
                <img src="${window.API}/normie/${item.id}/image.svg" class="inv-img normie-avatar" alt="#${item.id}">
                <div class="inv-info">
                    <span class="inv-id">#${item.id}</span>
                    <span class="inv-stats">LVL ${lvl} | AP ${ap}</span>
                    <span id="binding-${item.id}" style="font-size:10px;letter-spacing:1px;opacity:0.6;">·</span>
                </div>
            </div>`;
        }).join('')}</div>`;

        await Promise.all(metas.map(async (item) => {
            try {
                const r = await fetch(`${window.API}/agents/binding/${item.id}`);
                const data = await r.json();
                const el = body.querySelector(`#binding-${item.id}`);
                if (!el) return;
                if (data?.binding) {
                    el.innerHTML = '● AWAKENED';
                    el.style.color = '#48494b';
                } else {
                    el.textContent = 'DORMANT';
                }
            } catch { /* silent */ }
        }));
    } catch (err) {
        body.innerHTML = `<div class="native-loading">>> ERROR: ${err.message}</div>`;
    }
}

window.openInventory = openInventory;