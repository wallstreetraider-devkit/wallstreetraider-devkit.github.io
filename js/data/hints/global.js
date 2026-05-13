// Global hints catalog. Currently holds the three framework-validation
// seeds from §G.2. Future home for the first-run pointer copy and the
// lightbulb-intro hint (Phase 6).
//
// The seeds prove the matcher + renderer wiring works end-to-end on
// view+controls, view+tab, and target-anchored paths respectively.
// They are deliberately bland copy so no one mistakes them for content.
// Delete each when real content for its match lands.

export default [
    // FRAMEWORK VALIDATION — not content. Delete when real cashflow-controlled
    // content arrives. Exists to prove view + controls matching works end-to-end.
    {
        id: 'framework-seed-controlled-company',
        match: { view: 'company', controls: true },
        title: 'You control this company',
        content: `<p>(Framework-validation hint. Replace with real content.)</p>`,
    },

    // FRAMEWORK VALIDATION — not content. Delete when real market-heatmap content arrives.
    // Exists to prove target-anchored panel positioning works end-to-end.
    {
        id: 'framework-seed-market-heatmap',
        match: { view: 'market' },
        target: '[data-hint="market-heatmap-grid"]',
        position: 'right',
        title: 'Market heat map',
        content: `<p>(Framework-validation hint. Replace with real content.)</p>`,
    },
];
