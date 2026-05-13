// Hints for view: 'industry'. Active when the player has drilled into a
// specific industry from the Market view (activeIndustryNum > 0). Tabs:
// Summary, Projection (or Fund Strategies for the ETF industry #71),
// and Heat Map. Industries 1, 2, and 70 hide the Projection tab.
//
// Catalog order matters: tab-specific entries come before the no-tab
// fallback so they win the matcher's tie-break (earliest-of-equal-priority
// wins; see hintMatcher.findActiveHint).

export default [
    {
        id: 'industry-summary',
        match: { view: 'industry', tab: 'summary' },
        title: 'Industry Summary',
        content: `<p>This is the snapshot of every company in the industry you drilled into. Sortable columns let you spot the leaders by market cap, the cash hoarders, the ones priced below book, and the ones with weak credit.</p>
<p>Click any company name to drill in and view it. The classic move: scan for stocks below book value with BBB+ credit, then take a deeper look at Overview and Financials before raiding.</p>`,
    },

    {
        id: 'industry-projection',
        match: { view: 'industry', tab: 'projection' },
        title: 'Industry Projection',
        content: `<p>Forward-looking outlook for this industry: where analysts expect demand, pricing, and earnings to head over the next several years. Banking, Insurance, and Holding Company industries don't have growth projections.</p>
<p>Use this as a sector-rotation signal. An industry with strong projected growth pulls in capital and lifts P/E ratios; weak projections compress them. Pair the projection with the Heat Map tab to see which companies in the sector are best positioned.</p>`,
    },

    {
        id: 'industry-fund-strategies',
        match: { view: 'industry', tab: 'fund-strategies' },
        title: 'Fund Strategies',
        content: `<p>Only shown for the Exchange-Traded Fund (ETF) industry. This is where each ETF's investment mandate is described: which sector it tracks, whether it's leveraged, and what its rebalancing rule is.</p>
<p>If you're hunting for an ETF to advise, this is where you decide which mandate suits your view. The 3x Bull ETF is the famous one; sector ETFs let you concentrate exposure without picking individual stocks.</p>`,
    },

    {
        id: 'industry-heat-map',
        match: { view: 'industry', tab: 'heat-map' },
        title: 'Sector Heat Map',
        content: `<p>Visual grid of every company in this industry, color-coded by recent stock performance. Green tiles are gainers, red are losers, and tile size scales with market cap.</p>
<p>Use it to spot rotation: when a few small tiles are bright green while the giants are red, money is moving down the cap stack within the sector. Click any tile to view that company.</p>`,
    },

    {
        id: 'industry-view',
        match: { view: 'industry' },
        title: 'Industry Drilldown',
        content: `<p>You've drilled into a specific industry. Use the tabs to explore: Summary lists every company with sortable financials, Projection (when available) shows the forward outlook, and Heat Map gives the visual market-performance view.</p>
<p>Back to the market overview is the Back button at the top-left. Click any company to view it directly.</p>`,
    },
];
