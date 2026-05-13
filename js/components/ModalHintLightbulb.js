// ModalHintLightbulb — modal-chrome hint affordance.
//
// Mounted as the first child of `.modal-card` by Modal.js (unless the
// modal sets hideHintLightbulb). Positioned absolutely at the modal's
// top-right corner — `.modal-card` already has `position: relative`
// (see electron/css/components/modals.css line 30) so absolute children
// anchor against the card itself.
//
// Rendered only when a modal-context hint matches; otherwise returns
// null and the modal chrome is free of any indicator. (See HintLightbulb
// for the design-history note on why we abandoned the always-visible-dim
// approach during initial playtesting.)

import { html } from '../lib/preact.standalone.module.js';
import * as api from '../api.js';
import useActiveHint from '../hooks/useActiveHint.js';
import { toggleHintPanel } from '../hooks/useHintPanelOpen.js';

export default function ModalHintLightbulb() {
    const activeHint = useActiveHint();
    const modalType = api.useGameStore(s => s.gameState.modalType) || 0;

    if (!activeHint || modalType === 0) return null;

    const onClick = (e) => {
        // Don't let the click bubble to Modal.js's overlay-click-outside
        // handler — clicking the lightbulb should not close the modal.
        e.stopPropagation();
        toggleHintPanel('modal');
    };

    return html`
        <button
            class="btn"
            data-hint-anchor="modal"
            data-testid="hint-lightbulb-modal"
            style="position:absolute;top:8px;right:8px;z-index:10;height:auto;padding:2px 8px;font-size:16px;line-height:1;"
            title="Hint available — click to view"
            onClick=${onClick}
        >
            💡
        </button>
    `;
}
