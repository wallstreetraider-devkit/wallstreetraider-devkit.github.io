// Test suite for hintMatcher.js. Covers all 15 assertions in §F of the
// hint system spec (docs/hint-system-spec.md). Run with `npm test`.
//
// api.js is mocked at module level so the matcher loads in Node/Vitest
// without dragging in preact/zustand/electron boot. The mocked helpers
// are byte-for-byte equivalent to the canonical exports in api.js:506-512.
// Production code uses the canonical versions; this mock only isolates
// the test environment.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../api.js', () => ({
    isPlayerControlled: (controlledCompanies, entityId) =>
        (controlledCompanies || []).some(c => c.id === entityId),
    isPlayerCEO: (chairedCompanyId, entityId) =>
        chairedCompanyId === entityId,
    ETF_IND: 71,
    UI_MARKET_HEATMAP: 33,
    UI_DB_SEARCH: 39,
    UI_MARKET_REPORTS_COMMOD_FUTURES_REPORT: 1,
    UI_MARKET_REPORTS_COMMOD_PHYSICAL_REPORT: 2,
    UI_MARKET_REPORTS_OPTIONS_REPORT: 3,
    UI_MARKET_REPORTS_INTEREST_RATE_SWAPS_REPORT: 4,
    UI_MARKET_REPORTS_STOCKS_REPORT: 5,
    UI_MARKET_REPORTS_INVESTMENT_CONTRACTS_REPORT: 6,
    UI_MARKET_REPORTS_INDUSTRY_GROWTH_RATES_REPORT: 7,
    UI_MARKET_REPORTS_LARGEST_MARKET_SHARE_REPORT: 8,
    UI_MARKET_REPORTS_LARGEST_TAX_LOSSES_REPORT: 9,
    UI_MARKET_REPORTS_MOST_CASH_REPORT: 10,
    UI_MARKET_REPORTS_MOST_MARKET_CAP_REPORT: 11,
    UI_MARKET_REPORTS_ECON_STATS_REPORT: 12,
    UI_MARKET_REPORTS_INTEREST_RATES_REPORT: 13,
    UI_MARKET_REPORTS_WHO_AHEAD_REPORT: 14,
}));

const { deriveContext, matches, findActiveHint } = await import('./hintMatcher.js');

// ---------- helpers ----------

function publicCompanyState({
    id = 100,
    industryId = 5,
    outstandingShares = 1_000_000,
    controlled = false,
    isCEO = false,
    tab,
} = {}) {
    return {
        activeEntityNum: id,
        allCompanies: [{ id, industryId, outstandingShares }],
        controlledCompanies: controlled ? [{ id }] : [],
        chairedCompanyId: isCEO ? id : 0,
        ...(tab ? { uiPreferredCompanyTab: tab } : {}),
    };
}

function entry(overrides) {
    return { id: 'e', title: 't', content: '', match: {}, ...overrides };
}

// ============================================================
// deriveContext (§F.1-5)
// ============================================================

