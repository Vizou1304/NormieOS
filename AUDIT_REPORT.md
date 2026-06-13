# NORMIES OS — DEEP AUDIT REPORT
> Generated: 2026-06-09

---

## 1. API ALIGNMENT

### Documented endpoints (from CLAUDE.md)
```
GET /holders/:address
GET /normie/:id/metadata
GET /normie/:id/pixels
GET /normie/:id/canvas/info
GET /history/burns                   (global feed)
GET /history/burned/:id/image.svg
GET /history/stats
GET /agents/count
GET /agents/list?limit=100
GET /agents/info/:tokenId
GET /agents/identity/:tokenId
GET /agents/binding/:tokenId
GET /agents/a2a/:tokenId
GET /history/burns/address/:address
```

---

### Broken / Wrong Endpoints

- `GET /normie/:id/canvas/status` — **pixeleditor.js:138** — Endpoint not in docs. The documented route is `/normie/:id/canvas/info`. If this is a real separate endpoint (returns planned-AP / burn-queue), its contract is unknown. If it is a typo of `canvas/info`, the Burn Planner silently gets null every time it opens.

- `GET /history/burned-tokens?limit=100` — **hive.js:622** — Not documented. Expected shape unclear; code treats response as an array and reads `.tokenId`. If this endpoint does not exist, the LORE pipeline randomly picks `firstBurn = null` every run, causing no image in the theater.

- `GET /agents/agent-card/:id` — **normie-api.js:104** — Not in CLAUDE.md docs. `fetchAgentCard()` is defined but never called anywhere in the codebase (zero callers found via grep). Dead code.

- `GET /agents/persona-preview/:id` — **normie-api.js:170 / combat.js:99** — Not documented. Used as a secondary fallback in COMBAT when `agents/info` returns a 500. Acceptable as a fallback, but contract is unknown; if it also returns 500 the fighter becomes `{ name: 'Normie #X', systemPrompt: '' }` with no error shown.

- `GET /history/burns/receiver/:id` — **cortex.js:163 / emergence.js:388** — Not documented. Used in SCARS tab to count how many burns a token *received*. Risk: if undocumented, may return 404 silently (`.catch(() => null)` masks this).

- `GET /history/normie/:id/versions` — **burnwatch.js:152 / cortex.js:19,162** — Not documented in CLAUDE.md. Actively used for Canvas History and SCARS. Endpoint appears stable but should be confirmed.

- `GET /history/normie/:id/version/:vNum/image.svg` — **burnwatch.js:122 / cortex.js:222** — Not documented. Used to render per-version canvas previews. Same risk as above.

- `GET /normie/:id/original/image.svg` — **burnwatch.js:139** — Not documented. Used by "[ ORIGINAL ]" button in ASHFALL Canvas History tab.

- `GET /history/burns/:commitId` (detail) — **burnwatch.js:34,200** — Only the address-scoped variant is documented. The commit-ID variant is used in the burn list and detail modal but not listed in CLAUDE.md.

---

### High-Value Unused Endpoints

- `GET /agents/identity/:tokenId` — Returns `{ name, type }` lightweight. **Currently unused in any app.** Could be used in HIVE NETWORK tab to annotate each constellation node without the full 3-fetch overhead of `agents/info` + `normie/metadata`. Estimated impact: 3× reduction in API calls for network rendering.

- `GET /history/burns/address/:address` — **Used** in LEDGER/SHELL/TERMINAL only. **Not used in GUARD**. GUARD only counts current token count — it does not warn if burn rate suddenly spikes. Hooking this into GUARD's 30s poll would add burn-velocity alerting in under a day.

- `GET /normie/:id/pixels` (1600-char binary string) — **Only used in PIXELFORGE**. Could be used in EMERGENCE to skip the per-agent SVG fetch and reconstruct pixel data locally, reducing 1 HTTP call per agent during the render pipeline. Currently EMERGENCE fetches the full SVG + canvas info separately.

---

## 2. APP STATUS

---

