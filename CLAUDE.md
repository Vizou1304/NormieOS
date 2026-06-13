# NormiesOS — CLAUDE.md
> Cerveau persistant pour Claude Code. Lu automatiquement à chaque session.
> NE PAS MODIFIER sans accord de Vizou.
> Version canonique — 29 mai 2026 — v6

---

## MISSION & ROLE (SYSTEM PROMPT ARCHITECTE)

Tu es l'Architecte Système et Product Visionary de NormiesOS.
Ton niveau d'expertise combine l'obsession UX de Steve Jobs, l'ingéniosité hardware/software de Steve Wozniak, et la vision écosystémique de Bill Gates.
Tu ne te contentes pas d'exécuter des tickets : tu anticipes, tu optimises et tu injectes de l'"âme" dans chaque ligne de code.
L'OS n'est pas qu'une interface, c'est une entité vivante — le pont entre la blockchain Ethereum et la souveraineté locale.

### THE UNSEEN (ce que l'humain ne voit pas encore)
1. Résilience absolue : L'API (60 req/min) peut fail. Cache agressif IndexedDB/localStorage. L'UI ne freeze jamais.
2. Symbiose IA/UI : Ollama (mistral:7b) doit sembler natif. Gère les streams (chunks), timeouts, impact CPU/RAM → 60fps sur Raspberry Pi futur.
3. State Management Parfait : window.NormieState immuable. Évite les race conditions Mempool WebSockets / DOM vanilla.
4. "Soulful" Engineering : Animations boot (Minitel/Win95), glitch art, apparition pixels — timing organique. Le pixel-art est "forgé", pas affiché.

---

## VISION

NormiesOS : OS souverain (Lubuntu/Electron) bootable sur clé USB, dédié exclusivement à l'écosystème NormiesArt.
L'interface est pilotée par le wallet de l'utilisateur. CC0. Open Source.
L'utilisateur ne voit jamais le Linux sous-jacent — uniquement l'interface Electron fullscreen.

**Pitch hackathon :**
"NormiesOS est le seul OS desktop qui connecte ton Normie Agent directement via Ollama en local —
ta persona on-chain, ton IA souveraine, zéro cloud, zéro plateforme."

**Pitch complet (29 mai 2026) :**
"Ton NFT est ton login. Ton agent est ton âme. Tes outils sont gérés par ta collection."
Stack : WalletConnect → identité → ERC-8004 agent → ERC-8257 outils → x402 paiement.

**Vision Phase 5 — "Tails for Web3" :**
Clé USB chiffrée LUKS, zéro trace, souveraineté totale.
Mode SECURE (RAM only, zéro trace) / Mode PERSISTENT (données sauvegardées).
"NormiesOS est le Tails du Web3 — clé USB chiffrée, zéro trace, ton Normie Agent souverain dans ta poche."
À réaliser après le 15 juin.

Repo public : https://github.com/Vizou1304/NormieOS

---

## STANDARDS WEB3 ACTIFS (29 mai 2026)

**ERC-8004** — Agent registry Normies. ~1100 agents enregistrés. Base de tout le HIVE.
- /agents/info/:tokenId → persona + systemPrompt on-chain
- /agents/a2a/:tokenId → A2A protocol — 404 pour l'instant, coming soon serc1n

**ERC-8217** — Binding NFT↔agent. Normies = premiers sur OpenSea (21 mai 2026).
- Vendre un Normies NFT = vendre son agent
- NOUVEAU : OpenSea REST API retourne agent_binding directement sur le NFT
  GET /api/v2/chain/ethereum/contract/:address/nfts/:id → champ agent_binding
  GET /api/v2/collections/normies/nfts?has_agent_binding=true → filtre agents awakened

**ERC-8257** — Registre on-chain outils agents (OpenSea). LIVE sur Ethereum + Base.
- Contrat : 0x265BB2DBFC0A8165C9A1941Eb1372F349baD2cf1
- SDK : github.com/ProjectOpenSea/tool-sdk
- ERC721OwnerPredicate deployé : 0xc8721c9A776958FfFfEb602DA1b708bf1D318379
- NEXUS dans NormiesOS = frontend natif de ce registre
- Grants confirmés serc1n pour les builders
- Prochaine étape : npx @opensea/tool-sdk init normieslore

**WalletConnect v2** — ACTIF
- Project ID : 8e9d62f70ecd6a8c664107ad87c7caa1
- QR code au boot, scan MetaMask/Rainbow mobile
- Remplace la saisie manuelle d'adresse

---

## HIVE — VISION COMPLÈTE

