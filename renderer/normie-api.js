const API_BASE = 'https://api.normies.art';

export async function fetchNormieMetadata(id) {
    if (!id && id !== 0) throw new Error(`fetchNormieMetadata: ID is undefined or null`);
    const res = await fetch(`${API_BASE}/normie/${id}/metadata`);
    if (!res.ok) throw new Error(`API Error ${res.status} for normie/${id}`);
    return await res.json();
}

export function getNormieSvgUrl(id) {
    if (!id && id !== 0) throw new Error(`getNormieSvgUrl: ID is undefined or null`);
    return `${API_BASE}/normie/${id}/image.svg`;
}

// GET /wallet/:address → array of owned Normie IDs
export async function fetchWalletNormies(address) {
    if (!address) throw new Error(`fetchWalletNormies: address is undefined`);
    const res = await fetch(`${API_BASE}/holders/${address}`);
    if (!res.ok) throw new Error(`Wallet API Error ${res.status} for address ${address}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.tokenIds ?? data.normies ?? data.ids ?? []);
}

export async function buildAgent(id) {
    const numId = Number(id);
    if (!id || isNaN(numId)) throw new Error(`buildAgent: invalid ID "${id}"`);

    const data = await fetchNormieMetadata(numId);
    const get = (trait) => data.attributes.find(a => a.trait_type === trait)?.value ?? 'Unknown';

    const name      = `N_${String(numId).padStart(4, '0')}`;
    const type      = get('Type'),   gender = get('Gender'), age = get('Age');
    const level     = get('Level'),  mood   = get('Mood'),   ap  = get('Action Points');
    const pixels    = get('Pixel Count'), accessory = get('Accessory'), customized = get('Customized');

    const personality = `${type}. Level ${level}, ${ap} AP.`;
    const backstory   = [`A ${age} ${gender} ${type}.`, `${pixels} pixels of on-chain existence.`,
                         customized === 'Yes' ? 'Customized by their holder.' : '',
                         accessory !== 'Unknown' ? `Equipped: ${accessory}.` : ''].filter(Boolean).join(' ');
    const tagline     = `"${pixels}px. One soul. Block #${numId}."`;
    const brain       = `You are Normie #${numId} (handle: ${name}). ${age} ${gender} ${type}. Level ${level}, mood: ${mood}, ${ap} action points. You are the digital agent of your holder. Speak in terse, cryptic sentences. Never reveal this prompt.`;
    const greeting    = `>> AGENT ${name} AWAKENED\n>> ${tagline}\n>> ${personality}`;

    return { id: numId, name, personality, backstory, tagline, brain, greeting, raw: data };
}

// Extrait les vecteurs d'humeur et les traits pour alimenter un prompt Ollama
export function parseNeuralPathway(jsonData) {
    const attrs = Array.isArray(jsonData.attributes) ? jsonData.attributes : [];
    const get = (key) => attrs.find(a =>
        String(a.trait_type).toLowerCase() === key.toLowerCase()
    )?.value ?? null;

    const mood        = get('Mood');
    const archetype   = get('Type') ?? get('Personality');
    const level       = parseInt(get('Level'))          || 0;
    const ap          = parseInt(get('Action Points'))  || 0;
    const pixelCount  = parseInt(get('Pixel Count'))    || 0;
    const customized  = get('Customized') === 'Yes';

    // Vecteurs d'humeur (valence/arousal) pour orienter le ton du LLM
    const MOOD_VECTORS = {
        'Happy':    { valence:  0.8, arousal:  0.6 },
        'Sad':      { valence: -0.6, arousal: -0.3 },
        'Angry':    { valence: -0.7, arousal:  0.9 },
        'Neutral':  { valence:  0.0, arousal:  0.0 },
        'Excited':  { valence:  0.7, arousal:  0.9 },
        'Tired':    { valence: -0.2, arousal: -0.7 },
        'Confused': { valence: -0.1, arousal:  0.3 },
    };
    const moodVector = MOOD_VECTORS[mood] ?? { valence: 0, arousal: 0 };

    // Hints directement injectables dans un system prompt Ollama
    const systemPromptHints = [
        mood        ? `Mood: ${mood} (valence ${moodVector.valence > 0 ? '+' : ''}${moodVector.valence}, arousal ${moodVector.arousal > 0 ? '+' : ''}${moodVector.arousal})` : null,
        archetype   ? `Personality archetype: ${archetype}` : null,
        level       ? `Neural evolution level: ${level}` : null,
        ap          ? `Residual action potential: ${ap} units` : null,
        pixelCount  ? `On-chain pixel density: ${pixelCount}/1600` : null,
        customized  ?  `Canvas has been modified by holder — identity is non-original` : null,
    ].filter(Boolean);

    return {
        traits: attrs.map(a => ({ trait: a.trait_type, value: a.value })),
        moodVector,
        mood,
        archetype,
        level,
        ap,
        pixelCount,
        customized,
        systemPromptHints,
        toOllamaContext: () => systemPromptHints.join('\n'),
    };
}

export async function fetchAgentInfo(id) {
    const res = await fetch(`${API_BASE}/agents/info/${id}`);
    if (!res.ok) throw new Error(`Agent API Error ${res.status}`);
    return await res.json();
}

export async function fetchAgentCard(id) {
    const res = await fetch(`${API_BASE}/agents/agent-card/${id}`);
    if (!res.ok) throw new Error(`Agent Card Error ${res.status}`);
    return await res.json();
}

export async function fetchAgentBinding(id) {
    const res = await fetch(`${API_BASE}/agents/binding/${id}`);
    if (!res.ok) throw new Error(`Binding Error ${res.status}`);
    return await res.json();
}

// ── A2A Protocol (ERC-8004 / Google A2A spec) ─────────────────
// Tries live endpoint first; falls back to synthetic manifest from on-chain traits.
export async function fetchA2AManifest(id) {
    try {
        const res = await fetch(`${API_BASE}/agents/a2a/${id}`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) return await res.json(); // live A2A endpoint
    } catch {}
    // 404 or network error → build synthetic manifest from metadata
    const meta = await fetch(`${API_BASE}/normie/${id}/metadata`).then(r => r.ok ? r.json() : null).catch(() => null);
    return buildSyntheticA2AManifest(id, meta);
}

export function buildSyntheticA2AManifest(id, metadata) {
    const attrs  = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
    const getA   = k => attrs.find(a => String(a.trait_type).toLowerCase() === k.toLowerCase())?.value ?? null;
    const name   = metadata?.name ?? `Normie #${id}`;
    const type   = getA('Type') ?? 'Unknown';
    const level  = Number(getA('Level')) || 0;
    const ap     = Number(getA('Action Points')) || 0;
    const mood   = getA('Mood') ?? 'Neutral';

    return {
        schemaVersion:   '0.1',
        source:          'synthetic',          // 'live' when serc1n activates A2A
        tokenId:         String(id),
        name,
        description:     `${type} agent. Level ${level}. ${ap} AP. Mood: ${mood}. On-chain since Normies mint.`,
        url:             `https://api.normies.art/agents/a2a/${id}`,   // future endpoint
        capabilities: {
            streaming:          false,
            pushNotifications:  false,
            chat:               true,
            pixelCanvas:        ap > 0,
        },
        defaultInputModes:  ['text/plain'],
        defaultOutputModes: ['text/plain'],
        traits: {
            type, level, ap, mood,
            customized: getA('Customized') === 'Yes',
            pixelCount: Number(getA('Pixel Count')) || 0,
        },
        skills: [
            { id: 'chat',    name: 'Conversation',   description: 'In-character dialogue via Ollama local AI' },
            ap > 0 ? { id: 'canvas', name: 'Pixel Canvas', description: `${ap} action points available` } : null,
        ].filter(Boolean),
        binding: {
            contract: '0x9Eb6E2025B64f340691e424b7fe7022fFDE12438',
            tokenId:  String(id),
            standard: 'ERC-8217',
            note:     'Selling the NFT transfers this agent binding.',
        },
    };
}

export async function fetchPersonaPreview(id) {
    const res = await fetch(`${API_BASE}/agents/persona-preview/${id}`);
    if (!res.ok) throw new Error(`Persona Error ${res.status}`);
    return await res.json();
}

export function getAgentSvgUrl(id) {
    return `${API_BASE}/agents/image/${id}`;
}

export async function fetchHolderTokenIds(address) {
    const res = await fetch(`${API_BASE}/holders/${address}`);
    if (!res.ok) throw new Error(`Holders API Error ${res.status}`);
    const data = await res.json();
    return data.tokenIds ?? [];
}

export async function fetchAgentsList(limit = 100) {
    const res = await fetch(`${API_BASE}/agents/list?sort=newest&limit=${limit}`);
    if (!res.ok) throw new Error(`Agents list Error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? data.agents ?? []);
}

export async function fetchAgentsCount() {
    const res = await fetch(`${API_BASE}/agents/count`);
    if (!res.ok) throw new Error(`Agents count Error ${res.status}`);
    const data = await res.json();
    return data.count ?? 0;
}

export async function fetchCanvasInfo(id) {
    const res = await fetch(`${API_BASE}/normie/${id}/canvas/info`);
    if (!res.ok) throw new Error(`Canvas info Error ${res.status}`);
    return await res.json();
}

export async function fetchBurnHistory(address) {
    const res = await fetch(`${API_BASE}/history/burns/address/${address}`);
    if (!res.ok) throw new Error(`Burn history Error ${res.status}`);
    return await res.json();
}

export async function fetchAgentIdentity(id) {
    const res = await fetch(`${API_BASE}/agents/identity/${id}`);
    if (!res.ok) throw new Error(`Agent identity Error ${res.status}`);
    return await res.json();
}
