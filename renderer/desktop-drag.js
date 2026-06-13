(function () {
    const STORAGE_KEY = 'normie_desktop_icons';

    function saveIcons() {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;
        const icons = Array.from(desktop.querySelectorAll('.desktop-icon')).map(el => ({
            native: el.dataset.native,
            label:  el.dataset.label,
            x:      parseInt(el.style.left,  10) || 0,
            y:      parseInt(el.style.top,   10) || 0,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
    }

    function restoreIcons() {
        let saved;
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch { saved = []; }
        saved.forEach(d => createIcon(d.native, d.label, d.x, d.y));
    }

    function createIcon(native, label, x, y) {
        const desktop = document.getElementById('desktop');
        if (!desktop) return null;

        // prevent duplicates
        if (desktop.querySelector(`.desktop-icon[data-native="${CSS.escape(native)}"]`)) return null;

        const icon = document.createElement('div');
        icon.className   = 'desktop-icon';
        icon.dataset.native = native;
        icon.dataset.label  = label;
        icon.style.left  = x + 'px';
        icon.style.top   = y + 'px';

        const srcSvg = document.querySelector(`.sm-app-btn[data-native="${CSS.escape(native)}"] svg`);
        let img;
        if (srcSvg) {
            img = srcSvg.cloneNode(true);
            img.removeAttribute('class');
            img.classList.add('di-icon');
            img.style.width  = '40px';
            img.style.height = '40px';
            img.style.fill   = '#48494b';
        } else {
            img = document.createElement('div');
            img.className   = 'di-icon';
            img.textContent = label.slice(0, 3).toUpperCase();
            img.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:10px;font-family:Courier New,monospace;color:#48494b;border:1px solid #48494b;';
        }

        const lbl = document.createElement('div');
        lbl.className   = 'di-label';
        lbl.textContent = label;

        icon.appendChild(img);
        icon.appendChild(lbl);

        // double-click → open app
        icon.addEventListener('dblclick', () => {
            icon.dispatchEvent(new CustomEvent('openApp', {
                bubbles: true,
                detail: { native }
            }));
        });

        // right-click → send to trash
        icon.addEventListener('contextmenu', e => {
            e.preventDefault();
            const diIcon = icon.querySelector('.di-icon');
            window.sendToTrash?.(icon.dataset.native, icon.dataset.label, diIcon?.outerHTML ?? '');
            icon.remove();
            saveIcons();
        });

        // drag to reposition
        icon.addEventListener('mousedown', startIconDrag);

        desktop.appendChild(icon);
        return icon;
    }

    function startIconDrag(e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        const icon    = e.currentTarget;
        const desktop = document.getElementById('desktop');
        const rect    = desktop.getBoundingClientRect();
        const offX    = e.clientX - icon.getBoundingClientRect().left;
        const offY    = e.clientY - icon.getBoundingClientRect().top;

        let moved = false;

        function onMove(ev) {
            moved = true;
            const nx = ev.clientX - rect.left - offX;
            const ny = ev.clientY - rect.top  - offY;
            icon.style.left = Math.max(0, Math.min(rect.width  - 64, nx)) + 'px';
            icon.style.top  = Math.max(0, Math.min(rect.height - 80, ny)) + 'px';
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
            if (moved) saveIcons();
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    }

    // drop zone on next-free-slot helper
    function freeSlot(desktop) {
        const rect   = desktop.getBoundingClientRect();
        const cols   = Math.max(1, Math.floor(rect.width / 80));
        const icons  = desktop.querySelectorAll('.desktop-icon').length;
        const col    = icons % cols;
        const row    = Math.floor(icons / cols);
        return { x: 8 + col * 80, y: 8 + row * 90 };
    }

    function initDesktopDrag() {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;

        // make sm-app-btn draggable
        document.querySelectorAll('.sm-app-btn').forEach(btn => {
            if (!btn.dataset.native) return;
            btn.setAttribute('draggable', 'true');

            btn.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', btn.dataset.native + '|' + btn.textContent.trim().split('\n')[0].trim());
                e.dataTransfer.effectAllowed = 'copy';
                btn.classList.add('dragging');
            });

            btn.addEventListener('dragend', () => btn.classList.remove('dragging'));
        });

        desktop.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        desktop.addEventListener('drop', e => {
            e.preventDefault();
            const raw = e.dataTransfer.getData('text/plain');
            if (!raw) return;
            const [native, label] = raw.split('|');
            if (!native || !label || label === 'undefined') return;
            const dRect = desktop.getBoundingClientRect();
            const x = Math.max(0, Math.min(dRect.width  - 64, e.clientX - dRect.left - 32));
            const y = Math.max(0, Math.min(dRect.height - 80, e.clientY - dRect.top  - 40));
            const icon = createIcon(native, label, x, y);
            if (icon) saveIcons();
        });

        // listen for openApp bubbling up
        desktop.addEventListener('openApp', e => {
            const { native } = e.detail;
            if (window.launchNativeApp) { window.launchNativeApp(native); return; }
            const btn = document.querySelector(`.sm-app-btn[data-native="${CSS.escape(native)}"]`);
            if (btn) btn.click();
        });

        restoreIcons();
    }

    window.createDesktopIcon = function (native, label) {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;
        const slot = freeSlot(desktop);
        const icon = createIcon(native, label, slot.x, slot.y);
        if (icon) saveIcons();
    };

    document.addEventListener('DOMContentLoaded', initDesktopDrag);
})();
