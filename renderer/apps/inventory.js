async function openInventory() {
    const body = window.createNativeWindow('VAULT', '<div class="native-loading">>> LOADING INVENTORY...</div>');
    const win = body.closest('.os-window');
    if (win) { win.style.width = '520px'; win.style.height = '580px'; }

    try {
        const ns = window.NormieState;
        const tokenIds = ns?.normieIds?.length ? ns.normieIds : (() => { throw new Error('NormieState not ready'); })();

        if (!tokenIds.length) {
            body.innerHTML = '<div class="native-loading">>> NO NORMIES FOUND</div>';
            return;
        }

        const items = tokenIds.map(id => {
            const meta = ns.allMetadata?.[String(id)] ?? window.NormieCache.get(`meta_${id}`) ?? null;
            const getAttr = (key) => meta?.attributes?.find(a => String(a.trait_type).toLowerCase() === key.toLowerCase())?.value ?? null;
            return {
                id,
                meta,
                lvl: Number(getAttr('Level')) || 0,
                ap: Number(getAttr('Action Points')) || 0,
                status: 'LOADING'
            };
        });

        body.innerHTML = `
            <div style="padding:6px 8px 0;border-bottom:1px solid #48494b;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <select id="inv-filter-status" style="font-family:inherit;font-size:10px;background:#e3e5e4;color:#48494b;border:1px solid #48494b;padding:2px 4px;cursor:pointer;">
                    <option value="ALL">ALL STATUS</option>
                    <option value="AWAKENED">AWAKENED</option>
                    <option value="DORMANT">DORMANT</option>
                </select>
                <select id="inv-sort-type" style="font-family:inherit;font-size:10px;background:#e3e5e4;color:#48494b;border:1px solid #48494b;padding:2px 4px;cursor:pointer;">
                    <option value="ID">SORT BY ID</option>
                    <option value="LEVEL">SORT BY LEVEL</option>
                    <option value="AP">SORT BY AP</option>
                </select>
                <span id="inv-count" style="font-size:10px;opacity:0.6;margin-left:auto;"></span>
            </div>
            <div class="inv-grid-container" style="overflow-y:auto;height:calc(100% - 36px);"></div>`;

        const container = body.querySelector('.inv-grid-container');
        const selStatus = body.querySelector('#inv-filter-status');
        const selSort   = body.querySelector('#inv-sort-type');
        const countEl   = body.querySelector('#inv-count');

        function renderGrid() {
            const filterStatus = selStatus.value;
            const sortType     = selSort.value;

            let visible = items.filter(it => {
                if (filterStatus === 'ALL') return true;
                if (filterStatus === 'LOADING') return it.status === 'LOADING';
                return it.status === filterStatus;
            });

            if (sortType === 'LEVEL') visible.sort((a, b) => b.lvl - a.lvl);
            else if (sortType === 'AP') visible.sort((a, b) => b.ap - a.ap);
            else visible.sort((a, b) => Number(a.id) - Number(b.id));

            countEl.textContent = `${visible.length}/${items.length}`;

            container.innerHTML = `<div class="inv-grid">${visible.map(item => {
                const statusHtml = item.status === 'LOADING'
                    ? `<span id="binding-${item.id}" style="font-size:10px;letter-spacing:1px;opacity:0.6;">·</span>`
                    : item.status === 'AWAKENED'
                        ? `<span id="binding-${item.id}" style="font-size:10px;letter-spacing:1px;color:#48494b;">● AWAKENED</span>`
                        : `<span id="binding-${item.id}" style="font-size:10px;letter-spacing:1px;opacity:0.6;">DORMANT</span>`;
                return `
                <div class="inv-cell" onclick="window.openNormieViewer('${item.id}')">
                    <img src="${window.API}/normie/${item.id}/image.svg" class="inv-img normie-avatar" alt="#${item.id}">
                    <div class="inv-info">
                        <span class="inv-id">#${item.id}</span>
                        <span class="inv-stats">LVL ${item.lvl || '?'} | AP ${item.ap || '?'}</span>
                        ${statusHtml}
                    </div>
                </div>`;
            }).join('')}</div>`;
        }

        selStatus.addEventListener('change', renderGrid);
        selSort.addEventListener('change', renderGrid);
        renderGrid();

        try {
            let bindings = window.NormieState?.bindings;
            if (!bindings) {
                const batchRes = await fetch(`${window.API}/agents/binding/batch`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tokenIds: items.map(i => String(i.id)) })
                });
                const batchData = batchRes.ok ? await batchRes.json().catch(() => ({})) : {};
                bindings = batchData.bindings ?? {};
                if (window.NormieState) window.NormieState.bindings = bindings;
            }
            items.forEach(item => { item.status = bindings[String(item.id)] ? 'AWAKENED' : 'DORMANT'; });
        } catch {
            items.forEach(item => { item.status = 'DORMANT'; });
        }
        renderGrid();

    } catch (err) {
        body.innerHTML = `<div class="native-loading">>> ERROR: ${window.escapeHTML(err.message)}</div>`;
    }
}

window.openInventory = openInventory;
