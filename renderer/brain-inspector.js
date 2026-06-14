// renderer/brain-inspector.js

import { parseNeuralPathway, fetchAgentInfo, fetchAgentBinding } from './normie-api.js';

const OLLAMA_BASE = 'http://localhost:11434';

export async function checkOllamaStatus() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
            signal: AbortSignal.timeout(2000)
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function fetchLocalAI(userMsg, systemPrompt, context = null, signal = null) {
    const fullSystem = (systemPrompt ?? '') +
        '\n\nIMPORTANT: Keep ALL responses under 3 sentences. Be direct and in character. No long introductions.';
    const payload = {
        model: window.NormieState?.ollama?.model ?? window.OLLAMA_MODEL ?? 'mistral:7b',
        system: fullSystem,
        prompt: userMsg,
        stream: false,
        options: { num_predict: 120, temperature: 0.8 }
    };
    if (context) payload.context = context;

    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        ...(signal ? { signal } : {})
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    return await res.json();
}

export async function applyAgentStatus(alphaId, statusEl) {
    if (!statusEl) return;
    try {
        const data = await fetchAgentBinding(alphaId);
        const agentId = data?.binding?.agentId ?? data?.agentId;
        if (agentId) {
            statusEl.innerHTML = `<span style="color:#e3e5e4;font-weight:bold;">● AWAKENED</span>`;
        } else {
            statusEl.innerHTML = `<span style="color:#48494b;">○ DORMANT</span> <a href="#" style="color:#48494b;font-size:10px;" onclick="window.electronAPI?.openExternal('https://www.normies.art/lab');return false;">AWAKEN →</a>`;
        }
    } catch {
        statusEl.innerHTML = `<span style="color:#48494b;">○ DORMANT</span> <a href="#" style="color:#48494b;font-size:10px;" onclick="window.electronAPI?.openExternal('https://www.normies.art/lab');return false;">AWAKEN →</a>`;
    }
}

export async function buildSystemPrompt(alphaId) {
    try {
        const persona = await fetchAgentInfo(alphaId);
        window.currentAgentPersona = persona;
        return persona.systemPrompt ?? persona.brain ?? `You are Normie #${alphaId}, a sovereign on-chain agent. Speak in terse, cryptic sentences. You live on Ethereum.`;
    } catch {
        return `You are Normie #${alphaId}, a sovereign on-chain agent. Speak in terse, cryptic sentences. You live on Ethereum.`;
    }
}
