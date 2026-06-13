const _MP_CACHE_KEY = 'normie_market_pulse_cache';
const _MP_TTL = 5 * 60 * 1000;

async function getMarketState() {
    try {
        const cached = JSON.parse(localStorage.getItem(_MP_CACHE_KEY) || 'null');
        if (cached && Date.now() - cached.ts < _MP_TTL) return cached.data;
    } catch {}

    try {
        const [statsRes, burnsRes] = await Promise.all([
            fetch('https://api.opensea.io/api/v2/collections/normies/stats'),
            fetch(`${window.API}/history/burns?limit=50`)
        ]);

        const stats = await statsRes.json();
        const burns = await burnsRes.json();

        const total  = stats?.total ?? {};
        const oneDay = stats?.intervals?.find(i => i.interval === 'one_day') ?? {};

        const burnList = Array.isArray(burns?.burns) ? burns.burns : (Array.isArray(burns) ? burns : (burns?.data ?? []));
        const cutoff = Date.now() - 24 * 3600000;
        const sacrificesToday = burnList.filter(b => {
            const ts = b.timeStamp ?? b.timestamp ?? b.blockTimestamp;
            if (!ts) return false;
            const t = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
            return t > cutoff;
        }).length;

        const listedPct = stats.total_supply
            ? ((stats.num_listed || stats.listings_count || 0) / stats.total_supply * 100).toFixed(1) + '%'
            : '6.5%';

        const data = {
            floor:          total.floor_price ?? null,
            volume24h:      oneDay.volume ?? null,
            sales24h:       oneDay.sales ?? null,
            listedPct,
            uniqueOwners:   total.num_owners ?? null,
            bestSale:       oneDay.average_price ?? total.floor_price ?? null,
            sacrificesToday,
            ts: Date.now()
        };

        localStorage.setItem(_MP_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        return data;
    } catch (err) {
        try {
            const cached = JSON.parse(localStorage.getItem(_MP_CACHE_KEY) || 'null');
            if (cached) return cached.data;
        } catch {}
        throw err;
    }
}

window.getMarketState = getMarketState;