### VAULT (inventory.js) | OK
- Correctly reads from `window.NormieState.normieIds` and `NormieCache` — no re-fetch on open.
- Fires `Promise.all` for all binding checks simultaneously — good batching.
- No close handler. No intervals/streams to clean up, acceptable.
- Issue: `inventory.js:35` — binding display sets `el.style.color = '#48494b'` for AWAKENED. No design violation but the DORMANT state has no color override, relying on inherited style — consistent.
- **No issues with checklist points 1–12.**

---

### LEDGER (portfolio.js) | WARNING
- **portfolio.js:38** — Fetches `agents/binding/${window.currentAlphaId}` (singular). Only checks the alpha's binding, counts `awakenedCount` as 0 or 1. If user holds 10 Normies with 7 awakened, SOVEREIGN profile is understated. Profile logic is based on a single binding check — misleading for multi-holder wallets.
- NormieBus unsub registered on close button — good cleanup (portfolio.js:106).
- No AbortController on the two fetches (fetches are one-shot, acceptable).
- GOLD/SILVER/IRON/GREY TIER thresholds are hardcoded by pixel count totals — not dynamic from API. Minor.

---

### ASHFALL (burnwatch.js) | WARNING
- **burnwatch.js:18** — `Promise.all(commits.map(...))` fires one `fetch(/history/burns/${commitId})` per burn in the list. With 20 burns: 20 simultaneous detail requests on top of the initial 2. Total: 22 requests at open. At 60 req/min limit this saturates ~22% of the rate budget on one app open.
- **burnwatch.js:122** — Image URL uses `/history/normie/${_chTokenId}/version/${vNum}/image.svg` — undocumented endpoint (see §1).
- **burnwatch.js:139** — Uses `/normie/${tokenId}/original/image.svg` — undocumented endpoint.
- **burnwatch.js:235** — Ollama eulogy uses AbortController with 10s timeout — correct.
- No close handler (no intervals/streams outside of the Ollama call, which has its own abort). The Ollama AbortController created inside `openBurnDetail` at line 233 is not tied to window close — if user closes window during eulogy fetch the stream continues until the 10s timeout fires.
- French text: none. UI text all English.

---

### CORTEX (cortex.js) | WARNING
- **cortex.js:19** — Hardcodes `https://api.normies.art/history/normie/${alphaId}/versions` as a literal string instead of using `${API}`. Inconsistent — all other calls use `${API}` or `window.API`. If the API base changes, this line will not update.
- **cortex.js:183** — Ollama `stream: true` call does NOT use `scarsAbort.signal`. The `scarsAbort` controller is created at line 158 but only assigned to fetch calls for versRes/burnsRes/canvasRes (lines 161–164, which use `.catch(() => null)`, not the signal). The actual streaming Ollama call at line 183 uses `scarsAbort.signal` — this IS passed correctly. OK.
- Close handler at cortex.js:231 aborts both `abortController` and `scarsAbort`. Correct cleanup.
- Reads `window.NormieState?.alpha?.id` in `loadScars()` — good NormieState usage.
- Memory persisted to localStorage per alpha (`cortex_history_${alphaId}`) — correct.

---

### HIVE (hive.js) | WARNING
- **hive.js:472, 650, 680** — Three places hardcode `model: 'mistral:7b'` instead of using `window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b'`. Model selection in MAINFRAME is ignored by HIVE's main chain, lore analyst, and narrator. This is the most critical model-config bug across all apps.
- **hive.js:622** — `fetch('/history/burned-tokens?limit=100')` — undocumented endpoint (§1). Silent fail if 404 (`try/catch` wraps it), `firstBurn` stays null, theater has no image.
- Close handler at hive.js:580 calls `abortController.abort()` and `stopRaf()`. Canvas animation is cleaned up. Good.
- Caches agents list in `window.NormieState.agents` and `NormieCache` — correct NormieState usage.
- agents/info is fetched inside `Promise.all` for 3 shuffled agents — batched correctly.
- `hive.js:69` — 3 sequential `agents/info` fetches inside a `Promise.all` map. These run in parallel for the 3 agents. Acceptable.

---

