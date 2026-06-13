// renderer/core/erc8257.js — ERC-8257 Tool Registry Protocol Layer
// Selectors verified via keccak256 (@noble/hashes/sha3) against live contract.
// Spec: https://eips.ethereum.org/EIPS/eip-8257

window.ERC8257 = (() => {

    // ── Canonical deployment addresses ────────────────────────────
    const ADDRESSES = {
        registry:              '0x265BB2DBFC0A8165C9A1941Eb1372F349baD2cf1',
        erc721OwnerPredicate:  '0xc8721c9A776958FfFfEb602DA1b708bf1D318379',
        erc1155OwnerPredicate: '0x77373Dc3c1AE9A1e937eF3e5E08F4807D47c7c11',
        subscriptionPredicate: '0xCBe0cd9B1d99d95Baa9c58f2767246C52e461f25',
        traitGatedPredicate:   '0x10abF07CfA34Bf22372C57f27e8bd9C2DCF93fA1',
        erc20BalancePredicate: '0x1a834FC48B5f6e119c62C12a98b32137bCFA77cD',
    };

    // ── Function selectors (keccak256-verified) ───────────────────
    const SEL = {
        toolCount:       '0xfaf23b23',  // toolCount() → uint256
        getToolConfig:   '0xa0178453',  // getToolConfig(uint256) → ToolConfig
        hasAccess:       '0xa7e3775b',  // hasAccess(uint256,address,bytes) → bool
        tryHasAccess:    '0x2361abf3',  // tryHasAccess(uint256,address,bytes) → (bool,bool)
        name:            '0x06fdde03',  // name() → string
        version:         '0x54fd4d50',  // version() → string
    };

    // ── RPC endpoints — Base primary (55 tools), ETH fallback (26) ─
    const RPCS = {
        base:     'https://base.publicnode.com',
        ethereum: 'https://ethereum.publicnode.com',
    };

    // ── ABI utilities ─────────────────────────────────────────────

    const hexToUtf8 = hex => {
        try {
            const bytes = new Uint8Array((hex.match(/.{2}/g) || []).map(b => parseInt(b, 16)));
            return new TextDecoder().decode(bytes).replace(/\0/g, '');
        } catch { return ''; }
    };

    const padU256 = n => n.toString(16).padStart(64, '0');

    // Decode ToolConfig struct from eth_call response
    // ToolConfig { address creator, string metadataURI, bytes32 manifestHash, address accessPredicate }
    const decodeToolConfig = hex => {
        const d = hex.startsWith('0x') ? hex.slice(2) : hex;
        if (d.length < 128) return null;

        const chunk = i => d.slice(i * 64, i * 64 + 64);

        // d[0..63] = outer tuple offset (0x20 = 32 bytes) — standard ABI tuple encoding
        // d[64..127] = creator (32 bytes, 20-byte address right-padded)
        const creator = '0x' + chunk(1).slice(24);

        // d[128..191] = offset to metadataURI within the tuple (relative to tuple start)
        const metaOffset = parseInt(chunk(2), 16);

        // d[192..255] = manifestHash (bytes32)
        const manifestHash = '0x' + chunk(3);

        // d[256..319] = accessPredicate (32 bytes, address)
        const accessPredicate = '0x' + chunk(4).slice(24);

        // metadataURI string: at tupleStart + metaOffset
        // tupleStart = 32 bytes into d (after outer offset) = 64 hex chars
        const tupleStartHex = 64;
        const metaAbsHex = tupleStartHex + metaOffset * 2;
        const metaLen = parseInt(d.slice(metaAbsHex, metaAbsHex + 64), 16);
        const metaHex = d.slice(metaAbsHex + 64, metaAbsHex + 64 + metaLen * 2);
        const metadataURI = hexToUtf8(metaHex);

        const isGated = accessPredicate.replace(/0x/i, '').replace(/0/g, '').length > 0;

        return { creator, metadataURI, manifestHash, accessPredicate, isGated };
    };

    // ABI-encode tryHasAccess(toolId, account, bytes "0x")
    const encodeTryHasAccess = (toolId, account) => {
        const id  = padU256(toolId);
        const acc = account.slice(2).toLowerCase().padStart(64, '0');
        const dataOffset = padU256(96);   // 3 × 32 bytes before data
        const dataLen    = padU256(0);    // empty bytes
        return SEL.tryHasAccess + id + acc + dataOffset + dataLen;
    };

    // ── RPC call helper ───────────────────────────────────────────
    const rpcCall = async (rpc, data, timeout = 6000) => {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), timeout);
        try {
            const res = await fetch(rpc, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'eth_call',
                    params:  [{ to: ADDRESSES.registry, data }, 'latest'],
                }),
                signal: ctrl.signal,
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.result;
        } finally { clearTimeout(tid); }
    };

    // ── Public API ────────────────────────────────────────────────

    // Get tool count from preferred chain
    const getToolCount = async (chain = 'base') => {
        const rpc = RPCS[chain] ?? RPCS.base;
        const raw = await rpcCall(rpc, SEL.toolCount);
        const n = parseInt(raw, 16);
        if (!n || isNaN(n)) throw new Error('toolCount returned 0 or failed');
        return n;
    };

    // Get ToolConfig for a specific tool ID
    const getToolConfig = async (toolId, chain = 'base') => {
        const rpc  = RPCS[chain] ?? RPCS.base;
        const raw  = await rpcCall(rpc, SEL.getToolConfig + padU256(toolId));
        if (!raw || raw === '0x') return null;
        return decodeToolConfig(raw);
    };

    // Check access — tryHasAccess(toolId, account, "0x") → { ok, granted }
    const checkAccess = async (toolId, account, chain = 'base') => {
        if (!account || account === '0x') return { ok: false, granted: false };
        const rpc = RPCS[chain] ?? RPCS.base;
        try {
            const raw = await rpcCall(rpc, encodeTryHasAccess(toolId, account), 4000);
            if (!raw || raw === '0x') return { ok: false, granted: false };
            const d = raw.startsWith('0x') ? raw.slice(2) : raw;
            return {
                ok:      parseInt(d.slice(0, 64), 16) === 1,
                granted: parseInt(d.slice(64, 128), 16) === 1,
            };
        } catch { return { ok: false, granted: false }; }
    };

    // Fetch and parse ERC-8257 manifest JSON from metadataURI
    const fetchManifest = async (uri) => {
        if (!uri) return null;
        if (uri.startsWith('ipfs://')) uri = 'https://ipfs.io/ipfs/' + uri.slice(7);
        if (!uri.startsWith('http')) return null;
        try {
            const r = await fetch(uri, { signal: AbortSignal.timeout(5000) });
            return r.ok ? await r.json() : null;
        } catch { return null; }
    };

    // Load all tools from a chain (batched, respects rate limits)
    const loadAllTools = async (chain = 'base', maxTools = 55, onProgress = null) => {
        const _cacheKey = `erc8257_tools_cache_${chain}`;
        const _cached   = localStorage.getItem(_cacheKey);
        if (_cached) {
            try {
                const { ts, data } = JSON.parse(_cached);
                if (Date.now() - ts < 3600000) return data;
            } catch {}
        }
        const count = await getToolCount(chain);
        const tools = [];
        for (let i = 1; i <= Math.min(count, maxTools); i++) {
            const config = await getToolConfig(i, chain);
            if (!config) continue;
            const manifest = await fetchManifest(config.metadataURI);
            const tool = { id: i, ...config, manifest, chain };
            tools.push(tool);
            onProgress?.(tools.length, count);
            await new Promise(r => setTimeout(r, 200));
        }
        const result = { count, tools };
        try { localStorage.setItem(_cacheKey, JSON.stringify({ ts: Date.now(), data: result })); } catch {}
        return result;
    };

    return {
        ADDRESSES,
        SEL,
        RPCS,
        decodeToolConfig,
        rpcCall,
        getToolCount,
        getToolConfig,
        checkAccess,
        fetchManifest,
        loadAllTools,
    };
})();
