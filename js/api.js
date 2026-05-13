/**
 * @fileoverview Wall Street Raider 10 - Frontend API Layer
 *
 * This module provides the complete API surface for the Wall Street Raider 10
 * game frontend. It communicates with the C++ backend (wsr10.exe) via two
 * transports:
 *
 * 1. **REST API** (default): HTTP POST/GET requests to dynamically-assigned ports.
 * 2. **IPC bridge** (addon mode, `WSR_NO_REST=1`): Electron IPC calls to main process.
 *
 * All API calls await `bridgeReady` before executing.
 *
 * @author Wall Street Raider 10 Team
 */

import { insertCurrencySymbols } from './components/helpers.js';
import { html, render, useRef, useState, useEffect, useMemo, useCallback, useContext, createContext } from './lib/preact.standalone.module.js';
import zustand from './lib/zustand.module.js';
import { debugLog } from './debug-log.js';
const { createStore } = zustand;

// In a plain browser (phone access), Electron APIs are unavailable — stub them out.
const ipcRenderer = (typeof require !== 'undefined')
    ? require('electron').ipcRenderer
    : { invoke: () => Promise.resolve(null), send: () => {}, on: () => {} };

// Bridge handshake: REST + WebSocket ports are OS-assigned at wsr.exe startup
// and delivered here via the 'bridge-ports' IPC message from electron/main.js,
// which reads them from %LOCALAPPDATA%\Wall Street Raider\runtime.json.
// No REST or WebSocket call may fire until bridgeReady resolves — fetchWithRetry
// awaits it at the top, so all POST/GET helpers below are port-safe.
let apiBase = null;
let wsUrl = null;
let _resolveBridge;

/**
 * Promise that resolves when the backend bridge ports are discovered.
 * All API calls internally await this before making network requests.
 * @type {Promise<void>}
 */
export const bridgeReady = new Promise(resolve => { _resolveBridge = resolve; });

/**
 * Returns the currently configured REST API base URL.
 * Returns `null` until the bridge handshake completes.
 * @returns {string|null} e.g. "http://127.0.0.1:54321"
 */
export const getApiBase = () => apiBase;

/**
 * Returns the currently configured WebSocket URL.
 * Returns `null` until the bridge handshake completes.
 * @returns {string|null} e.g. "ws://127.0.0.1:54322"
 */
export const getWsUrl = () => wsUrl;

// Phone/remote-access override: browsers loading index.html from a non-loopback
// host can't read the local handshake file. They pass the backend ports via URL
// params (e.g. ?restPort=54321&wsPort=54322) from a manual discovery step.
(function applyUrlOverride() {
    try {
        if (typeof location === 'undefined') return;
        const h = location.hostname;
        if (!h || h === '127.0.0.1' || h === 'localhost') return;
        const params = new URLSearchParams(location.search || '');
        const rest = Number(params.get('restPort'));
        const ws = Number(params.get('wsPort'));
        if (Number.isInteger(rest) && rest > 0) {
            apiBase = `http://${h}:${rest}`;
            if (Number.isInteger(ws) && ws > 0) wsUrl = `ws://${h}:${ws}`;
            _resolveBridge();
        }
    } catch (e) { /* best effort */ }
})();

function _applyPorts(ports) {
    if (!ports) return false;
    apiBase = `http://127.0.0.1:${ports.restPort}`;
    wsUrl = `ws://127.0.0.1:${ports.wsPort}`;
    console.log('[api] bridge-ports:', ports);
    _resolveBridge();
    return true;
}

if (ipcRenderer && typeof ipcRenderer.on === 'function') {
    // Catches send('bridge-ports') from main on wsr.exe restarts. Note this
    // would miss the initial handshake if the IPC fires before this listener
    // registers — the invoke() call below is the race-free primary path.
    ipcRenderer.on('bridge-ports', (_evt, ports) => _applyPorts(ports));
}

// Race-free initial pull: renderer asks main for the ports. If they're
// already known, main returns them synchronously. If not (handshake still
// in flight), main returns a promise it resolves when the handshake arrives.
// On wsr-restart, main rejects outstanding invokes with null so we retry.
if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
    const pullPorts = () => {
        ipcRenderer.invoke('get-bridge-ports').then(ports => {
            if (_applyPorts(ports)) return;
            // null response = stale request on restart; retry once the new
            // child has started the next handshake cycle.
            setTimeout(pullPorts, 200);
        }).catch(err => {
            console.warn('[api] get-bridge-ports failed, retrying:', err?.message || err);
            setTimeout(pullPorts, 500);
        });
    };
    pullPorts();
}

// Detect addon mode: WSR_NO_REST=1 means no REST server, use IPC for everything
const useIPC = typeof process !== 'undefined' && process.env && process.env.WSR_NO_REST === '1';
console.log('[api] useIPC =', useIPC, 'WSR_NO_REST =', typeof process !== 'undefined' && process.env ? process.env.WSR_NO_REST : 'N/A');

// REST path → GameEventType mapping (from GameEvent.h)
// Used to route postNoArg/postIdArg through game:dispatch IPC in addon mode
const REST_TO_EVENT = {
    '/clear_event_string': 5,
    '/start_ticker': 10,
    '/run_ticker': 13,
    '/stop_ticker': 15,
    '/set_ticker_speed': 1160,
    '/loadgame': 20,
    '/newgame': 30,
    '/savegame': 40,
    '/exit_game': 45,
    '/check_scoreboard': 50,
    '/buy_stock': 60,
    '/sell_stock': 70,
    '/short_stock': 80,
    '/cover_short_stock': 90,
    '/buy_corporate_bond': 100,
    '/sell_corporate_bond': 110,
    '/buy_long_govt_bonds': 120,
    '/sell_long_govt_bonds': 125,
    '/buy_short_govt_bonds': 130,
    '/sell_short_govt_bonds': 135,
    '/buy_commodity_futures': 140,
    '/sell_commodity_futures': 150,
    '/short_commodity_futures': 160,
    '/cover_short_commodity_futures': 170,
    '/buy_physical_commodity': 180,
    '/sell_physical_commodity': 190,
    '/buy_physical_crypto': 200,
    '/sell_physical_crypto': 210,
    '/buy_crypto_futures': 220,
    '/sell_crypto_futures': 230,
    '/buy_calls': 280,
    '/sell_calls': 290,
    '/buy_puts': 300,
    '/sell_puts': 310,
    '/advanced_options_trading': 330,
    '/exercise_call_options_early': 340,
    '/exercise_put_options_early': 350,
    '/prepay_taxes': 360,
    '/elect_ceo': 370,
    '/resign_as_ceo': 380,
    '/change_managers': 390,
    '/set_dividend': 400,
    '/set_productivity': 410,
    '/set_growth_rate': 420,
    '/restructure': 430,
    '/buy_corporate_assets': 440,
    '/sell_corporate_assets': 450,
    '/view_for_sale_items': 456,
    '/sell_subsidiary_stock': 460,
    '/rebrand': 470,
    '/toggle_company_autopilot': 480,
    '/toggle_global_autopilot': 490,
    '/become_etf_advisor': 500,
    '/set_advisory_fee': 510,
    '/merger': 530,
    '/greenmail': 540,
    '/lbo': 550,
    '/startup': 560,
    '/capital_contribution': 570,
    '/public_stock_offering': 580,
    '/private_stock_offering': 590,
    '/issue_new_corp_bonds': 600,
    '/redeem_corp_bonds': 610,
    '/extraordinary_dividend': 620,
    '/tax_free_liquidation': 630,
    '/taxable_liquidation': 640,
    '/spin_off': 650,
    '/split_stock': 660,
    '/reverse_split_stock': 670,
    '/borrow_money': 680,
    '/repay_loan': 690,
    '/advance_funds': 700,
    '/call_in_advance': 710,
    '/interest_rate_swaps': 720,
    '/view_swap_details': 724,
    '/terminate_swap': 725,
    '/set_bank_allocation': 730,
    '/trade_tbills': 740,
    '/list_bank_loans': 750,
    '/change_bank': 770,
    '/call_in_loan': 780,
    '/buy_business_loans': 810,
    '/sell_business_loan': 820,
    '/buy_consumer_loans': 830,
    '/sell_consumer_loans': 840,
    '/buy_prime_mortgages': 850,
    '/sell_prime_mortgages': 860,
    '/buy_subprime_mortgages': 870,
    '/sell_subprime_mortgages': 880,
    '/list_etfs': 890,
    '/freeze_all_loans': 900,
    '/freeze_loan': 905,
    '/decrease_earnings': 910,
    '/increase_earnings': 920,
    '/change_law_firm': 930,
    '/antitrust_lawsuit': 940,
    '/harrassing_lawsuit': 950,
    '/spread_rumors': 960,
    '/credit_info': 1080,
    '/clear_chart': 1090,
    '/growth_throttle': 1100,
    '/clear_stream_list': 1110,
    '/fill_stream_list': 1120,
    '/database_search': 1150,
    '/set_ticker_speed': 1160,
    '/set_view_asset': 2000,
    '/set_view_industry': 2003,
    '/change_acting_as': 2001,
    '/toggle_streaming_quote': 2002,
    '/close_modal': 3000,
    // '/set_active_ui_report' — handled as special case in postIdArg (direct pointer write, not an event)
    '/set_tutorial_step': 4100,
    '/set_tutorial_enabled': 4101,
    '/set_chart_type': 4200,
    '/set_locale': 4201,
    '/supp_earn_select': 2100,
    '/currency_select': 2101,
    '/supp_warn_select': 2102,
    '/suppress_select': 2103,
    '/autosave_select': 2104,
    '/exercise_select': 2105,
    '/sweep_select': 2106,
    '/makedelivery_select': 2107,
    '/takedelivery_select': 2108,
    '/tooltips_select': 2109,
    '/shareholdergraph_select': 2110,
    '/unethical_select': 2111,
    '/disablehotkeys_select': 2112,
    '/autoadd_select': 2113,
    '/cheat_disable_lawsuits': 2120,
    '/cheat_merger_info': 2121,
    '/cheat_earnings_info': 2122,
    '/cheat_add_cash': 2123,
    '/create_price_alert': 4102,
    '/delete_price_alert': 4103,
    '/show_price_alerts': 4104,
};

// Market report REST paths that use trigger_event with specific GameEventTypes
const REPORT_PATH_TO_EVENT = {
    '/view_current_interest_rates': 970,
    '/whos_ahead': 980,
    '/db_research_tool': 990,
    '/economic_stats': 1000,
    '/most_cash_report': 1010,
    '/largest_market_cap': 1020,
    '/largest_tax_losses': 1030,
    '/industry_summary': 1040,
    '/industry_projections': 1050,
    '/view_corp_assets_for_sale': 1060,
};

// Network error handling - refresh browser only after sustained failures (e.g., sleep/wake).
// Transient failures (server busy during game load) must NOT trigger reload or it causes
// an infinite refresh loop: load game -> server busy -> fetch fails -> reload -> repeat.
let _networkFailCount = 0;
const NETWORK_FAIL_THRESHOLD = 5;

async function fetchWithRetry(pathOrUrl, options = {}) {
    // Must await bridgeReady BEFORE building the URL — apiBase is null until
    // the handshake arrives, so constructing "null/foo" synchronously at the
    // caller would produce a broken URL.
    await bridgeReady;
    const url = (typeof pathOrUrl === 'string' && pathOrUrl.startsWith('/'))
        ? apiBase + pathOrUrl
        : pathOrUrl;
    const method = options.method || 'GET';
    const pathOnly = (typeof pathOrUrl === 'string' && pathOrUrl.startsWith('/'))
        ? pathOrUrl
        : String(pathOrUrl).replace(apiBase || '', '');
    const t0 = performance.now();
    try {
        const response = await fetch(url, options);
        _networkFailCount = 0; // Reset on any successful fetch
        return response;
    } catch (error) {
        _networkFailCount++;
        if (_networkFailCount <= 1 || _networkFailCount % 10 === 0) {
            console.warn(`[FETCH #${_networkFailCount}] ${method} ${pathOnly} FAILED (${(performance.now() - t0).toFixed(1)}ms, streak=${_networkFailCount}): ${error.message}`);
        }
        throw error;
    }
}

