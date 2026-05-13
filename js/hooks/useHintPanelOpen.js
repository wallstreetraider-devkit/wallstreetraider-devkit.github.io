// useHintPanelOpen — module-level signal for the hint panel's open/closed
// state. Lives outside Zustand because this is pure UI ephemera (which
// lightbulb is currently expanded), not game state. Lives outside any
// single component's useState because both lightbulbs and HintPanelHost
// need to coordinate on a single shared value.
//
// State shape:
//   openAnchor: 'topbar' | 'modal' | null
//     null    → panel hidden
//     'topbar' → panel anchored to [data-hint-anchor="topbar"]
//     'modal'  → panel anchored to [data-hint-anchor="modal"]
//
// Click semantics (implemented by callers, not enforced here):
//   - Click a lightbulb whose anchor matches openAnchor → close (null)
//   - Click a lightbulb whose anchor differs           → re-anchor
//   - Click outside the panel / lightbulb              → close (HintPanelHost)
//   - Anchored modal closes                            → close (HintPanelHost)
//
// Why an outside-React store with subscribe/publish (vs. Context, Zustand,
// per-component useState):
//   - Two physically separate consumers (TopBar lightbulb, modal lightbulb,
//     HintPanelHost) must agree on one value. Per-component useState can't
//     coordinate across the tree.
//   - This is UI session state, not game state, so it shouldn't pollute
//     the Zustand gameState slice (which is reconciled against the bridge).
//   - The data is a single primitive, so a Context provider would be
//     overhead for what is effectively a global variable + subscription.

import { useState, useEffect } from '../lib/preact.standalone.module.js';

let openAnchor = null;
const subscribers = new Set();

function notify() {
    for (const cb of subscribers) cb();
}

export function getOpenAnchor() {
    return openAnchor;
}

export function setOpenAnchor(next) {
    const v = (next === 'topbar' || next === 'modal') ? next : null;
    if (openAnchor === v) return;
    openAnchor = v;
    notify();
}

export function closeHintPanel() {
    setOpenAnchor(null);
}

export function toggleHintPanel(anchor) {
    setOpenAnchor(openAnchor === anchor ? null : anchor);
}

export default function useHintPanelOpen() {
    const [value, setValue] = useState(openAnchor);
    useEffect(() => {
        const cb = () => setValue(openAnchor);
        subscribers.add(cb);
        // Sync in case openAnchor changed between render and effect attach.
        if (value !== openAnchor) setValue(openAnchor);
        return () => subscribers.delete(cb);
    }, []);
    return { openAnchor: value, setOpenAnchor, close: closeHintPanel };
}
