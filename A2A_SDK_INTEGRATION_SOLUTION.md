# A2A SDK Integration Solution

## Problem Summary

The A2A SDK (`@a2a-js/sdk`) was failing to call our custom agents with the error:
```
HTTP error for message/send! Status: 404 Not Found. Response: Cannot POST /
```

## Root Cause

The A2A SDK's `A2AExpressApp` class sets up the JSON-RPC endpoint at the **root path `/`**, not at `/message/send`. Our custom agents had:
- Agent card `url` field pointing to base URL: `http://localhost:3001`
- Endpoint at `/message/send` instead of `/`

When the SDK called `client.sendMessage()`, it posted to the `url` from the agent card directly, expecting a JSON-RPC endpoint at `/`.

## Solution

### 1. Changed Agent Endpoint from `/message/send` to `/`

Both agents now implement the JSON-RPC 2.0 protocol at the root path:

```typescript
app.post('/', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;
    
    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: Expected JSON-RPC 2.0' },
        id: null
      });
    }

    // Handle message/send method
    if (method === 'message/send') {
      const { message } = params;
      
      if (!message || message.kind !== 'message') {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32602, message: 'Invalid params: Expected A2A Message' },
          id
        });
      }

      // Execute agent
      const result = await executor.execute(message);
      
      // Return JSON-RPC success response
      return res.json({
        jsonrpc: '2.0',
        id,
        result
      });
    }

    // Unsupported method
    return res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32601, message: `Method not found: ${method}` },
      id
    });
  } catch (error) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error', data: { details: error.message } },
      id: req.body.id || null
    });
  }
});
```

### 2. Agent Card Format

Agent cards must have the `url` field pointing to the base URL where the JSON-RPC endpoint is hosted:

```json
{
  "name": "Simple Echo Agent",
  "url": "http://localhost:3001",
  "api": "http://localhost:3001",
  "capabilities": [...],
  "endpoints": {
    "execute": "/execute",
    "cancel": "/cancel/:taskId",
    "health": "/health"
  }
}
```

The SDK will:
1. Fetch the agent card from `http://localhost:3001/.well-known/agent-card.json`
2. Extract the `url` field: `http://localhost:3001`
3. POST JSON-RPC requests to: `http://localhost:3001/` (root)

## Testing Results

All 5 workflow execution tests now pass:

### Test 1: Echo Agent ✅
```
Input: "Hello from the Agentic Ecosystem!"
Output: {
  "echo": "Hello from the Agentic Ecosystem!",
  "receivedAt": "2025-11-19T17:41:18.449Z",
  "messageLength": 33
}
```

### Test 2: Text Transformer (Uppercase) ✅
```
Input: "hello world from agentic ecosystem"
Output: "HELLO WORLD FROM AGENTIC ECOSYSTEM"
```

### Test 3: Chained Workflow (Echo → Transform) ✅
```
Input: "hello agentic world"
Step 1 (Echo): "hello agentic world"
Step 2 (Uppercase): "HELLO AGENTIC WORLD"
```

### Test 4: Multi-step Pipeline ✅
```
Input: "hello world from agentic ecosystem"
Step 1 (Title): "Hello World From Agentic Ecosystem"
Step 2 (Upper): "HELLO WORLD FROM AGENTIC ECOSYSTEM"
Step 3 (Reverse): Complete transformation chain
```

### Test 5: Health Checks ✅
```
Echo agent: Available
Transformer agent: Available
```

## Key Learnings

### 1. A2A SDK Standard Pattern
The official A2A SDK uses `A2AExpressApp` which sets up:
- Agent card at `/.well-known/agent-card.json`
- JSON-RPC endpoint at root `/`
- Methods dispatched via `jsonrpc.method` field

### 2. JSON-RPC 2.0 Format
All requests/responses must follow JSON-RPC 2.0:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": { "message": {...} },
  "id": 1
}
```

**Success Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "kind": "message", ... }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

### 3. Standard Error Codes
- `-32700`: Parse error (invalid JSON)
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

### 4. Agent Card Requirements
- `url`: Base URL for JSON-RPC endpoint
- `api`: Same as `url` for HTTP agents
- `capabilities`: Array of agent capabilities
- `.well-known/agent-card.json`: Standard discovery path

## Files Modified

1. **agents/simple-echo-agent.ts** - Added JSON-RPC endpoint at `/`
2. **agents/text-transformer-agent.ts** - Added JSON-RPC endpoint at `/`

## How to Test

### 1. Start Agents
```bash
# Terminal 1 - Echo Agent
bun run agents/simple-echo-agent.ts

# Terminal 2 - Transformer Agent  
bun run agents/text-transformer-agent.ts
```

### 2. Run Workflow Tests
```bash
# Test with A2A SDK
bun run execute-workflow.ts
```

### 3. Direct JSON-RPC Test
```bash
curl -X POST http://localhost:3001/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "message/send",
    "params": {
      "message": {
        "kind": "message",
        "messageId": "test-123",
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello!"}]
      }
    },
    "id": 1
  }'
```

## Next Steps

1. ✅ A2A SDK integration working
2. ✅ Workflow execution with live agents
3. ⏭️ Integrate with full ecosystem (AgentRegistry, BudgetManager)
4. ⏭️ Implement YAML workflow executor with template resolution
5. ⏭️ Add retry policies and error handling
6. ⏭️ Support streaming and push notifications

## References

- A2A Protocol: https://google-a2a.github.io/A2A
- A2A SDK: https://www.npmjs.com/package/@a2a-js/sdk
- JSON-RPC 2.0: https://www.jsonrpc.org/specification
