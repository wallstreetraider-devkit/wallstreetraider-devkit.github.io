import { html, useEffect, useState } from '../lib/preact.standalone.module.js';
import * as api from '../api.js';

export function squarify(width, height, items, getSizeValue) {

    if (!Array.isArray(items) || items.length === 0) {
        return {
            flexDirection: 'row',
            children: []
        }
    }

    if (items.length === 1) {
        return {
            flexDirection: 'row',
            children: [items[0]]
        };
    }

    // Ascending order
    const remaining = items
        .slice()
        .map(item => ({ ...item, _sizeValue: getSizeValue(item) }))
        .sort((a, b) => a._sizeValue - b._sizeValue);

    const totalValue = remaining.reduce((sum, item) => sum + item._sizeValue, 0);
    const totalAreaPxs = width * height;

    // Normalize values to total area
    remaining.forEach(item => {
        item._areaPct = item._sizeValue / totalValue;
    });

    let result = [];

    let lastAspect = Infinity;
    const stripWidth = Math.min(width, height); // Shortest side
    const parentFlexDirection = stripWidth == width ? 'col' : 'row'

    function worst(row) {
        // Total area of this row (in actual pixels)
        const rowArea = row.reduce((sum, item) => sum + item._areaPct, 0) * totalAreaPxs;

        // Thickness of the strip in the direction perpendicular to w
        // w is the length of the side along which we're laying the strip
        const stripHeight = rowArea / stripWidth;

        let worstAspect = 0;
        for (const item of row) {
            const itemArea = item._areaPct * totalAreaPxs;

            // Other side (along the strip's main axis)
            const itemStripWidth = itemArea / stripHeight;

            const aspect = Math.max(itemStripWidth / stripHeight, stripHeight / itemStripWidth);
            if (aspect > worstAspect) worstAspect = aspect;
        }

        return worstAspect;
    }

    while (remaining.length > 1) {
        const head = remaining[remaining.length - 1];
        const worstAspect = worst([...result, head], stripWidth);
        if (worstAspect > lastAspect) break;

        result.push(remaining.pop());
        lastAspect = worstAspect;
    }

    const totalUsedAreaPct = result.reduce((sum, item) => sum + item._areaPct, 0);

    const usedAreaPxs = totalAreaPxs * totalUsedAreaPct;
    const remAreaPxs = totalAreaPxs * (1 - totalUsedAreaPct)
    let usedWidth, usedHeight, remWidth, remHeight;
    if (parentFlexDirection === 'col') {
        // The remaining rectangle is the bottom half of the column. Same width, shorter height.
        usedWidth = width;
        usedHeight = usedAreaPxs / width;
        remWidth = width;
        remHeight = remAreaPxs / width;
    } else {
        // The remaining rectangle is the right half of the row. Same height, shorter width.
        usedWidth = usedAreaPxs / height;
        usedHeight = height;
        remWidth = remAreaPxs / height;
        remHeight = height;
    }

    const usedStripFlexDirection = parentFlexDirection === 'row' ? 'col' : 'row'

    result = result.map(item => {
        const sizePct = item._areaPct / totalUsedAreaPct;
        item._sizePct = sizePct;
        if (item.children) {
            const itemAreaPxs = totalAreaPxs * item._areaPct;
            let itemWidth, itemHeight;
            if (usedStripFlexDirection === 'col') {
                // The item is in a column strip. Same width as the strip, height based on area.
                itemWidth = usedWidth;
                itemHeight = itemAreaPxs / usedWidth;
            } else {
                // The item is in a row strip. Same height as the strip, width based on area.
                itemWidth = itemAreaPxs / usedHeight;
                itemHeight = usedHeight;
            }

            return {
                ...item,
                ...squarify(itemWidth, itemHeight, item.children, getSizeValue),
                type: 'group',
            };
        } else {
            item.children = [];
            return item;
        }
    });

    const children = [{
        flexDirection: usedStripFlexDirection, // The strip should go opposite direction to flex direction of parent strip
        _sizePct: totalUsedAreaPct,
        children: result
    }]

    if (remWidth > 0 && remHeight > 0)
        children.push(squarify(remWidth, remHeight, remaining, getSizeValue))

    return {
        flexDirection: parentFlexDirection,
        children
    };
}


const MIN_CELL_AREA_PX = 1200; // ~50x24; smaller cells can't fit even short labels at 0.75em
const HOLDING_TRADING_INDUSTRY_ID = 70;

export function dropUnreadable(items, totalArea, getSize) {
    let kept = items.slice().sort((a, b) => (getSize(b) || 0) - (getSize(a) || 0));
    while (kept.length > 1) {
        const total = kept.reduce((s, i) => s + (getSize(i) || 0), 0);
        if (total <= 0) break;
        const smallest = kept[kept.length - 1];
        const area = ((getSize(smallest) || 0) / total) * totalArea;
        if (area >= MIN_CELL_AREA_PX) break;
        kept.pop();
    }
    return kept;
}