### COMBAT (combat.js) | WARNING
- **combat.js:252** — `model: 'mistral:7b'` hardcoded. MAINFRAME model selection ignored.
- **combat.js:360** — Unbounded `while (hasMore && body.closest('.os-window'))` loop in a `setTimeout` (line 351) that paginate-fetches ALL awakened agents. At ~1100 agents with limit=100, this fires 11 sequential API calls (11 × agents/list requests) every time COMBAT opens. No AbortController on these loop fetches — if user closes window mid-pagination, requests continue silently until exhausted.
- **combat.js:378** — French text in UI: `> ${agents.length} AGENTS AWAKENED CHARGÉS.` — violates RULE 9 (ALL UI TEXT IN ENGLISH).
- AbortController on Ollama streaming exists (combat.js:75) and is aborted on window close (combat.js:345). Correct.
- `typeTimers` (setInterval array) are cleared on window close (combat.js:347). Correct.

---

### AWAKENING (awakening.js) | WARNING
- **awakening.js:6** — Uses `window.allNormieIds` as primary source (falls back to `currentAlphaId`). This bypasses `window.NormieState.normieIds`. `window.allNormieIds` is set at `index.html:494` — exists but is a parallel state to NormieState, creating two sources of truth.
- **awakening.js:25** — Fetches `normie/${id}/metadata` for every token in a `Promise.all` map. If NormieState.allMetadata is populated (which it is after awaken()), these fetches are redundant. Should read from `window.NormieState?.allMetadata?.[String(id)]` first.
- No close handler needed (no intervals/streams).
- Missing `window.openAwakening = openAwakening` export line at end of file — function is called directly as `openAwakening()` in APP_LAUNCHERS (index.html:1389) without `window.` prefix, so it works. Not a bug but inconsistent with other apps.

---

### PIXELFORGE (pixeleditor.js) | WARNING
- **pixeleditor.js:138** — `GET /normie/${alphaId}/canvas/status` — undocumented endpoint (§1). Burn Planner silently gets `_bpStatus = null` if the endpoint doesn't exist, causing "BURN PLANNER" to show Normies list but no burn calculations. The `bp-calc` result section never appears unless `_bpStatus` is truthy.
- Canvas push button is disabled (pixeleditor.js:37, `disabled`). Push on-chain is not implemented beyond this stub. No issue per se but the button is shown to users.
- No close handler needed (no intervals/streams).
- Reads from `window.NormieState.normieIds` and `allMetadata` in Burn Planner — correct.

---

### NEXUS (nexus.js) | OK
- Renders from `window.APPS` (community registry) — no API calls.
- ERC-8257 tab is in TOOLS app, not NEXUS — CLAUDE.md references it as the same. NEXUS only shows the community APPS[] registry (official/community filter). The ERC-8257 on-chain registry is in `renderer/apps/tools.js` under the TOOLS native app. No bug, but doc says "NEXUS = frontend of ERC-8257 registry" which is now handled by TOOLS.
- No intervals, no streams, clean.

---

### MAINFRAME (controlpanel.js) | WARNING
- **controlpanel.js:113** — Text size toggle buttons have `style="color:#e3e5e4;"` on a `#e3e5e4` background container. The label "[ TEXT SIZE ]" is rendered in `#e3e5e4` on `#e3e5e4` — invisible. This is a palette-compliant color but a genuine visibility bug.
- Two timers (hwTimer, sysTimer) are correctly cleared on close (controlpanel.js:435). Correct cleanup.
- The Ollama check at controlpanel.js:384 and ping at controlpanel.js:394 have no AbortController. These are fire-and-forget one-shot fetches — acceptable risk for the UI panel.
- AI tab correctly reads `localStorage.getItem('normie_model')` to set initial selection.

---

### SHELL / TERMINAL (terminal.js) | OK
- **terminal.js:117** — Uses `https://api.etherscan.io/api?module=gastracker&action=gasoracle` — external API without auth key. Etherscan free tier returns `MAX_RATE_LIMIT` after a few calls. No error handling for this specific case beyond generic `catch`.
- No intervals, no streams, no AbortController needed (one-shot commands). Clean.
- `/stop` command calls `clearInterval(window.matrixInterval)` — correct cleanup.
- All commands use `window.API` — correct.

---

### GUARD (guard.js) | OK
- `setInterval(poll, 30_000)` and uptime timer are both cleared on window close (guard.js:82–84). Correct cleanup.
- Reads wallet address from `window.currentWalletAddress` — global, correct.
- APPROVALS and CANVAS WATCH rows always show "OK" (hardcoded, guard.js:26–28). These are display-only stubs — no live data feeds them. Not a runtime error but users see a false "OK" on APPROVALS at all times.

