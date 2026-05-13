# Wall Street Raider 10 - Frontend API Layer

This documentation covers the complete API surface for the Wall Street Raider 10 game frontend. The API communicates with the C++ backend (wsr10.exe) via two transports:

1. **REST API** (default): HTTP POST/GET requests to dynamically-assigned ports.
2. **IPC bridge** (addon mode, `WSR_NO_REST=1`): Electron IPC calls to main process.

The bridge handshake uses `get-bridge-ports` IPC to discover REST/WebSocket ports at startup. All API calls await `bridgeReady` before executing.

## Architecture
- **`bridgeReady`**: Promise that resolves when backend ports are discovered.
- **`gameStore`**: Zustand store holding all game state (polled every 50ms).
- **`WSRProvider`** / **`useWSRContext`**: React context providers.
- **`useGameStore`**: Custom hook for subscribing to Zustand state changes.

## Getting Started with MCP
A Model Context Protocol (MCP) server is available to allow AI assistants (like Claude or Gemini) to natively interact with the game. We use the Node.js `fastmcp` library to expose the game's API as MCP tools.

To run the MCP server manually:
```bash
cd resources/app
npm install fastmcp
node mcp_server.js
```
Once running, you can connect your MCP client via `stdio`. The MCP server provides tools like `get_game_state`, `buy_stock`, `sell_stock`, and `start_ticker` to automate and interact with the game engine.

### Connecting via MCP Config (Cursor, Windsurf, etc.)
If your MCP client uses a standard `mcp.json` or `config.json` (such as Cursor or Windsurf), add the following configuration:
```json
{
  "mcpServers": {
    "wsr-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/resources/app/mcp_server.js"]
    }
  }
}
```

### Connecting to Claude
If you are using the **Claude Code CLI**, you can easily add this server to your Claude configuration by running the following command from the `resources/app` directory:
```bash
claude mcp add wsr-mcp node mcp_server.js
```
For **Claude Desktop**, add the configuration JSON block shown above to your `claude_desktop_config.json`.

## Python Wrapper
A Python wrapper (`wsr_api.py`) is available that mirrors this JS API using `httpx` for REST calls and `websockets` for real-time state polling. See `wsr_api.py` documentation for usage.
