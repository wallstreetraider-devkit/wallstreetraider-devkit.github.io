// Migrated from the legacy TutorialTooltip.js TUTORIAL_TOOLTIPS array
// (recovered from pre-Phase-1 commit 540d3ff). All 43 legacy entries
// are preserved verbatim in title and content; tutorialStepId and
// tutorialAdvice fields are dropped per §E (step-machinery concepts
// no longer exist).
//
// Eight entries (search: "Retirement target: PB-side stable modalId
// field") use customMatch because their legacy conditions are OR, AND
// of two substrings, or regex — predicates that the case-sensitive
// modalTitleContains schema field cannot express on its own. Each
// such entry retains a declarative narrowing in match (so the matcher
// can fast-reject) and the customMatch refines on top.
//
// When the PB engine surfaces a stable per-dialog modalId, these
// entries become declarative on identity and the escape hatches can
// be removed in one pass.

import { SWAP_INFO_HTML } from './swap-info-text.js';

export default [
    // ==================== EXISTING TOOLTIPS ====================
    {
        id: 'buy-from-related-entity',
        match: { modalTitleContains: 'Buy from Related or Uncontrolled Entity' },
        title: 'Buying from Institutional Shareholders',
        content: `
            <p>This dialog appears because <strong>other companies own shares</strong> in the stock you're trying to buy.</p>
            <p style="margin-top: 10px;"><strong>Click "Yes"</strong> if you want to buy shares directly from these institutional shareholders instead of on the open market. Reasons to do this:</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Hostile takeover - you need to acquire shares from resistant owners</li>
                <li>Gaining control - you need their shares to reach majority ownership</li>
                <li>Getting institutions out of the picture</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Click "No"</strong> to buy shares on the open market instead.</p>
            <p style="margin-top: 10px;"><em>Note: Institutional shareholders typically demand a premium above market price, which may be cost-prohibitive.</em></p>
        `,
    },
    {
        id: 'offer-assets-for-sale',
        match: { modalTitleContains: 'Sell or List Assets?' },
        title: 'Sell Now vs. List for Sale',
        content: `
            <p>You have two ways to sell corporate assets:</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>YES — Sell Now:</strong> Immediate cash. A buyer is found or assets are scrapped. A <strong>10% commission</strong> is deducted — you net 90 cents on the dollar.</li>
                <li><strong>NO — List for Sale:</strong> Posted at 5% below book value with <strong>no commission</strong> — you net 95 cents on the dollar. But a buyer in the same industry must accept before the offer expires (this quarter or next).</li>
            </ul>
            <p style="margin-top: 8px;"><em>If you need cash now, choose YES. If you can wait a quarter, NO nets you 5% more.</em></p>
        `,
    },
    {
        id: 'interest-rate-swaps',
        match: { modalType: 7 },
        title: 'Interest Rate Swaps',
        content: SWAP_INFO_HTML,
    },

    // ==================== PRIORITY 1: HIGH IMPACT ====================
    {
        id: 'merger-premium-pct',
        match: { modalType: 3, modalTitleContains: 'Merger Premium' },
        title: 'Merger Premium',
        content: `
            <p>The <strong>merger premium</strong> is the percentage above the target company's current stock price that you're offering to pay.</p>
            <p style="margin-top: 8px;">For example, if the stock trades at $50 and you offer a 20% premium, you're offering $60 per share.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Higher premium</strong> = more likely the target's board will accept, but costs more</li>
                <li><strong>Lower premium</strong> = cheaper, but more likely to be rejected</li>
                <li><strong>Typical range</strong>: 10-40% in real-world M&A deals</li>
            </ul>
            <p style="margin-top: 8px;">The target's board of directors will vote on whether to accept. They consider the premium, the company's prospects, and whether shareholders would benefit. A very low premium may trigger a rejection or even a competing bid.</p>
            <p style="margin-top: 8px;"><em>Tip: If the target company is financially distressed, a lower premium may suffice. Healthy, growing companies typically demand higher premiums.</em></p>
        `,
    },
    {
        id: 'stock-transaction-financing',
        match: { modalTitleContains: 'Transaction Financing' },
        title: 'Transaction Financing',
        content: `
            <p>You don't have enough cash to complete this purchase outright. This dialog asks whether you want to <strong>borrow on your line of credit</strong> to cover the shortfall.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Yes</strong>: Borrow the difference. Increases your debt and leverage ratio</li>
                <li><strong>No</strong>: Cancel the transaction entirely</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Risks of borrowing:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li>Higher debt-to-equity ratio may lower your credit rating</li>
                <li>Interest payments reduce future cash flow</li>
                <li>If the investment loses value, you still owe the debt</li>
                <li>Excessive leverage can lead to margin calls or forced liquidation</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Using leverage (borrowed money) amplifies both gains and losses. Borrow only if you're confident in the investment.</em></p>
        `,
    },
    {
        id: 'tax-free-liquidation',
        // customMatch: legacy condition is a substring OR — modalTitle includes
        // 'Tax-Free Liquidation' or 'Tax Benefits'. modalTitleContains is a
        // single case-sensitive substring and cannot express disjunction.
        // Declarative narrowing on 'Tax' is a fast-reject; customMatch refines.
        // Retirement target: PB-side stable modalId field.
        match: { modalTitleContains: 'Tax' },
        customMatch: (gs) => Boolean(gs.modalTitle && (
            gs.modalTitle.includes('Tax-Free Liquidation') || gs.modalTitle.includes('Tax Benefits')
        )),
        title: 'Tax-Free Liquidation',
        content: `
            <p>A <strong>tax-free liquidation</strong> dissolves a subsidiary and merges all its assets and liabilities into the parent company, without triggering a taxable event.</p>
            <p style="margin-top: 8px;"><strong>When this makes sense:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li>The subsidiary has valuable assets you want in the parent</li>
                <li>Simplifying your corporate structure (fewer entities to manage)</li>
                <li>The subsidiary has tax losses that can offset the parent's income</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Caution:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li>You must own enough of the subsidiary (typically 80%+) for tax-free treatment</li>
                <li>The subsidiary ceases to exist; its stock is cancelled</li>
                <li>All debts of the subsidiary become your parent company's responsibility</li>
            </ul>
        `,
    },
    {
        id: 'form-advanced-options',
        match: { modalType: 6 },
        title: 'Advanced Options Strategies',
        content: `
            <p>This form lets you construct <strong>multi-leg options strategies</strong> that combine calls and puts at different strike prices and expirations.</p>
            <p style="margin-top: 8px;"><strong>Common strategies:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li><strong>Straddle</strong>: Buy both a call and put at the same strike. Profits from large moves in either direction</li>
                <li><strong>Strangle</strong>: Similar to straddle but with different strikes. Cheaper, but needs a bigger move to profit</li>
                <li><strong>Bull/Bear Spread</strong>: Buy and sell options at different strikes. Limits both profit and loss</li>
                <li><strong>Butterfly</strong>: Three strikes, profits when stock stays near the middle strike</li>
                <li><strong>Condor</strong>: Four strikes, profits when stock stays in a range</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Key concepts:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li><strong>Strike price</strong>: Price at which the option can be exercised</li>
                <li><strong>In the money</strong>: Call strike below stock price (or put strike above)</li>
                <li><strong>Premium</strong>: Price you pay for the option (affected by time to expiry and volatility)</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Selling (writing) options generates income but creates unlimited potential losses for naked calls. Always understand your maximum loss before entering a position.</em></p>
        `,
    },
    {
        id: 'form-bank-allocation',
        match: { modalType: 10 },
        title: 'Bank Asset Allocation',
        content: `
            <p>As a bank's controlling shareholder, you decide how to allocate the bank's lending portfolio across different categories.</p>
            <p style="margin-top: 8px;"><strong>Allocation categories:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li><strong>Prime loans</strong>: Safest, lowest returns. Loans to high-quality borrowers</li>
                <li><strong>Subprime loans</strong>: Higher risk, higher returns. More defaults but better margins</li>
                <li><strong>Consumer loans</strong>: Personal and credit card loans. Moderate risk and return</li>
                <li><strong>Mortgage loans</strong>: Real estate-backed. Sensitive to interest rate changes and housing market</li>
                <li><strong>Cash equivalents/T-bills</strong>: Safest, lowest return. Required for regulatory capital</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Percentages must total 100%.</strong> Banks with too much in risky categories may face regulatory intervention or suffer heavy losses during economic downturns.</p>
            <p style="margin-top: 8px;"><em>Tip: Maintain a balanced portfolio. Heavy subprime concentration can generate great returns in good times but catastrophic losses in a recession.</em></p>
        `,
    },
    {
        id: 'greenmail-pct',
        match: { modalType: 3, modalTitleContains: 'Greenmail' },
        title: 'Greenmail',
        content: `
            <p><strong>Greenmail</strong> is a controversial corporate tactic where you acquire a significant stake in a target company, then pressure it to buy back your shares at a premium.</p>
            <p style="margin-top: 8px;"><strong>How it works:</strong></p>
            <ol style="margin: 4px 0 8px 20px; list-style-type: decimal;">
                <li>Accumulate shares in the target company</li>
                <li>Threaten a hostile takeover or proxy fight</li>
                <li>The target pays a premium to buy back your shares and make you go away</li>
            </ol>
            <p style="margin-top: 8px;">Enter the <strong>percentage of the target's shares</strong> you want to demand they repurchase. The target may accept, negotiate, or refuse outright.</p>
            <p style="margin-top: 8px;"><em>Named by combining "greenback" (money) with "blackmail." While legal, greenmail is widely criticized and some companies have adopted anti-greenmail charter provisions.</em></p>
        `,
    },
    {
        id: 'lbo-pct',
        match: { modalType: 3, modalTitleContains: 'LBO' },
        title: 'Leveraged Buyout (LBO)',
        content: `
            <p>A <strong>leveraged buyout</strong> uses primarily borrowed money (debt) to acquire a company. The target company's own assets and cash flows are used as collateral for the loans.</p>
            <p style="margin-top: 8px;"><strong>How it works:</strong></p>
            <ol style="margin: 4px 0 8px 20px; list-style-type: decimal;">
                <li>You put up a small amount of equity (your own money)</li>
                <li>Borrow the rest from banks and bond markets</li>
                <li>Use the combined funds to buy out all other shareholders</li>
                <li>The acquired company's cash flow services the debt</li>
            </ol>
            <p style="margin-top: 8px;"><strong>Risks:</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li>Heavy debt burden can crush the company if earnings decline</li>
                <li>Interest rate increases make debt payments more expensive</li>
                <li>If the company can't service its debt, bankruptcy follows</li>
            </ul>
            <p style="margin-top: 8px;"><em>Famous LBOs: RJR Nabisco (1989, $25 billion), the inspiration for "Barbarians at the Gate."</em></p>
        `,
    },

    // ==================== PRIORITY 2: MEDIUM IMPACT ====================
    {
        id: 'stock-purchase-pct',
        match: { modalType: 3, modalTitleContains: 'Stock Purchase' },
        title: 'Stock Purchase',
        content: `
            <p>Enter the <strong>percentage of outstanding shares</strong> you want to buy, not a dollar amount. For example, entering "5" means 5% of all shares outstanding.</p>
            <p style="margin-top: 10px;"><strong>What you can do depends on the ownership percentage you reach:</strong></p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>1-4% (open market):</strong> Bought directly on the exchange at the current market price. Minimal market impact; good for accumulating a position quietly.</li>
                <li><strong>5-19% (tender offer):</strong> Any purchase whose total brings your holding above 5% is automatically a tender offer to the public at a premium above the current market price. More expensive per share, but the only way to acquire a stake larger than 5%.</li>
                <li><strong>20-79% (control):</strong> 20% is the minimum needed to control the company, unless another player or corporation already owns more (in which case you have to beat their stake). Control lets you set strategy, declare dividends, restructure the business, pursue acquisitions, and so on.</li>
                <li><strong>80-99% (consolidated tax reporting):</strong> A corporate parent owning 80% or more of a subsidiary can file consolidated tax returns with it. Profits and losses across the group net out, so losses in one entity shelter gains in another. Cascades through chains of 80%+ subs.</li>
                <li><strong>100% (wholly owned):</strong> Unlocks moves only available with full ownership: tax-free liquidation of the sub into the parent, capital contributions, advances (parent-to-sub loans that can later be forgiven), and similar wholly-owned-sub maneuvers.</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Very large buy orders may not be fully filled if there aren't enough shares available on the market.</em></p>
        `,
    },
    {
        id: 'stock-sale-pct',
        match: { modalType: 3, modalTitleContains: 'Stock Sale' },
        title: 'Stock Sale',
        content: `
            <p>Enter the <strong>percentage of your holdings</strong> you want to sell.</p>
            <p style="margin-top: 8px;">For example, if you own 1,000,000 shares and enter "50%", you'll sell 500,000 shares.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Large sales may depress the stock price</li>
                <li>Selling below 50% ownership means losing control of the company</li>
                <li>Short-term gains (held less than 1 year) are taxed at a higher rate</li>
            </ul>
        `,
    },
    {
        id: 'stock-tender-offer-premium',
        match: { modalType: 3, modalTitleContains: 'Tender Offer Premium' },
        title: 'Tender Offer',
        content: `
            <p>A <strong>tender offer</strong> is a public bid to buy shares directly from all shareholders at a specified price, bypassing the open market.</p>
            <p style="margin-top: 8px;">The <strong>premium</strong> is how much above the current market price you're willing to pay. A higher premium attracts more shareholders to tender (sell) their shares to you.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>vs. Open market</strong>: Tender offers are faster for acquiring large blocks but more expensive</li>
                <li><strong>Typical premiums</strong>: 10-30% above market price</li>
                <li>All shares are purchased at the same price (the tender price)</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Tender offers are especially useful for hostile takeovers when you want to acquire shares directly from shareholders without board approval.</em></p>
        `,
    },
    {
        id: 'spinoff-pct',
        match: { modalType: 3, modalTitleContains: 'Spin Off' },
        title: 'Spin-Off',
        content: `
            <p>A <strong>spin-off</strong> creates a new, independent company by distributing shares of a subsidiary to existing shareholders.</p>
            <p style="margin-top: 8px;">Enter the <strong>percentage of the subsidiary's stock</strong> to distribute. Shareholders of the parent receive proportional shares of the new company.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>100% spin-off</strong>: Complete separation; parent retains no ownership</li>
                <li><strong>Partial spin-off</strong>: Parent keeps some ownership stake</li>
                <li>Spin-offs are typically tax-free for shareholders</li>
            </ul>
            <p style="margin-top: 8px;"><em>Why spin off? "Unlocking value" when a subsidiary's worth isn't reflected in the parent's stock price, or when the businesses have different growth profiles.</em></p>
        `,
    },
    {
        id: 'capital-contrib-type',
        match: { modalType: 3, modalTitleContains: 'Contribution of Capital' },
        title: 'Capital Contribution',
        content: `
            <p>You're contributing capital from a parent company to a subsidiary. Choose the <strong>type of contribution</strong>:</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Cash</strong>: Direct cash transfer. Simplest option, immediately usable by the subsidiary</li>
                <li><strong>Business Assets</strong>: Transfer physical assets (property, equipment). May have tax implications</li>
                <li><strong>Stock</strong>: Transfer shares of other companies you hold. Useful for portfolio restructuring</li>
                <li><strong>Bonds</strong>: Transfer government or corporate bond holdings</li>
            </ul>
            <p style="margin-top: 8px;">Capital contributions increase the subsidiary's equity without creating debt. Unlike a loan, contributions are not repaid.</p>
        `,
    },
    {
        id: 'option-strike-price',
        match: { modalType: 3, modalTitleContains: 'Stock Price =' },
        title: 'Option Strike Price',
        content: `
            <p>The <strong>strike price</strong> is the price at which you can buy (call) or sell (put) the underlying stock when exercising the option.</p>
            <p style="margin-top: 8px;"><strong>For calls (right to buy):</strong></p>
            <ul style="margin: 4px 0 8px 20px; list-style-type: disc;">
                <li><strong>In the money</strong>: Strike below current stock price (has intrinsic value)</li>
                <li><strong>At the money</strong>: Strike equals current stock price</li>
                <li><strong>Out of the money</strong>: Strike above current stock price (cheaper, but riskier)</li>
            </ul>
            <p style="margin-top: 8px;"><strong>For puts (right to sell):</strong> The opposite applies.</p>
            <p style="margin-top: 8px;">The option's price (premium) includes <strong>intrinsic value</strong> (how far in the money) plus <strong>time value</strong> (potential for the stock to move before expiration).</p>
            <p style="margin-top: 8px;"><em>Tip: Out-of-the-money options are cheap but expire worthless more often. In-the-money options cost more but have a better chance of being profitable.</em></p>
        `,
    },
    {
        id: 'bond-maturity-change',
        match: { modalType: 3, modalTitleContains: 'Bonds Will Mature' },
        title: 'Bond Maturity',
        content: `
            <p><strong>Bond maturity</strong> is the number of years until the bond's face value is repaid to the bondholder.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Shorter maturity</strong> (1-5 years): Lower yield but less interest rate risk. Easier to refinance</li>
                <li><strong>Longer maturity</strong> (10-30 years): Higher yield but more sensitive to interest rate changes</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Interest rate risk:</strong> When rates rise, existing bond prices fall (more for longer maturities). When rates fall, bond prices rise.</p>
            <p style="margin-top: 8px;"><em>Tip: If you expect interest rates to rise, issue shorter-maturity bonds so you can refinance at better terms sooner.</em></p>
        `,
    },
    {
        id: 'select-law-firm',
        match: { modalType: 3, modalTitleContains: 'Law Firm' },
        title: 'Choosing a Law Firm',
        content: `
            <p>Your choice of law firm affects <strong>legal costs and success rates</strong> in lawsuits.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Cheap firm</strong>: Low fees, but lower chance of winning cases</li>
                <li><strong>Average firm</strong>: Balanced cost and competence</li>
                <li><strong>Expensive firm</strong>: High fees, but significantly better odds in court</li>
            </ul>
            <p style="margin-top: 8px;">This affects all your legal proceedings: antitrust suits, harassment suits, and defending against lawsuits filed against you.</p>
            <p style="margin-top: 8px;"><em>Tip: If you plan aggressive legal tactics (antitrust suits, hostile takeovers), invest in a top firm. If you're just defending occasionally, a cheaper firm may suffice.</em></p>
        `,
    },
    {
        id: 'etf-reset-mgmt-fee',
        match: { modalType: 3, modalTitleContains: 'Management Fee' },
        title: 'ETF Management Fee',
        content: `
            <p>As the fund's adviser, you earn a <strong>management fee</strong> (a percentage of assets under management) each quarter.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Higher fee</strong>: More income for you, but reduces the fund's net returns for shareholders</li>
                <li><strong>Lower fee</strong>: Less income, but attracts more investors and keeps regulators happy</li>
                <li><strong>Fee limits</strong>: Different fund types have maximum fee caps</li>
            </ul>
            <p style="margin-top: 8px;">After a 2-year measurement period, the fund's performance is reviewed. Poor performance relative to fees may trigger regulatory action or investor flight.</p>
            <p style="margin-top: 8px;"><em>Tip: Typical real-world ETF fees range from 0.03% to 0.75%. Actively managed funds charge more (0.5%-2%).</em></p>
        `,
    },
    {
        id: 'commodity-futures',
        match: { modalType: 3, modalTitleContains: 'Futures' },
        title: 'Commodity Futures Trading',
        content: `
            <p><strong>Futures contracts</strong> are agreements to buy or sell a commodity at a predetermined price on a future date.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Going long</strong> (buying): You profit if the commodity price rises</li>
                <li><strong>Going short</strong> (selling): You profit if the commodity price falls</li>
                <li><strong>Contracts</strong>: Each contract represents a fixed quantity of the commodity</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Margin and leverage:</strong> You only put up a fraction of the contract's value (margin). This creates leverage that amplifies both gains and losses.</p>
            <p style="margin-top: 8px;"><strong>Margin calls:</strong> If the market moves against you, you must deposit more funds. If you can't meet a margin call, your positions may be forcibly liquidated.</p>
            <p style="margin-top: 8px;"><em>Warning: Commodity futures are highly leveraged instruments. Losses can exceed your initial investment.</em></p>
        `,
    },
    {
        id: 'bond-convertible-price',
        match: { modalType: 3, modalTitleContains: 'Conversion Price' },
        title: 'Convertible Bond Conversion Price',
        content: `
            <p>The <strong>conversion price</strong> determines how many shares of stock each bond can be converted into.</p>
            <p style="margin-top: 8px;">For example, a $1,000 bond with a $50 conversion price converts into 20 shares ($1,000 / $50).</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Lower conversion price</strong>: More shares per bond (more dilutive to existing shareholders), but easier to sell the bonds</li>
                <li><strong>Higher conversion price</strong>: Fewer shares per bond (less dilution), but bonds are less attractive to buyers</li>
                <li><strong>Conversion premium</strong>: Typically 15-30% above current stock price</li>
            </ul>
            <p style="margin-top: 8px;"><em>Convertible bonds pay lower interest rates than regular bonds because of the conversion privilege. They're a way to raise capital that may be less dilutive than a direct stock offering.</em></p>
        `,
    },

    // ==================== ADDITIONAL: CORPORATE ACTIONS ====================
    {
        id: 'restructuring-amount',
        match: { modalType: 3, modalTitleContains: 'Restructuring' },
        title: 'Corporate Restructuring',
        content: `
            <p>Enter a percentage (up to 50%) of the company's business assets to write down to zero — scrapping equipment, closing factories, and cutting the workforce. It's brutal, but sometimes necessary to turn around a poorly performing company.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Improves future profitability</strong> — remaining assets tend to earn a higher return once deadweight is removed, unless the company was already well-run</li>
                <li><strong>Slashes current earnings and net worth</strong> — you may be limited to less than 50% if the company already has a weak credit rating</li>
                <li><strong>Tax benefit</strong> — the large loss saves taxes and can make the next year's earnings comparisons look very favorable as the company recovers</li>
                <li><strong>Extraordinary item</strong> — if the charge is large enough, accountants may classify it as extraordinary, keeping it out of reported operating earnings (which is what the market prices)</li>
            </ul>
            <p style="margin-top: 8px; color: #f87171;"><strong>Caution:</strong> A large write-off on a company already in weak financial condition can push it toward bankruptcy. Check the Research Report first to gauge whether management has room to absorb the hit.</p>
        `,
    },
    {
        id: 'stock-offering-amount',
        match: { modalType: 3, modalTitleContains: 'Stock Offering' },
        title: 'Public Stock Offering',
        content: `
            <p>Issuing new shares of stock to raise capital. The company sells shares to the public and receives the proceeds (minus underwriting fees).</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Dilution</strong>: Existing shareholders' ownership percentage decreases</li>
                <li><strong>Stock price impact</strong>: New supply of shares typically depresses the price temporarily</li>
                <li><strong>No debt</strong>: Unlike bonds, equity doesn't need to be repaid</li>
            </ul>
            <p style="margin-top: 8px;">The underwriter may reject the offering if market conditions are unfavorable or the offering is too large relative to the company's market capitalization.</p>
        `,
    },
    {
        id: 'bond-issue-corporate',
        match: { modalType: 3, modalTitleContains: 'Issue Corporate Bonds' },
        title: 'Issuing Corporate Bonds',
        content: `
            <p><strong>Corporate bonds</strong> are debt instruments. The company borrows money from bond buyers and promises to pay interest (the coupon rate) plus repay the principal at maturity.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Advantages</strong>: No ownership dilution, interest payments are tax-deductible</li>
                <li><strong>Risks</strong>: Fixed obligation regardless of company performance; default leads to bankruptcy</li>
                <li><strong>Credit rating</strong>: Better ratings mean lower interest rates. Poor ratings make bonds expensive</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Bonds are ideal when you need capital but don't want to dilute ownership. Best issued when interest rates are low.</em></p>
        `,
    },
    {
        id: 'capitalize-new-company',
        match: { modalType: 3, modalTitleContains: 'Capitalize New Company' },
        title: 'New Company Capitalization',
        content: `
            <p>Set the <strong>initial capital</strong> for your new startup company. This is the cash the company will have to begin operations.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>More capital</strong>: Stronger balance sheet, easier to get loans, more room to grow</li>
                <li><strong>Less capital</strong>: Preserves your personal cash, but the company may struggle initially</li>
            </ul>
            <p style="margin-top: 8px;">The company will issue shares based on this capitalization. You'll own 100% initially, but you can later sell shares to the public via a stock offering.</p>
        `,
    },
    {
        id: 'extraordinary-dividend',
        match: { modalType: 3, modalTitleContains: 'Extraordinary Dividend' },
        title: 'Extraordinary Dividend',
        content: `
            <p>An <strong>extraordinary (special) dividend</strong> is a one-time cash payment to shareholders, separate from the regular dividend.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Typically paid when a company has excess cash it doesn't need for operations</li>
                <li>Reduces the company's cash reserves by the total amount paid</li>
                <li>The stock price usually drops by approximately the dividend amount on the ex-date</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: As a controlling shareholder, declaring a large extraordinary dividend is a way to extract cash from the company. But be careful not to leave it undercapitalized.</em></p>
        `,
    },
    {
        id: 'stock-split-ratio',
        match: { modalType: 3, modalTitleContains: 'Stock Split' },
        title: 'Stock Split',
        content: `
            <p>A <strong>stock split</strong> divides existing shares into more shares at a proportionally lower price. A <strong>reverse split</strong> combines shares into fewer shares at a higher price.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Forward split</strong> (e.g., 2:1): Each share becomes 2 shares at half the price. Makes shares more affordable for retail investors</li>
                <li><strong>Reverse split</strong> (e.g., 1:5): Every 5 shares become 1 share at 5x the price. Often done to avoid delisting due to low stock price</li>
            </ul>
            <p style="margin-top: 8px;">Splits don't change the total value of your holdings or the company's market capitalization. They're purely cosmetic.</p>
        `,
    },

    // ==================== ADDITIONAL: BANKING ====================
    {
        id: 'borrow-credit-line',
        match: { modalType: 3, modalTitleContains: 'Line of Credit' },
        title: 'Borrowing on Credit Line',
        content: `
            <p>Your <strong>line of credit</strong> is a pre-approved borrowing limit from your bank. You can draw funds up to this limit as needed.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Interest accrues on the borrowed amount</li>
                <li>Your credit limit depends on your net worth and credit rating</li>
                <li>Excessive borrowing reduces your credit rating</li>
                <li>If your credit rating drops, your line of credit may be reduced</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Keep some borrowing capacity in reserve for opportunities or emergencies. Don't max out your credit line.</em></p>
        `,
    },
    {
        id: 'advance-funds',
        match: { modalType: 3, modalTitleContains: 'Advance Funds' },
        title: 'Advancing Funds',
        content: `
            <p>You can <strong>advance funds</strong> (make a loan) from your personal account to a company you control. This is different from a capital contribution.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Advance</strong>: Treated as a loan; can be recalled later</li>
                <li><strong>Capital contribution</strong>: Permanent equity; cannot be taken back</li>
                <li>Advances show as debt on the company's balance sheet</li>
            </ul>
            <p style="margin-top: 8px;">You can also <strong>forgive</strong> advances, converting them from debt to equity (effectively a capital contribution after the fact).</p>
        `,
    },
    {
        id: 'bank-tbill-trade',
        // customMatch: legacy condition OR's two case variants ('T-bill' and
        // 'T-Bill'). modalTitleContains is case-sensitive and would miss one
        // form or the other. Declarative narrowing on modalType is the fast-
        // reject; customMatch picks up both casings.
        // Retirement target: PB-side stable modalId field.
        match: { modalType: 3 },
        customMatch: (gs) => Boolean(gs.modalTitle && (
            gs.modalTitle.includes('T-bill') || gs.modalTitle.includes('T-Bill')
        )),
        title: 'Treasury Bill Trading',
        content: `
            <p><strong>Treasury bills (T-bills)</strong> are short-term government securities, considered the safest investment available.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Backed by the full faith of the government</li>
                <li>Very liquid; can be bought and sold easily</li>
                <li>Low returns compared to loans or corporate bonds</li>
                <li>Banks hold T-bills as part of their cash equivalents and regulatory capital</li>
            </ul>
            <p style="margin-top: 8px;"><em>For banks: T-bills provide safety and liquidity but earn less than loans. Balance your T-bill holdings against lending opportunities.</em></p>
        `,
    },

    // ==================== ADDITIONAL: LEGAL ====================
    {
        id: 'antitrust-damages',
        match: { modalType: 3, modalTitleContains: 'AntiTrust Damages' },
        title: 'Antitrust Damages',
        content: `
            <p>You're filing an antitrust lawsuit against a competitor. Enter the <strong>amount of damages</strong> you're seeking.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Treble damages</strong>: Under U.S. antitrust law, courts can award 3x the actual damages</li>
                <li><strong>Higher claims</strong>: More potential payout but lower chance of winning the full amount</li>
                <li><strong>Settlement</strong>: Cases often settle before trial for a fraction of the claimed amount</li>
            </ul>
            <p style="margin-top: 8px;">Your law firm quality affects the outcome. The defendant may countersue or try to settle.</p>
            <p style="margin-top: 8px;"><em>Antitrust suits can only be filed against companies in the same industry as your company.</em></p>
        `,
    },

    // ==================== ADDITIONAL: BONDS ====================
    {
        id: 'bond-buyback',
        match: { modalType: 3, modalTitleContains: 'Bond Buyback' },
        title: 'Bond Buyback',
        content: `
            <p>A <strong>bond buyback</strong> means repurchasing your company's own outstanding bonds from the market.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Reduces debt</strong>: Lowers total outstanding bonds and future interest payments</li>
                <li><strong>Discount opportunity</strong>: If bonds are trading below face value (e.g., due to market conditions), buying them back at a discount is profitable</li>
                <li><strong>Improves ratios</strong>: Reduces debt-to-equity ratio, may improve credit rating</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Bond buybacks are especially attractive when your bonds are trading at a steep discount to face value.</em></p>
        `,
    },
    {
        id: 'bond-redemption',
        match: { modalType: 3, modalTitleContains: 'Bond Redemption' },
        title: 'Bond Redemption (Calling Bonds)',
        content: `
            <p><strong>Bond redemption</strong> (or "calling" bonds) means paying off bonds before their maturity date at a specified call price.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Usually done when interest rates have fallen, allowing the company to refinance at lower rates</li>
                <li>The call price is typically at or slightly above face value (a "call premium")</li>
                <li>Not all bonds are callable; it depends on the terms when issued</li>
            </ul>
        `,
    },
    {
        id: 'bond-govt-trade',
        // customMatch: legacy condition requires BOTH 'GOVERNMENT' and 'BONDS'
        // substrings (not necessarily adjacent). modalTitleContains takes a
        // single substring and cannot express conjunction across non-adjacent
        // fragments. Declarative narrowing on 'GOVERNMENT' is the fast-reject;
        // customMatch enforces both substrings.
        // Retirement target: PB-side stable modalId field.
        match: { modalType: 3, modalTitleContains: 'GOVERNMENT' },
        customMatch: (gs) => Boolean(gs.modalTitle && (
            gs.modalTitle.includes('GOVERNMENT') && gs.modalTitle.includes('BONDS')
        )),
        title: 'Government Bond Trading',
        content: `
            <p><strong>Government bonds</strong> are debt securities issued by the government. They come in two main varieties:</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Long bonds</strong>: Higher yield, more sensitive to interest rate changes. Prices rise when rates fall</li>
                <li><strong>Short bonds</strong>: Lower yield, less price volatility. Closer to cash equivalents</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Trading strategy:</strong> Government bonds are often used to bet on interest rate direction. If you expect rates to fall, buy long bonds (their prices will rise). If you expect rates to rise, sell or avoid them.</p>
            <p style="margin-top: 8px;"><em>Government bonds are the safest fixed-income investment, backed by the taxing power of the sovereign government.</em></p>
        `,
    },

    // ==================== ADDITIONAL: OPTIONS ====================
    {
        id: 'option-buy-contracts',
        // customMatch: legacy condition uses regex /Buy .+ (Call|Put)/ to
        // capture variable underlying-symbol text between "Buy" and the
        // option type. modalTitleContains can't express a pattern with a
        // wildcard middle. Declarative narrowing keeps modalType as the
        // fast-reject; customMatch runs the regex.
        // Retirement target: PB-side stable modalId field.
        match: { modalType: 3 },
        customMatch: (gs) => Boolean(gs.modalTitle && /Buy .+ (Call|Put)/.test(gs.modalTitle)),
        title: 'Buying Options',
        content: `
            <p>Enter the <strong>number of option contracts</strong> to buy. Each contract typically represents 100 shares of the underlying stock.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Buying calls</strong>: You profit if the stock price rises above the strike price plus the premium paid</li>
                <li><strong>Buying puts</strong>: You profit if the stock price falls below the strike price minus the premium paid</li>
                <li><strong>Maximum loss</strong>: Limited to the premium paid (the cost of the option)</li>
            </ul>
            <p style="margin-top: 8px;">Options have an <strong>expiration date</strong>. If the option is out of the money at expiration, it expires worthless and you lose 100% of your investment.</p>
        `,
    },
    {
        id: 'option-sell-contracts',
        // customMatch: legacy condition uses regex /Sell .+ (Call|Put)/ to
        // capture variable underlying-symbol text between "Sell" and the
        // option type. modalTitleContains can't express a pattern with a
        // wildcard middle.
        // Retirement target: PB-side stable modalId field.
        match: { modalType: 3 },
        customMatch: (gs) => Boolean(gs.modalTitle && /Sell .+ (Call|Put)/.test(gs.modalTitle)),
        title: 'Selling (Writing) Options',
        content: `
            <p>Enter the <strong>number of option contracts</strong> to sell (write). You receive the premium upfront but take on an obligation.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Selling calls</strong>: You must sell shares at the strike price if exercised. <strong>Naked calls have unlimited loss potential</strong></li>
                <li><strong>Selling puts</strong>: You must buy shares at the strike price if exercised. Max loss = strike price x shares</li>
                <li><strong>Covered calls</strong>: If you own the underlying shares, selling calls is less risky (income strategy)</li>
            </ul>
            <p style="margin-top: 8px;"><em>Warning: Writing naked options (without owning the underlying) carries extreme risk and requires significant collateral. Your credit rating must meet minimum requirements.</em></p>
        `,
    },

    // ==================== ADDITIONAL: COMMODITY / PHYSICAL ====================
    {
        id: 'physical-commodity',
        // customMatch: legacy condition OR's two case variants ('Physical' and
        // 'physical'). modalTitleContains is case-sensitive.
        // Retirement target: PB-side stable modalId field.
        match: { modalType: 3 },
        customMatch: (gs) => Boolean(gs.modalTitle && (
            gs.modalTitle.includes('Physical') || gs.modalTitle.includes('physical')
        )),
        title: 'Physical Commodity Trading',
        content: `
            <p><strong>Physical commodities</strong> are actual raw materials (gold, oil, etc.) that you purchase for delivery and storage, as opposed to futures contracts.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>No leverage</strong>: You pay the full price upfront (unlike futures which use margin)</li>
                <li><strong>Storage costs</strong>: Physical holdings may incur storage fees</li>
                <li><strong>No expiration</strong>: Unlike futures, you hold physical commodities indefinitely</li>
                <li><strong>Position limits</strong>: Regulatory limits on how much you can hold</li>
            </ul>
            <p style="margin-top: 8px;"><em>Physical commodities are safer than futures (no margin calls) but tie up more capital.</em></p>
        `,
    },

    // ==================== ADDITIONAL: ETF ====================
    {
        id: 'etf-seek-adviser',
        // customMatch: legacy condition OR's two case variants ('Adviser' and
        // 'adviser') and accepts any modalType > 0 (not just 3). Declarative
        // narrowing on 'dviser' captures both casings via case-sensitive
        // substring; customMatch preserves the precise legacy OR for clarity.
        // Retirement target: PB-side stable modalId field.
        match: { modalTitleContains: 'dviser' },
        customMatch: (gs) => Boolean(gs.modalTitle && (
            gs.modalTitle.includes('Adviser') || gs.modalTitle.includes('adviser')
        )),
        title: 'ETF Advisory Role',
        content: `
            <p>Becoming an ETF's <strong>investment adviser</strong> gives you control over the fund's investment decisions and earns you a management fee.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>You earn a percentage of assets under management each quarter</li>
                <li>You control the fund's portfolio (buying/selling holdings)</li>
                <li>Advisory appointments may require a fee to secure</li>
                <li>Poor fund performance may lead to being replaced</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Managing an ETF is a steady income stream. But if the fund performs poorly, you may lose the advisory role and the fee income that comes with it.</em></p>
        `,
    },

    // ==================== ADDITIONAL: GAME LIFECYCLE ====================
    {
        id: 'newgame-computer-players',
        match: { modalType: 3, modalTitleContains: 'computer player' },
        title: 'Computer Players',
        content: `
            <p>Choose how many <strong>AI-controlled opponents</strong> will compete against you.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Fewer players</strong>: Less competition, more opportunities for you to acquire companies and control industries</li>
                <li><strong>More players</strong>: More realistic market dynamics, more competition for deals, harder to dominate</li>
            </ul>
            <p style="margin-top: 8px;">Computer players actively trade stocks, launch takeovers, file lawsuits, and compete for control of companies just like you do.</p>
        `,
    },
    {
        id: 'newgame-currency',
        match: { modalType: 3, modalTitleContains: 'Currency' },
        title: 'Currency Selection',
        content: `
            <p>Choose the <strong>base currency</strong> for your game. All monetary values will be displayed in this currency.</p>
            <p style="margin-top: 8px;">This is a cosmetic choice that affects how numbers are displayed. The underlying game mechanics remain the same regardless of currency selection. Exchange rates between currencies fluctuate during the game.</p>
            <p style="margin-top: 8px;"><em>The currency conversion rate can be changed later during the game via the Settings menu.</em></p>
        `,
    },
    {
        id: 'form-startup-choices',
        match: { modalType: 5 },
        title: 'Game Startup Choices',
        content: `
            <p>Configure the starting conditions for your new game.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>Starting money</strong>: How much cash each player begins with. More money = easier start</li>
                <li><strong>Game length</strong>: Number of years the game will run. Longer games allow more complex strategies</li>
                <li><strong>Difficulty</strong>: Affects market volatility, AI aggressiveness, and economic conditions</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: For your first game, use default settings. The standard difficulty provides a balanced experience.</em></p>
        `,
    },

    // ==================== ADDITIONAL: COMMON CONFIRMATIONS ====================
    {
        id: 'margin-call',
        match: { modalTitleContains: 'Margin Call' },
        title: 'Margin Call',
        content: `
            <p>A <strong>margin call</strong> means your account has fallen below the minimum required equity. You must deposit additional funds or liquidate positions to meet the requirement.</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li>Caused by losses on leveraged positions (borrowed money)</li>
                <li>If you don't meet the call, positions may be forcibly liquidated at unfavorable prices</li>
                <li>Forced liquidation often locks in losses at the worst possible time</li>
            </ul>
            <p style="margin-top: 8px;"><em>Tip: Avoid margin calls by not over-leveraging. Keep a cash reserve to absorb short-term market swings.</em></p>
        `,
    },
    {
        id: 'credit-info',
        // customMatch: legacy condition requires BOTH 'Credit' and 'Rating'
        // substrings (not necessarily adjacent). modalTitleContains takes a
        // single substring and cannot express conjunction across non-adjacent
        // fragments. Declarative narrowing on 'Credit' is the fast-reject;
        // customMatch enforces both substrings.
        // Retirement target: PB-side stable modalId field.
        match: { modalTitleContains: 'Credit' },
        customMatch: (gs) => Boolean(gs.modalTitle && (
            gs.modalTitle.includes('Credit') && gs.modalTitle.includes('Rating')
        )),
        title: 'Credit Rating',
        content: `
            <p>A company's <strong>credit rating</strong> reflects its ability to repay debt, from AAA (highest) to D (default).</p>
            <ul style="margin: 8px 0 8px 20px; list-style-type: disc;">
                <li><strong>AAA-AA</strong>: Investment grade, low borrowing costs</li>
                <li><strong>A-BBB</strong>: Still investment grade but higher rates</li>
                <li><strong>BB and below</strong>: "Junk" bonds; very high borrowing costs, difficulty raising capital</li>
            </ul>
            <p style="margin-top: 8px;">Key factors: debt-to-equity ratio, cash flow, profitability, industry conditions. High leverage (lots of debt) is the fastest way to get downgraded.</p>
        `,
    },
];
