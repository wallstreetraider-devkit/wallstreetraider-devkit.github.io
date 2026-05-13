// HintPanel — renders the active hint, if any.
//
// Rendering contract (see §B and §G of docs/hint-system-spec.md):
//
//   entry.target present →
//     • TutorialOverlay draws a spotlight on the target element.
//     • Panel positions itself relative to that target using
//       entry.position via calculatePanelStyle.
//     • Lightbulb anchors are NOT consulted in this case — target
//       always wins for spotlight hints (§B rendering contract).
//
//   entry.target absent →
//     • No spotlight.
//     • Panel positions relative to the active lightbulb. Phase 5
//       mounts ModalHintLightbulb in modal chrome and HintLightbulb in
//       TopBar, both carrying data-hint-anchor attributes that this
//       panel looks up. Anchor precedence:
//         gameState.modalType > 0  →  [data-hint-anchor="modal"]
//         else                     →  [data-hint-anchor="topbar"]
//     • Phase 4 ships before either lightbulb exists; when the anchor
//       selector does not resolve, calculatePanelStyle's sidebarMode
//       flag drops the panel into the legacy top-left position so it
//       still renders visibly. Phase 5's lightbulb wiring is then
//       purely additive — the anchor selectors start resolving and
//       the panel migrates from the fallback to the proper position.
//
// Phase 5: click-mediated lifecycle lives in HintPanelHost.js, which
//   gates this component's render on useHintPanelOpen and passes
//   `anchorOverride` so anchor selection follows the clicked lightbulb
//   rather than re-deriving from modalType. The X-button-close case
//   from §C is deferred — same-lightbulb click, click-outside, and
//   anchor-disappear (modal close) cover the close paths for now.
//
// TODO(Phase 5 perf-check): per §I Phase 4, profile TutorialOverlay's
//   200ms poll under sustained spotlight (a hint may be live for the
//   duration of a player sitting on a tab). Switch to ResizeObserver +
//   IntersectionObserver only if profiling shows frame drops. Cannot
//   profile in Phase 4 because the panel is not yet mounted.

import { html, useEffect, useMemo } from '../lib/preact.standalone.module.js';
import * as api from '../api.js';
import useActiveHint from '../hooks/useActiveHint.js';
import catalog, { validateTargetSelectors } from '../data/hints/index.js';
import calculatePanelStyle from '../utils/calculatePanelStyle.js';
import TutorialOverlay from './TutorialOverlay.js';
import { closeHintPanel } from '../hooks/useHintPanelOpen.js';

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV?.trim() === 'development';

// Phase 5: HintPanelHost passes `anchorOverride` (the currently-open
// anchor key from useHintPanelOpen). When provided it pins anchor
// selection; when absent the panel falls back to the legacy
// modalType-derived selection so HintPanel keeps working if mounted
// without the host (e.g. dev experiments).
export default function HintPanel({ anchorOverride } = {}) {
    const activeHint = useActiveHint();
    const modalType = api.useGameStore(s => s.gameState.modalType) || 0;

    // Dev-only: target-selector resolution against the live DOM, once on
    // first mount. Module load is too early (UI not yet built); a mount
    // effect is the first runtime opportunity (see hints/index.js).
    useEffect(() => {
        if (isDev) validateTargetSelectors(catalog);
    }, []);

    // Dev-only: log each panel mount with active hint so Phase 5 perf
    // analysis has timeline data on which hints were live for how long.
    // Cheap to remove if it ever becomes noisy.
    useEffect(() => {
        if (isDev && activeHint) {
            console.debug('[HintPanel] mounted with hint:', activeHint.id);
        }
    }, [activeHint?.id]);

    // Style computation. Memo key includes modalType so the anchor
    // selector re-resolves when modal state flips; document.querySelector
    // is a render-time side effect but calculatePanelStyle already does
    // the same lookup internally, so we're consistent with the harvested
    // utility rather than introducing a new pattern.
    const style = useMemo(() => {
        if (!activeHint) return null;
        if (activeHint.target) {
            // Adapter for the legacy {step, sidebarMode} signature — see
            // calculatePanelStyle.js's preserved-verbatim header. Phase 4
            // chose the adapter approach over refactoring the utility to
            // protect the verbatim guarantee.
            return calculatePanelStyle(
                { highlightSelector: activeHint.target, position: activeHint.position },
                false
            );
        }
        const anchorSelector = anchorOverride
            ? `[data-hint-anchor="${anchorOverride}"]`
            : (modalType > 0
                ? '[data-hint-anchor="modal"]'
                : '[data-hint-anchor="topbar"]');
        const anchorResolves = typeof document !== 'undefined'
            && !!document.querySelector(anchorSelector);
        return calculatePanelStyle(
            { highlightSelector: anchorSelector, position: 'bottom' },
            !anchorResolves
        );
    }, [activeHint, modalType, anchorOverride]);

    if (!activeHint) return null;

    // Every hint surfaces a Help button that pops the wsrbook.htm manual in
    // a new window. When the entry sets `helpId`, the URL is anchored at
    // that section (matches wsrbook's `#chap04`, `#chap04_IV(A)` style).
    const helpUrl = `assets/help/wsrbook.htm${activeHint.helpId ? '#' + activeHint.helpId : ''}`;

    return html`
        ${activeHint.target
            ? html`<${TutorialOverlay} selector=${activeHint.target} enabled=${true} />`
            : ''}
        <div
            class="tutorial-tooltip-modal hint-panel"
            style=${style}
            role="dialog"
            aria-label="Hint"
        >
            <button
                class="hint-panel-close"
                aria-label="Close hint"
                title="Close"
                onClick=${() => closeHintPanel()}
            >×</button>
            <div class="tutorial-tooltip-title" style="padding-right:24px;">${activeHint.title}</div>
            <div
                class="tutorial-tooltip-content"
                dangerouslySetInnerHTML=${{ __html: activeHint.content }}
            ></div>
            <div class="hint-panel-actions" style="display:flex; justify-content:flex-end; margin-top:10px;">
                <button
                    class="btn"
                    onClick=${() => window.open(helpUrl, '_blank')}
                    title="Open the Wall Street Raider manual in a new window"
                >Open Help</button>
            </div>
        </div>
    `;
}