describe('deriveContext', () => {
    it('F.1: gameState with modalType > 0 produces modalType + modalTitleContains', () => {
        const ctx = deriveContext({ modalType: 3, modalTitle: 'Buy Stock - Merger Premium' });
        expect(ctx.modalType).toBe(3);
        expect(ctx.modalTitleContains).toBe('Buy Stock - Merger Premium');
    });

    it('F.2: viewing a public company not controlled by player produces view/entityKind/controls=false', () => {
        const ctx = deriveContext(publicCompanyState({ controlled: false }));
        expect(ctx.view).toBe('company');
        expect(ctx.entityKind).toBe('public');
        expect(ctx.controls).toBe(false);
    });

    it('F.3: viewing a controlled company produces controls=true', () => {
        // "Owns >50%" is captured upstream by gameState.controlledCompanies
        // (the player's effective-control list — see api.js:isPlayerControlled).
        const ctx = deriveContext(publicCompanyState({ controlled: true }));
        expect(ctx.controls).toBe(true);
    });

    it('F.4: empty gameState produces empty context (no view, tab, modalType)', () => {
        const ctx = deriveContext({});
        expect(ctx.view).toBeUndefined();
        expect(ctx.tab).toBeUndefined();
        expect(ctx.modalType).toBeUndefined();
    });

    it('F.5: company view with uiPreferredCompanyTab=Cashflow normalizes to tab=cashflow', () => {
        const ctx = deriveContext(publicCompanyState({ tab: 'Cashflow' }));
        expect(ctx.tab).toBe('cashflow');
    });

    // Regression: activeEntityNum is preserved across navigations, so the
    // user's "current entity" remains the last company even after they
    // click Market or DB Search. The matcher MUST mirror View.js's
    // routing and use activeIndustryNum as the primary discriminator,
    // not activeEntityNum, or every market/industry/DB-search screen
    // falls back to the company-view hint.
    it('market: activeIndustryNum=0 wins over activeEntityNum>10 (top-level market view)', () => {
        const ctx = deriveContext({
            activeEntityNum: 100,
            activeIndustryNum: 0,
            allCompanies: [{ id: 100, industryId: 5, outstandingShares: 1_000_000 }],
            uiPreferredMarketTab: 'Heat Map',
        });
        expect(ctx.view).toBe('market');
        expect(ctx.tab).toBe('heat-map');
    });

    it('industry: activeIndustryNum>0 wins over activeEntityNum>10 (industry drilldown)', () => {
        const ctx = deriveContext({
            activeEntityNum: 100,
            activeIndustryNum: 5,
            allCompanies: [{ id: 100, industryId: 5, outstandingShares: 1_000_000 }],
            uiPreferredIndustryTab: 'Summary',
        });
        expect(ctx.view).toBe('industry');
        expect(ctx.tab).toBe('summary');
    });

    it('market: activeIndustryNum=-2 wins over activeEntityNum>10 (DB Search)', () => {
        const ctx = deriveContext({
            activeEntityNum: 100,
            activeIndustryNum: -2,
            activeUiReport: 39, // UI_DB_SEARCH
            allCompanies: [{ id: 100, industryId: 5, outstandingShares: 1_000_000 }],
        });
        expect(ctx.view).toBe('market');
        // DB Search synthesizes a stable tab so entries can match
        // declaratively without depending on activeUiReport timing.
        expect(ctx.tab).toBe('db-search');
    });

    it('DB Search synthesized tab overrides any stale uiPreferredMarketTab', () => {
        // User was on Heat Map (uiPreferredMarketTab='Heat Map'), then
        // navigated to DB Search. uiPreferredMarketTab is not updated by
        // the DB Search nav, but the matcher must surface tab='db-search'
        // anyway so the DB Search hint matches instead of the heatmap one.
        const ctx = deriveContext({
            activeIndustryNum: -2,
            uiPreferredMarketTab: 'Heat Map',
        });
        expect(ctx.view).toBe('market');
        expect(ctx.tab).toBe('db-search');
    });

    // Sensitivity: an unrelated UI ID (e.g. UI_CORP_OVERVIEW = 42) must NOT
    // resolve to view: 'market'. If the matcher were broadened to accept any
    // truthy activeUiReport, this would fail.
    it('market: all leaf market-report UI IDs (heatmap, db search, every UI_MARKET_REPORTS_*) resolve to view=market; unrelated IDs do not', () => {
        const marketIds = [
            33, 39,                  // UI_MARKET_HEATMAP, UI_DB_SEARCH
            1, 2, 3, 4, 5, 6,        // Who Owns What sub-tabs
            7,                       // Industry Growth Rates
            8, 9, 10, 11,            // Companies With Most sub-tabs
            12,                      // Econ Data
            13,                      // Interest Rates
            14,                      // Who's Ahead
        ];
        for (const id of marketIds) {
            const ctx = deriveContext({ activeUiReport: id });
            expect(ctx.view, `activeUiReport=${id} should derive view=market`).toBe('market');
        }
        // Sensitivity: an unrelated report ID (UI_CORP_OVERVIEW = 42) must not
        // accidentally resolve to 'market'.
        expect(deriveContext({ activeUiReport: 42 }).view).toBeUndefined();
    });
});

