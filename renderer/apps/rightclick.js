(function () {
    let menu = null;

    function removeMenu() {
        if (menu) { menu.remove(); menu = null; }
    }

    function buildMenu(x, y) {
        removeMenu();

        const alphaId    = window.currentAlphaId ?? '?';
        const level      = window.currentAlphaLevel ?? '?';
        const agentName  = window.currentAgentPersona?.name ?? `NORMIE #${alphaId}`;
        const prestige   = window.walletPrestige ?? '?';
        const wallMode   = localStorage.getItem('wallpaperMode') || 'normie';
        const walls      = ['normie', 'hive', 'mempool'];
        const nextWall   = walls[(walls.indexOf(wallMode) + 1) % walls.length];

        const items = [
            { label: `${agentName}  LVL:${level}  PST:${prestige}`, disabled: true },
            { sep: true },
            { label: 'CORTEX',     action: () => window.openBrainInspector?.() },
            { label: 'HIVE',       action: () => window.openHive?.() },
            { label: 'EMERGENCE',  action: () => window.openEmergence?.() },
            { sep: true },
            { label: `WALLPAPER  [ ${wallMode.toUpperCase()} > ${nextWall.toUpperCase()} ]`,
              action: () => window.toggleWallpaper?.(nextWall) },
            { label: 'DISCONNECT', action: () => document.getElementById('disconnect-btn')?.click() },
            { sep: true },
            { label: 'NORMIES OS  v1.0  CC0', disabled: true },
        ];

        menu = document.createElement('div');
        menu.id = 'ctx-menu';
        menu.style.cssText = [
            'position:fixed',
            `left:${x}px`,
            `top:${y}px`,
            'background:#48494b',
            'color:#e3e5e4',
            "font-family:'Courier New',Courier,monospace",
            'font-size:11px',
            'border:2px solid #e3e5e4',
            'z-index:99999',
            'min-width:220px',
            'padding:4px 0',
            'white-space:nowrap',
        ].join(';');

        items.forEach(item => {
            if (item.sep) {
                const hr = document.createElement('div');
                hr.style.cssText = 'border-top:1px solid rgba(227,229,228,0.25);margin:3px 0;';
                menu.appendChild(hr); return;
            }
            const row = document.createElement('div');
            row.style.cssText = [
                'padding:5px 14px',
                `cursor:${item.disabled ? 'default' : 'pointer'}`,
                `opacity:${item.disabled ? '0.45' : '1'}`,
                'letter-spacing:1px',
            ].join(';');
            row.textContent = item.label;
            if (!item.disabled) {
                row.addEventListener('mouseenter', () => {
                    row.style.background = '#e3e5e4';
                    row.style.color = '#48494b';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.background = '';
                    row.style.color = '#e3e5e4';
                });
                row.addEventListener('click', e => {
                    e.stopPropagation();
                    removeMenu();
                    item.action();
                });
            }
            menu.appendChild(row);
        });

        document.body.appendChild(menu);

        requestAnimationFrame(() => {
            if (!menu) return;
            const r = menu.getBoundingClientRect();
            if (r.right  > window.innerWidth)  menu.style.left = (window.innerWidth  - r.width  - 6) + 'px';
            if (r.bottom > window.innerHeight) menu.style.top  = (window.innerHeight - r.height - 6) + 'px';
        });
    }

    document.addEventListener('contextmenu', e => {
        if (e.target.closest('.os-window')) return;
        e.preventDefault();
        // Only show when desktop is live (wallet connected)
        if (!window.currentAlphaId) return;
        buildMenu(e.clientX, e.clientY);
    });

    document.addEventListener('click',   removeMenu);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') removeMenu(); });
})();