/**
 * Industry IDs
 */
export const PLAYER_IND = 0;
/**
 *  b a n k_ i n d
 */
export const BANK_IND = 1;
/**
 *  i n s u r a n c e_ i n d
 */
export const INSURANCE_IND = 2;
/**
 *  s e c u r i t i e s_ b r o k e r_ i n d
 */
export const SECURITIES_BROKER_IND = 37;
/**
 *  e t f_ i n d
 */
export const ETF_IND = 71;

/**
 * Entity IDs
 */
export const HUMAN1_ID = 2;
/**
 *  c o m p u t e r1_ i d
 */
export const COMPUTER1_ID = 1;
/**
 *  c o m p u t e r2_ i d
 */
export const COMPUTER2_ID = 3;
/**
 *  c o m p u t e r3_ i d
 */
export const COMPUTER3_ID = 4;
/**
 *  c o m p u t e r4_ i d
 */
export const COMPUTER4_ID = 5;
/**
 *  s t o c k_ i n d e x_ i d
 */
export const STOCK_INDEX_ID = 0;
/**
 *  c m o d_ i d
 */
export const CMOD_ID = 1600;  // Basic Commodities Fund ETF
/**
 *  o i l_ i d
 */
export const OIL_ID = 6;
/**
 *  g o l d_ i d
 */
export const GOLD_ID = 7;
/**
 *  s i l v e r_ i d
 */
export const SILVER_ID = 8;
/**
 *  w h e a t_ i d
 */
export const WHEAT_ID = 9;
/**
 *  c o r n_ i d
 */
export const CORN_ID = 10;
/**
 *  p r i m e_ r a t e_ i d
 */
export const PRIME_RATE_ID = 1601;
/**
 *  t b o n d_ r a t e_ i d
 */
export const TBOND_RATE_ID = 1602;
/**
 *  s b o n d_ r a t e_ i d
 */
export const SBOND_RATE_ID = 1603;
/**
 *  g n p_ r a t e_ i d
 */
export const GNP_RATE_ID = 1604;
/**
 *  b i t c o i n_ i d
 */
export const BITCOIN_ID = 1605;
/**
 *  e t h e r e u m_ i d
 */
export const ETHEREUM_ID = 1606;

/**
 * UI IDs
 */
export const UI_ADVISORY_REPORT = 1;
/**
 *  u i_ m a r k e t_ r e p o r t s_ c o m m o d_ f u t u r e s_ r e p o r t
 */
export const UI_MARKET_REPORTS_COMMOD_FUTURES_REPORT = 1;
/**
 *  u i_ m a r k e t_ r e p o r t s_ c o m m o d_ p h y s i c a l_ r e p o r t
 */
export const UI_MARKET_REPORTS_COMMOD_PHYSICAL_REPORT = 2;
/**
 *  u i_ m a r k e t_ r e p o r t s_ o p t i o n s_ r e p o r t
 */
export const UI_MARKET_REPORTS_OPTIONS_REPORT = 3;
/**
 *  u i_ m a r k e t_ r e p o r t s_ i n t e r e s t_ r a t e_ s w a p s_ r e p o r t
 */
export const UI_MARKET_REPORTS_INTEREST_RATE_SWAPS_REPORT = 4;
/**
 *  u i_ m a r k e t_ r e p o r t s_ s t o c k s_ r e p o r t
 */
export const UI_MARKET_REPORTS_STOCKS_REPORT = 5;
/**
 *  u i_ m a r k e t_ r e p o r t s_ i n v e s t m e n t_ c o n t r a c t s_ r e p o r t
 */
export const UI_MARKET_REPORTS_INVESTMENT_CONTRACTS_REPORT = 6;
/**
 *  u i_ m a r k e t_ r e p o r t s_ i n d u s t r y_ g r o w t h_ r a t e s_ r e p o r t
 */
export const UI_MARKET_REPORTS_INDUSTRY_GROWTH_RATES_REPORT = 7;
/**
 *  u i_ m a r k e t_ r e p o r t s_ l a r g e s t_ m a r k e t_ s h a r e_ r e p o r t
 */
export const UI_MARKET_REPORTS_LARGEST_MARKET_SHARE_REPORT = 8;
/**
 *  u i_ m a r k e t_ r e p o r t s_ l a r g e s t_ t a x_ l o s s e s_ r e p o r t
 */
export const UI_MARKET_REPORTS_LARGEST_TAX_LOSSES_REPORT = 9;
/**
 *  u i_ m a r k e t_ r e p o r t s_ m o s t_ c a s h_ r e p o r t
 */
export const UI_MARKET_REPORTS_MOST_CASH_REPORT = 10;
/**
 *  u i_ m a r k e t_ r e p o r t s_ m o s t_ m a r k e t_ c a p_ r e p o r t
 */
export const UI_MARKET_REPORTS_MOST_MARKET_CAP_REPORT = 11;
/**
 *  u i_ m a r k e t_ r e p o r t s_ e c o n_ s t a t s_ r e p o r t
 */
export const UI_MARKET_REPORTS_ECON_STATS_REPORT = 12;
/**
 *  u i_ m a r k e t_ r e p o r t s_ i n t e r e s t_ r a t e s_ r e p o r t
 */
export const UI_MARKET_REPORTS_INTEREST_RATES_REPORT = 13;
/**
 *  u i_ m a r k e t_ r e p o r t s_ w h o_ a h e a d_ r e p o r t
 */
export const UI_MARKET_REPORTS_WHO_AHEAD_REPORT = 14;
/**
 *  u i_ i n d u s t r y_ s u m m a r y_ r e p o r t
 */
export const UI_INDUSTRY_SUMMARY_REPORT = 15;
/**
 *  u i_ i n d u s t r y_ p r o j e c t i o n s_ r e p o r t
 */
export const UI_INDUSTRY_PROJECTIONS_REPORT = 16;
/**
 *  u i_ c o r p_ f i n a n c i a l_ p r o f i l e
 */
export const UI_CORP_FINANCIAL_PROFILE = 17;
/**
 *  u i_ b a n k_ l o a n s_ l i s t
 */
export const UI_BANK_LOANS_LIST = 18;
/**
 *  u i_ c o r p_ c a s h_ f l o w_ p r o j e c t i o n
 */
export const UI_CORP_CASH_FLOW_PROJECTION = 19;
/**
 *  u i_ c o r p_ r e s e a r c h_ r e p o r t
 */
export const UI_CORP_RESEARCH_REPORT = 20;
/**
 *  u i_ c o r p_ s t o c k s_ b o n d s_ p o r t f o l i o
 */
export const UI_CORP_STOCKS_BONDS_PORTFOLIO = 21;
/**
 *  u i_ c o r p_ o p t i o n s_ p o r t f o l i o
 */
export const UI_CORP_OPTIONS_PORTFOLIO = 22;
/**
 *  u i_ c o r p_ s h a r e h o l d e r s_ l i s t
 */
export const UI_CORP_SHAREHOLDERS_LIST = 23;
/**
 *  u i_ c o r p_ c o m m o d i t y_ c o n t r a c t s_ l i s t
 */
export const UI_CORP_COMMODITY_CONTRACTS_LIST = 24;
/**
 *  u i_ c o r p_ e a r n i n g s_ r e p o r t
 */
export const UI_CORP_EARNINGS_REPORT = 25;
/**
 *  u i_ p l a y e r_ f i n a n c i a l_ p r o f i l e
 */
export const UI_PLAYER_FINANCIAL_PROFILE = 26;
/**
 *  u i_ p l a y e r_ c a s h_ f l o w_ p r o j e c t i o n
 */
export const UI_PLAYER_CASH_FLOW_PROJECTION = 27;
/**
 *  u i_ p l a y e r_ s t o c k s_ b o n d s_ p o r t f o l i o
 */
export const UI_PLAYER_STOCKS_BONDS_PORTFOLIO = 28;
/**
 *  u i_ p l a y e r_ o p t i o n s_ p o r t f o l i o
 */
export const UI_PLAYER_OPTIONS_PORTFOLIO = 29;
/**
 *  u i_ p l a y e r_ c o r p o r a t i o n s_ l i s t
 */
export const UI_PLAYER_CORPORATIONS_LIST = 30;
/**
 *  u i_ p l a y e r_ c o m m o d i t y_ c o n t r a c t s_ l i s t
 */
export const UI_PLAYER_COMMODITY_CONTRACTS_LIST = 31;
/**
 *  u i_ p l a y e r_ a d v a n c e s_ l i s t
 */
export const UI_PLAYER_ADVANCES_LIST = 32;
/**
 *  u i_ m a r k e t_ h e a t m a p
 */
export const UI_MARKET_HEATMAP = 33;
/**
 *  u i_ i n d u s t r y_ h e a t m a p
 */
export const UI_INDUSTRY_HEATMAP = 34;
/**
 *  u i_ i n d u s t r i e s_ h e a t m a p
 */
export const UI_INDUSTRIES_HEATMAP = 35;
/**
 *  u i_ c o m p a n i e s_ h e a t m a p
 */
export const UI_COMPANIES_HEATMAP = 36;
/**
 *  u i_ c o r p_ s w a p s_ p o r t f o l i o
 */
export const UI_CORP_SWAPS_PORTFOLIO = 37;
/**
 *  u i_ p l a y e r_ s w a p s_ p o r t f o l i o
 */
export const UI_PLAYER_SWAPS_PORTFOLIO = 38;
/**
 *  u i_ d b_ s e a r c h
 */
export const UI_DB_SEARCH = 39;
/**
 *  u i_ c o r p_ h o l d i n g s
 */
export const UI_CORP_HOLDINGS = 40;
/**
 *  u i_ p l a y e r_ h o l d i n g s
 */
export const UI_PLAYER_HOLDINGS = 41;
/**
 *  u i_ c o r p_ o v e r v i e w
 */
export const UI_CORP_OVERVIEW = 42;

/**
 * Dispatches a POST request with no arguments (empty JSON body).
 * Automatically routes to REST or IPC based on current mode.
 * @param {string} path - REST endpoint path (e.g. "/start_ticker")
 * @returns {Promise<string>} Response text from backend
 */
export async function postNoArg(path) {
    if (useIPC) {
        // Special-case endpoints that need dedicated IPC handlers
        if (path === '/close_modal') { return ipcRenderer.invoke('game:closeModal'); }
        if (path === '/splash_screen_played') { return ipcRenderer.invoke('game:splashScreenPlayed'); }

        // Map REST path to event type and dispatch via IPC
        const eventType = REST_TO_EVENT[path] ?? REPORT_PATH_TO_EVENT[path];
        if (eventType !== undefined) {
            return ipcRenderer.invoke('game:dispatch', eventType, 0, '');
        }
        console.warn('[api] No IPC mapping for POST', path);
    }
    const response = await fetchWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.text();
}

/**
 * Dispatches a POST request with a single "id" integer argument.
 * @param {string} path - REST endpoint path
 * @param {number} id - Entity ID or numeric parameter
 * @returns {Promise<any>} Parsed JSON response from backend
 */
export async function postIdArg(path, id) {
    if (useIPC) {
        // /asset_chart needs its own IPC handler (returns data, not just ack)
        if (path === '/asset_chart') {
            return ipcRenderer.invoke('game:getAssetChart', typeof id === 'string' ? Number(id) : id);
        }
        // /set_who_owns_filter uses a different param name
        if (path === '/set_who_owns_filter') {
            return ipcRenderer.invoke('game:setWhoOwnsFilter', id);
        }
        // /set_active_ui_report is a direct pointer write, not an event
        if (path === '/set_active_ui_report') {
            return ipcRenderer.invoke('game:setActiveUIReport', id);
        }

        const eventType = REST_TO_EVENT[path];
        if (eventType !== undefined) {
            return ipcRenderer.invoke('game:dispatch', eventType, id || 0, '');
        }
        console.warn('[api] No IPC mapping for POST', path, 'id=', id);
    }
    const response = await fetchWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
}

