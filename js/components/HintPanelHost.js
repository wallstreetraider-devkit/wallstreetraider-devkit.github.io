// HintPanelHost — lifecycle wrapper around HintPanel.
//
// Owns the click-mediated open/close behavior that Phase 4's HintPanel
// deliberately did not implement (Phase 4 was "render given a hint";
// Phase 5 layers "when to render" on top via this host).
//
// Responsibilities:
//   - Gate HintPanel render on the shared open-anchor signal — the panel
//     is never visible unless a lightbulb has been clicked.
//   - Auto-close when the anchored modal closes (openAnchor='modal' but
//     modalType has dropped to 0; the modal lightbulb's DOM node no
//     longer exists, the panel has nothing to anchor to).
//   - Auto-close when the resolved anchor selector returns no element
//     (defensive — covers cases where a lightbulb is unmounted for
//     reasons other than modal close).
//   - Click-outside-to-close: a mousedown outside both the panel and any
//     [data-hint-anchor] element dismisses the panel. Lightbulb clicks
//     are excluded from "outside" because they toggle via their own
//     onClick handlers; double-triggering would cancel their toggle.
//
// HintPanel.js itself receives a single new prop (anchorOverride) from
// this host. Without the host, HintPanel falls back to the legacy
// modalType-based anchor selection — so this host is purely additive.

import { html, useEffect } from '../lib/preact.standalone.module.js';
import * as api from '../api.js';
import HintPanel from './HintPanel.js';
import useHintPanelOpen, { closeHintPanel } from '../hooks/useHintPanelOpen.js';

export default function HintPanelHost() {
    const { openAnchor } = useHintPanelOpen();
    const modalType = api.useGameStore(s => s.gameState.modalType) || 0;

    // Auto-close when the anchored modal closes. The modal lightbulb
    // (and the .modal-card it lives in) is unmounted at this point, so
    // the panel's anchor would resolve to null.
    useEffect(() => {
        if (openAnchor === 'modal' && modalType === 0) {
            closeHintPanel();
        }
    }, [openAnchor, modalType]);

    // Click-outside dismiss. Mousedown (not click) so it fires before
    // any focus shifts; closure runs only while the panel is open to
    // keep the listener cost zero in steady state.
    useEffect(() => {
        if (!openAnchor) return;
        const onDocMouseDown = (e) => {
            const t = e.target;
            if (!t || typeof t.closest !== 'function') return;
            if (t.closest('.hint-panel')) return;
            if (t.closest('[data-hint-anchor]')) return;
            closeHintPanel();
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [openAnchor]);

    // Defensive auto-close: if the anchor selector no longer resolves,
    // there's nothing to anchor the panel to. Runs on every openAnchor
    // or modalType change to catch lightbulb unmount races.
    useEffect(() => {
        if (!openAnchor) return;
        const sel = `[data-hint-anchor="${openAnchor}"]`;
        if (typeof document !== 'undefined' && !document.querySelector(sel)) {
            closeHintPanel();
        }
    }, [openAnchor, modalType]);

    if (!openAnchor) return null;
    return html`<${HintPanel} anchorOverride=${openAnchor} />`;
}
