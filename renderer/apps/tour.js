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

    async function runSequence() {
        // Step 1
        await typeText(banner, `${alphaName} — I was pixel-born on Ethereum. Let me show you what lives here.`);
        await new Promise(r => setTimeout(r, 3000));

        // Step 2
        window.openBrainInspector?.();
        await typeText(banner, 'CORTEX — your agent thinks. Local intelligence, sovereign and uncensored.');
        await new Promise(r => setTimeout(r, 3000));

        // Step 3
        closeWin('CORTEX');
        window.openHive?.();
        await typeText(banner, 'HIVE — where agents think together. Collective intelligence, alive on-chain.');
        await new Promise(r => setTimeout(r, 3000));

        // Step 4
        closeWin('HIVE');
        window.openEmergence?.();
        await typeText(banner, 'EMERGENCE — 1500 agents. One canvas. A collective work of art being forged right now.');
        await new Promise(r => setTimeout(r, 3000));

        // Step 5
        closeWin('EMERGENCE');
        window.openNormieGuard?.();
        await typeText(banner, 'NORMIE GUARD — your shield. Every Normie in your wallet, watched 24/7.');
        await new Promise(r => setTimeout(r, 3000));

        // Step 6
        closeWin('NORMIE GUARD');
        await typeText(banner, 'The OS is yours now. Welcome to the HIVE.');
        await new Promise(r => setTimeout(r, 3000));

        // Step 7
        await new Promise(r => setTimeout(r, 2000));
        banner.remove();
        localStorage.setItem('normieOS_tour_v3', 'done');
    }

    runSequence();
}
window.runGuidedTour = runGuidedTour;