/**
 * Variant of postIdArg that optionally includes an acting-as entity override.
 * If actingAsId > 0, the backend switches context before executing the command.
 * @param {string} path - REST endpoint path
 * @param {number} id - Entity ID
 * @param {number} [actingAsId=0] - Entity to act as (0 for current view entity)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function postIdArgWithActingAs(path, id, actingAsId = 0) {
    if (useIPC) {
        const eventType = REST_TO_EVENT[path];
        if (eventType !== undefined) {
            return ipcRenderer.invoke('game:dispatch', eventType, id || 0, '', actingAsId || 0);
        }
        console.warn('[api] No IPC mapping for POST', path, 'id=', id);
    }
    const body = (actingAsId > 0) ? { id, intParam2: actingAsId } : { id };
    const response = await fetchWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
}

/**
 * Variant for options-trade endpoints (buy/sell calls/puts). Same shape as postIdArgWithActingAs, plus an optional `underlyingId`: when id=0 and underlyingId>0, the C++ bridge stashes it in strParam1 and PB uses it as TGT — skipping SelectCompanyModal$. Lets CLI "CALL ABC" resolve the symbol up front without colliding with IntParam1's ContractNum& semantics.
 * @param {any} path
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @param {number} [underlyingId=0]
 * @returns {Promise<any>}
 */
export async function postOptionsTradeWithActingAs(path, id, actingAsId = 0, underlyingId = 0) {
    if (useIPC) {
        const eventType = REST_TO_EVENT[path];
        if (eventType !== undefined) {
            const strParam1 = underlyingId > 0 ? String(underlyingId) : '';
            return ipcRenderer.invoke('game:dispatch', eventType, id || 0, strParam1, actingAsId || 0);
        }
        console.warn('[api] No IPC mapping for POST', path, 'id=', id);
    }
    const body = { id };
    if (actingAsId > 0) body.intParam2 = actingAsId;
    if (underlyingId > 0) body.underlyingId = underlyingId;
    const response = await fetchWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
}

/**
 * Post string arg
 * @param {any} path
 * @param {string} str
 * @returns {Promise<any>}
 */
export async function postStringArg(path, str) {
    if (useIPC) {
        // String-arg endpoints: map to event + strParam1
        if (path === '/load_specific_save') {
            // LOAD_SPECIFIC_GAME = 21, str goes in strParam1 as "filename"
            return ipcRenderer.invoke('game:dispatch', 21, 0, str || '');
        }
        if (path === '/savegameas') {
            // SAVE_GAME_AS = 41, filename in strParam1
            return ipcRenderer.invoke('game:dispatch', 41, 0, str || '');
        }
        console.warn('[api] No IPC mapping for POST string', path);
    }
    const response = await fetchWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ str })
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.text();
}

/**
 * Dispatches a GET request and returns the parsed JSON response.
 * @param {string} path - REST endpoint path
 * @returns {Promise<any>}
 */
export async function getJSON(path) {
    if (useIPC) {
        if (path === '/gamestate') return ipcRenderer.invoke('game:getGameState');
        if (path === '/database_data') return ipcRenderer.invoke('game:getDatabaseData');
        if (path === '/ownership_tree') return ipcRenderer.invoke('game:getOwnershipTree');
        if (path === '/subsidiaries_tree') return ipcRenderer.invoke('game:getSubsidiariesTree');
        if (path === '/quote') return ipcRenderer.invoke('game:getQuote');
        console.warn('[api] No IPC mapping for GET', path);
    }
    const response = await fetchWithRetry(path);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    return data;
}

/**
 * Fetch database search data.
 * @returns {Promise<any>}
 */
export async function getDatabaseData() {
    return getJSON('/database_data');
}

/**
 * Fetch ownership tree (who owns the active entity).
 * @returns {Promise<any>}
 */
export async function getOwnershipTree() {
    return getJSON('/ownership_tree');
}

/**
 * Fetch subsidiaries tree (what the active entity owns).
 * @returns {Promise<any>}
 */
export async function getSubsidiariesTree() {
    return getJSON('/subsidiaries_tree');
}

/**
 * Checks if an entity is controlled by the player.
 * @param {Array<object>} controlledCompanies - List of companies from gameState
 * @param {number} entityId - ID to check
 * @returns {boolean}
 */
export function isPlayerControlled(controlledCompanies, entityId) {
    return (controlledCompanies || []).some(c => c.id === entityId);
}

/**
 * Checks if the player is the CEO of a company.
 * @param {number} chairedCompanyId - player.chairedCompanyId from gameState
 * @param {number} entityId - ID to check
 * @returns {boolean}
 */
export function isPlayerCEO(chairedCompanyId, entityId) {
    return chairedCompanyId === entityId;
}

/**
 * Returns the company object for a given ticker symbol.
 * @param {Array<object>} allCompanies - List of companies from gameState
 * @param {string} symbol - Ticker symbol
 * @returns {object|undefined}
 */
export function getCompanyBySymbol(allCompanies, symbol) {
    return (allCompanies || []).find(c => c.symbol === symbol);
}

/**
 * Returns the industry object for a given industry ID.
 * @param {Array<object>} allIndustries - List of industries from gameState
 * @param {number} industryNum - Industry ID
 * @returns {object|undefined}
 */
export function getIndustry(allIndustries, industryNum) {
    return (allIndustries || []).find(ind => ind.id === industryNum);
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

let lookup = {};

// Memoization cache for buildDictRegex - avoids rebuilding on every 50ms poll
let _cachedRegex = null;
let _cachedFingerprint = '';

function _dictFingerprint(allCompanies, allIndustries) {
    // Fast fingerprint: count + first/last IDs. Lists only change on mergers/new companies.
    const cl = (allCompanies || []).length;
    const il = (allIndustries || []).length;
    const c0 = cl > 0 ? allCompanies[0].id : 0;
    const cN = cl > 0 ? allCompanies[cl - 1].id : 0;
    const i0 = il > 0 ? allIndustries[0].id : 0;
    const iN = il > 0 ? allIndustries[il - 1].id : 0;
    return `${cl}:${c0}:${cN}:${il}:${i0}:${iN}`;
}

/**
 * Build dict regex
 * @param {any} allCompanies
 * @param {string} allIndustries
 */
export function buildDictRegex(allCompanies, allIndustries) {
    // Return cached regex if the company/industry lists haven't changed
    const fp = _dictFingerprint(allCompanies, allIndustries);
    if (_cachedRegex && fp === _cachedFingerprint) {
        return _cachedRegex;
    }
    _cachedFingerprint = fp;

    lookup = Object.create(null); // key: lowercased token -> {id, type}

    // Companies: match by symbol (2+ chars only to avoid false hyperlinks) and name
    // BUG-027/082/103: Single-letter symbols (N, X, T, E, M, H, L) trigger on common words
    for (const c of allCompanies || []) {
        if (c.symbol && c.symbol.length >= 2) lookup[c.symbol] = { id: c.id, type: 'C' };
        if (c.name) lookup[c.name] = { id: c.id, type: 'C' };
    }

    // Industries: names can be multi-word, add common informal aliases (BUG-088)
    const INDUSTRY_ALIASES = {
        'BIOTECHNOLOGY': ['BioTech', 'Biotech', 'BIOTECH'],
        'MEDICAL EQUIP. / SUPPLIES': ['Medical Supplies', 'Medical Equipment'],
        'ENTERTAIN. & BROADCAST': ['Entertainment', 'Broadcasting'],
        'HOUSEHOLD & PERS. PRODS.': ['Household Products'],
        'INTERNET SERV. / CONTENT': ['Internet Services', 'Internet'],
        'NETWORK & TELECOM EQUIP.': ['Telecom Equipment'],
    };
    for (const ind of allIndustries || []) {
        if (ind.name) {
            lookup[ind.name] = { id: ind.id, type: 'I' };
            lookup[toTitleCase(ind.name)] = { id: ind.id, type: 'I' };
            lookup[toTitleCase(ind.name).toUpperCase()] = { id: ind.id, type: 'I' };
            // Add aliases for industry names that appear informally in game text
            const aliases = INDUSTRY_ALIASES[ind.name];
            if (aliases) {
                for (const alias of aliases) {
                    lookup[alias] = { id: ind.id, type: 'I' };
                }
            }
        }
    }

    const keys = Object.keys(lookup);

    const esc = keys.map(escapeRe).sort((a, b) => b.length - a.length);

    const singles = esc.filter(k => /^[A-Za-z]$/.test(k));
    const others = esc.filter(k => !singles.includes(k));

    const parts = [];
    if (others.length) parts.push(`(?:${others.join("|")})`);
    if (singles.length) parts.push(`(?:${singles.join("|")})(?!\\.(?=\\w))`);
    const core = `(?:${parts.join("|")})`;

    const parenWrapped = `(?<=\\()${core}(?=\\))`;
    const dblQuoted = `(?<=")${core}(?=")`;
    const sglQuotedBoth = `(?<=')${core}(?=')`;
    const bareEndSglOnly = `(?<!')(?<![A-Za-z0-9("'(])${core}(?=')`;
    const bareNoWrap = `(?<![A-Za-z0-9("'(])${core}(?![A-Za-z0-9)"'])`;

    const allowed = `(?:${parenWrapped}|${dblQuoted}|${sglQuotedBoth}|${bareEndSglOnly}|${bareNoWrap})`;

    const pattern =
        `(?<![./_])${allowed}(?![/$_])(?!-(?=[A-Za-z0-9]))(?!/(?=[A-Za-z0-9]))`;

    _cachedRegex = new RegExp(pattern, "g");
    return _cachedRegex;
}

function toTitleCase(str) {
    const exceptions = ['and', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'a', 'an', 'the'];
    return str
        .toLowerCase()
        .replaceAll("&", "and")
        .replace(/\b\w+/g, (w, i) =>
            exceptions.includes(w) && i !== 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)
        );
}

/**
 * Render hyperlinks
 * @param {any} headline
 * @param {any} onClick
 * @param {any} regex
 */
export function renderHyperlinks(headline, onClick, regex) {

    if ([
        "Operating Earnings",
        "LONG AND SHORT",
        "LONG POSITION",
        "SHORT POSITION",
        "Credit Rating",
        "SUBPRIME MORT.",
        "LONG BOND",
        "SHORT BOND",
        'AS "ACTIVE ENTITY"',
        "LONG PARTY",
        "NAME OF ENTITY WITH LONG",
        "SAVED AS"
    ].some(s => headline.includes(s))) return headline;

    headline = insertCurrencySymbols(headline);

    const parts = [];
    let lastIndex = 0;
    let m;

    regex.lastIndex = 0;
    while ((m = regex.exec(headline)) !== null) {
        const before = headline.slice(lastIndex, m.index);
        if (before) parts.push(before);

        const raw = m[0];
        const info = lookup[raw]; // {id, type}

        parts.push(html`
      <span
        class="text-blue-400 cursor-pointer hover:underline"
        onClick=${() => onClick({ id: info.id, type: info.type })}
      >${raw}</span>
    `);

        lastIndex = regex.lastIndex;
    }

    const after = headline.slice(lastIndex);
    if (after) parts.push(after);

    return html`${parts}`;
}

/* General */
/**
 * Get game state
 */
export function getGameState() { return getJSON('/gamestate'); }
/**
 * Clear event string
 * @returns {Promise<any>}
 */
export async function clearEventString() { await postNoArg('/clear_event_string'); }
/**
 * Start ticker
 * @returns {Promise<any>}
 */