function MarketHeatMapTab() {

    const [tabSize, setTabSize] = useState({ width: 600, height: 600 });
    const [hoveredId, setHoveredId] = useState(null);

    const allIndustries = api.useGameStore(s => s.gameState.allIndustries);
    const controlledCompanies = api.useGameStore(s => s.gameState.controlledCompanies) || [];

    const totalArea = Math.max(tabSize.width * tabSize.height, 1);
    const filteredIndustries = (allIndustries || []).filter(ind => ind.id !== HOLDING_TRADING_INDUSTRY_ID);
    const visibleIndustries = dropUnreadable(filteredIndustries, totalArea, ind => ind.totalMarketCap);
    const industriesMarketCapTree = squarify(tabSize.width, tabSize.height, visibleIndustries, ind => ind.totalMarketCap);
    const hoveredNode = hoveredId != null ? (allIndustries || []).find(i => i.id === hoveredId) : null;

    const renderNode = (node, key, getColor, getText, onClick) => {
        // Leaf node (no children)
        if (!node.children || node.children.length === 0) {
            return html`
                <div
                    key=${key}
                    class="flex items-center text-center justify-center font-semibold text-slate-50 border border-slate-900 overflow-hidden"
                    style=${{
                    flex: node._sizePct ?? 1,
                    background: getColor ? getColor(node) : 'rgba(100, 100, 100, 0.5)',
                    cursor: 'pointer',
                    border: undefined,
                }}
                    onClick=${() => onClick(node)}
                    onMouseEnter=${() => setHoveredId(node.id)}
                    onMouseLeave=${() => setHoveredId(null)}
                >
                    <span style="pointer-events: none; font-size: 0.75em">${getText(node)}</span>
                </div>
    `;
        }

        if (node.type !== 'group')
            return html`
                <div
                    key=${key}
                    class=${`flex flex-${node.flexDirection} overflow-hidden`}
                    style=${{ flex: node._sizePct ?? 1, border: node.type === 'group' ? '1px solid cyan' : undefined }}
                >
                    ${node.children.map((child, i) => renderNode(child, `${key}-${i}`, getColor, getText, onClick))}
                </div>
            `;

        return html`
        <div
            class="flex flex-col overflow-hidden"
            style=${{
                flex: node._sizePct ?? 1,
                ...(node.type === 'group' ? {
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--border)',
                } : {})
            }}
        >
            <div
                style="cursor: pointer; color: white;"
                onClick=${() => onClick(node)}
                onMouseEnter=${() => setHoveredId(node.id ?? null)}
                onMouseLeave=${() => setHoveredId(null)}
            >
                ${getText(node)}
            </div>
            ${node.children.map((child, i) => renderNode(child, `${key}-${i}`, getColor, getText, onClick))}
        </div>`;
    };

    useEffect(() => {
        const tabElement = document.getElementById('market-heat-map-tab');
        if (!tabElement) return;
        const update = () => setTabSize({ width: tabElement.clientWidth, height: tabElement.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(tabElement);
        return () => ro.disconnect();
    }, []);

    const value2RGBA = (value, maxValue = 20) => {
        // Helper: clamp between 0–255
        const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));

        if (value > 0) {
            // Base green: rgb(34, 197, 94)
            const scale = Math.max(value / maxValue, 0.2); // scale toward full intensity
            const r = clamp(34 * scale);
            const g = clamp(197 * scale);
            const b = clamp(94 * scale);
            return `rgb(${r}, ${g}, ${b})`;
        }

        else if (value < 0) {
            // Base red: rgb(239, 68, 68)
            const scale = Math.max(-value / maxValue, 0.2);
            const r = clamp(239 * scale);
            const g = clamp(68 * scale);
            const b = clamp(68 * scale);
            return `rgb(${r}, ${g}, ${b})`;
        }

        // Neutral gray (unchanged)
        return 'rgb(0, 0, 0)';
    };

    const maxDemandGrowth = Math.max(...allIndustries.map(i => Math.abs(i.demandGrowth || 0)), 1);

    return html`
        <div id="market-heat-map-tab" data-hint="market-heatmap-grid" class="w-full h-full overflow-hidden" style="position: relative;">
            <div style="position: absolute; padding: 10px; font-size: 0.9em; background: rgba(20, 20, 20, 0.8); border: 1px solid rgba(100, 100, 100, 0.5); border-radius: 5px; margin: 10px; z-index: 10;">
                ${hoveredNode
        ? html`
                        ${hoveredNode.name}<br/>
                        Demand Growth: ${typeof hoveredNode.demandGrowth === 'number' ? hoveredNode.demandGrowth.toFixed(2) + '%' : '\u00A0'}<br/>
                        Long-Term Growth: ${typeof hoveredNode.permDemandGrowth === 'number' ? hoveredNode.permDemandGrowth.toFixed(2) + '%' : '\u00A0'}<br/>
                        Total Market Cap: ${typeof hoveredNode.totalMarketCap === 'number' ? '$' + (parseFloat(hoveredNode.totalMarketCap.toFixed(0))).toLocaleString() : '\u00A0'}
                    `
        : html`Hover over a sector to see details<br/>${'\u00A0'}<br/>${'\u00A0'}<br/>${'\u00A0'}`}
            </div>
            <div class="flex w-full h-full flex-${industriesMarketCapTree.flexDirection}">
                ${industriesMarketCapTree.children.map((node, i) => renderNode(node,
                    `root-${i}`, ind => value2RGBA(ind.demandGrowth, maxDemandGrowth),
                    ind => ind.name,
                    ind => api.viewIndustry(ind.id)))}
            </div>
        </div>
    `;
}

export default MarketHeatMapTab;