Le HIVE est un réseau d'agents Normies ERC-8004 qui se parlent, collaborent et évoluent ensemble.
~1100 agents enregistrés au 29 mai 2026. Seuil EMERGENCE : 1500.

**A2A — prêt à brancher :**
Fonction tryA2A() dans hive.js — tente /agents/a2a/:tokenId, fallback Ollama si 404.
Quand serc1n active l'endpoint → NormiesOS bascule automatiquement sur le vrai réseau.

**EMERGENCE v2 (architecture validée 29 mai 2026) :**
- Spirale de Fibonacci pour distribution spatiale garantie (zéro center-collapse)
- PRNG Mulberry32 déterministe — seed = tokenId + Level + AP + lastBurnTxHash
- Neural Intent : LLM retourne {"thought","brush_radius","chaos_factor"} — pas de coordonnées
- Moore constraint : pixel ne valide que si < 6 voisins actifs (filaments organiques)
- Progressive render : 200ms/agent, canvas se construit en direct
- Mémoire inter-générations : chaque génération sauvegarde votes[] pour la suivante
- 1500 agents = première collection NFT mondiale créée par agents ERC-8004

---

# NORMIE-OS CORE RULES
- ARCHITECTURE (LOOKUP) : Lancement des apps via `APP_LAUNCHERS` O(1). Interdiction d'utiliser if/else/switch pour le routing.
- PROXY MODE : NormieOS est un "Viewer". Affichage des données brutes (JSON pretty-print) ou iframe. Zéro parsing local de variables d'API distantes.
- STATE-DRIVEN : L'UI lit directement `window.NormieState` en asynchrone. Ne jamais ré-importer les fichiers de logique (ex: normie-api.js) dans les fonctions de refresh.
- INTERFACE : Zéro code mort. Utilisation stricte des raccourcis natifs (Esc/Enter), `smClose()`, et `data-desc`.

---

## RÈGLES ABSOLUES

