// Pure matching engine for the hint system.
//
// Exports:
//   deriveContext(gameState) → context object (with non-enumerable _gameState)
//   matches(entry, context)  → boolean (AND of all match keys + customMatch)
//   findActiveHint(catalog, context) → HintEntry | null (priority then catalog order)
//
// See docs/hint-system-spec.md §F (test cases), §G (context derivation).
//
// This module has no React, no fetch, no store subscriptions. Its only
// imports from api.js are the canonical entity-predicate helpers and the
// view-discriminator constants — single source of truth, no duplication.

import {
    isPlayerControlled,
    isPlayerCEO,
    ETF_IND,
    UI_MARKET_HEATMAP,
    UI_DB_SEARCH,
    UI_MARKET_REPORTS_COMMOD_FUTURES_REPORT,
    UI_MARKET_REPORTS_COMMOD_PHYSICAL_REPORT,
    UI_MARKET_REPORTS_OPTIONS_REPORT,
    UI_MARKET_REPORTS_INTEREST_RATE_SWAPS_REPORT,
    UI_MARKET_REPORTS_STOCKS_REPORT,
    UI_MARKET_REPORTS_INVESTMENT_CONTRACTS_REPORT,
    UI_MARKET_REPORTS_INDUSTRY_GROWTH_RATES_REPORT,
    UI_MARKET_REPORTS_LARGEST_MARKET_SHARE_REPORT,
    UI_MARKET_REPORTS_LARGEST_TAX_LOSSES_REPORT,
    UI_MARKET_REPORTS_MOST_CASH_REPORT,
    UI_MARKET_REPORTS_MOST_MARKET_CAP_REPORT,
    UI_MARKET_REPORTS_ECON_STATS_REPORT,
    UI_MARKET_REPORTS_INTEREST_RATES_REPORT,
    UI_MARKET_REPORTS_WHO_AHEAD_REPORT,
} from '../api.js';

// activeUiReport values that should resolve to view: 'market'. Covers the
// Heat Map and DB Search top-level entries plus every leaf of the nested
// Industry/Companies-With-Most/Who-Owns-What tab trees — Tabs.js writes the
// active leaf's id, not the parent's, so each leaf needs explicit coverage.
const MARKET_REPORT_UI_IDS = new Set([
    UI_MARKET_HEATMAP,
    UI_DB_SEARCH,
    UI_MARKET_REPORTS_COMMOD_FUTURES_REPORT,
    UI_MARKET_REPORTS_COMMOD_PHYSICAL_REPORT,
    UI_MARKET_REPORTS_OPTIONS_REPORT,
    UI_MARKET_REPORTS_INTEREST_RATE_SWAPS_REPORT,
    UI_MARKET_REPORTS_STOCKS_REPORT,
    UI_MARKET_REPORTS_INVESTMENT_CONTRACTS_REPORT,
    UI_MARKET_REPORTS_INDUSTRY_GROWTH_RATES_REPORT,
    UI_MARKET_REPORTS_LARGEST_MARKET_SHARE_REPORT,
    UI_MARKET_REPORTS_LARGEST_TAX_LOSSES_REPORT,
    UI_MARKET_REPORTS_MOST_CASH_REPORT,
    UI_MARKET_REPORTS_MOST_MARKET_CAP_REPORT,
    UI_MARKET_REPORTS_ECON_STATS_REPORT,
    UI_MARKET_REPORTS_INTEREST_RATES_REPORT,
    UI_MARKET_REPORTS_WHO_AHEAD_REPORT,
]);

// Player entity IDs are 1-10 (see api.js HUMAN1_ID..COMPUTER4_ID, all <= 10);
// company IDs are 11+. This is the actual view discriminator in the game
// model — the spec's ENTITY_PLAYER / ENTITY_COMPANY / viewedEntityType
// constants do not exist (Phase 2 finding, see commit message).
const PLAYER_ID_MAX = 10;

function normalizeTabId(label) {
    if (label == null) return undefined;
    const s = String(label)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return s.length > 0 ? s : undefined;
}

// Phase 2 deferral: 'commodity', 'bond', 'index' kinds are not yet derived.
// Those entities are identified by specific entity IDs in WSR (OIL_ID,
// TBOND_RATE_ID, STOCK_INDEX_ID, etc.), not by industryId, and no current
// hint exercises them. When a hint requires one, extend this function and
// add the corresponding test in §F. See spec §B schema-extension principle.
function deriveEntityKind(company) {
    if (!company) return undefined;
    if (company.industryId === ETF_IND) return 'mutual-fund';
    if (typeof company.outstandingShares === 'number' && company.outstandingShares > 0) {
        return 'public';
    }
    return 'private';
}

