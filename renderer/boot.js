// renderer/boot.js — Boot animations

export function showSystemSplash(onComplete) {
    const canvas = document.getElementById('boot-progress-canvas');
    const status = document.getElementById('splash-status');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e3e5e4';
    ctx.fillRect(0, 0, 200, 20);

    const blockSize = 4;
    const gap = 1;
    const step = blockSize + gap;
    const totalBlocksX = Math.floor(200 / step);
    const totalBlocksY = Math.floor(20 / step);
    let currentBlockX = 0;
    ctx.fillStyle = '#48494b';

    const interval = setInterval(() => {
        if (currentBlockX < totalBlocksX) {
            for (let y = 0; y < totalBlocksY; y++) {
                ctx.fillRect(currentBlockX * step, y * step, blockSize, blockSize);
            }
            currentBlockX++;
            const pct = (currentBlockX / totalBlocksX) * 100;
            if (pct > 20) status.innerText = '>> LOADING KERNEL...';
            if (pct > 50) status.innerText = '>> INITIALIZING DRIVERS...';
            if (pct > 80) status.innerText = '>> SECURING CONNECTION...';
        } else {
            clearInterval(interval);
            status.innerText = '';
            canvas.style.display = 'none';
            setTimeout(onComplete, 300);
        }
    }, 100);
}

export function animateAlphaBuild(imgUrl, canvasElement) {
    return new Promise((resolve) => {
        const ctx = canvasElement.getContext('2d');
        ctx.clearRect(0, 0, 40, 40);

        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = async () => {
            // 1. On lit l'image dans un canvas caché en mémoire
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 40;
            tempCanvas.height = 40;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, 40, 40);

            // 2. On extrait les vraies couleurs et coordonnées
            const imgData = tempCtx.getImageData(0, 0, 40, 40).data;
            const pixels = [];

            for (let y = 0; y < 40; y++) {
                for (let x = 0; x < 40; x++) {
                    const i = (y * 40 + x) * 4;
                    if (imgData[i + 3] > 10) { // Si le pixel n'est pas transparent
                        pixels.push({ x, y, r: imgData[i], g: imgData[i+1], b: imgData[i+2] });
                    }
                }
            }

            // 3. On mélange pour l'apparition chaotique "petit à petit"
            pixels.sort(() => Math.random() - 0.5);

            // 4. On dessine sur l'écran
            for (let k = 0; k < pixels.length; k++) {
                const p = pixels[k];
                // Dessine avec la vraie couleur du pixel (ou remplace par '#48494b' si tu veux tout en gris)
                ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
                ctx.fillRect(p.x, p.y, 1, 1);

                // Vraie pause mécanique
                if (k % 4 === 0) await new Promise(r => setTimeout(r, 2));
            }

            await new Promise(r => setTimeout(r, 400));
            resolve();
        };

        img.onerror = () => {
            console.error("Erreur de lecture image, bypass de l'animation");
            resolve();
        };

        img.src = imgUrl;
    });
}

export async function initOllamaState() {
    const fallback = { online: false, model: localStorage.getItem('normie_model') || 'mistral:7b', installed: [], downloading: false, downloadModel: null };
    try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) { if (window.NormieState) window.NormieState.ollama = fallback; return false; }
        const data = await res.json();
        const installed = (data.models ?? []).map(m => m.name);
        const saved = localStorage.getItem('normie_model') || 'mistral:7b';
        let activeModel;
        if (installed.includes(saved)) {
            activeModel = saved;
        } else if (installed.length > 0) {
            activeModel = installed[0];
            localStorage.setItem('normie_model', activeModel);
            window._notifier?.showNotif('SYSTEM', `Model ${saved} not found — switched to ${activeModel}`, null);
        } else {
            activeModel = saved;
            window._notifier?.showNotif('SYSTEM', 'No Ollama models installed — run: ollama pull mistral:7b', null);
        }
        window.OLLAMA_MODEL = activeModel;
        const ollamaState = { online: true, model: activeModel, installed, downloading: false, downloadModel: null };
        if (window.NormieState) window.NormieState.ollama = ollamaState;
        return true;
    } catch {
        if (window.NormieState) window.NormieState.ollama = fallback;
        return false;
    }
}
