# Agents & Workflows

This directory contains example A2A-compliant agents and workflow definitions.

## 🤖 Available Agents

### 1. Simple Echo Agent (`agents/simple-echo-agent.ts`)
**Port:** 3001  
**Purpose:** Echoes back messages with metadata

**Capabilities:**
- Receives text messages
- Returns echo with timestamp and message length
- Demonstrates basic A2A protocol implementation

**Start:**
```bash
bun run agents/simple-echo-agent.ts
```

**Test:**
```bash
curl http://localhost:3001/.well-known/agent-card.json
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{"kind":"message","messageId":"test-123","role":"user","parts":[{"kind":"text","text":"Hello World"}]}'
```

---

### 2. Text Transformer Agent (`agents/text-transformer-agent.ts`)
**Port:** 3002  
**Purpose:** Transforms text in various ways

**Capabilities:**
- `uppercase` - Convert to UPPERCASE
- `lowercase` - Convert to lowercase
- `reverse` - Reverse text
- `wordcount` - Count words
- `capitalize` - Capitalize first letter
- `titlecase` - Convert To Title Case

**Start:**
```bash
bun run agents/text-transformer-agent.ts
```

**Test:**
```bash
curl http://localhost:3002/.well-known/agent-card.json
curl -X POST http://localhost:3002/execute \
  -H "Content-Type: application/json" \
  -d '{"kind":"message","messageId":"test-456","role":"user","parts":[{"kind":"data","data":{"text":"hello world","operation":"uppercase"}}]}'
```

---

## 📋 Available Workflows

### 1. Simple Text Flow (`workflows/simple-text-flow.yaml`)

**Description:** Basic two-step pipeline demonstrating agent chaining

**Flow:**
```
Input → Echo Agent → Text Transformer (uppercase) → Output
```

**Usage:**
```bash
# Start agents
bun run agents/simple-echo-agent.ts &
bun run agents/text-transformer-agent.ts &

# Test workflow parsing
bun run test-workflow.ts
```

**Input:**
```yaml
message: "Hello from the Agentic Ecosystem!"
```

**Output:**
```yaml
original: "Hello from the Agentic Ecosystem!"
transformed: "HELLO FROM THE AGENTIC ECOSYSTEM!"
```

---

### 2. Advanced Text Flow (`workflows/advanced-text-flow.yaml`)

**Description:** Multi-step text processing with various transformations

**Flow:**
```
Input → Validate → Title Case → Uppercase → Reverse → Output
         ↓
      Word Count (parallel)
```

**Features:**
- Linear transformation pipeline
- Parallel word counting
- Multiple retry policies
- Template variable resolution

**Usage:**
```bash
# Start agents (if not already running)
bun run agents/simple-echo-agent.ts &
bun run agents/text-transformer-agent.ts &

# Test workflow parsing
bun run test-workflow.ts
```

**Input:**
```yaml
text: "hello world from agentic ecosystem"
```

**Expected Output:**
```yaml
original: "hello world from agentic ecosystem"
titleCase: "Hello World From Agentic Ecosystem"
uppercase: "HELLO WORLD FROM AGENTIC ECOSYSTEM"
reversed: "METSYSOCE CITNEG MORF DLROW OLLEH"
```

---

## 🚀 Quick Start Guide

### Step 1: Start Both Agents
```bash
# Terminal 1 - Echo Agent
bun run agents/simple-echo-agent.ts

# Terminal 2 - Text Transformer
bun run agents/text-transformer-agent.ts
```

### Step 2: Test Workflow Parsing
```bash
bun run test-workflow.ts
```

You should see output like:
```
✓ Parsed workflow: Simple Text Processing Flow
  Description: A simple two-step workflow that echoes text and transforms it
  Nodes: 2
  Edges: 1
```

### Step 3: Execute Workflow (Coming Soon)
```bash
# Once execution engine is fully integrated with registry
bun run run-workflow.ts
```

---

## 📝 Creating Your Own Agent

### 1. Copy Template
```bash
cp agents/simple-echo-agent.ts agents/my-custom-agent.ts
```

