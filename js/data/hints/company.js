// Hints for view: 'company' (viewing a company entity, controlled or
// scouting). Tabs include overview, financials, loans (banks only),
// holdings (when portHoldings is non-empty), and shareholders.
//
// Catalog order matters: findActiveHint resolves ties on priority by
// catalog order (earlier wins). Entries are ordered most-specific to
// least-specific so entity-kind variants beat the tab+controls entries,
// and tab+controls entries beat the no-tab fallbacks.
//
// The framework-validation seed 'framework-seed-controlled-company' in
// global.js still exists with match { view: 'company', controls: true }.
// It should be deleted now that the real fallback below has landed.

export default [
    // ─── Entity-kind specializations (most specific, evaluated first) ───

    {
        id: 'company-overview-controlled-etf',
        match: { view: 'company', tab: 'overview', controls: true, entityKind: 'mutual-fund' },
        title: 'Advising an ETF',
        content: `<p>You control the advisor for this ETF, which allows you to direct its investment strategy. Three things to know: ETFs are tax-exempt, so profits compound untaxed; the advising company collects a fee of 0.2% to 1.0% of total assets annually paid to your controlled entity; and you may direct the ETF's buy/sell decisions from the Action Bar dropdowns.</p>
<p>Set the Advisory Fee from the advising company's Action Bar, not on the ETF itself. Bump the fee as assets grow.</p>`,
    },

    {
        id: 'company-overview-scouting-etf',
        match: { view: 'company', tab: 'overview', controls: false, entityKind: 'mutual-fund' },
        title: 'Exchange-Traded Funds',
        content: `<p>You're looking at an ETF, not an operating company. ETFs come in all shapes and sizes:the first few track the broad market, then leveraged variants (the 3x Bull ETF is the main one), then sector ETFs. The Investment Advisor cell tells you who directs this fund's strategy. Control the Investment Advisor, and you may direct the ETFs investment decisions.</p>
<p>Buying ETF shares costs 1% commission; selling costs 1% markdown with no price impact. That makes ETFs the cheapest way to express a broad-market view after small open-market stock buys.</p>`,
    },

    {
        id: 'company-financials-private',
        match: { view: 'company', tab: 'financials', entityKind: 'private' },
        title: 'Private Companies',
        content: `<p>This company is privately held. The stock price is based on internal valuations as it is not publicly traded.</p>
<p>Acquiring a private company goes through a private offering, costing a 10% to 58% premium over book value (the bigger the premium, the more cooperative the existing owner). That's expensive compared to 0.15% open-market stock buys, so private companies are usually only worth chasing when the book value contains hidden assets (a subsidiary, a fund stake, undeveloped land) worth more than the premium.</p>`,
    },

    // ─── Tab + controls entries (medium specificity) ───

    {
        id: 'company-overview-scouting',
        match: { view: 'company', tab: 'overview', controls: false },
        title: 'Researching Companies',
        content: `<p>The Overview tab is a great place to start digging into a company you're unfamiliar with. First check Controlled By in the Company Information panel. Whether it's independent or controlled by a major shareholder will determine your takeover strategy.</p>
<p>Then compare Stock Price to Book Value/Share. Stocks below book value with credit rating BBB or better are classic raid candidates. The Analyst Summary's Cash Flow indicator (green is strong, red is weak) tells you whether the underlying business can service debt if you load it up post-takeover.</p>
<p>Click View Research Report for the full analyst write-up: earnings trajectory, management quality, and what's already been priced in.</p>`,
    },

    {
        id: 'company-overview-controlled',
        match: { view: 'company', tab: 'overview', controls: true },
        title: 'Command Center',
        content: `<p>You control this company, which means that you have a fiduciary duty to your shareholders. You may enable Autopilot under the Corporate dropdown for a more hands-off approach, or disable it to direct it manually.</p>
        <p>The first three metrics you should watch are stock price (your shareholders judge you on it), credit rating (BBB+ unlocks bond issuance and swap trading), and the Analyst Summary's Cash Flow indicator (green means you can sustain dividends and buybacks).</p>
<p>When the stock is undervalued, buy back shares to take it private over time via Trade > Buy Stock or Hostile > Leveraged Buyout, same thing. Buybacks raise Earnings Per Share (EPS) by reducing the number of outstanding shares and increasing your ownership percentage. When the stock is overvalued, Public Stock Offering raises cash at premium prices, though it dilutes your ownership. Issue Bonds works best when prime rate is low: you lock in cheap debt, and 75% of proceeds auto-repays bank loans.</p>
<p>Click View Research Report to see how analysts read your numbers. If they're skeptical, the stock won't lift on good earnings alone.</p>`,
    },

    {
        id: 'company-financials-scouting',
        match: { view: 'company', tab: 'financials', controls: false },
        title: 'Reading the Books',
        content: `<p>Two numbers tell the story. Equity under the Liabilities & Equity panel: if positive, the company has a cushion; if negative, it's effectively insolvent and one bad quarter from bankruptcy. Debt-to-Equity ratio under Borrower Status panel: under 1x is conservative, 1x to 3x is normal, above 3x is leveraged enough that a credit downgrade could break it. Cross-reference with the credit rating. A company priced below book value with BBB+ credit and modest debt is a takeover target; the same company at CCC with 5x leverage is a trap.</p>
<p>Click View Full Financial Disclosure for the line-by-line report. That's where you find hidden reserves, subsidiary holdings, and bond maturity schedules.</p>`,
    },

    {
        id: 'company-financials-controlled',
        match: { view: 'company', tab: 'financials', controls: true },
        title: 'You\'re the CFO',
        content: `<p>Equity is the cushion. Keep it positive and rising or your credit rating will fall, choking off the bond and swap channels.</p>
<p>Watch the Debt-to-Equity ratio: above 3x your credit rating starts dropping, above 5x you'll have trouble refinancing. If it climbs, issue stock or sell off subsidiaries to bring it down. Tax Position and Borrower Status tell you whether to prepay tax (use cash now) or borrow more.</p>
<p>Click View Full Financial Disclosure for the year-by-year detail. The "Bonds Due in YYYY" lines let you redeem bonds early when rates are favorable, freeing you from old high-coupon debt.</p>`,
    },

    {
        id: 'company-loans-scouting',
        match: { view: 'company', tab: 'loans', controls: false },
        title: 'Banks',
        content: `<p>You're looking at a bank's loan book. Three loan classes drive earnings: Consumer Loans (highest yield, highest default risk), Prime Mortgages (steady, low risk, rate-sensitive), and Subprime Mortgages (boom-bust, blows up in recessions). Corporate Loans below those are this bank's lending to other companies.</p>
<p>If you control corporations that owe this bank money, watch carefully: a hostile owner can freeze your line of credit or call in loans to force a fire sale. That's why owning your own bank is the safest move once your empire grows.</p>
<p>If you're scouting this bank to acquire it, banks with the right asset mix for the current rate environment trade at a premium. In high rates, look for heavy Consumer Loan exposure; in low rates, look for bond-heavy portfolios that'll appreciate when rates rise.</p>`,
    },

    {
        id: 'company-loans-controlled',
        match: { view: 'company', tab: 'loans', controls: true },
        title: 'Bank Operations',
        content: `<p>You control this bank, which means you control credit. The Corporate Loans section is where you wield power: Freeze blocks the borrower from drawing more; Call In forces immediate repayment, often pushing the borrower into asset sales or bankruptcy.</p>
<p>Tune loan allocation to the rate environment. In low rates (prime &lt; 5%) tilt toward bonds (35%) and prime mortgages (30%); bonds appreciate when rates rise. In high rates (prime &gt; 10%) tilt toward consumer loans (40%) at their highest yields. Keep subprime small in normal times and at zero before a recession.</p>
<p>Banks lever 10:1 on equity through deposits, so $1B of bank equity supports $10B+ of assets. This is called fractional reserve banking and is why owning a bank multiplies the rest of your empire's borrowing capacity.</p>`,
    },

    // REVIEW: tab purpose inferred from rendered data (PortHoldingsTable.js
    // columns: STOCK, SHORT, CORP_BOND, GOVT_BOND, OPTION, FUTURE, PHYSICAL,
    // SWAP), not from manual.
    {
        id: 'company-holdings-scouting',
        match: { view: 'company', tab: 'holdings', controls: false },
        title: 'Portfolio Committee',
        content: `<p>This company holds stocks, bonds, options, futures, or other assets, which makes it a holding company in miniature. Its book value reflects what those positions are worth at today's prices.</p>
<p>Hunt for hidden value: a controlling stake in another listed company (especially one trading below book value), or a fund stake that's appreciated. If you can buy this company below the market value of its holdings, you're buying those holdings at a discount. That's the classic asset-stripping setup.</p>
<p>The Show Subsidiary Holdings toggle (top right) decides whether positions held by this company's subsidiaries are rolled in. Leave it ON to see everything the whole control chain owns; switch it OFF to see only what this entity holds directly. Subsidiary rows show their owning company so you can trace where each position lives.</p>
<p>After a takeover you can spin off, liquidate, or hold these positions inside your new subsidiary, depending on tax treatment.</p>`,
    },

    // REVIEW: tab purpose inferred from rendered data (PortHoldingsTable.js
    // columns: STOCK, SHORT, CORP_BOND, GOVT_BOND, OPTION, FUTURE, PHYSICAL,
    // SWAP), not from manual.
    {
        id: 'company-holdings-controlled',
        match: { view: 'company', tab: 'holdings', controls: true },
        title: "The Book",
        content: `<p>These are the positions this company owns: stocks, bonds, options, futures, and other assets. Treat it like a personal portfolio with one big difference: profits compound inside a corporate entity, which can be useful for tax planning (capital gains and dividends taxed at corporate rates, not your personal rate).</p>
<p>The Show Subsidiary Holdings toggle (top right) decides whether positions held by this company's subsidiaries are rolled in. ON (default) gives you the consolidated view of what the whole control chain owns; OFF strips it down to just this entity's direct positions, useful when you want to act on this corp specifically rather than through a parent. Subsidiary rows show their owning company.</p>
<p>Use this tab to spot dead weight (positions held too long, low-conviction shorts) and concentrate where you have an edge. Subsidiaries (20%+ stakes in another listed company) show up here too and contribute their earnings to this company's reported numbers.</p>`,
    },

    {
        id: 'company-shareholders-scouting',
        match: { view: 'company', tab: 'shareholders', controls: false },
        title: 'Who Owns This Company',
        content: `<p>Read the share register top down. Control is determined by <em>groups</em>, not individual shareholders: if two corporations each own 15% and are both controlled by the same player, they form a 30% group. Identify the dominant group before you accumulate.</p>
<p>If no single group has more than 20%, this company is winnable through open-market accumulation. If a group already has 40%+, you'll need a tender offer (6% to 18% premium plus 1% fee) to dislodge them, and public shareholders will vote based on premium size, company size, and credit quality.</p>
<p>Toggle Show Graph to see the ownership network visually: who owns whom, and whether circular ownership is in play.</p>`,
    },

    {
        id: 'company-shareholders-controlled',
        match: { view: 'company', tab: 'shareholders', controls: true },
        title: 'Watch Your Back',
        content: `<p>This is your shareholder base. Read it for two things: the size of your control group (your direct stake plus any subsidiaries' stakes) and the size of the largest hostile bloc. If a rival player's group climbs above 15%, they're positioning for a takeover bid.</p>
<p>Defenses if you spot accumulation: hit Buyback to shrink the float and raise your ownership percentage, issue a Public Stock Offering at premium prices (dilutes the attacker), or Restructure to write down assets and lower the company's attractiveness.</p>
<p>Toggle Show Graph to see the network. Circular ownership (your company owning the company that owns you) is legal short-term but you'll be forced to unwind it.</p>`,
    },

    // ─── Fallback entries (no tab; least specific, evaluated last) ───

    {
        id: 'company-view-scouting',
        match: { view: 'company', controls: false },
        title: 'Scouting a Target',
        content: `<p>You're inspecting a company you don't run. Use the tabs to size it up: Overview for the headline metrics (price, book value, credit rating, who controls it), Financials for the balance sheet, Shareholders to identify the control group, and Holdings if it owns positions in other entities.</p>
<p>Two questions to answer before acting: is this company priced cheaply enough to be worth acquiring (stock below book value, BBB+ credit), and is it actually winnable (no entrenched 40%+ group)? If yes to both, the Trade and Corporate dropdowns are how you start.</p>`,
    },

    {
        id: 'company-view-controlled',
        match: { view: 'company', controls: true },
        title: 'A Company You Run',
        content: `<p>You control this company, so the tabs serve a different purpose than when scouting. Overview is your operations cockpit (stock price, ratings, CEO actions like Rebrand and stock offerings). Financials is your treasury (balance sheet, debt levels, tax position). Holdings is your investment portfolio (positions this company owns).</p>
<p>The ActionBar at the top is where CEO-level actions live: issue debt, buy back shares, change managers, declare dividends. Use it actively. Companies you run but don't operate (just hold for stock appreciation) tend to drift and get raided.</p>`,
    },
];