export async function startTicker() {
    // Optimistically update UI immediately so ticker starts without waiting for backend round-trip
    localTickerRunning = true;
    gameStore.setState(state => ({
        gameState: { ...state.gameState, isTickerRunning: true }
    }));
    await postNoArg('/start_ticker');
}
/**
 * Run ticker
 * @returns {Promise<any>}
 */
export async function runTicker() { await postNoArg('/run_ticker'); }
/**
 * Stop ticker
 * @returns {Promise<any>}
 */
export async function stopTicker() {
    // Optimistically update UI immediately so ticker stops without waiting for backend round-trip
    localTickerRunning = false;
    gameStore.setState(state => ({
        gameState: { ...state.gameState, isTickerRunning: false }
    }));
    await postNoArg('/stop_ticker');
}
/**
 * Set tick speed
 * @param {any} speed
 * @returns {Promise<any>}
 */
export async function setTickSpeed(speed) { await postIdArg('/set_ticker_speed', speed); }
/**
 * Advance ticker
 * @returns {Promise<any>}
 */
export async function advanceTicker() {
    if (useIPC) return ipcRenderer.invoke('game:advanceTicker');
    return postNoArg('/ticker_advance');
}
/**
 * Load game
 * @returns {Promise<any>}
 */
export async function loadGame() {
    await postNoArg('/loadgame');
}
/**
 * New game
 * @returns {Promise<any>}
 */
export async function newGame() {
    await postNoArg('/newgame');
}
/**
 * Save game
 * @returns {Promise<any>}
 */
export async function saveGame() { await postNoArg('/savegame'); }
/**
 * Save game as
 * @param {string} filename
 * @returns {Promise<any>}
 */