---

### NOTEPAD (notepad.js) | OK
- Auto-saves to localStorage with 500ms debounce. Correct.
- No API calls, no intervals, no streams.
- No close handler needed. Clean.

---

### TRASH (trash.js) | OK
- All localStorage operations. No API calls.
- No close handler needed.
- `updateTrashBadge` is called on IIFE init — correct.

---

### RETRO (retro.js) | OK
- Uses `window.retroAPI.selectRom()` / `window.retroAPI.launch()` — Electron IPC via preload.
- No API calls. No intervals.
- No color violations.

---

### SOLITAIRE (solitaire.js) | WARNING
- **Known bug (CLAUDE.md):** Ace deck bug. The `autoFound` logic at solitaire.js:29 correctly checks `card.r === 'A'` for empty foundation piles. The double-click auto-move at solitaire.js:118 iterates `found` piles to find valid target. Potential bug: `autoFound` returns the index of the matching *suit* pile for non-Ace cards but for Aces it returns the first *empty* pile. If `found[0]` is `♠` and an `A♥` is double-clicked, it will land on found[0] if `found[0]` is empty even though foundations should be suit-ordered. The foundation placement check `(!top && card.r === 'A')` does NOT verify suit matching for first card — any Ace can go on any foundation pile. This is technically correct Solitaire rules (foundations don't need to be pre-assigned by suit), so the "bug" mentioned in CLAUDE.md may refer to a different symptom.
- **Actual bug candidate:** The render loop (`solitaire.js:84`) calls `body.innerHTML = ''` on every click — rebuilds entire DOM on each interaction. Performance degrades with many `setInterval` calls if any were left dangling, but solitaire has none. The full re-render is wasteful but not broken.
- Background color uses `#48494b` (palette-compliant).

---

### VINYL (vinyl.js) | WARNING
- Tracklist shows 11 generic `TRACK 01` through `TRACK 11` placeholders (vinyl.js:15–17). No actual track names. The Spotify/Apple links search by artist name — if the album title is slightly different from the search query, results may not surface the album. Track data should be hardcoded with real names.
- No API calls. No close handler needed. Clean.

---

### PHANTOM / ALPHASWITCH (alphaswitch.js) | OK
- Reads from `window.NormieState.normieIds` — correct.
- No fetch calls, no intervals. Clean.
- `window.switchAlpha` updates `desktop-normie` and `sm-normie-img` elements — correct two-location update.

---

### CONDUCTOR (walletorch.js) | WARNING
- **walletorch.js:18** — Footer text: `DELEGATION & BURN TRANSACTIONS — PHASE 3 (WalletConnect required)`. Phase 3 is complete. Stale label. Should be updated or removed.
- No AbortController on individual wallet scan fetches — acceptable (one-shot per wallet).
- `delegated` detection reads `canvas/info.delegate` field — field presence depends on API returning a `delegate` key. If absent, `!!undefined` = false — silently shows `[NO DELEG]`.
- No close handler needed (no timers/streams). Clean.

---

### SIMULATOR (simulator.js) | WARNING
- **simulator.js:217** — Ollama call uses `AbortSignal.timeout(30000)` (inline, not an AbortController instance). This means closing the window does NOT abort the Ollama stream — the battle log generation continues for up to 30s in background after window close.
- Reads from `window.NormieState.allMetadata` and `normieIds` — correct NormieState usage.
- Model correctly uses `window.OLLAMA_MODEL || localStorage.getItem('normie_model')`.
- No close handler registered.

---

### BRIEFING (briefing.js) | OK
- Checks `window.NormieState.burnStats` before fetching stats — correct cache usage (briefing.js:18).
- AbortController with 15s timeout on Ollama call (briefing.js:39–40). Correct.
- Not a windowed app — runs as background function. No close handler needed.
- No model hardcoding — uses OLLAMA_MODEL pattern correctly.

---

### TOOLS (tools.js) | OK
- AbortController tied to window close (tools.js:64). Correct.
- Reads from `window._nexusState` persistent cache — correct.
- Uses `window.ERC8257` registry. `ERC8257` is loaded from `renderer/core/erc8257.js`. If erc8257.js fails to init, `window.ERC8257` is undefined — tools.js:9 handles this gracefully via `if (reg)` guard.
- Wallet passed as `X-Wallet-Address` header (tools.js:67) — not as query param. Correct for ERC-8257 gated access.

---

### DREDGE (dredge.js) | OK
- File explorer showing notepad autosave and session log. No API calls.
- Reads `localStorage.getItem('normie_notepad')` — correct.
- No close handler needed. Clean.

---

### TOUR (tour.js) | WARNING
- **Known bug (CLAUDE.md):** Tour no longer triggers at boot. Root cause: `_showFirstBootOverlay` is called inside the WalletConnect `session_update` handler and the `dev-skip` handler (index.html:690 and 708). Both correctly call it after `awaken()` resolves. The tour overlay itself appears to be functional. The bug may be that `awaken()` completes and sets `normieOS_tour_v3` = 'done' via some other path before the overlay appears, or the overlay is created before `window.runGuidedTour` is defined (tour.js is loaded via `<script>` tag, not a module — it should be synchronously available). To confirm: `runGuidedTour` at tour.js:1 is a plain function, globally scoped — it IS available. The bug may be a timing issue where `_showFirstBootOverlay` fires before the DOM is fully built.
- `closeWin` uses `data-title` attribute selector (tour.js:13) — requires windows to have `data-title` set. Need to verify `createNativeWindow` sets this attribute on `.os-window`.

---

### NAVIGATOR (navigator.js) | WARNING
- **navigator.js:52–56** — Hover events on nav buttons use `mouseover`/`mouseout` instead of `mouseenter`/`mouseleave`. `mouseover` bubbles — child elements inside buttons can re-trigger hover. Minor UX glitch on buttons with inner text.
- Uses `<webview>` tag — requires `webviewTag: true` in Electron BrowserWindow options. If not enabled (check main.js), the webview will silently not render.
- **navigator.js:11** — startUrl hardcoded as `https://google.com`. Minor, but deviates from any "start page" concept.
- No close handler needed (webview manages its own lifecycle).

---

### EMERGENCE (emergence.js) | OK
- Proper `AbortController` (`abortCtrl`) on all fetch calls (emergence.js:220). 429 retry with 5s delay implemented.
- 24h localStorage cache with TTL for pixels, identity, burns.
- Model uses `window.OLLAMA_MODEL || localStorage.getItem('normie_model')` correctly.
- `history/burns/receiver/${tid}` is used — undocumented endpoint risk (§1).
- Progressive render architecture (Fibonacci + PRNG) matches CLAUDE.md spec.

---

### MEDIA (community-media — inline stub) | BROKEN
- **index.html:1402** — MEDIA app is an inline one-liner: `createNativeWindow('MEDIA', '>> COMMUNITY MEDIA INTERFACE — LOADING GIFS...')`. The loading message never resolves — there is no actual implementation. Window shows a spinner-text forever.

---

### SIGNAL | MISSING
- Listed in CLAUDE.md app table as an app under COMMUNITY or INTEL (mentioned in task prompt). **No implementation found anywhere in the codebase.** Not in NATIVE_APPS array, not in APP_LAUNCHERS, no `apps/signal.js` file. This app does not exist.

---

### REQUIEM (zombiewatch) | MISSING
- Listed in CLAUDE.md: `zombiewatch: REQUIEM, INTEL, ✅`. **No entry in NATIVE_APPS array** in index.html. No entry in APP_LAUNCHERS. No `apps/zombiewatch.js` or similar file. The app was removed from the Start Menu but is still listed as ✅ in CLAUDE.md. Dead reference.

---

## 3. EXECUTIVE SUMMARY

### Top 5 Priority Bug Fixes

1. **MEDIA app never loads (index.html:1402)** — The `community-media` launcher is a stub that permanently displays "LOADING GIFS..." with no implementation. Either implement the app or remove the entry from NATIVE_APPS to avoid user confusion.

2. **HIVE model hardcoded to mistral:7b (hive.js:472, 650, 680)** — The three Ollama calls in HIVE's chain/lore/narrator ignore the user's MAINFRAME model selection. Replace all three with `window.OLLAMA_MODEL || localStorage.getItem('normie_model') || 'mistral:7b'`. Same fix needed in COMBAT (combat.js:252).

3. **COMBAT unbounded pagination loop without AbortController (combat.js:360–371)** — The background `while (hasMore)` loop fires 11+ uncancellable API calls at startup. Add an `abortController.signal` to each `fetch(url)` inside the loop, and abort on window close.

4. **PIXELFORGE Burn Planner uses undocumented `/normie/:id/canvas/status` (pixeleditor.js:138)** — If this endpoint returns 404/500, `_bpStatus = null` and the [ CALCULATE ] button never shows results. Either confirm the endpoint exists or replace with the documented `/normie/:id/canvas/info`.

5. **DEV MODE not removed (index.html:47, 207, 707–708)** — The `dev-skip` button that bypasses WalletConnect and hard-authenticates with wallet `0xb488...7AD1` is still visible and active. CLAUDE.md CHECKLIST explicitly flags "Retirer DEV MODE avant push public". The button is shown to all users post-splash.

---

### Top Redundancies to Merge

- **Stats fetch duplication** — `GET /history/stats` is fetched independently in BRIEFING, AWAKENING, ASHFALL, HIVE, and TERMINAL (`/burn-stats` command). All should read from `window.NormieState.burnStats` if available (BRIEFING already does this at briefing.js:18 — the pattern should be applied everywhere).

- **Agent list fetch duplication** — `agents/list?limit=100` is fetched in HIVE (hive.js:61), COMBAT pagination (combat.js:361), and EMERGENCE (emergence.js:238). HIVE and EMERGENCE both cache to `window.NormieState.agents` / `NormieCache`. COMBAT's background loop ignores both caches and fetches everything fresh. Replace COMBAT's full pagination with a read from `window.NormieState.agents` if populated.

- **Metadata fetch in AWAKENING** — `awakening.js:25` fetches `/normie/${id}/metadata` for every token even though `window.NormieState.allMetadata` is already populated post-boot. Should be `const meta = window.NormieState?.allMetadata?.[String(id)] ?? await fetch(...)`. Saves N API calls on every AWAKENING open.

- **Canvas info duplication** — CORTEX SCARS tab fetches `canvas/info` (cortex.js:164) even though `window.currentAlphaLevel` and `window.currentAlphaAP` are already set at index.html:551–552. The fallback chain at cortex.js:175–176 already handles this correctly, but the fetch still fires. The `catch(() => null)` makes it graceful, but it is a wasted call for the alpha's own token.

---

### Quick Wins (< 1 day)

- **Fix French UI string (combat.js:378):** Change `AGENTS AWAKENED CHARGÉS.` → `AGENTS AWAKENED LOADED.`

- **Fix CONDUCTOR stale label (walletorch.js:18):** Change `PHASE 3 (WalletConnect required)` → `WALLETCONNECT REQUIRED`

- **Remove REQUIEM and SIGNAL from CLAUDE.md app table** (or implement stub windows) — they are ✅ in the doc but do not exist in the code.

- **Fix TEXT SIZE label invisible text (controlpanel.js:113):** `color:#e3e5e4` on `#e3e5e4` background — change the label's color to `#48494b`.

- **Fix cortex.js hardcoded URL (cortex.js:19):** Replace literal `https://api.normies.art/history/normie/${alphaId}/versions` with `${API}/history/normie/${alphaId}/versions` using the local `API` constant.

- **ASHFALL rate burst:** Move detail fetches from `Promise.all(commits.map(...))` to a sequential `for...of` with a small delay (e.g. 100ms) or batch into groups of 5 to avoid hitting the 60 req/min cap on ASHFALL open.

- **SIMULATOR close cleanup (simulator.js:217):** Replace `AbortSignal.timeout(30000)` with a proper `AbortController` that is aborted when the window closes, so the Ollama stream terminates immediately on window close.

- **HIVE `history/burned-tokens` fallback:** Add a try/catch with `firstBurn = null` fallback (already there) but log a console.warn so it's visible during dev when the endpoint is absent.
