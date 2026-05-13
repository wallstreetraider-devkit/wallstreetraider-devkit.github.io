// Hints scoped to portfolio-style tabs.
//
// Note: 'portfolio' is currently a TAB of the player view, not a top-
// level view. deriveContext keeps view === 'player' when the player is
// on the stocks-bonds tab (see §G.1). Hints in this file should match
// on { view: 'player', tab: 'stocks-bonds' } or similar tab-scoped
// criteria, not { view: 'portfolio' } (the matcher will not emit that).
//
// Reserved for content authoring (Phase 8+). The framework-validation
// seed 'framework-seed-portfolio-tab' in global.js exercises view + tab
// matching against this surface; delete it when the first real
// portfolio hint lands.

export default [];