### 2. Update Agent Logic
```typescript
class MyCustomExecutor implements AgentExecutor {
  async execute(input: Message): Promise<Message | Task> {
    // Your custom logic here
    const result = await this.processInput(input);
    
    return {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'agent',
      contextId: input.contextId,
      parts: [
        { kind: 'text', text: 'Result text' },
        { kind: 'data', data: result }
      ]
    };
  }
}
```

### 3. Update Agent Card
```typescript
app.get('/.well-known/agent-card.json', (req, res) => {
  res.json({
    name: 'My Custom Agent',
    description: 'What my agent does',
    capabilities: [/* your capabilities */],
    // ... rest of card
  });
});
```

### 4. Start Your Agent
```typescript
const PORT = process.env.PORT || 3003; // Use unique port
app.listen(PORT, () => {
  logger.info('[MyAgent]', `Running on http://localhost:${PORT}`);
});
```

---

## 📝 Creating Your Own Workflow

### 1. Create YAML File
```bash
touch workflows/my-workflow.yaml
```

### 2. Define Workflow Structure
```yaml
name: My Custom Workflow
description: What my workflow does
version: 1.0.0
chain: base
token: USDC
maxBudget: "1.0"
entryNode: step1
tags:
  - custom
  - example

nodes:
  step1:
    type: agent
    agent: simple-echo-v1
    name: First Step
    inputs:
      message: "{{input.text}}"
    retry:
      maxAttempts: 3
      backoffMs: 1000

  step2:
    type: agent
    agent: text-transformer-v1
    name: Second Step
    inputs:
      text: "{{step1.output}}"
      operation: "uppercase"
    retry:
      maxAttempts: 3
      backoffMs: 1000

edges:
  - from: step1
    to: step2
```

### 3. Test Your Workflow
```bash
bun run test-workflow.ts
```

---

## 🔧 Development Tips

### Agent Development
1. **Use TypeScript** - Full type safety with A2A SDK types
2. **Implement AgentExecutor** - Required interface for A2A compliance
3. **Serve Agent Card** - At `/.well-known/agent-card.json`
4. **Handle Errors** - Return error messages in A2A format
5. **Add Logging** - Use the Logger utility for consistent output

### Workflow Development
1. **Use Template Variables** - `{{input.field}}`, `{{node.output}}`
2. **Set Retry Policies** - Handle transient failures gracefully
3. **Chain Agents** - Connect outputs to inputs via templates
4. **Set Budgets** - Define max cost in USDC/ETH/SOL
5. **Test Incrementally** - Parse first, then execute

### Testing
```bash
# Test agent endpoints
curl http://localhost:3001/health
curl http://localhost:3002/health

# Test agent cards
curl http://localhost:3001/.well-known/agent-card.json
curl http://localhost:3002/.well-known/agent-card.json

# Test workflow parsing
bun run test-workflow.ts

# Test complete system
bun run example-a2a.ts
```

---

## 📚 Additional Resources

- **A2A Protocol Guide:** `/A2A_AGENT_DEVELOPMENT.md`
- **Project Structure:** `/PROJECT_STRUCTURE.md`
- **Development Status:** `/DEVELOPMENT.md`
- **A2A SDK Docs:** https://github.com/google/a2a

---

## 🎯 Next Steps

1. ✅ Create your custom agent
2. ✅ Define workflow YAML
3. ⏳ Register agents with ecosystem
4. ⏳ Execute workflows end-to-end
5. ⏳ Add payment settlement
6. ⏳ Deploy to production

---

## 🐛 Troubleshooting

**Agent won't start:**
- Check port availability: `lsof -i :3001`
- Verify dependencies: `bun install`
- Check logs for errors

**Workflow parse fails:**
- Validate YAML syntax
- Check node references in edges
- Ensure required fields present (name, version, chain, token, maxBudget, entryNode)

**Agent execution fails:**
- Verify agents are running: `curl http://localhost:3001/health`
- Check input format matches agent schema
- Review agent logs for errors

---

## 📞 Support

For questions or issues:
- Check example agents in `/agents`
- Review workflow YAMLs in `/workflows`
- See A2A development guide: `/A2A_AGENT_DEVELOPMENT.md`
- Run system stats: `bun dev.ts project-stats`
