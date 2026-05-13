// React hook returning the currently-matching HintEntry (or null) for
// the live gameState. Single source of truth for "which hint should be
// shown right now" — consumers should not duplicate this derivation.
//
// Subscribes to the WHOLE gameState (not per-field) and memoizes the
// matcher call with [gameState] as the sole dep. Rationale:
//
//   1) api.js's buildGameState reuses references when array/string
//      contents have not changed (BUG-105 fix at api.js:1192-1210), so
//      Zustand's default Object.is check on the outer reference already
//      catches stable polls. Whole-state subscription does not cause
//      spurious re-renders in this codebase.
//
//   2) customMatch predicates can read ANY gameState field (the schema
//      hands them the raw gameState). A whole-state memo dep is
//      automatically safe; explicit field-list deps would require every
//      future customMatch author to know to extend that list, and stale
//      results would fail silently.
//
// Cost: the matcher walks ~46 entries doing key comparisons + the eight
// customMatch invocations. Cheap. If profiling later shows this is a
// hot path, switch to explicit deps listing the fields deriveContext
// reads plus every field every customMatch reads.

import { useMemo } from '../lib/preact.standalone.module.js';
import * as api from '../api.js';
import { deriveContext, findActiveHint } from '../services/hintMatcher.js';
import catalog from '../data/hints/index.js';

export default function useActiveHint() {
    const gameState = api.useGameStore(s => s.gameState);
    return useMemo(
        () => findActiveHint(catalog, deriveContext(gameState)),
        [gameState]
    );
}