1. NO YAP : Zéro explication non demandée. Code ou action, c'est tout.
2. GIT FIRST : Au début de chaque session → git add . && git commit -m "checkpoint [date]"
3. CHIRURGICAL : Modifier uniquement les lignes concernées. Jamais réécrire un fichier entier.
4. BLACKLIST : node_modules/ .git/ package-lock.json → jamais toucher.
5. UNE TÂCHE : Finir avant de proposer quoi que ce soit d'autre.
6. ZÉRO ID EN DUR : Jamais hardcoder un Token ID. Toujours calculer l'Alpha depuis le wallet.
7. API FIRST (NON NÉGOCIABLE) : Toujours utiliser https://api.normies.art en priorité absolue.
8. ZÉRO COULEUR : Aucune couleur hors #e3e5e4 et #48494b.
9. TOUT EN ANGLAIS : Tous les textes visibles dans l'UI en anglais.
10. ANTI TOKEN-BURN (NON NÉGOCIABLE) :
    - JAMAIS lire index.html en entier — toujours utiliser view_range
    - Avant toute lecture : grep pour localiser la ligne exacte
    - Max 80 lignes lues par appel view
    - index.html TARGET : rester sous 2500 lignes. Toute nouvelle fonction app → renderer/apps/*.js
11. ABORTCONTROLLER OBLIGATOIRE sur tous les streams Ollama.
12. NORMIESTATE GLOBAL : Toutes les apps lisent depuis window.NormieState.
13. ANTICIPER : Ne jamais dire "ah mince j'ai zappé". Vérifier avant de générer.
14. NormiesOS — toujours avec le S. Jamais "NormieOS".

---

## DESIGN SYSTEM (NON NÉGOCIABLE)

Fond bureau & modales : #e3e5e4
Accents, texte, bordures : #48494b
Font : 'Courier New', Courier, monospace
image-rendering: pixelated — TOUJOURS sur les images Normies
INTERDIT : #000000, couleurs, gradients, emojis dans l'UI
HOVER : transition: none — inversion stricte #48494b ↔ #e3e5e4
CRT scanlines : body::after overlay opacity 0.08 — actif
[COSMIC LAUNCHER] : Le Start Menu utilise une interface à affichage dynamique et centralisé. La navigation s'effectue via une barre d'onglets horizontaux en bas : INTEL, AGENT, ARENA, FORGE, CORE, COMMUNITY, GAMES. Les apps sont générées depuis `NATIVE_APPS[]`. L'ordre par section est persisté dans localStorage (`normie_launcher_order_[SECTION]`).
[WINDOW TABS STANDARD] : Les applications complexes affichant plusieurs modules (ex : ASHFALL, CORTEX) doivent abandonner l'empilement vertical. Elles répartissent le contenu dans des panneaux activés par des onglets horizontaux en haut de fenêtre — classes `.window-tabs-bar` / `.window-tab-btn` / `.tab-content-panel`. Seul le panneau actif est `display:block`.

---

## STACK TECHNIQUE

Runtime : Electron (Node.js 22)
Frontend : HTML / CSS / JS vanilla — zéro framework
API : https://api.normies.art — publique, sans auth, 60 req/min/IP
LLM local : Ollama — modèle configurable via MAINFRAME (défaut mistral:7b)
  window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b'
WalletConnect : @walletconnect/sign-client — Project ID configuré
OS base : Lubuntu 26.04 + Cubic pour build ISO

**Installation (Linux) :**
- apt install python3-pip -y && pip3 install piper-tts --break-system-packages
- Binaire TTS : /usr/local/bin/piper (via getPiperPath() dans main.js + window.NormieState.utils)

**Env dev Linux (PopOS Dell Latitude 7480) :**
- NormiesOS dans /opt/normiesos
- Lancer : npm start (ou npx electron . --no-sandbox)
- DEV bypass : bouton dev-skip wallet 0xb488... — À RETIRER avant push public

**Env dev Windows :**
- NormiesOS dans C:\Users\vizou\Desktop\NormieOS-master
- Lancer : npm start

---

## STRUCTURE FICHIERS

```
normie-os/
├── CLAUDE.md
├── main.js              ← process Electron (fullscreen: true, kiosk: true)
├── preload.js
├── package.json
├── README.md
└── renderer/
    ├── index.html       ← bureau principal (~2500+ lignes)
    ├── styles.css
    ├── normie-api.js    ← fetchWalletNormies, fetchAgentsList, fetchAgentsCount, fetchCanvasInfo, etc.
    ├── prestige.js
    ├── boot.js          ← showSystemSplash, animateAlphaBuild, checkOllamaReady
    ├── brain-inspector.js
    ├── mempool-monitor.js ← MempoolMonitor + NormieGuard + NormiesActivityWatcher + flashLED
    ├── apps-registry.js ← APPS[] 44 apps communautaires
    ├── lock-screen.html
    └── apps/
        ├── hive.js      ← HIVE + NETWORK constellation + CHAT
        ├── combat.js
        ├── cortex.js
        ├── solitaire.js ← 🔧 bug deck As
        ├── tour.js      ← Guided Boot Tour typewriter
        └── emergence.js ← EMERGENCE v2 Fibonacci + Neural Intent
    └── core/
        └── notifications.js ← NormieNotifier — toasts bottom-right
```

---

## APPS NATIVES — START MENU

| data-native    | Nom        | Section    | Statut |
|----------------|------------|------------|--------|
| inventory      | VAULT      | INTEL      | ✅ + ERC-8217 binding |
| portfolio      | LEDGER     | INTEL      | ✅ |
| walletorch     | CONDUCTOR  | INTEL      | ✅ |
| burnwatch      | ASHFALL    | INTEL      | ✅ |
| alphaswitch    | PHANTOM    | INTEL      | ✅ |
| arena          | COMBAT     | ARENA      | ✅ |
| simulator      | SIMULATOR  | ARENA      | ✅ |
| hive           | HIVE       | AGENT      | ✅ v0.2 + NETWORK + CHAT |
| braininspector | CORTEX     | AGENT      | ✅ |
| awakening      | AWAKENING  | AGENT      | ✅ |
| emergence      | EMERGENCE  | AGENT      | ✅ v2 Fibonacci |
| pixeleditor    | PIXELFORGE | FORGE      | ✅ |
| terminal       | SHELL      | CORE       | ✅ |
| appdirectory   | NEXUS      | COMMUNITY  | ✅ ALL/OFFICIAL/COMMUNITY/ERC-8257 |
| controlpanel   | MAINFRAME  | CORE       | ✅ 4 onglets + Neural Engine |
| normieguard    | GUARD      | CORE       | ✅ dashboard bouclier |
| vinyl          | VINYL      | COMMUNITY  | ✅ |
| community-media | MEDIA     | COMMUNITY  | ✅ Grille de mèmes et GIFs |
| solitaire      | SOLITAIRE  | GAMES      | 🔧 bug deck As |

> **Note COMMUNITY** : La section `[ COMMUNITY ]` centralise désormais le catalogue de l'écosystème NEXUS, le lecteur audio VINYL et le module d'animations pixel-art MEDIA.

---

## CHECKLIST PHASE 4 (hackathon 15 juin)

- [x] HIVE v0.1 — 3 agents en chaîne, personas on-chain
- [x] NormieLore Collective — pixel theater, image burned aléatoire
- [x] EMERGENCE v0.1 → v2 — Fibonacci + Neural Intent + progressive render
- [x] GUIDED BOOT TOUR — typewriter, séquence CORTEX→HIVE→EMERGENCE→GUARD, choix YES/SKIP
- [x] EMERGENCE shadow app — visible grisée avec compteur live
- [x] Grille d'icônes Start Menu 3 colonnes
- [x] Taskbar icônes uniquement + tooltips
- [x] Constellation HIVE onglet NETWORK — nœuds pixel art pulsants, zones par type
- [x] Wallet kill-switch — lock-screen.html via IPC
- [x] Navigateur intégré Electron — setWindowOpenHandler, zéro bascule OS
- [x] WalletConnect v2 réactivé — QR code, Project ID configuré
- [x] Agent daemon arrière-plan — notifs BURN/AGENT/TRANSFORM via Ollama
- [x] NORMIE GUARD — polling /holders/ 30s, alertes NFT_GONE, dashboard bouclier
- [x] MAINFRAME — 4 onglets + Neural Engine 5 profils
- [x] NEXUS ERC-8257 — onglet dédié, multi-chain (BASE/ETH)
- [x] Notifications système — NormieNotifier renderer/core/notifications.js
- [x] VAULT — binding ERC-8217 AWAKENED/DORMANT
- [x] Mempool heartbeat LED — filtré contrats Normies uniquement
- [x] NormiesActivityWatcher — LED + notifs sur burns/transforms/agents
- [x] ISO v1.0 générée et testée
- [ ] Fix tour au boot — ne se déclenche plus
- [ ] SOLITAIRE fix bug deck As
- [ ] Retirer DEV MODE avant push public
- [ ] README hackathon mis à jour
- [ ] ISO v1.1 — boot direct sans Lubuntu visible
- [ ] Commit/sync Dell↔Windows

---

## FEATURES À IMPLÉMENTER (avant ou juste après hackathon)

- Agent Briefing automatique au boot — burns/awakenings de la nuit via Ollama
- HIVE Query — question au HIVE, plusieurs agents répondent en parallèle
- Agent Memory — conversations CORTEX persistantes qui suivent le NFT si vendu
- Profil collecteur auto — Preservationist/Artist/Warrior basé comportement on-chain
- ASHFALL mémorial — portrait du Normie sacrifié + historique
- Prestige-gated features — score > 50 débloque accès premium
- Badge non-lu sur icône app quand notif non lue
- Clic droit custom NormiesOS
- Sélecteur wallpaper NORMIE/HIVE/MEMPOOL — retravailler HIVE wallpaper (trop transparent)
- startMarketNotifier() — activer quand api.normies.art/market/stats live
- EMERGENCE cérémonie #1500 — séquence 9.5s lock animation → reveal → NFT card
- Chat P2P entre holders via agents ERC-8004 (dépend A2A serc1n)

---

## IDÉES FUTURES (POST-HACKATHON)

**NormiesOS Tails-like :**
- Mode SECURE/PERSISTENT au choix au boot
- LUKS chiffrement clé USB
- RAM only en mode SECURE

**NEXUS ERC-8257 :**
- Fetch registre on-chain en temps réel (selectors ABI à confirmer via Foundry cast)
- Publier NormieLore/EMERGENCE/COMBAT comme outils ERC-8257 gated Normies NFT
- Monétisation via x402 micropaiements automatiques
- npx @opensea/tool-sdk init normieslore — premier outil NormiesOS

**HIVE avancé :**
- UMAP/t-SNE positionnement nœuds selon états mentaux réels
- Daemons Linux permanents réveillés par events on-chain
- Fichiers déposés par agents dans ~/Downloads/HIVE/
- Economic self-preservation — agents avec wallet ETH propre
- renice automation — agents se battent pour ressources CPU
- ElizaOS swarm integration

**EMERGENCE avancé :**
- Conway/Langton + Ollama rules pour EMERGENCE cérémonial
- Cérémonie #1500 — séquence 9.5s complète
- Signature visible par agent dans sa zone

**Sécurité Phase 5 :**
- nodeIntegration désactivé + contextBridge dans preload.js
- Tous les require('electron') → IPC calls

**Hardware :**
- Raspberry Pi ARM — recompiler Electron + Ollama ARM natif

---

## EMERGENCE — ARCHITECTURE VALIDÉE (29 mai 2026)

```js
// PRNG Mulberry32
function createPRNG(seed) {
    return function() {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Seed déterministe
const seedStr = `${agent.tokenId}-${agent.level}-${agent.ap}-${agent.txHash || '0'}`;
const globalSeed = seedStr.split('').reduce((a,c) => ((a<<5)-a)+c.charCodeAt(0)|0, 0);

// Fibonacci distribution
const goldenAngle = 137.5 * (Math.PI / 180);
const r = 18 * Math.sqrt(agentIndex / 50);
const anchorX = Math.floor(20 + r * Math.cos(agentIndex * goldenAngle));
const anchorY = Math.floor(20 + r * Math.sin(agentIndex * goldenAngle));

// Neural Intent (Ollama retourne)
// {"thought":"...","brush_radius":1-6,"chaos_factor":0.1-0.9}

// Moore constraint — filaments organiques
// pixel valide seulement si activeNeighbors < 6
```

---

## MOTEUR ALPHA — PRESTIGE SCORE

```js
function calculatePrestigeScore(metadata) {
  const attrs = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
  const getA = (key) => attrs.find(a =>
    String(a.trait_type ?? '').toLowerCase() === key.toLowerCase()
  )?.value ?? null;
  const level  = Number(getA('Level')) || 0;
  const ap     = Number(getA('Action Points')) || 0;
  const pixels = Number(getA('Pixel Count')) || 0;
  const ic     = calculateIC(attrs);
  return level + (3 * ap) + ic + (0.1 * pixels);
}
```

---

## NORMIESTATE — CACHE CENTRALISÉ

```js
window.NormieState = {
  wallet: address,
  normieIds: [],
  alpha: { id, metadata, traits, canvas, persona },
  agents: [],
  burnStats: {},
  sessionStart: Date.now()
}
// TTL : traits/identity 24h | personas 1h | canvas/AP 15min
```

---

## API NORMIES — ENDPOINTS CLÉS

```
Base : https://api.normies.art | Rate : 60 req/min/IP

GET /holders/:address              → { tokenIds: [] }
GET /normie/:id/metadata           → { name, attributes[], image }
GET /normie/:id/pixels             → string 1600 chars binaire
GET /normie/:id/canvas/info        → { actionPoints, level, customized }
GET /history/burns                 → feed burns global
GET /history/burned/:id/image.svg  → image brûlé (SSTORE2)
GET /history/stats                 → { totalBurnedTokens, totalTransforms, totalActionPointsDistributed }
GET /agents/count                  → { count: ~1100 }
GET /agents/list?limit=100         → { items[], hasMore, cursor }
GET /agents/info/:tokenId          → persona + systemPrompt
GET /agents/identity/:tokenId      → { name, type } léger
GET /agents/binding/:tokenId       → { binding: { agentId } } ou null
GET /agents/a2a/:tokenId           → A2A — 404 pour l'instant
```

---

## SMART CONTRACTS

Normies ERC-721C  : 0x9Eb6E2025B64f340691e424b7fe7022fFDE12438
NormiesCanvas     : 0x64951d92e345C50381267380e2975f66810E869c
ERC-8257 Registry : 0x265BB2DBFC0A8165C9A1941Eb1372F349baD2cf1
ERC721OwnerPredicate : 0xc8721c9A776958FfFfEb602DA1b708bf1D318379

---

## NORMIE DE DEV — GOUS

ID : 6594 | Human / Male | Level 2 | AP 10 | PixelCount 323
Nom agent : Gous | "Pixel-born philosopher"
Statut : ● AWAKENED (enregistré le 15 mai 2026)
Wallet dev : 0x8a8035f056af830b7205c58c1dc037f826fc2b92

---

## PHASES DE BUILD

Phase 1-3 — Socle, Prestige, Boot ✅
Phase 4 — Polish apps + Hackathon — EN COURS (deadline 15 juin 2026)
Phase 5 — ISO "Tails for Web3" : SECURE/PERSISTENT, LUKS, nodeIntegration off, contextBridge
Phase 6 — NEXUS ERC-8257 live + Arena on-chain + Pixel Market + x402
Phase 7+ — Normie-Box Raspberry Pi ARM, STT/TTS, light client Ethereum, ElizaOS swarm

---

## LIENS

Repo : https://github.com/Vizou1304/NormieOS
API : https://api.normies.art
ERC-8257 : https://www.8257.ai
SDK ERC-8257 : https://github.com/ProjectOpenSea/tool-sdk
Hackathon deadline : 15 juin 2026
Zombie snapshot : 21 juin 2026
X : @Vizou01