export async function saveGameAs(filename) {
    if (useIPC) {
        // SAVE_GAME_AS = 41, filename in strParam1
        return ipcRenderer.invoke('game:dispatch', 41, 0, filename || '');
    }
    await fetchWithRetry('/savegameas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    });
}

/**
 * List available save files (via IPC to main process)
 * @returns {Promise<any>}
 */
export async function listSaves() {
    return ipcRenderer.invoke('list-saves');
}

/**
 * Delete a save file (via IPC to main process)
 * @param {string} filename
 * @returns {Promise<any>}
 */
export async function deleteSave(filename) {
    return ipcRenderer.invoke('delete-save', filename);
}

/**
 * Load a specific save file by triggering the backend load event
 * @param {string} filename
 * @returns {Promise<any>}
 */
export async function loadSpecificSave(filename) {
    if (useIPC) {
        // LOAD_SPECIFIC_GAME = 21, filename in strParam1
        return ipcRenderer.invoke('game:dispatch', 21, 0, filename || '');
    }
    // First set the filename, then trigger load
    await fetchWithRetry('/load_specific_save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    });
}

/**
 * Validate Windows filename (no invalid characters)
 * @param {string} filename
 */
export function isValidWindowsFilename(filename) {
    if (!filename || filename.length === 0) return false;
    // Invalid Windows filename characters: \ / : * ? " < > |
    const invalidChars = /[\\/:*?"<>|]/;
    return !invalidChars.test(filename);
}
/**
 * Exit game
 * @returns {Promise<any>}
 */
export async function exitGame() {
    // Just send the exit_game request - WSR will show save dialog,
    // and if user confirms, WSR will exit and Electron will restart it automatically
    await postNoArg('/exit_game');
}
/**
 * Exit to desktop
 * @returns {Promise<any>}
 */
export async function exitToDesktop() {
    gameStore.setState(state => ({
        gameState: { ...state.gameState, isLoading: true }
    }));
    ipcRenderer.send('exit-to-desktop');
}

// Listen for wsr.exe restarting - show loading state
ipcRenderer.on('wsr-restarting', () => {
    console.log('wsr.exe exited, restarting...');
    gameStore.setState(state => ({
        gameState: { ...state.gameState, isLoading: true }
    }));
});

// Listen for wsr.exe restart completion - reset game state to show main menu.
// Preserve splashScreenPlayed across restart so the splash overlay doesn't briefly
// flash when the previous value (true) is wiped to undefined and the selector
// evaluates !undefined === true before the new gameState broadcast arrives.
ipcRenderer.on('wsr-restarted', () => {
    console.log('wsr.exe restarted, returning to main menu...');
    gameStore.setState(state => ({
        gameState: {
            gameLoaded: false,
            isLoading: false,
            splashScreenPlayed: state.gameState?.splashScreenPlayed,
        },
    }));
});
/**
 * Check scoreboard
 * @returns {Promise<any>}
 */
export async function checkScoreboard() { await postNoArg('/check_scoreboard'); }
/**
 * Get quote of the day
 * @returns {Promise<any>}
 */
export async function getQuoteOfTheDay() { return getJSON('/quote'); }
/**
 * Set active u i report
 * @param {number} uiId
 * @returns {Promise<any>}
 */
export async function setActiveUIReport(uiId) { await postIdArg('/set_active_ui_report', uiId); }

/**
 * Get asset chart
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function getAssetChart(id) {
    // Some Jenkins builds don't return chart history until later (e.g., after Q2 starts).
    // The UI should still render charts early in the game, so we provide a bounded
    // fallback: a flat series based on the latest known value.
    const buildFallback = () => {
        const gs = gameStore.getState?.().gameState || {};
        const month = Number.isFinite(gs.currentMonth) ? gs.currentMonth : 0;
        const year = Number.isFinite(gs.currentYear) ? gs.currentYear : 0;

        const idNum = (typeof id === 'string') ? Number(id) : id;
        let v = null;

        // Player / human net worth chart.
        if (idNum === HUMAN1_ID) v = gs.netWorth;
        // Macro charts (best-effort).
        else if (idNum === GNP_RATE_ID) v = gs.gnpRate ?? gs.gdpRate ?? gs.gdp;
        else if (idNum === PRIME_RATE_ID) v = gs.primeRate;

        // Stocks shown in Streaming Quotes.
        if (v == null) {
            const sq = Array.isArray(gs.streamingQuotesList) ? gs.streamingQuotesList : [];
            const hit = sq.find(q => Number(q?.id) === idNum);
            if (hit && Number.isFinite(hit.price)) v = hit.price;
        }

        // Last resort: 0 so chart can still paint.
        if (!Number.isFinite(v)) v = 0;

        return {
            prices: [v, v, v, v, v, v],
            highs: [],
            lows: [],
            baseMonth: month,
            baseYear: year,
        };
    };

    try {
        const data = await postIdArg('/asset_chart', id);
        if (data && Array.isArray(data.prices) && data.prices.length >= 3) {
            // Filter out leading zeros — matching PB's charTEST.inc behavior.
            // Zero values compress the chart scale, making it look like only
            // the current price is shown.
            const firstNonZero = data.prices.findIndex(p => p !== 0);
            if (firstNonZero > 0) {
                const fillValue = data.prices[firstNonZero];
                for (let i = 0; i < firstNonZero; i++) {
                    data.prices[i] = fillValue;
                }
            }
            if (!Array.isArray(data.highs)) data.highs = [];
            if (!Array.isArray(data.lows)) data.lows = [];
            return data;
        }
        return buildFallback();
    } catch (e) {
        console.error(e);
        return buildFallback();
    }
}

/* Trading Center - Stocks */
/**
 * Buy stock
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyStock(id, actingAsId = 0) {
    console.log('[Tutorial] buyStock called with id:', id);
    await postIdArgWithActingAs('/buy_stock', id, actingAsId);
}
/**
 * Sell stock
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellStock(id, actingAsId = 0) { await postIdArgWithActingAs('/sell_stock', id, actingAsId); }
/**
 * Short stock
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function shortStock(id, actingAsId = 0) { await postIdArgWithActingAs('/short_stock', id, actingAsId); }
/**
 * Cover short stock
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function coverShortStock(id, actingAsId = 0) { await postIdArgWithActingAs('/cover_short_stock', id, actingAsId); }

/* Bonds */
/**
 * Buy corporate bond
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyCorporateBond(id, actingAsId = 0) { await postIdArgWithActingAs('/buy_corporate_bond', id, actingAsId); }
/**
 * Sell corporate bond
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellCorporateBond(id, actingAsId = 0) { await postIdArgWithActingAs('/sell_corporate_bond', id, actingAsId); }
/**
 * Buy long govt bonds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyLongGovtBonds(actingAsId = 0) { await postIdArgWithActingAs('/buy_long_govt_bonds', 0, actingAsId); }
/**
 * Sell long govt bonds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellLongGovtBonds(actingAsId = 0) { await postIdArgWithActingAs('/sell_long_govt_bonds', 0, actingAsId); }
/**
 * Buy short govt bonds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyShortGovtBonds(actingAsId = 0) { await postIdArgWithActingAs('/buy_short_govt_bonds', 0, actingAsId); }
/**
 * Sell short govt bonds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellShortGovtBonds(actingAsId = 0) { await postIdArgWithActingAs('/sell_short_govt_bonds', 0, actingAsId); }

/* Commodity Futures */
/**
 * Buy commodity futures
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyCommodityFutures(id, actingAsId = 0) { await postIdArgWithActingAs('/buy_commodity_futures', id, actingAsId); }
/**
 * Sell commodity futures
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellCommodityFutures(id, actingAsId = 0) { await postIdArgWithActingAs('/sell_commodity_futures', id, actingAsId); }
/**
 * Close long commodity futures by slot
 * @param {any} slot
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function closeLongCommodityFuturesBySlot(slot, actingAsId = 0) { await postIdArgWithActingAs('/close_long_commodity_futures_by_slot', slot, actingAsId); }
/**
 * Short commodity futures
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function shortCommodityFutures(id, actingAsId = 0) { await postIdArgWithActingAs('/short_commodity_futures', id, actingAsId); }
/**
 * Cover short commodity futures
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function coverShortCommodityFutures(id, actingAsId = 0) { await postIdArgWithActingAs('/cover_short_commodity_futures', id, actingAsId); }
/**
 * Cover short commodity futures by slot
 * @param {any} slot
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function coverShortCommodityFuturesBySlot(slot, actingAsId = 0) { await postIdArgWithActingAs('/cover_short_commodity_futures_by_slot', slot, actingAsId); }

/* Physical Commodities */
/**
 * Buy physical commodity
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyPhysicalCommodity(id, actingAsId = 0) { await postIdArgWithActingAs('/buy_physical_commodity', id, actingAsId); }
/**
 * Sell physical commodity
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellPhysicalCommodity(id, actingAsId = 0) { await postIdArgWithActingAs('/sell_physical_commodity', id, actingAsId); }

/* Crypto */
/**
 * Buy physical crypto
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyPhysicalCrypto(id, actingAsId = 0) { await postIdArgWithActingAs('/buy_physical_crypto', id, actingAsId); }
/**
 * Sell physical crypto
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function sellPhysicalCrypto(id) { await postIdArg('/sell_physical_crypto', id); }
/**
 * Buy crypto futures
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyCryptoFutures(id, actingAsId = 0) { await postIdArgWithActingAs('/buy_crypto_futures', id, actingAsId); }
/**
 * Sell crypto futures
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellCryptoFutures(id, actingAsId = 0) { await postIdArgWithActingAs('/sell_crypto_futures', id, actingAsId); }

/* Options */
/**
 * Buy calls
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @param {number} [underlyingId=0]
 * @returns {Promise<any>}
 */
export async function buyCalls(id, actingAsId = 0, underlyingId = 0) { await postOptionsTradeWithActingAs('/buy_calls', id, actingAsId, underlyingId); }
/**
 * Sell calls
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @param {number} [underlyingId=0]
 * @returns {Promise<any>}
 */
export async function sellCalls(id, actingAsId = 0, underlyingId = 0) { await postOptionsTradeWithActingAs('/sell_calls', id, actingAsId, underlyingId); }
/**
 * Buy puts
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @param {number} [underlyingId=0]
 * @returns {Promise<any>}
 */
export async function buyPuts(id, actingAsId = 0, underlyingId = 0) { await postOptionsTradeWithActingAs('/buy_puts', id, actingAsId, underlyingId); }
/**
 * Sell puts
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @param {number} [underlyingId=0]
 * @returns {Promise<any>}
 */
export async function sellPuts(id, actingAsId = 0, underlyingId = 0) { await postOptionsTradeWithActingAs('/sell_puts', id, actingAsId, underlyingId); }
/**
 * Advanced options trading
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function advancedOptionsTrading(actingAsId = 0) { await postIdArgWithActingAs('/advanced_options_trading', 0, actingAsId); }
/**
 * Exercise call options early
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function exerciseCallOptionsEarly(id, actingAsId = 0) { await postIdArgWithActingAs('/exercise_call_options_early', id, actingAsId); }
/**
 * Exercise put options early
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function exercisePutOptionsEarly(id, actingAsId = 0) { await postIdArgWithActingAs('/exercise_put_options_early', id, actingAsId); }

/* Management */
/**
 * Prepay taxes
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function prepayTaxes(actingAsId = 0) { await postIdArgWithActingAs('/prepay_taxes', 0, actingAsId); }
/**
 * Elect ceo
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function electCeo(actingAsId = 0) { await postIdArgWithActingAs('/elect_ceo', 0, actingAsId); }
/**
 * Resign as ceo
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function resignAsCeo(actingAsId = 0) { await postIdArgWithActingAs('/resign_as_ceo', 0, actingAsId); }
/**
 * Change managers
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function changeManagers(actingAsId = 0) { await postIdArgWithActingAs('/change_managers', 0, actingAsId); }
/**
 * Set dividend
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function setDividend(actingAsId = 0) { await postIdArgWithActingAs('/set_dividend', 0, actingAsId); }
/**
 * Set productivity
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function setProductivity(actingAsId = 0) { await postIdArgWithActingAs('/set_productivity', 0, actingAsId); }
/**
 * Set growth rate
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function setGrowthRate(actingAsId = 0) { await postIdArgWithActingAs('/set_growth_rate', 0, actingAsId); }
/**
 * Restructure
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function restructure(actingAsId = 0) { await postIdArgWithActingAs('/restructure', 0, actingAsId); }
/**
 * Buy corporate assets
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyCorporateAssets(actingAsId = 0) { await postIdArgWithActingAs('/buy_corporate_assets', 0, actingAsId); }
/**
 * Sell corporate assets
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellCorporateAssets(actingAsId = 0) { await postIdArgWithActingAs('/sell_corporate_assets', 0, actingAsId); }
/**
 * View for sale items
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function viewForSaleItems(actingAsId = 0) { await postIdArgWithActingAs('/view_for_sale_items', 0, actingAsId); }
/**
 * Sell subsidiary stock
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellSubsidiaryStock(id, actingAsId = 0) { await postIdArgWithActingAs('/sell_subsidiary_stock', id, actingAsId); }
/**
 * Rebrand
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function rebrand(actingAsId = 0) { await postIdArgWithActingAs('/rebrand', 0, actingAsId); }
/**
 * Toggle company autopilot
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function toggleCompanyAutopilot(id) { await postIdArg('/toggle_company_autopilot', id); }
/**
 * Toggle global autopilot
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function toggleGlobalAutopilot(actingAsId = 0) { await postIdArgWithActingAs('/toggle_global_autopilot', 0, actingAsId); }
/**
 * Become etf advisor
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function becomeEtfAdvisor(actingAsId = 0) { await postIdArgWithActingAs('/become_etf_advisor', 0, actingAsId); }
/**
 * Set advisory fee
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function setAdvisoryFee(actingAsId = 0) { await postIdArgWithActingAs('/set_advisory_fee', 0, actingAsId); }

/* Deals & Funding */
/**
 * Merger
 * @param {number} [targetId=0]
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function merger(targetId = 0, actingAsId = 0) { await postIdArgWithActingAs('/merger', targetId, actingAsId); }
/**
 * Greenmail
 * @param {number} [targetId=0]
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function greenmail(targetId = 0, actingAsId = 0) { await postIdArgWithActingAs('/greenmail', targetId, actingAsId); }
/**
 * Lbo
 * @param {number} [targetId=0]
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function lbo(targetId = 0, actingAsId = 0) { await postIdArgWithActingAs('/lbo', targetId, actingAsId); }
/**
 * Startup
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function startup(actingAsId = 0) { await postIdArgWithActingAs('/startup', 0, actingAsId); }
/**
 * Capital contribution
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function capitalContribution(actingAsId = 0) { await postIdArgWithActingAs('/capital_contribution', 0, actingAsId); }
/**
 * Public stock offering
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function publicStockOffering(actingAsId = 0) { await postIdArgWithActingAs('/public_stock_offering', 0, actingAsId); }
/**
 * Private stock offering
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function privateStockOffering(actingAsId = 0) { await postIdArgWithActingAs('/private_stock_offering', 0, actingAsId); }
/**
 * Issue new corp bonds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function issueNewCorpBonds(actingAsId = 0) { await postIdArgWithActingAs('/issue_new_corp_bonds', 0, actingAsId); }
/**
 * Redeem corp bonds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function redeemCorpBonds(actingAsId = 0) { await postIdArgWithActingAs('/redeem_corp_bonds', 0, actingAsId); }
/**
 * Extraordinary dividend
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function extraordinaryDividend(actingAsId = 0) { await postIdArgWithActingAs('/extraordinary_dividend', 0, actingAsId); }
/**
 * Tax free liquidation
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function taxFreeLiquidation(actingAsId = 0) { await postIdArgWithActingAs('/tax_free_liquidation', 0, actingAsId); }
/**
 * Taxable liquidation
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function taxableLiquidation(actingAsId = 0) { await postIdArgWithActingAs('/taxable_liquidation', 0, actingAsId); }
/**
 * Spin off
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function spinOff(id) { await postIdArg('/spin_off', id); }
/**
 * Split stock
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function splitStock(actingAsId = 0) { await postIdArgWithActingAs('/split_stock', 0, actingAsId); }
/**
 * Reverse split stock
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function reverseSplitStock(actingAsId = 0) { await postIdArgWithActingAs('/reverse_split_stock', 0, actingAsId); }

/* Lender Services */
/**
 * Borrow money
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function borrowMoney(actingAsId = 0) { await postIdArgWithActingAs('/borrow_money', 0, actingAsId); }
/**
 * Repay loan
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function repayLoan(actingAsId = 0) { await postIdArgWithActingAs('/repay_loan', 0, actingAsId); }
/**
 * Advance funds
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function advanceFunds(actingAsId = 0) { await postIdArgWithActingAs('/advance_funds', 0, actingAsId); }
/**
 * Call in advance
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function callInAdvance(id) { await postIdArg('/call_in_advance', id); }
/**
 * Interest rate swaps
 * @param {number} [assetId=0]
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function interestRateSwaps(assetId = 0, actingAsId = 0) { await postIdArgWithActingAs('/interest_rate_swaps', assetId, actingAsId); }
/**
 * View swap details
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function viewSwapDetails(id, actingAsId = 0) { await postIdArgWithActingAs('/view_swap_details', id, actingAsId); }
/**
 * Terminate swap
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function terminateSwap(id, actingAsId = 0) { await postIdArgWithActingAs('/terminate_swap', id, actingAsId); }

/* Bank/Insurance Specific */
/**
 * Set bank allocation
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function setBankAllocation(actingAsId = 0) { await postIdArgWithActingAs('/set_bank_allocation', 0, actingAsId); }
/**
 * Trade tbills
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function tradeTbills(actingAsId = 0) { await postIdArgWithActingAs('/trade_tbills', 0, actingAsId); }
/**
 * List bank loans
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function listBankLoans(actingAsId = 0) { await postIdArgWithActingAs('/list_bank_loans', 0, actingAsId); }
/**
 * Change bank
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function changeBank(actingAsId = 0) { await postIdArgWithActingAs('/change_bank', 0, actingAsId); }
/**
 * Call in loan
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function callInLoan(id) { await postIdArg('/call_in_loan', id); }
/**
 * Buy bank loans
 * @returns {Promise<any>}
 */
export async function buyBankLoans() { await postNoArg('/buy_bank_loans'); }
/**
 * Buy business loans
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyBusinessLoans(actingAsId = 0) { await postIdArgWithActingAs('/buy_business_loans', 0, actingAsId); }
/**
 * Sell business loan
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function sellBusinessLoan(id) { await postIdArg('/sell_business_loan', id); }
/**
 * Buy consumer loans
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyConsumerLoans(actingAsId = 0) { await postIdArgWithActingAs('/buy_consumer_loans', 0, actingAsId); }
/**
 * Sell consumer loans
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellConsumerLoans(actingAsId = 0) { await postIdArgWithActingAs('/sell_consumer_loans', 0, actingAsId); }
/**
 * Buy prime mortgages
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buyPrimeMortgages(actingAsId = 0) { await postIdArgWithActingAs('/buy_prime_mortgages', 0, actingAsId); }
/**
 * Sell prime mortgages
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellPrimeMortgages(actingAsId = 0) { await postIdArgWithActingAs('/sell_prime_mortgages', 0, actingAsId); }
/**
 * Buy subprime mortgages
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function buySubprimeMortgages(actingAsId = 0) { await postIdArgWithActingAs('/buy_subprime_mortgages', 0, actingAsId); }
/**
 * Sell subprime mortgages
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function sellSubprimeMortgages(actingAsId = 0) { await postIdArgWithActingAs('/sell_subprime_mortgages', 0, actingAsId); }
/**
 * List etfs
 * @returns {Promise<any>}
 */
export async function listEtfs() { await postNoArg('/list_etfs'); }
/**
 * Freeze all loans
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function freezeAllLoans(actingAsId = 0) { await postIdArgWithActingAs('/freeze_all_loans', 0, actingAsId); }
/**
 * Freeze loan
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function freezeLoan(id) { await postIdArg('/freeze_loan', id); }

/* Accounting */
/**
 * Decrease earnings
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function decreaseEarnings(actingAsId = 0) { await postIdArgWithActingAs('/decrease_earnings', 0, actingAsId); }
/**
 * Increase earnings
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function increaseEarnings(actingAsId = 0) { await postIdArgWithActingAs('/increase_earnings', 0, actingAsId); }

/* Legal */
/**
 * Change law firm
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function changeLawFirm(actingAsId = 0) { await postIdArgWithActingAs('/change_law_firm', 0, actingAsId); }
/**
 * Credit info
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function creditInfo(actingAsId = 0) { await postIdArgWithActingAs('/credit_info', 0, actingAsId); }
/**
 * Clear chart
 * @returns {Promise<any>}
 */
export async function clearChart() { await postNoArg('/clear_chart'); }
/**
 * Growth throttle
 * @returns {Promise<any>}
 */
export async function growthThrottle() { await postNoArg('/growth_throttle'); }
/**
 * Clear stream list
 * @returns {Promise<any>}
 */
export async function clearStreamList() { await postNoArg('/clear_stream_list'); }
/**
 * Fill stream list
 * @returns {Promise<any>}
 */
export async function fillStreamList() { await postNoArg('/fill_stream_list'); }
/**
 * Set who owns filter
 * @param {any} value
 * @returns {Promise<any>}
 */
export async function setWhoOwnsFilter(value) {
    await fetchWithRetry('/set_who_owns_filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
    });
}
/**
 * Antitrust lawsuit
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function antitrustLawsuit(id, actingAsId = 0) { await postIdArgWithActingAs('/antitrust_lawsuit', id, actingAsId); }

/**
 * Harrassing lawsuit
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function harrassingLawsuit(id, actingAsId = 0) { await postIdArgWithActingAs('/harrassing_lawsuit', id, actingAsId); }
/**
 * Spread rumors
 * @param {number} id
 * @param {number} [actingAsId=0]
 * @returns {Promise<any>}
 */
export async function spreadRumors(id, actingAsId = 0) { await postIdArgWithActingAs('/spread_rumors', id, actingAsId); }

/**
 * Menu/Settings
 * @returns {Promise<any>}
 */
export async function suppEarnSelect() { await postNoArg('/supp_earn_select'); }
/**
 * Currency select
 * @returns {Promise<any>}
 */
export async function currencySelect() { await postNoArg('/currency_select'); }
/**
 * Supp warn select
 * @returns {Promise<any>}
 */
export async function suppWarnSelect() { await postNoArg('/supp_warn_select'); }
/**
 * Suppress select
 * @returns {Promise<any>}
 */
export async function suppressSelect() { await postNoArg('/suppress_select'); }
/**
 * Autosave select
 * @returns {Promise<any>}
 */
export async function autosaveSelect() { await postNoArg('/autosave_select'); }
/**
 * Exercise select
 * @returns {Promise<any>}
 */
export async function exerciseSelect() { await postNoArg('/exercise_select'); }
/**
 * Sweep select
 * @returns {Promise<any>}
 */
export async function sweepSelect() { await postNoArg('/sweep_select'); }
/**
 * Makedelivery select
 * @returns {Promise<any>}
 */
export async function makedeliverySelect() { await postNoArg('/makedelivery_select'); }
/**
 * Takedelivery select
 * @returns {Promise<any>}
 */
export async function takedeliverySelect() { await postNoArg('/takedelivery_select'); }
/**
 * Tooltips select
 * @returns {Promise<any>}
 */
export async function tooltipsSelect() { await postNoArg('/tooltips_select'); }
/**
 * Shareholder graph select
 * @returns {Promise<any>}
 */
export async function shareholderGraphSelect() { await postNoArg('/shareholdergraph_select'); }
/**
 * Unethical select
 * @returns {Promise<any>}
 */
export async function unethicalSelect() { await postNoArg('/unethical_select'); }
/**
 * Disable hotkeys select
 * @returns {Promise<any>}
 */
export async function disableHotkeysSelect() { await postNoArg('/disablehotkeys_select'); }
/**
 * Auto add select
 * @returns {Promise<any>}
 */
export async function autoAddSelect() { await postNoArg('/autoadd_select'); }

/**
 * Per-machine UI prefs (PB persists to CFIG.WSR via WriteConfig)
 * @param {any} typeInt
 * @returns {Promise<any>}
 */
export async function setChartType(typeInt) { await postIdArg('/set_chart_type', typeInt); }
/**
 * Set locale
 * @param {any} localeCode
 * @returns {Promise<any>}
 */
export async function setLocale(localeCode) {
    if (useIPC) {
        return ipcRenderer.invoke('game:dispatch', REST_TO_EVENT['/set_locale'], 0, localeCode);
    }
    const response = await fetchWithRetry('/set_locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ str: localeCode })
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return response.text();
}

/**
 * Cheat Menu
 * @returns {Promise<any>}
 */
export async function cheatDisableLawsuits() { await postNoArg('/cheat_disable_lawsuits'); }
/**
 * Cheat merger info
 * @returns {Promise<any>}
 */
export async function cheatMergerInfo() { await postNoArg('/cheat_merger_info'); }
/**
 * Cheat earnings info
 * @returns {Promise<any>}
 */
export async function cheatEarningsInfo() { await postNoArg('/cheat_earnings_info'); }
/**
 * Cheat add cash
 * @returns {Promise<any>}
 */
export async function cheatAddCash() { await postNoArg('/cheat_add_cash'); }

/**
 * Fullscreen toggle (Electron if available, otherwise browser fullscreen API)
 */
export function toggleFullscreen() {
    try {
        // Electron preload bridge (if the host provides it)
        if (window?.electron?.toggleFullscreen) {
            return window.electron.toggleFullscreen();
        }
        if (window?.electron?.setFullscreen) {
            // Some builds expose a setter that toggles internally
            return window.electron.setFullscreen();
        }

        // Browser fallback
        if (!document.fullscreenElement) {
            return document.documentElement.requestFullscreen?.();
        }
        return document.exitFullscreen?.();
    } catch (e) {
        console.error('toggleFullscreen failed', e);
        // Re-throw so Toolbar.safe() can show a user message
        throw e;
    }
}

/* Market Reports */
/**
 * View current interest rates
 * @returns {Promise<any>}
 */
export async function viewCurrentInterestRates() { await postNoArg('/view_current_interest_rates'); }
/**
 * Whos ahead
 * @returns {Promise<any>}
 */
export async function whosAhead() { await postNoArg('/whos_ahead'); }
/**
 * Db research tool
 * @returns {Promise<any>}
 */
export async function dbResearchTool() { await postNoArg('/db_research_tool'); }
/**
 * Economic stats
 * @returns {Promise<any>}
 */
export async function economicStats() { await postNoArg('/economic_stats'); }
/**
 * Most cash report
 * @returns {Promise<any>}
 */
export async function mostCashReport() { await postNoArg('/most_cash_report'); }
/**
 * Largest market cap
 * @returns {Promise<any>}
 */
export async function largestMarketCap() { await postNoArg('/largest_market_cap'); }
/**
 * Largest tax losses
 * @returns {Promise<any>}
 */
export async function largestTaxLosses() { await postNoArg('/largest_tax_losses'); }
/**
 * Industry summary
 * @returns {Promise<any>}
 */
export async function industrySummary() { await postNoArg('/industry_summary'); }
/**
 * Industry projections
 * @returns {Promise<any>}
 */
export async function industryProjections() { await postNoArg('/industry_projections'); }
/**
 * View corp assets for sale
 * @returns {Promise<any>}
 */
export async function viewCorpAssetsForSale() { await postNoArg('/view_corp_assets_for_sale'); }


/*
 * Navigation is now managed in C++ (GameState.h).
 * navHistory + navPointerIndex come from gameState polling.
 * Back/forward/goto are POST calls to C++ endpoints.
 */

/**
 * Splash screen played
 * @returns {Promise<any>}
 */
export async function splashScreenPlayed() { await postNoArg('/splash_screen_played'); }

/* Modal */
/**
 * Close modal
 * @param {any} result
 * @returns {Promise<any>}
 */
export async function closeModal(result) { await postNoArg('/close_modal', result); }
/**
 * Modal result
 * @param {any} result
 * @returns {Promise<any>}
 */
export async function modalResult(result) {
    if (useIPC) {
        if (typeof result === 'number') {
            return ipcRenderer.invoke('game:modalResult', result, '');
        } else {
            return ipcRenderer.invoke('game:modalResult', 0, result || '');
        }
    }
    const response = await fetchWithRetry('/modal_result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof result === 'number' ? JSON.stringify({ answer: result }) : JSON.stringify({ str: result })
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.text();
}

/* CustomData API */
/**
 * Set custom data
 * @param {any} blob
 * @returns {Promise<any>}
 */
export async function setCustomData(blob) {
    if (useIPC) {
        return ipcRenderer.invoke('game:setCustomData', JSON.stringify(blob));
    }
    const response = await fetchWithRetry('/set_custom_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blob)
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.text();
}

/* Price Alerts API — bridge to PB alerts.inc via events 4102/4103/4104 */
/**
 * Show price alerts
 * @returns {Promise<any>}
 */
export async function showPriceAlerts() { await postNoArg('/show_price_alerts'); }

/**
 * Create price alert
 * @param {number} entityId
 * @param {any} direction
 * @param {any} targetPrice
 * @returns {Promise<any>}
 */
export async function createPriceAlert(entityId, direction, targetPrice) {
    const str = `${entityId}|${direction}|${targetPrice}`;
    const response = await fetchWithRetry('/create_price_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ str })
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.text();
}

/**
 * Delete price alert
 * @param {any} slot
 * @returns {Promise<any>}
 */
export async function deletePriceAlert(slot) {
    const response = await fetchWithRetry('/delete_price_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot })
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.text();
}

/* Ticker optimistic state */
// Track locally set ticker running state - preserve until backend catches up
let localTickerRunning = null; // null means use backend value

/* Tutorial API */
// Track locally set tutorial values - preserve until backend catches up
let localTutorialStep = null; // null means use backend value
let localTutorialEnabled = null; // null means use backend value

/**
 * Set tutorial step
 * @param {any} step
 * @returns {Promise<any>}
 */
export async function setTutorialStep(step) {
    // Optimistically update the local state immediately
    const state = gameStore.getState();
    state.setGameState({ ...state.gameState, tutorialStep: step });
    localTutorialStep = step; // Track expected value
    return postIdArg('/set_tutorial_step', step);
}

/**
 * Set tutorial enabled
 * @param {any} enabled
 * @returns {Promise<any>}
 */
export async function setTutorialEnabled(enabled) {
    // Optimistically update the local state immediately
    const state = gameStore.getState();
    const value = enabled ? 1 : 0;
    state.setGameState({ ...state.gameState, tutorialEnabled: value });
    localTutorialEnabled = value; // Track expected value
    return postIdArg('/set_tutorial_enabled', value);
}

/**
 * Merge new game state from polling, preserving local tutorial changes until backend catches up
 * @param {any} newState
 */
export function mergeGameState(newState) {
    const state = gameStore.getState();
    const currentState = state.gameState || {};

    // For tutorialStep: keep local value until backend matches or exceeds it
    if (localTutorialStep !== null) {
        if (newState.tutorialStep >= localTutorialStep) {
            // Backend caught up, clear local override
            localTutorialStep = null;
        } else {
            // Backend hasn't caught up, use local value
            newState.tutorialStep = currentState.tutorialStep;
        }
    }

    // For tutorialEnabled: keep local value until backend matches
    if (localTutorialEnabled !== null) {
        if (newState.tutorialEnabled === localTutorialEnabled) {
            // Backend caught up, clear local override
            localTutorialEnabled = null;
        } else {
            // Backend hasn't caught up, use local value
            newState.tutorialEnabled = currentState.tutorialEnabled;
        }
    }

    // For isTickerRunning: keep local value until backend matches
    if (localTickerRunning !== null) {
        if (newState.isTickerRunning === localTickerRunning) {
            // Backend caught up, clear local override
            localTickerRunning = null;
        } else {
            // Backend hasn't caught up, use local value
            newState.isTickerRunning = currentState.isTickerRunning;
        }
    }

    // Preserve UI-only preferred tab overrides — the backend doesn't know about these
    // fields, so polling would otherwise overwrite them with undefined before the view
    // components can consume them. Under Phase 2 these fields continuously reflect the
    // active tab in each top-level view (PlayerView, IndustrialView, IndustryView
    // drilldown, market overview), so dropping them would also break hint matching.
    if (currentState.uiPreferredCompanyTab && !newState.uiPreferredCompanyTab) {
        newState.uiPreferredCompanyTab = currentState.uiPreferredCompanyTab;
    }
    if (currentState.uiPreferredPlayerTab && !newState.uiPreferredPlayerTab) {
        newState.uiPreferredPlayerTab = currentState.uiPreferredPlayerTab;
    }
    if (currentState.uiPreferredIndustryTab && !newState.uiPreferredIndustryTab) {
        newState.uiPreferredIndustryTab = currentState.uiPreferredIndustryTab;
    }
    if (currentState.uiPreferredMarketTab && !newState.uiPreferredMarketTab) {
        newState.uiPreferredMarketTab = currentState.uiPreferredMarketTab;
    }

    // BUG-105 FIX: Reuse old references when contents haven't changed.
    // This prevents unnecessary re-renders of report/list components every poll cycle.
    for (const key of Object.keys(newState)) {
        const prev = currentState[key];
        const next = newState[key];
        if (Array.isArray(prev) && Array.isArray(next)) {
            if (prev.length === next.length) {
                let same = true;
                for (let i = 0; i < prev.length; i++) {
                    if (prev[i] !== next[i]) { same = false; break; }
                }
                if (same) newState[key] = prev;
            }
        } else if (typeof prev === 'string' && typeof next === 'string' && prev === next) {
            // String dedup: reuse old reference when value hasn't changed
            // Prevents flicker in AdvisorySummary and other text components
            newState[key] = prev;
        }
    }

    return newState;
}

/**
 * Serialize
 * @param {any} obj
 */
export function serialize(obj) {
    return Object.entries(obj).map(([key, value]) => `${key}=${value}`).join('|');
}

// Navigation — C++ handles history tracking in set_view_asset/set_view_industry/change_acting_as

/**
 * View industry
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function viewIndustry(id) {
    await postIdArg('/set_view_industry', id);
}

/**
 * View db search
 * @returns {Promise<any>}
 */
export async function viewDbSearch() {
    await postIdArg('/set_view_industry', -2);
    await postIdArg('/set_active_ui_report', UI_DB_SEARCH);
}

/**
 * Open market heat map
 * @returns {Promise<any>}
 */
export async function openMarketHeatMap() {
    const state = gameStore.getState();
    const gs = state.gameState || {};
    const industryId = (typeof gs.activeIndustryNum === 'number' && gs.activeIndustryNum >= 0)
        ? gs.activeIndustryNum
        : 0;
    state.setGameState({ ...gs, uiPreferredIndustryTab: 'Heat Maps' });
    await viewIndustry(industryId);
    await setActiveUIReport(UI_MARKET_HEATMAP);
}

/**
 * Set view asset
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function setViewAsset(id) {
    // Optimistically update activeEntityNum so components reading from the store
    // during the 50ms polling gap don't compute actAs against the previous entity.
    gameStore.setState(state => ({
        gameState: { ...state.gameState, activeEntityNum: id }
    }));
    await postIdArg('/set_view_asset', id);
}

/**
 * Like setViewAsset but also sets a preferred tab so the destination view opens on the correct tab (e.g. "Stocks & Bonds" when drilling from Holdings). preferredTab is a string matching the tab label in IndustrialView / PlayerView. NOTE: the preferred tab is set AFTER the navigation REST call completes so that it lands in a separate render cycle and doesn't cause a simultaneous activeEntityNum + preferredTab state change, which previously caused rapid mount/unmount of heavy components (Holdings ↔ target tab) and an Oilpan OOM crash.
 * @param {number} id
 * @param {any} preferredTab
 * @returns {Promise<any>}
 */
export async function setViewAssetWithTab(id, preferredTab) {
    const isPlayer = id <= 10; // players are entity 1-10
    // Navigate first (same as setViewAsset — single render cycle)
    gameStore.setState(state => ({
        gameState: { ...state.gameState, activeEntityNum: id }
    }));
    await postIdArg('/set_view_asset', id);
    // Set preferred tab AFTER navigation, in its own render cycle
    const gs = gameStore.getState().gameState || {};
    const patchKey = isPlayer ? 'uiPreferredPlayerTab' : 'uiPreferredCompanyTab';
    gameStore.getState().setGameState({ ...gs, [patchKey]: preferredTab });
}

/**
 * Goto page
 * @param {any} p
 * @returns {Promise<any>}
 */
export async function gotoPage(p) {
    const endpoint = p.type === 'industry' ? '/set_view_industry' : '/set_view_asset';
    await postIdArg(endpoint, p.id);
}

/**
 * Go back
 * @returns {Promise<any>}
 */
export async function goBack() {
    await postNoArg('/nav_back');
}

/**
 * Go forward
 * @returns {Promise<any>}
 */
export async function goForward() {
    await postNoArg('/nav_forward');
}

/**
 * Nav goto index
 * @param {any} index
 * @returns {Promise<any>}
 */
export async function navGotoIndex(index) {
    await postIdArg('/nav_goto', index);
}

/**
 * Restore nav history from localStorage — called on game load. entries: [{id, type}] ordered most-recent-first.
 * @param {any} entries
 * @returns {Promise<any>}
 */
export async function navSetHistory(entries) {
    await fetchWithRetry('/nav_set_history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries)
    });
}

/**
 * Change acting as
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function changeActingAs(id) {
    await postIdArg('/change_acting_as', id);
}

/**
 * Cycle acting-as to next/previous controlled company
 * @param {any} direction
 */
export function cycleActingAs(direction) {
    const state = gameStore.getState();
    const gs = state.gameState || {};
    const playerId = gs.playerId;
    const controlledCompanies = gs.controlledCompanies || [];
    const actingAsId = gs.actingAsId;

    // Build the full options list: player + controlled companies
    const options = [playerId, ...controlledCompanies.map(c => c.id)];
    if (options.length <= 1) return; // Nothing to cycle

    const currentIndex = options.indexOf(actingAsId);
    let nextIndex;
    if (direction > 0) {
        nextIndex = (currentIndex + 1) % options.length;
    } else {
        nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    changeActingAs(options[nextIndex]);
}
/**
 * Toggle streaming quote
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function toggleStreamingQuote(id) { await postIdArg('/toggle_streaming_quote', id); }

// Wrap a command-palette fn so the viewed entity is appended as the final
// arg (acting-as). Most api trade/finance fns take actingAsId as their last
// param, so this lets command-line invocations (e.g. "BUY GAC" on the ETF
// page) correctly route through the active entity instead of defaulting to
// PlayCo. Functions that don't take acting-as will simply ignore the extra arg.
const _withActiveEntityActingAs = (fn) => (...args) =>
    fn(...args, gameStore.getState().gameState?.activeEntityNum || 0);

/**
 * Command map
 */
export const commandMap = {
    // === Navigation / Acting As ===

    // === Trading - Stocks ===
    'BUY':          { description: 'Buy stock',                       fn: _withActiveEntityActingAs(buyStock),               takesId: true },
    'SELL':         { description: 'Sell stock',                      fn: _withActiveEntityActingAs(sellStock),              takesId: true },
    'SHORT':        { description: 'Short stock',                     fn: _withActiveEntityActingAs(shortStock),             takesId: true },
    'COVER':        { description: 'Cover short',                     fn: _withActiveEntityActingAs(coverShortStock),        takesId: true },

    // === Trading - Corporate Bonds ===
    'BUYBOND':      { description: 'Buy corporate bond',              fn: _withActiveEntityActingAs(buyCorporateBond),       takesId: true },
    'SELLBOND':     { description: 'Sell corporate bond',             fn: _withActiveEntityActingAs(sellCorporateBond),      takesId: true },

    // === Trading - Government Bonds ===
    'BUYLGOV':      { description: 'Buy long govt bonds',             fn: _withActiveEntityActingAs(buyLongGovtBonds),       takesId: false },
    'SELLLGOV':     { description: 'Sell long govt bonds',            fn: _withActiveEntityActingAs(sellLongGovtBonds),      takesId: false },
    'BUYSGOV':      { description: 'Buy short govt bonds',            fn: _withActiveEntityActingAs(buyShortGovtBonds),      takesId: false },
    'SELLSGOV':     { description: 'Sell short govt bonds',           fn: _withActiveEntityActingAs(sellShortGovtBonds),     takesId: false },

    // === Trading - Options ===
    // CLI passes a resolved underlying company id (e.g. "CALL AAPL" → AAPL's id).
    // Route through the underlying-aware path: IntParam1=0, actingAs=viewed
    // entity, picked id travels in strParam1 so PB uses it as TGT without a
    // prompt. Typing the command alone (no operand) sends underlying=0 and
    // PB's SelectCompanyModal$ fires normally.
    'CALL':         { description: 'Buy calls',                       fn: (underlying) => buyCalls(0, gameStore.getState().gameState?.activeEntityNum || 0, underlying),   takesId: true },
    'SELLCALL':     { description: 'Sell calls',                      fn: (underlying) => sellCalls(0, gameStore.getState().gameState?.activeEntityNum || 0, underlying),  takesId: true },
    'PUT':          { description: 'Buy puts',                        fn: (underlying) => buyPuts(0, gameStore.getState().gameState?.activeEntityNum || 0, underlying),    takesId: true },
    'SELLPUT':      { description: 'Sell puts',                       fn: (underlying) => sellPuts(0, gameStore.getState().gameState?.activeEntityNum || 0, underlying),   takesId: true },
    'ADVOPTS':      { description: 'Advanced options trading',        fn: _withActiveEntityActingAs(advancedOptionsTrading), takesId: false },

    // === Trading - Commodity Futures ===
    'BUYFUT':       { description: 'Buy commodity futures',           fn: _withActiveEntityActingAs(buyCommodityFutures),    takesId: true },
    'SELLFUT':      { description: 'Sell commodity futures',          fn: _withActiveEntityActingAs(sellCommodityFutures),   takesId: true },
    'SHORTFUT':     { description: 'Short commodity futures',         fn: _withActiveEntityActingAs(shortCommodityFutures),  takesId: true },
    'COVERFUT':     { description: 'Cover short commodity futures',   fn: _withActiveEntityActingAs(coverShortCommodityFutures), takesId: true },

    // === Trading - Physical Commodities ===
    'BUYCOMM':      { description: 'Buy physical commodity',          fn: _withActiveEntityActingAs(buyPhysicalCommodity),   takesId: true },
    'SELLCOMM':     { description: 'Sell physical commodity',         fn: _withActiveEntityActingAs(sellPhysicalCommodity),  takesId: true },

    // === Trading - Crypto ===
    'BUYCRYPTO':    { description: 'Buy physical crypto',             fn: _withActiveEntityActingAs(buyPhysicalCrypto),      takesId: true },
    'SELLCRYPTO':   { description: 'Sell physical crypto',            fn: _withActiveEntityActingAs(sellPhysicalCrypto),     takesId: true },
    'BUYCFUT':      { description: 'Buy crypto futures',              fn: _withActiveEntityActingAs(buyCryptoFutures),       takesId: true },
    'SELLCFUT':     { description: 'Sell crypto futures',             fn: _withActiveEntityActingAs(sellCryptoFutures),      takesId: true },

    // === Finance ===
    'BORROW':       { description: 'Borrow money',                    fn: _withActiveEntityActingAs(borrowMoney),            takesId: false },
    'REPAY':        { description: 'Repay loan',                      fn: _withActiveEntityActingAs(repayLoan),              takesId: false },
    'PREPAY':       { description: 'Prepay taxes',                    fn: _withActiveEntityActingAs(prepayTaxes),            takesId: false },
    'ADVANCE':      { description: 'Advance funds',                   fn: _withActiveEntityActingAs(advanceFunds),           takesId: false },
    'SWAPS':        { description: 'Interest rate swaps',             fn: _withActiveEntityActingAs(interestRateSwaps),      takesId: false },
    'TBILLS':       { description: 'Trade T-Bills',                   fn: _withActiveEntityActingAs(tradeTbills),            takesId: false },
    'CHGBANK':      { description: 'Change bank',                     fn: _withActiveEntityActingAs(changeBank),             takesId: false },

    // === Corporate - Leadership ===
    'ELECT':        { description: 'Elect yourself as CEO',           fn: _withActiveEntityActingAs(electCeo),               takesId: false },
    'RESIGN':       { description: 'Resign as CEO',                   fn: _withActiveEntityActingAs(resignAsCeo),            takesId: false },
    'MANAGERS':     { description: 'Change managers',                 fn: _withActiveEntityActingAs(changeManagers),         takesId: false },

    // === Corporate - Strategy ===
    'DIVIDEND':     { description: 'Set dividend',                    fn: _withActiveEntityActingAs(setDividend),            takesId: false },
    'PRODUCTIVITY': { description: 'Set productivity',                fn: _withActiveEntityActingAs(setProductivity),        takesId: false },
    'GROWTH':       { description: 'Set growth rate',                 fn: _withActiveEntityActingAs(setGrowthRate),          takesId: false },
    'REBRAND':      { description: 'Rebrand company',                 fn: _withActiveEntityActingAs(rebrand),                takesId: false },
    'RESTRUCTURE':  { description: 'Restructure company',             fn: _withActiveEntityActingAs(restructure),            takesId: false },

    // === Corporate - Equity ===
    'PSO':          { description: 'Public stock offering',           fn: _withActiveEntityActingAs(publicStockOffering),    takesId: false },
    'PPO':          { description: 'Private stock offering',          fn: _withActiveEntityActingAs(privateStockOffering),   takesId: false },
    'SPLIT':        { description: 'Split stock',                     fn: _withActiveEntityActingAs(splitStock),             takesId: false },
    'RSPLIT':       { description: 'Reverse split stock',             fn: _withActiveEntityActingAs(reverseSplitStock),      takesId: false },

    // === Corporate - Debt ===
    'ISSUEBOND':    { description: 'Issue new corp bonds',            fn: _withActiveEntityActingAs(issueNewCorpBonds),      takesId: false },
    'REDEEMBOND':   { description: 'Redeem corp bonds',               fn: _withActiveEntityActingAs(redeemCorpBonds),        takesId: false },

    // === Corporate - Returns / Liquidation ===
    'EXTDIV':       { description: 'Extraordinary dividend',          fn: _withActiveEntityActingAs(extraordinaryDividend),  takesId: false },
    'TAXFREE':      { description: 'Tax-free liquidation',            fn: _withActiveEntityActingAs(taxFreeLiquidation),     takesId: false },
    'TAXLIQ':       { description: 'Taxable liquidation',             fn: _withActiveEntityActingAs(taxableLiquidation),     takesId: false },

    // === Corporate - Assets ===
    'BUYASSET':     { description: 'Buy corporate assets',            fn: _withActiveEntityActingAs(buyCorporateAssets),     takesId: false },
    'SELLASSET':    { description: 'Sell corporate assets',           fn: _withActiveEntityActingAs(sellCorporateAssets),    takesId: false },
    'SELLSUB':      { description: 'Sell subsidiary stock',           fn: _withActiveEntityActingAs(sellSubsidiaryStock),    takesId: false },
    'SPINOFF':      { description: 'Spin off a subsidiary',           fn: spinOff,                                           takesId: true },
    'BROWSE':       { description: 'Browse for-sale items',           fn: _withActiveEntityActingAs(viewForSaleItems),       takesId: false },

    // === Corporate - M&A ===
    'MERGER':       { description: 'Merge with viewed company',       fn: _withActiveEntityActingAs(merger),                 takesId: false },
    'GREENMAIL':    { description: 'Greenmail',                        fn: _withActiveEntityActingAs(greenmail),              takesId: false },
    'LBO':          { description: 'Leveraged buyout',                 fn: _withActiveEntityActingAs(lbo),                    takesId: false },
    'STARTUP':      { description: 'Start a new company',             fn: _withActiveEntityActingAs(startup),                takesId: false },
    'CONTRIB':      { description: 'Capital contribution',            fn: _withActiveEntityActingAs(capitalContribution),    takesId: false },

    // === Hostile Actions ===
    'HARASS':       { description: 'Harassing lawsuit',               fn: _withActiveEntityActingAs(harrassingLawsuit),      takesId: true },
    'RUMORS':       { description: 'Spread rumors',                   fn: _withActiveEntityActingAs(spreadRumors),           takesId: true },
    'ANTITRUST':    { description: 'Antitrust lawsuit',               fn: _withActiveEntityActingAs(antitrustLawsuit),       takesId: true },
    'LAWFIRM':      { description: 'Change law firm',                 fn: _withActiveEntityActingAs(changeLawFirm),          takesId: false },

    // === Accounting ===
    'INCREARN':     { description: 'Increase earnings',               fn: _withActiveEntityActingAs(increaseEarnings),       takesId: false },
    'DECREARN':     { description: 'Decrease earnings',               fn: _withActiveEntityActingAs(decreaseEarnings),       takesId: false },

    // === ETF / Advisory ===
    'FEE':          { description: 'Set advisory fee',                fn: _withActiveEntityActingAs(setAdvisoryFee),         takesId: false },
    'AUTOPILOT':    { description: 'Toggle global autopilot',         fn: _withActiveEntityActingAs(toggleGlobalAutopilot),  takesId: false },

    // === Bank Operations ===
    'ALLOC':        { description: 'Set bank allocation',             fn: _withActiveEntityActingAs(setBankAllocation),      takesId: false },
    'LISTLOANS':    { description: 'List bank loans',                 fn: _withActiveEntityActingAs(listBankLoans),          takesId: false },
    'FREEZE':       { description: 'Freeze all loans',                fn: _withActiveEntityActingAs(freezeAllLoans),         takesId: false },
    'BUYBIZ':       { description: 'Buy business loans',              fn: _withActiveEntityActingAs(buyBusinessLoans),       takesId: false },
    'BUYCONS':      { description: 'Buy consumer loans',              fn: _withActiveEntityActingAs(buyConsumerLoans),       takesId: false },
    'SELLCONS':     { description: 'Sell consumer loans',             fn: _withActiveEntityActingAs(sellConsumerLoans),      takesId: false },
    'BUYMORT':      { description: 'Buy prime mortgages',             fn: _withActiveEntityActingAs(buyPrimeMortgages),      takesId: false },
    'SELLMORT':     { description: 'Sell prime mortgages',            fn: _withActiveEntityActingAs(sellPrimeMortgages),     takesId: false },
    'BUYSUBMORT':   { description: 'Buy subprime mortgages',          fn: _withActiveEntityActingAs(buySubprimeMortgages),   takesId: false },
    'SELLSUBMORT':  { description: 'Sell subprime mortgages',         fn: _withActiveEntityActingAs(sellSubprimeMortgages),  takesId: false },
}

/**
 *  w s r context
 */
export const WSRContext = createContext();

/**
 * Game store
 */
export const gameStore = createStore((set, get) => ({
    gameState: {},
    setGameState: (next) => set({ gameState: next }),
    uiHoldingsTabActive: false,
    setUiHoldingsTabActive: (v) => set({ uiHoldingsTabActive: v }),
}));

/**
 * Use game store
 * @param {any} [selector=s]
 * @param {any} [isEqual=Object.is]
 */
export function useGameStore(selector = s => s, isEqual = Object.is) {
    const selRef = useRef(selector);
    selRef.current = selector;
    const isEqualRef = useRef(isEqual);
    isEqualRef.current = isEqual;

    const [val, setVal] = useState(() => selRef.current(gameStore.getState()));
    const valRef = useRef(val);
    valRef.current = val;

    useEffect(() => {
        const unsub = gameStore.subscribe((state) => {
            const next = selRef.current(state);
            if (!isEqualRef.current(next, valRef.current)) setVal(next);
        });
        return unsub;
    }, []); // stable subscription — selRef/valRef always point to latest values

    return val;
}

/**
 *  w s r provider
 * @param {any} { children }
 */
export function WSRProvider({ children }) {
    const [helpShown, setHelpShown] = useState(false);
    const [helpSectionId, setHelpSectionId] = useState(null);
    const showHelp = useCallback((sectionId = null) => {
        setHelpSectionId(sectionId);
        setHelpShown(true);
    }, []);
    const hideHelp = useCallback(() => {
        setHelpShown(false);
        setHelpSectionId(null);
    }, []);

    // Database Search modal state
    const [dbSearchShown, setDbSearchShown] = useState(false);
    const showDbSearch = useCallback(() => setDbSearchShown(true), []);
    const hideDbSearch = useCallback(() => setDbSearchShown(false), []);

    // Tutorial modal state
    const showTutorial = useCallback(() => setTutorialEnabled(true), []);
    const hideTutorial = useCallback(() => setTutorialEnabled(false), []);

    // gameState/setGameState are intentionally NOT in context: gameState polls at
    // 200ms (50ms in-game) and would force every consumer to re-render. Consumers
    // that need gameState use useGameStore(selector) directly so they only
    // re-render on the specific fields they read.
    const value = useMemo(() => ({
        helpShown,
        helpSectionId,
        showHelp,
        hideHelp,
        dbSearchShown,
        showDbSearch,
        hideDbSearch,
        showTutorial,
        hideTutorial,
    }), [helpShown, helpSectionId, showHelp, hideHelp, dbSearchShown, showDbSearch, hideDbSearch, showTutorial, hideTutorial]);

    return html`<${WSRContext.Provider} value=${value}>
        ${children}
    <//>`;
}

/**
 * Use w s r context
 */
export const useWSRContext = () => useContext(WSRContext);

/**
 * Debounce
 * @param {any} fn
 * @param {any} delay
 */
export function debounce(fn, delay) {
    let timer = null;

    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, delay);
    };
}

/**
 * Diff objects
 * @param {any} oldObj
 * @param {any} newObj
 * @param {any} [path=[]]
 */
export function diffObjects(oldObj, newObj, path = []) {
    const result = {
        added: {},
        removed: {},
        changed: {}
    };

    const oldKeys = Object.keys(oldObj || {});
    const newKeys = Object.keys(newObj || {});
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
        const oldVal = oldObj?.[key];
        const newVal = newObj?.[key];
        const currentPath = path.concat(key).join('.');

        // Added
        if (!(key in (oldObj || {}))) {
            result.added[currentPath] = newVal;
            continue;
        }

        // Removed
        if (!(key in (newObj || {}))) {
            result.removed[currentPath] = oldVal;
            continue;
        }

        // Both exist
        if (isObject(oldVal) && isObject(newVal)) {
            const child = diffObjects(oldVal, newVal, path.concat(key));
            Object.assign(result.added, child.added);
            Object.assign(result.removed, child.removed);
            Object.assign(result.changed, child.changed);
            continue;
        }

        // Changed
        if (!isEqual(oldVal, newVal)) {
            result.changed[currentPath] = { from: oldVal, to: newVal };
        }
    }

    return result;
}

function isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function isEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (isObject(a) && isObject(b)) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every(k => isEqual(a[k], b[k]));
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => isEqual(v, b[i]));
    }
    return false;
}

/**
 * Is different
 * @param {any} oldObj
 * @param {any} newObj
 */
export function isDifferent(oldObj, newObj) {
    const diff = diffObjects(oldObj, newObj);
    return Object.keys(diff.added).length > 0 ||
        Object.keys(diff.removed).length > 0 ||
        Object.keys(diff.changed).length > 0;
}

/**
 * Format thousands preserve caret
 * @param {any} e
 * @param {any} formatFn
 */
export function formatThousandsPreserveCaret(e, formatFn) {
    function formatFn(value) {
        // remove commas and spaces
        const raw = value.replace(/,/g, '').trim();

        // allow empty
        if (raw === '') return '';

        // reject non-numeric input
        if (!/^\d+(\.\d*)?$/.test(raw)) return null;

        // Add thousands commas
        const num = Number(raw);
        if (isNaN(num)) return null;
        // Preserve decimals if present
        const [intPart, decPart] = raw.split('.');
        let formatted = Number(intPart).toLocaleString();
        if (decPart !== undefined) {
            formatted += '.' + decPart;
        }
        return formatted;
    }

    const input = e.target;
    const prev = input.value;
    const start = input.selectionStart ?? prev.length;

    // How many digits were to the left of the caret
    const digitsLeft = (prev.slice(0, start).match(/\d/g) || []).length;

    const formatted = formatFn(prev);
    if (formatted == null) return;

    // Apply formatted value
    input.value = formatted;

    // Restore caret after same number of digits
    let pos = 0;
    let seenDigits = 0;
    while (pos < formatted.length && seenDigits < digitsLeft) {
        if (/\d/.test(formatted[pos])) seenDigits++;
        pos++;
    }

    input.setSelectionRange(pos, pos);
}
