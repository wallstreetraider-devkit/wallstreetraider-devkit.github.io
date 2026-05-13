const { FastMCP } = require('fastmcp');

// Note: Node 18+ includes native fetch.
const mcp = new FastMCP({
    name: "Wall Street Raider 10 MCP",
    version: "1.0.0"
});

// Assuming the REST API defaults to 54321 as per documentation.
// In practice, port may be dynamic and loaded via %LOCALAPPDATA%\Wall Street Raider\runtime.json
const API_BASE = "http://127.0.0.1:54321";

mcp.addTool({
    name: "get_game_state",
    description: "Fetch the complete current game state, including companies, industries, player holdings, and economic data.",
    parameters: {
        type: "object",
        properties: {},
        required: []
    }
}, async () => {
    try {
        const response = await fetch(`${API_BASE}/gamestate`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        return { gameState: data };
    } catch (error) {
        return { error: error.message };
    }
});

mcp.addTool({
    name: "buy_stock",
    description: "Buy stock of a company.",
    parameters: {
        type: "object",
        properties: {
            id: { type: "number", description: "Company entity ID" },
            actingAsId: { type: "number", description: "Entity to act as (0 for current view entity)" }
        },
        required: ["id"]
    }
}, async ({ id, actingAsId = 0 }) => {
    try {
        const body = actingAsId > 0 ? { id, intParam2: actingAsId } : { id };
        const response = await fetch(`${API_BASE}/buy_stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
});

mcp.addTool({
    name: "sell_stock",
    description: "Sell stock of a company.",
    parameters: {
        type: "object",
        properties: {
            id: { type: "number", description: "Company entity ID" },
            actingAsId: { type: "number", description: "Entity to act as (0 for current view entity)" }
        },
        required: ["id"]
    }
}, async ({ id, actingAsId = 0 }) => {
    try {
        const body = actingAsId > 0 ? { id, intParam2: actingAsId } : { id };
        const response = await fetch(`${API_BASE}/sell_stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
});

mcp.addTool({
    name: "start_ticker",
    description: "Start the game ticker (auto-advance through months).",
    parameters: {
        type: "object",
        properties: {},
        required: []
    }
}, async () => {
    try {
        const response = await fetch(`${API_BASE}/start_ticker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return { success: await response.text() };
    } catch (error) {
        return { error: error.message };
    }
});

mcp.start();
console.error("FastMCP Server running on stdio");