// ============================================================
// matches (§F.6-11)
// ============================================================

describe('matches', () => {
    it('F.6: entry with empty match={} matches any context', () => {
        const ctx = deriveContext({});
        expect(matches(entry({ match: {} }), ctx)).toBe(true);
    });

    it('F.7: match={view:company} matches view=company regardless of other fields', () => {
        const ctx = deriveContext(publicCompanyState({ tab: 'Cashflow', controlled: true }));
        expect(matches(entry({ match: { view: 'company' } }), ctx)).toBe(true);
    });

    it('F.8: match={view:company,tab:cashflow} does NOT match {view:company,tab:balance-sheet}', () => {
        const ctx = deriveContext(publicCompanyState({ tab: 'Balance Sheet' }));
        const e = entry({ match: { view: 'company', tab: 'cashflow' } });
        expect(matches(e, ctx)).toBe(false);
    });

    it('F.9: match={modalTitleContains:Merger} substring-matches', () => {
        const ctx = deriveContext({ modalType: 3, modalTitle: 'Buy Stock - Merger Premium' });
        const e = entry({ match: { modalTitleContains: 'Merger' } });
        expect(matches(e, ctx)).toBe(true);

        // Sensitivity check: a substring that is NOT present should fail to match.
        const e2 = entry({ match: { modalTitleContains: 'Tender' } });
        expect(matches(e2, ctx)).toBe(false);
    });

    it('F.10: customMatch returning false suppresses a match', () => {
        const ctx = deriveContext(publicCompanyState());
        const e = entry({ match: { view: 'company' }, customMatch: () => false });
        expect(matches(e, ctx)).toBe(false);
    });

    it('F.11: customMatch returning true cannot override a non-matching `match`', () => {
        const ctx = deriveContext({}); // no view
        const e = entry({ match: { view: 'company' }, customMatch: () => true });
        expect(matches(e, ctx)).toBe(false);
    });
});

// ============================================================
// findActiveHint (§F.12-15)
// ============================================================

describe('findActiveHint', () => {
    it('F.12: returns the single matching entry from a catalog of 3', () => {
        const catalog = [
            entry({ id: 'a', match: { view: 'player' } }),
            entry({ id: 'b', match: { view: 'company' } }),
            entry({ id: 'c', match: { view: 'market' } }),
        ];
        const ctx = deriveContext(publicCompanyState());
        expect(findActiveHint(catalog, ctx)).toBe(catalog[1]);
    });

    it('F.13: tied priority resolves to earlier catalog order', () => {
        const catalog = [
            entry({ id: 'a', match: { view: 'company' } }),
            entry({ id: 'b', match: { view: 'company' } }),
        ];
        const ctx = deriveContext(publicCompanyState());
        expect(findActiveHint(catalog, ctx)).toBe(catalog[0]);
    });

    it('F.14: higher priority wins', () => {
        const catalog = [
            entry({ id: 'a', match: { view: 'company' } }),
            entry({ id: 'b', match: { view: 'company' }, priority: 5 }),
        ];
        const ctx = deriveContext(publicCompanyState());
        expect(findActiveHint(catalog, ctx)).toBe(catalog[1]);
    });

    it('F.15: no matches returns null', () => {
        const catalog = [
            entry({ id: 'a', match: { view: 'industry' } }),
        ];
        const ctx = deriveContext(publicCompanyState());
        expect(findActiveHint(catalog, ctx)).toBeNull();
    });
});
