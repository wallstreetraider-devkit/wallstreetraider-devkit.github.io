// Harvested verbatim from TutorialModal.js (Phase 1 demolition) for reuse by
// the future HintPanel. Signature and behavior preserved exactly — Phase 4
// owns any adaptation when integrating into the hint renderer.
//
// Input: `step` is an object with optional `highlightSelector`, `position`,
// and `sidebarMode` fields. `sidebarMode` (second arg) forces docked-left.
// Output: a CSSProperties-style object suitable for spreading into `style`.

export default function calculatePanelStyle(step, sidebarMode = false) {
    // In sidebar mode, always position on the left side
    if (sidebarMode || step?.sidebarMode) {
        return {
            position: 'fixed',
            top: '100px',
            left: '20px',
            maxWidth: '350px',
            maxHeight: 'calc(100vh - 140px)'
        };
    }

    if (!step?.highlightSelector || step.position === 'center') {
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        };
    }

    const element = document.querySelector(step.highlightSelector);
    if (!element) {
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        };
    }

    const rect = element.getBoundingClientRect();
    const padding = 20;
    const panelWidth = 400;
    const panelHeight = 400; // Approximate

    // Calculate available space in each direction
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;

    let style = { position: 'fixed' };

    // Vertical bound for side placements (right/left): the panel's top
    // anchor is rect.top clamped to leave room for panelHeight above the
    // viewport bottom. maxHeight then caps the rendered height to what
    // actually remains, so the panel cannot fall off-screen even when
    // its content is taller than panelHeight.
    const sideTop = Math.max(20, Math.min(rect.top, window.innerHeight - panelHeight - 20));
    const sideMaxHeight = Math.max(120, window.innerHeight - sideTop - 20);

    switch (step.position) {
        case 'right':
            if (spaceRight >= panelWidth + padding) {
                style.top = `${sideTop}px`;
                style.left = `${rect.right + padding}px`;
                style.maxHeight = `${sideMaxHeight}px`;
            } else {
                style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            }
            break;
        case 'left':
            if (spaceLeft >= panelWidth + padding) {
                style.top = `${sideTop}px`;
                style.right = `${window.innerWidth - rect.left + padding}px`;
                style.maxHeight = `${sideMaxHeight}px`;
            } else {
                style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            }
            break;
        case 'bottom':
            // Cap maxHeight at the actual space below the anchor so the
            // panel scrolls internally rather than running off-screen.
            // Minimum 120px so the panel still renders something usable
            // even when the anchor sits near the viewport bottom.
            if (spaceBottom >= 120) {
                style.top = `${rect.bottom + padding}px`;
                style.left = `${Math.max(20, Math.min(rect.left, window.innerWidth - panelWidth - 20))}px`;
                style.maxHeight = `${Math.max(120, spaceBottom - padding - 20)}px`;
            } else {
                style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            }
            break;
        case 'top':
            if (spaceTop >= 120) {
                style.bottom = `${window.innerHeight - rect.top + padding}px`;
                style.left = `${Math.max(20, Math.min(rect.left, window.innerWidth - panelWidth - 20))}px`;
                style.maxHeight = `${Math.max(120, spaceTop - padding - 20)}px`;
            } else {
                style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            }
            break;
        default:
            style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    return style;
}
