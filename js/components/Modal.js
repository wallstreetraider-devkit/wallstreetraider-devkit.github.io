import { useEffect, useRef, html } from '../lib/preact.standalone.module.js';
import ModalHintLightbulb from './ModalHintLightbulb.js';

export default function Modal({ show, onClose, onKeyDown, enableClickOutsideClose = true, hideHintLightbulb = false, children, class: cls = '', style = '' }) {
    const cardRef = useRef(null);
    const mouseDownOnOverlayRef = useRef(false);

    useEffect(() => {
        if (!show) return;
        // Blur any focused editable element so modal hotkeys (C, Y, N) work
        // immediately without requiring a click on the modal first.
        const ae = document.activeElement;
        if (ae && ae !== document.body && ae !== document.documentElement) {
            ae.blur();
        }
    }, [show]);

    useEffect(() => {
        if (!show) return;
        const onKey = e => {
            // Only handle ESC if onClose is defined, otherwise let parent handlers deal with it
            if (e.key === 'Escape' && !e.defaultPrevented && onClose) { e.preventDefault(); onClose(); }
            onKeyDown?.(e);
        };
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [show, onClose, onKeyDown]);

    if (!show) return null;

    // TODO(Phase 4): if HintPanel re-introduces a sidebar shift, restore the modal offset here.
    // The legacy logic shifted the modal 200px right when useActiveTooltip() returned a match;
    // it lived here until Phase 1 demolition removed the TutorialTooltip catalog.
    const combinedStyle = style;

    // Click-outside-to-close: only close if BOTH mousedown AND click happen on the overlay.
    // This prevents accidental closes when the user drags text selection out of the modal.
    const handleOverlayMouseDown = enableClickOutsideClose ? (e) => {
        mouseDownOnOverlayRef.current = (e.target === e.currentTarget);
    } : undefined;

    const handleOverlayClick = enableClickOutsideClose ? (e) => {
        if (mouseDownOnOverlayRef.current && e.target === e.currentTarget) {
            onClose();
        }
        mouseDownOnOverlayRef.current = false;
    } : undefined;

    return html`<div
        role="dialog"
        aria-modal="true"
        class="modal-overlay"
        onMouseDown=${handleOverlayMouseDown}
        onClick=${handleOverlayClick}
    >
        <div
            ref=${cardRef}
            class=${cls?.length > 0 ? cls : 'modal-card'}
            style=${combinedStyle}
            onClick=${e => e.stopPropagation()}
        >
            ${hideHintLightbulb ? '' : html`<${ModalHintLightbulb} />`}
            ${children}
        </div>
    </div>`;
}
