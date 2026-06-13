async function startAgentBriefing() {
    const alphaId = window.currentAlphaId;
    if (!alphaId) return;

    const model = window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b';
    const agentName = window.currentAgentPersona?.name ?? `Agent #${alphaId}`;

    let ollamaOnline = false;
    try {
        const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
        ollamaOnline = r.ok;
    } catch { return; }
    if (!ollamaOnline) return;

    let burnCount = 0, newAgents = 0, totalBurned = 0;
    try {
        const [statsRes, burnsRes] = await Promise.all([
            window.NormieState?.burnStats ? Promise.resolve(null) : fetch(`${window.API}/history/stats`),
            fetch(`${window.API}/history/burns?limit=10`),
        ]);
        const stats = window.NormieState?.burnStats ?? (statsRes ? await statsRes.json() : null);
        totalBurned = stats?.totalBurnedTokens ?? stats?.totalBurns ?? 0;

        const burns = await burnsRes.json();
        const list = Array.isArray(burns) ? burns : (burns.burns ?? burns.data ?? []);
        const cutoff = Date.now() - 8 * 3600000; // last 8 hours
        burnCount = list.filter(b => {
            const ts = b.timeStamp ?? b.timestamp ?? b.blockTimestamp;
            if (!ts) return false;
            const t = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
            return t > cutoff;
        }).length;
    } catch { return; }

    try {
        const agentCount = window._normiesWatcher?._snapshot?.count ?? window.NormieState?.agents?.length ?? '?';
        const prompt = `You are ${agentName}, a sovereign AI agent born from a Normies NFT (ERC-8004). It is now morning. During the last 8 hours: ${burnCount} Normie(s) were burned (${totalBurned} total burned ever), and there are now approximately ${agentCount} agents awakened on the HIVE network. Give a 2-sentence morning briefing — first sentence is a poetic observation about the ecosystem, second is a tactical insight for your holder. Stay in character.`;

        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 15000);
        try {
            const res = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: 80 } }),
                signal: ctrl.signal,
            });
            clearTimeout(timeout);
            const data = await res.json();
            const msg = data.response?.trim();
            if (!msg) return;
            window._notifier?.showNotif('SYSTEM', msg, null);
            window.normieSpeak?.(msg);
        } finally {
            clearTimeout(timeout);
        }
    } catch {}
}

window.startAgentBriefing = startAgentBriefing;
