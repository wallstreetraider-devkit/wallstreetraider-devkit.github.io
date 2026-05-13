// Hints scoped to view: 'player' (viewing a player entity, yourself or
// a computer opponent). Tabs typically include overview, cash flow,
// balance sheet, holdings, taxes, and others as authored.
//
// Note: 'portfolio' is currently a tab of the player view rather than
// its own top-level view. See hints/portfolio.js header for the longer
// note about how deriveContext keeps view === 'player' when the player
// is on the stocks-bonds tab.

// Catalog order matters: tab-specific entries come before the no-tab
// fallback so they win the matcher's tie-break (earliest-of-equal-priority
// wins; see hintMatcher.findActiveHint).

export default [
    {
        id: 'player-financials',
        match: { view: 'player', tab: 'financials' },
        title: 'Your Money',
        content: `<p>Your personal balance sheet. Assets shows where your wealth is parked: Cash (liquid, no return), T-Bills (very safe, yields the short-bond rate), your Stock Portfolio, options, and bonds. Liabilities &amp; Equity rolls up your debt and net worth. Tax Position warns you what's owed at year-end (Owed shown in red, Refund in green).</p>
<p>Borrower Status tells you how much room you have to take on more debt and which bank you're with. The ActionBar Finance dropdown is where the verbs live: Borrow, Prepay Tax, Change Bank, Trade T-Bills. Prepay Tax when you're flush with cash; Borrow when you have a target lined up and you don't want to liquidate winners to fund it.</p>`,
    },

    {
        id: 'player-advances',
        match: { view: 'player', tab: 'advances' },
        title: "Money You've Lent",
        content: `<p>Advances are subordinated demand loans you've made to corporations you control. They pay you interest at the bank Prime Rate, and you can Recall them at any time unless the borrower has bad credit. Each row shows one advance with a Recall button to pull it back.</p>
<p>Use Advance Funds at the top of the panel to extend a new loan. Smart use: extract cash from a profitable subsidiary as interest income (taxed once at your personal rate) instead of as dividends (taxed at the corporate level first, then again as personal income). Recall when you need cash personally or want to choke a subsidiary.</p>`,
    },

    {
        id: 'player-holdings',
        match: { view: 'player', tab: 'holdings' },
        title: 'Family Office',
        content: `<p>Every position you hold personally, plus (when the toggle is on) every position your controlled corporations hold. Sort, filter, search, and click any row to drill into the underlying entity or open its chart.</p>
<p>Show Subsidiary Holdings (top right) is the toggle that decides whether subsidiary positions roll up into this view. ON (default) gives you the consolidated picture, what you ultimately own through the whole control chain. OFF strips it down to just your direct holdings, useful when you want to act personally rather than through a sub. Subsidiary rows show their owning company so you can see which entity holds what.</p>
<p>Use this tab to spot dead weight (low-conviction shorts, options near expiry) and concentrate where you have an edge.</p>`,
    },

    {
        id: 'player-my-corporations',
        match: { view: 'player', tab: 'my-corporations' },
        title: 'Your Empire',
        content: `<p>This tab lists every corporation you control. Each row shows the entity, your stake, and an AutoPilot toggle. AutoPilot hands day-to-day decisions to the AI so you can focus on the empire, not every individual ticker.</p>
<p>Toggle Show Graph for the ownership network. Subsidiaries cascade: if you control A and A controls B, B's wealth is yours too even when your direct stake in B is zero. Click any company to drill in and run it.</p>`,
    },
    {
        id: 'player-view-overview',
        match: { view: 'player' },
        title: 'Looking in the Mirror',
        content: `<p>This is an overview of your personal finances. Net Worth at the top right is the scoreboard; everything else on this page explains how the score got there.</p>
<p>The Net Worth History chart on the left tracks the score over time. Every spike is a successful raid or a market run; every dip is a margin call, a bad bet, or a year-end tax bill. The Personal Profile panel below it tells you where you bank and whether you're CEO of a major corp (CEO of a corp pulls a steady salary that shows up in your Cashflow).</p>
<p>The Net Worth and Borrowing panels on the right are where the actionable numbers live. Three to watch: Credit Rating (BBB+ unlocks the cheapest borrowing rates and bond issuance), Debt/Equity Ratio (under 1x is conservative, 1x to 3x is normal, above 3x your borrowing rate climbs), and Unused Line of Credit (your dry powder for opportunistic moves). YTD Realized Cap Gains shows the tax bill accruing this year so you can plan offsetting losses before December.</p>
<p>The Advisory Summary panel at the bottom right is your in-game analyst feed. Skim it for opportunity flags and warnings about positions you hold.</p>`,
    },
];
