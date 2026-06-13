// renderer/prestige.js — Prestige Score (source de vérité CLAUDE.md)
// Score = Level + (3 × AP) + IC_Traits + (0.1 × PixelCount)
// IC_Traits : Tier (Legendary=100, Epic=75, Rare=50, Common=25) + Customized (+30)

export function calculatePrestigeScore(meta) {
    const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
    const get   = (key) => attrs.find(a =>
        String(a.trait_type ?? '').toLowerCase() === key.toLowerCase()
    )?.value ?? null;

    const icCust  = String(get('Customized') ?? '').toLowerCase() === 'yes' ? 30 : 0;

    const level  = Number(get('Level')         ?? 0);
    const ap     = Number(get('Action Points') ?? 0);
    const pixels = Number(get('Pixel Count')   ?? 0);
    const icTier  = pixels >= 800 ? 100 : pixels >= 400 ? 50 : pixels >= 200 ? 25 : 0;

    return Math.round((level + (3 * ap) + icTier + icCust + (0.1 * pixels)) * 10) / 10;
}

// Top-5 normies du wallet → prestige wallet global
export function calculateWalletPrestige(normiesMetas) {
    return normiesMetas
        .map(m => calculatePrestigeScore(m))
        .sort((a, b) => b - a)
        .slice(0, 5)
        .reduce((sum, s) => sum + s, 0);
}
