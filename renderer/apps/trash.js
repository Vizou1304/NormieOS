(function () {
    const KEY = 'normie_trash';

    function getItems() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }
    function saveItems(items) {
        localStorage.setItem(KEY, JSON.stringify(items));
        updateTrashBadge();
    }

    window.sendToTrash = function (native, label, svgHTML) {
        const items = getItems();
        if (!items.find(i => i.native === native)) {
            items.push({ native, label, svgHTML, ts: Date.now() });
            saveItems(items);
        }
    };

    function updateTrashBadge() {
        const badge = document.getElementById('trash-badge');
        if (!badge) return;
        const count = getItems().length;
        badge.textContent = count > 0 ? String(count) : '';
        badge.style.display = count > 0 ? 'block' : 'none';
    }
    window.updateTrashBadge = updateTrashBadge;

    function getIconHtml(item) {
        const src = document.querySelector(`.sm-app-btn[data-native="${CSS.escape(item.native)}"] svg`);
        if (src) {
            const svg = src.cloneNode(true);
            svg.removeAttribute('class');
            svg.style.cssText = 'width:24px;height:24px;fill:#48494b;flex-shrink:0;';
            return svg.outerHTML;
        }
        return `<div style="width:24px;height:24px;border:1px solid #48494b;display:flex;align-items:center;justify-content:center;font-size:10px;font-family:'Courier New',monospace;flex-shrink:0;">${(item.label||'?').slice(0,3).toUpperCase()}</div>`;
    }

    window.openTrash = function openTrash() {
        const body = window.createNativeWindow('TRASH', '');
        if (!body) return;
        const win = body.closest('.os-window');
        if (win) { win.style.width = '380px'; win.style.height = '320px'; }

        const S   = "font-family:'Courier New',Courier,monospace;font-size:11px;color:#48494b;";
        const BTN = "background:transparent;border:1px solid #48494b;color:#48494b;font-family:'Courier New',Courier,monospace;font-size:10px;padding:1px 6px;cursor:pointer;flex-shrink:0;";

        function render() {
            const items = getItems();
            body.innerHTML = `
                <div style="${S}display:flex;flex-direction:column;height:100%;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-bottom:2px solid #48494b;">
                        <span style="font-size:10px;letter-spacing:2px;font-weight:bold;">TRASH — ${items.length} ITEM${items.length !== 1 ? 'S' : ''}</span>
                        <button id="trash-empty" style="${BTN}">[ EMPTY TRASH ]</button>
                    </div>
                    <div style="flex:1;overflow-y:auto;padding:6px 12px;">
                        ${items.length === 0
                            ? '<div style="opacity:0.65;padding:8px 0;font-size:10px;">TRASH IS EMPTY</div>'
                            : items.map((item, i) =>
                                `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed rgba(72,73,75,0.3);">
                                    ${getIconHtml(item)}
                                    <span style="flex:1;font-size:10px;">${item.label ?? item.native}</span>
                                    <button data-action="restore" data-idx="${i}" style="${BTN}">[ RESTORE ]</button>
                                    <button data-action="delete"  data-idx="${i}" style="${BTN}">[ DELETE ]</button>
                                </div>`
                            ).join('')
                        }
                    </div>
                </div>`;

            body.querySelector('#trash-empty')?.addEventListener('click', () => { saveItems([]); render(); });

            body.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('mouseenter', () => { btn.style.background = '#48494b'; btn.style.color = '#e3e5e4'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = '#48494b'; });
                btn.addEventListener('click', () => {
                    const list = getItems();
                    const item = list[parseInt(btn.dataset.idx)];
                    if (!item) return;
                    if (btn.dataset.action === 'restore') window.createDesktopIcon?.(item.native, item.label);
                    list.splice(parseInt(btn.dataset.idx), 1);
                    saveItems(list);
                    render();
                });
            });
        }

        render();
    };

    updateTrashBadge();
    document.getElementById('desktop-trash')?.addEventListener('dblclick', window.openTrash);
})();
