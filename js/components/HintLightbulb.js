// HintLightbulb — Toolbar hint affordance.
//
// Rendered only when a view-level hint matches the current context.
// When a modal is open, this lightbulb stays hidden — modal hints are
// signaled by ModalHintLightbulb instead.
//
// On click: toggleHintPanel('topbar') flips the shared open-anchor
// signal in hooks/useHintPanelOpen.js. HintPanelHost in app.js reads
// that signal and renders <HintPanel/> against [data-hint-anchor="topbar"].
// If the matching hint goes away while the panel is open, the host's
// anchor-resolution auto-close fires.

import { html } from '../lib/preact.standalone.module.js';
import * as api from '../api.js';
import useActiveHint from '../hooks/useActiveHint.js';
import { toggleHintPanel } from '../hooks/useHintPanelOpen.js';

export default function HintLightbulb() {
    const activeHint = useActiveHint();
    const modalType = api.useGameStore(s => s.gameState.modalType) || 0;

    if (!activeHint || modalType !== 0) return null;

    return html`
        <button
            class="btn"
            data-hint-anchor="topbar"
            data-testid="hint-lightbulb-topbar"
            style="padding:2px 8px;font-size:16px;line-height:1;"
            title="Hint available — click to view"
            onClick=${() => toggleHintPanel('topbar')}
        >
            💡
        </button>
    `;
}