export function deriveContext(gameState) {
    const gs = gameState || {};
    const ctx = {};

    // customMatch predicates take the raw gameState (see schema in §B).
    // Expose it as a non-enumerable property so the context still looks
    // clean in dev tools, JSON output, and Object.keys.
    Object.defineProperty(ctx, '_gameState', {
        value: gs,
        enumerable: false,
        writable: false,
        configurable: false,
    });

    // Modal takes precedence over view (§G.1 view mapping).
    if (typeof gs.modalType === 'number' && gs.modalType > 0) {
        ctx.modalType = gs.modalType;
        ctx.modalTitleContains = gs.modalTitle || '';
        return ctx;
    }

    const id = typeof gs.activeEntityNum === 'number' ? gs.activeEntityNum : 0;
    const industryNum = typeof gs.activeIndustryNum === 'number' ? gs.activeIndustryNum : null;

    // View routing mirrors components/View.js: activeIndustryNum is the
    // primary discriminator. activeEntityNum is preserved across
    // navigations (you remain "on" the last company even after clicking
    // Market, Industry, or DB Search), so checking activeEntityNum first
    // would route every market/industry/DB-search view back to 'company'
    // and the company-view fallback would fire on every market screen.
    // Stay in lockstep with View.js or this hint matcher will mismatch
    // what the user is actually looking at.
    if (industryNum === -2) {
        // DB Search. View === 'market', tab synthesized as 'db-search' so
        // entries can match declaratively without depending on
        // activeUiReport (which may not yet be set when the user lands on
        // DB Search). Overrides any uiPreferredMarketTab carried over
        // from the previous market screen.
        ctx.view = 'market';
        ctx.tab = 'db-search';
    } else if (industryNum !== null && industryNum > 0) {
        ctx.view = 'industry';
        const t = normalizeTabId(gs.uiPreferredIndustryTab);
        if (t) ctx.tab = t;
    } else if (industryNum === 0) {
        ctx.view = 'market';
        const t = normalizeTabId(gs.uiPreferredMarketTab);
        if (t) ctx.tab = t;
    } else if (id >= 1 && id <= PLAYER_ID_MAX) {
        ctx.view = 'player';
        const t = normalizeTabId(gs.uiPreferredPlayerTab);
        if (t) ctx.tab = t;
    } else if (id > PLAYER_ID_MAX) {
        ctx.view = 'company';
        const company = (gs.allCompanies || []).find(c => c.id === id);
        const kind = deriveEntityKind(company);
        if (kind) ctx.entityKind = kind;
        ctx.controls = (
            isPlayerControlled(gs.controlledCompanies, id) ||
            isPlayerCEO(gs.chairedCompanyId, id)
        );
        const t = normalizeTabId(gs.uiPreferredCompanyTab);
        if (t) ctx.tab = t;
    } else if (MARKET_REPORT_UI_IDS.has(gs.activeUiReport)) {
        // Robustness fallback: if neither activeIndustryNum nor
        // activeEntityNum yielded a view, fall back to recognizing
        // market reports by their UI id alone. Covers test fixtures
        // and partial gameStates; in production real navigation always
        // sets activeIndustryNum first.
        ctx.view = 'market';
        const t = normalizeTabId(gs.uiPreferredMarketTab);
        if (t) ctx.tab = t;
    }

    return ctx;
}

export function matches(entry, context) {
    if (!entry || !entry.match) return false;
    const m = entry.match;
    for (const key of Object.keys(m)) {
        const expected = m[key];
        if (key === 'modalTitleContains') {
            const actual = context.modalTitleContains || '';
            if (!actual.includes(expected)) return false;
        } else if (context[key] !== expected) {
            return false;
        }
    }
    if (typeof entry.customMatch === 'function') {
        if (!entry.customMatch(context._gameState)) return false;
    }
    return true;
}

export function findActiveHint(catalog, context) {
    if (!Array.isArray(catalog) || catalog.length === 0) return null;
    let best = null;
    let bestPriority = -Infinity;
    for (let i = 0; i < catalog.length; i++) {
        const entry = catalog[i];
        if (!matches(entry, context)) continue;
        const p = typeof entry.priority === 'number' ? entry.priority : 0;
        // Strict > preserves earlier-catalog-order tie-breaking (§F.13):
        // a later entry with equal priority does not displace the earlier one.
        if (p > bestPriority) {
            best = entry;
            bestPriority = p;
        }
    }
    return best;
}
