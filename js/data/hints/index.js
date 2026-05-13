// Hint catalog entry point. Merges per-view files into a single
// HintEntry[] and runs dev-time validation at module load.
//
// Order matters for the matcher's tie-break (later entries lose on
// equal priority; see hintMatcher.findActiveHint). Modals come first
// because they're the most populated; framework-validation seeds in
// globals come LAST so any future authored hint with the same match
// silently supersedes the seed. That is the right behavior for
// placeholder content: real authoring evicts the seed automatically.
//
// Validation runs only when NODE_ENV === 'development'. Production
// builds skip it entirely so the console stays clean and the warn
// branches do not run. DOM-dependent target-selector validation is
// exported as a separate function for Phase 4's renderer to invoke
// from a mount effect — it cannot run at module load because the
// catalog imports happen before any UI mounts.

import modals from './modals.js';
import company from './company.js';
import industry from './industry.js';
import market from './market.js';
import player from './player.js';
import portfolio from './portfolio.js';
import globals from './global.js';

const catalog = [
    ...modals,
    ...company,
    ...industry,
    ...market,
    ...player,
    ...portfolio,
    ...globals,
];

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV?.trim() === 'development';

// Structural validation (id uniqueness, empty match, duplicate (match,
// priority) pairs, customMatch usage). Runs at module load in dev.
// Exported so tests / future tooling can invoke explicitly.
export function validateCatalog(c = catalog) {
    if (!isDev) return;

    const seenIds = new Set();
    const seenMatchKeys = new Map(); // JSON-key -> first entry id

    for (const entry of c) {
        // 1. id uniqueness
        if (!entry.id) {
            console.warn('[hints] entry is missing an id:', entry);
        } else if (seenIds.has(entry.id)) {
            console.warn(`[hints] duplicate id "${entry.id}"`);
        } else {
            seenIds.add(entry.id);
        }

        // 2. match present and non-empty
        if (!entry.match || typeof entry.match !== 'object' || Object.keys(entry.match).length === 0) {
            console.warn(`[hints] entry "${entry.id}" has empty or missing match`);
        }

        // 3. duplicate (match, priority) pairs
        if (entry.match) {
            const key = JSON.stringify(entry.match) + '|p=' + (typeof entry.priority === 'number' ? entry.priority : 0);
            if (seenMatchKeys.has(key)) {
                console.warn(`[hints] entry "${entry.id}" has the same (match, priority) as "${seenMatchKeys.get(key)}"`);
            } else {
                seenMatchKeys.set(key, entry.id);
            }
        }

        // 4. customMatch usage warning (visibility into escape-hatch use)
        if (typeof entry.customMatch === 'function') {
            console.warn(`[hints] entry "${entry.id}" uses customMatch — verify the inline comment explains why declarative matching cannot express the condition`);
        }
    }
}

// Target-selector resolution. NOT auto-invoked. Phase 4's renderer
// will call this from a one-shot mount effect once the UI tree is
// in place — module load is too early. Accepts an explicit catalog
// arg so callers can pass a subset or a future filtered view.
export function validateTargetSelectors(c = catalog) {
    if (!isDev) return;
    if (typeof document === 'undefined') return;

    for (const entry of c) {
        if (entry.target && !document.querySelector(entry.target)) {
            console.warn(`[hints] entry "${entry.id}" target "${entry.target}" did not resolve to a DOM element`);
        }
    }
}

if (isDev) validateCatalog(catalog);

export default catalog;
