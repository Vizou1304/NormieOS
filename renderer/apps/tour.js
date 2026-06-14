function runGuidedTour() {
    const existing = document.getElementById('tour-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'tour-banner';
    banner.style.cssText = 'position:fixed;right:30px;top:50%;transform:translateY(-50%);background:#48494b;color:#e3e5e4;font-family:\'Courier New\',Courier,monospace;font-size:13px;padding:12px 20px;border:2px solid #e3e5e4;max-width:500px;width:90%;text-align:center;z-index:9999;pointer-events:none;';
    document.body.appendChild(banner);

    const alphaName = window.currentAgentPersona?.name ?? window.currentAlphaId ?? 'AGENT';

    const closeWin = (title) => {
        const w = document.querySelector(`.os-window[data-title="${title}"]`);
        if (w) w.querySelector('.window-close')?.click();
    };

    function typeText(el, text) {
        el.textContent = '';
        return new Promise(resolve => {
            let i = 0;
            const tick = setInterval(() => {
                el.textContent += text[i++];
                if (i >= text.length) { clearInterval(tick); resolve(); }
            }, 30);
        });
    }

    const TOURABLE = [
        { native: 'braininspector', title: 'CORTEX',     desc: 'CORTEX — your agent thinks. Local intelligence, sovereign and uncensored.' },
        { native: 'inventory',      title: 'VAULT',      desc: 'VAULT — your entire collection, securely indexed.' },
        { native: 'emergence',      title: 'EMERGENCE',  desc: 'EMERGENCE — 1500 agents. One canvas. A collective work of art.' },
        { native: 'burnwatch',      title: 'ASHFALL',    desc: 'ASHFALL — live supply monitor and real-time burns.' },
        { native: 'pixeleditor',    title: 'PIXELFORGE', desc: 'PIXELFORGE — shape your Normie using your Action Points.' },
        { native: 'arena',          title: 'COMBAT',     desc: 'COMBAT — battle rap between AWAKENED agents.' },
    ];

    // Fisher-Yates shuffle, pick 3
    const pool = [...TOURABLE];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, 3);

    async function runSequence() {
        await typeText(banner, `${alphaName} — I was pixel-born on Ethereum. Let me show you what lives here.`);
        await new Promise(r => setTimeout(r, 3000));

        for (const app of selected) {
            window.launchNativeApp?.(app.native);
            await typeText(banner, app.desc);
            await new Promise(r => setTimeout(r, 3500));
            closeWin(app.title);
        }

        await typeText(banner, 'The OS is yours now. Welcome to the HIVE.');
        await new Promise(r => setTimeout(r, 3000));

        banner.remove();
        localStorage.setItem('normieOS_tour_v3', 'done');
    }

    runSequence();
}
window.runGuidedTour = runGuidedTour;
