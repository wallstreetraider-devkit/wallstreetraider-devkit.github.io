// Hints for view: 'market'. Covers the IndustryView top-level tabs
// (Heat Map, Industry Growth Rates, Economic Data, Interest Rates,
// Companies With Most..., Who Owns What?, Who's Ahead?) plus the
// Database Search view.
//
// DB Search shares view: 'market' with the market heatmap, but
// deriveContext synthesizes tab: 'db-search' when activeIndustryNum
// === -2 so the DB Search entry can match declaratively without
// depending on activeUiReport timing.
//
// Sub-tabs nested under "Companies With Most..." and "Who Owns What?"
// inherit their parent's hint because the inner Tabs deliberately do
// not write a preferredTabField (which would clobber the parent's
// uiPreferredMarketTab). Per-leaf hints are deferred until needed; they
// would require customMatch on activeUiReport.

export default [
    {
        id: 'market-db-search',
        match: { view: 'market', tab: 'db-search' },
        title: 'Database Search',
        content: `<p>This is the screener. Build a query (price below book, BBB+ credit, market cap range, industry filter, and so on) and the engine returns every company in the simulation that matches. Thousands of companies plus dozens of ETFs are searchable.</p>
<p>The classic raid hunt: stock below book value, credit BBB or better, market cap small enough that you can accumulate without competing groups noticing. Click any result to view it. Save your favorite criteria with the save button so you can rerun the screen each year.</p>`,
    },

    {
        id: 'market-heat-map',
        match: { view: 'market', tab: 'heat-map' },
        title: 'Market Heat Map',
        content: `<p>The whole market at a glance: every industry sector tiled by market cap and colored by recent performance. Green sectors are pulling capital in, red sectors are losing it.</p>
<p>Click a sector tile to drill into that industry. Use this first thing each year to see where the rotation is happening, then dig into the leading sector for individual stock picks.</p>`,
    },

    {
        id: 'market-industry-growth-rates',
        match: { view: 'market', tab: 'industry-growth-rates' },
        title: 'Industry Growth Rates',
        content: `<p>Project short-term and long-term growth trends per industry: the engine's projection of how fast each sector's revenues will grow over the coming years. Think supply and demand, where growth increases demand, and companies buying Corporate Assets in their industry increases supply. Higher rates pull in capital and lift P/E ratios across the sector; low rates compress them.</p>
<p>Use this to time sector entries. An industry with a high growth rate trading at average P/Es is undervalued; a low-growth industry trading at premium P/Es is set up for disappointment.</p>
 <p>Saturate supply by outgrowing your competitors in Corporate Assets, capturing market share and squeezing your rivals' margins (if you can survive the impact on your own cashflow statement) and watch smaller companies in your industry fall into bankruptcy.</p>`,
    },

    {
        id: 'market-economic-data',
        match: { view: 'market', tab: 'economic-data' },
        title: 'Economic Data',
        content: `<p>Macro snapshot: Gross National Product (GNP), monetary policy stance (easy / neutral / tight), tax rates, and the broader economic backdrop. The starting GNP is around $7 trillion and climbs throughout the game.</p>
<p>Watch monetary policy: easy money lifts stocks and bonds, tight money does the opposite. Pair this view with the Interest Rates tab to time bond purchases and swap trades.</p>`,
    },

    {
        id: 'market-interest-rates',
        match: { view: 'market', tab: 'interest-rates' },
        title: 'Interest Rates',
        content: `<p>Prime rate, short-bond rate, long-bond rate, and CD rate. Starting prime is low.Banks borrow at CD rates (about 56-86% of prime) and lend at the borrow rate above prime: that spread is your bank's margin.</p>
<p>Low rates are the moment to issue corporate bonds (lock in cheap debt) and to load up on long bonds (they appreciate when rates rise). High rates are the moment to enter interest-rate swaps as the fixed-payer. The Swaps view is where you can see which players are positioned which way.</p>`,
    },

    {
        id: 'market-companies-with-most',
        match: { view: 'market', tab: 'companies-with-most' },
        title: 'Breaking Records',
        content: `<p>League tables across the whole economy: Market Share leaders, biggest Tax Losses (acquisition targets for tax-shelter purposes), biggest Market Caps, and biggest Cash hoards. Sub-tabs inside cycle through each ranking.</p>
<p>The most useful list is Tax Losses: a target sitting on $5B of Net Operating Losses (NOLs) can be merged into your profitable subsidiary to shelter $5B of future earnings. Cash hoards are also valuable, those companies are sitting on ammunition or are being mismanaged.</p>`,
    },

    {
        id: 'market-who-owns-what',
        match: { view: 'market', tab: 'who-owns-what' },
        title: 'Who Owns What',
        content: `<p>Position registries across the market: Futures, Commodities, Swaps, Options, Stocks, and Management Contracts. Each sub-tab shows who's long and short, with size and market value.</p>
<p>Read this to find counterparties and crowded trades. If everyone is long the same future, you might want to take the opposite position (called fading); if a rival has accumulated a large stock position quietly, this tab is where you spot it.</p>`,
    },

    {
        id: 'market-whos-ahead',
        match: { view: 'market', tab: 'whos-ahead' },
        title: "Who's Ahead",
        content: `<p>The scoreboard. Every player's net worth ranked, with year-over-year change. This is where you check whether the other tycoons are gaining on you and which ones to target.</p>
<p>If a rival's net worth is climbing fast, drill into their player view (My Corporations tab) to see which holdings are driving it. Those are usually your next short candidates or takeover targets.</p>`,
    },

    {
        id: 'market-view',
        match: { view: 'market' },
        title: 'Market Overview',
        content: `<p>You're at the top of the market, looking across every industry and player. Use the tabs to explore: Heat Map for the visual market overview, Industry Growth Rates and Economic Data for macro signals, Companies With Most for league tables, Who Owns What for position registries, and Who's Ahead for the leaderboard.</p>
<p>Click any industry tile or company link to drill in. Use the Search tab (top right) for the database screener when you have specific criteria.</p>`,
    },
];
