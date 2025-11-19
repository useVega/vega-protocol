# A2A Agent Development Guide

This guide explains how to create, deploy, and integrate A2A-compliant agents with the Agentic Ecosystem.

## Overview

The system now supports Google's A2A (Agent-to-Agent) protocol v0.3.0 for standardized agent communication. This enables:

- **Standardized Discovery**: Agent Cards at `/.well-known/agent-card.json`
- **Flexible Communication**: Message/Task pattern for sync/async operations
- **Real-time Updates**: Streaming and push notifications
- **Rich Capabilities**: Skill advertising and metadata

## Quick Start: Create an A2A Agent

### 1. Install A2A SDK

```bash
bun add @a2a-js/sdk express
```

### 2. Create Agent Server

Create `agents/web-crawler-agent.ts`:

```typescript
import express from 'express';
import { AgentExecutor, Task, Message, AgentCapability } from '@a2a-js/sdk';

// Define your agent's capabilities
const capabilities: AgentCapability[] = [
  {
    kind: 'skill',
    name: 'web-crawling',
    description: 'Crawls web pages and extracts content',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to crawl' }
      },
      required: ['url']
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Extracted content' },
        metadata: { type: 'object', description: 'Page metadata' }
      }
    }
  }
];

// Implement the AgentExecutor interface
class WebCrawlerExecutor implements AgentExecutor {
  async execute(input: Message): Promise<Message | Task> {
    try {
      // Extract URL from message
      const url = this.extractUrl(input);
      
      // Perform web crawling
      const result = await this.crawlWebPage(url);
      
      // Return Message for sync response
      return {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        contextId: input.contextId,
        parts: [
          {
            kind: 'text',
            text: `Successfully crawled ${url}`,
          },
          {
            kind: 'data',
            data: result,
          }
        ]
      };
    } catch (error) {
      // Return error message
      return {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        contextId: input.contextId,
        parts: [
          {
            kind: 'error',
            error: {
              code: 'CRAWL_FAILED',
              message: error.message
            }
          }
        ]
      };
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    // Implement task cancellation logic
    console.log(`Canceling task ${taskId}`);
  }

  private extractUrl(message: Message): string {
    for (const part of message.parts) {
      if (part.kind === 'text') {
        // Parse URL from text
        const urlMatch = part.text.match(/https?:\/\/[^\s]+/);
        if (urlMatch) return urlMatch[0];
      }
      if (part.kind === 'data' && part.data.url) {
        return part.data.url;
      }
    }
    throw new Error('No URL found in message');
  }

  private async crawlWebPage(url: string): Promise<any> {
    // Implement actual crawling logic
    const response = await fetch(url);
    const html = await response.text();
    
    return {
      content: html.substring(0, 1000), // Truncate for demo
      metadata: {
        url,
        contentLength: html.length,
        crawledAt: new Date().toISOString()
      }
    };
  }
}

// Create Express server
const app = express();
app.use(express.json());

// Serve Agent Card
app.get('/.well-known/agent-card.json', (req, res) => {
  res.json({
    name: 'Web Crawler Agent',
    description: 'Crawls web pages and extracts content',
    version: '1.0.0',
    author: 'Your Organization',
    contactEmail: 'support@example.com',
    capabilities,
    endpoints: {
      execute: '/execute',
      cancel: '/cancel'
    }
  });
});

// Executor instance
const executor = new WebCrawlerExecutor();

// Execute endpoint
app.post('/execute', async (req, res) => {
  try {
    const message: Message = req.body;
    const result = await executor.execute(message);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel endpoint
app.post('/cancel/:taskId', async (req, res) => {
  try {
    await executor.cancelTask(req.params.taskId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Web Crawler Agent running on http://localhost:${PORT}`);
  console.log(`Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
});
```

### 3. Start the Agent

```bash
bun run agents/web-crawler-agent.ts
```

### 4. Register with Ecosystem

Update your agent registration to use the live endpoint:

```typescript
const agent = await agentRegistry.createAgent({
  name: 'Web Crawler',
  description: 'Crawls and extracts web content',
  category: 'data_processing',
  endpoint: 'http://localhost:3001', // Your agent server
  version: '1.0.0',
  owner: '0x...',
  pricing: {
    model: 'per-call',
    basePrice: '0.1',
    token: 'USDC',
    chain: 'base',
  },
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' }
    },
    required: ['url']
  },
  outputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      metadata: { type: 'object' }
    }
  }
});

await agentRegistry.publishAgent(agent.ref);
```

## Advanced Patterns

### Long-Running Tasks (Task Pattern)

For operations that take >30 seconds:

```typescript
async execute(input: Message): Promise<Message | Task> {
  // Create a task for async processing
  const taskId = crypto.randomUUID();
  
  // Start background processing
  this.processInBackground(taskId, input);
  
  // Return Task immediately
  return {
    kind: 'task',
    taskId,
    status: 'running',
    createdAt: new Date().toISOString()
  };
}

private async processInBackground(taskId: string, input: Message) {
  try {
    // Long operation
    const result = await this.longRunningOperation(input);
    
    // Send push notification when done
    await this.sendPushNotification(taskId, result);
  } catch (error) {
    await this.sendPushNotification(taskId, null, error);
  }
}
```

### Streaming Responses

For real-time updates:

```typescript
app.get('/stream/:contextId', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { contextId } = req.params;
  
  // Send periodic updates
  const interval = setInterval(() => {
    const event = {
      kind: 'progress',
      contextId,
      progress: Math.random() * 100,
      message: 'Processing...'
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }, 1000);

  // Clean up
  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### Push Notifications

Configure webhook for async task completion:

```typescript
interface PushConfig {
  webhookUrl: string;
  secret: string;
}

async sendPushNotification(taskId: string, result: any, error?: Error) {
  const payload = {
    taskId,
    status: error ? 'failed' : 'completed',
    result: error ? null : result,
    error: error?.message,
    completedAt: new Date().toISOString()
  };

  await fetch(this.pushConfig.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': this.pushConfig.secret
    },
    body: JSON.stringify(payload)
  });
}
```

## Testing Your Agent

### Test Agent Card

```bash
curl http://localhost:3001/.well-known/agent-card.json
```

### Test Execution

```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "message",
    "messageId": "test-123",
    "role": "user",
    "parts": [
      {
        "kind": "text",
        "text": "Crawl https://example.com"
      }
    ]
  }'
```

### Test with Ecosystem

```typescript
// Create and execute workflow with your agent
const workflowYaml = `
name: Test Web Crawler
description: Test the web crawler agent
version: 1.0.0
inputs:
  url: string
outputs:
  content: string

nodes:
  - id: crawl
    name: Crawl Website
    agent: web-crawler-v1
    inputs:
      url: "{{input.url}}"

edges:
  - from: crawl
    to: output
`;

const spec = yamlParser.parse(workflowYaml);
const run = await scheduler.scheduleRun(spec, 'user-123', { url: 'https://example.com' });
const result = await executionEngine.executeRun(spec, run, { url: 'https://example.com' });

console.log('Result:', result);
```

## Deployment

### Local Development

```bash
bun run agents/web-crawler-agent.ts
```

### Production (Docker)

Create `Dockerfile`:

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production

COPY agents ./agents
EXPOSE 3001

CMD ["bun", "run", "agents/web-crawler-agent.ts"]
```

Build and run:

```bash
docker build -t web-crawler-agent .
docker run -p 3001:3001 web-crawler-agent
```

### Cloud Deployment

Deploy to any platform that supports Node.js/Bun:

- **Vercel**: `vercel deploy`
- **Fly.io**: `fly deploy`
- **Railway**: Connect GitHub repo
- **AWS ECS/Fargate**: Deploy Docker container
- **Google Cloud Run**: Deploy Docker container

## Agent Examples

See the `agents/` directory for example implementations:

1. **Web Crawler** (`agents/web-crawler.ts`) - HTTP requests and HTML parsing
2. **Sentiment Analyzer** (`agents/sentiment-analyzer.ts`) - NLP processing
3. **Image Generator** (`agents/image-generator.ts`) - Long-running tasks
4. **Data Transformer** (`agents/data-transformer.ts`) - Sync data processing

## Best Practices

### Error Handling

```typescript
async execute(input: Message): Promise<Message | Task> {
  try {
    // Your logic
    return this.createSuccessMessage(result);
  } catch (error) {
    return this.createErrorMessage(error);
  }
}

private createErrorMessage(error: Error): Message {
  return {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'agent',
    parts: [
      {
        kind: 'error',
        error: {
          code: 'EXECUTION_FAILED',
          message: error.message,
          details: error.stack
        }
      }
    ]
  };
}
```

### Input Validation

```typescript
async execute(input: Message): Promise<Message | Task> {
  // Validate input schema
  const validation = this.validateInput(input);
  if (!validation.valid) {
    return this.createErrorMessage(new Error(validation.error));
  }
  
  // Process valid input
  return this.processMessage(input);
}
```

### Logging

```typescript
import { logger } from '../src/utils/logger';

async execute(input: Message): Promise<Message | Task> {
  logger.info('[WebCrawler]', `Executing: ${input.messageId}`);
  
  try {
    const result = await this.crawl(input);
    logger.info('[WebCrawler]', `Completed: ${input.messageId}`);
    return result;
  } catch (error) {
    logger.error('[WebCrawler]', `Failed: ${error.message}`);
    throw error;
  }
}
```

### Rate Limiting

```typescript
class RateLimitedExecutor implements AgentExecutor {
  private requestCount = new Map<string, number>();
  private readonly maxRequestsPerMinute = 60;

  async execute(input: Message): Promise<Message | Task> {
    const userId = input.metadata?.userId;
    
    // Check rate limit
    if (this.isRateLimited(userId)) {
      return this.createErrorMessage(new Error('Rate limit exceeded'));
    }
    
    // Track request
    this.trackRequest(userId);
    
    // Execute
    return this.doExecute(input);
  }
}
```

## A2A Protocol Features

### Agent Cards

Agent Cards provide standardized metadata at `/.well-known/agent-card.json`:

```json
{
  "name": "Web Crawler Agent",
  "description": "Crawls web pages and extracts content",
  "version": "1.0.0",
  "author": "Your Organization",
  "contactEmail": "support@example.com",
  "capabilities": [
    {
      "kind": "skill",
      "name": "web-crawling",
      "description": "Crawls web pages",
      "inputSchema": {...},
      "outputSchema": {...}
    }
  ],
  "endpoints": {
    "execute": "/execute",
    "cancel": "/cancel",
    "stream": "/stream/:contextId"
  }
}
```

### Message Parts

A2A supports rich message parts:

```typescript
// Text part
{ kind: 'text', text: 'Hello world' }

// Data part
{ kind: 'data', data: { key: 'value' } }

// Error part
{ kind: 'error', error: { code: 'ERR_001', message: 'Failed' } }

// Artifact part (files, images, etc.)
{ kind: 'artifact', artifact: { uri: 'file://path', mimeType: 'image/png' } }
```

### Skills & Capabilities

Advertise agent capabilities:

```typescript
capabilities: [
  {
    kind: 'skill',
    name: 'sentiment-analysis',
    description: 'Analyzes sentiment of text',
    tags: ['nlp', 'text', 'analysis'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        score: { type: 'number', minimum: 0, maximum: 1 }
      }
    }
  }
]
```

## Integration with Ecosystem

The Agentic Ecosystem automatically:

1. **Discovers Agents**: Fetches Agent Cards from registered endpoints
2. **Creates Clients**: Initializes A2A clients for each agent
3. **Executes Workflows**: Orchestrates multi-agent workflows
4. **Handles Responses**: Processes Message/Task responses
5. **Manages Context**: Resolves template variables between nodes
6. **Tracks Costs**: Records execution costs per agent call

## Next Steps

1. ✅ Create your first A2A agent
2. ✅ Deploy agent server
3. ✅ Register agent in ecosystem
4. ✅ Create workflow using your agent
5. ✅ Execute and test workflow
6. ⏳ Add streaming support
7. ⏳ Implement push notifications
8. ⏳ Deploy to production

## Resources

- **A2A SDK**: https://github.com/google/a2a
- **Agent Examples**: `/agents` directory
- **Workflow Examples**: `example-a2a.ts`
- **Type Definitions**: `src/types/a2a.types.ts`
- **Execution Engine**: `src/execution/execution-engine.service.ts`

## Support

For questions or issues:
- Check example agents in `/agents`
- Review `example-a2a.ts` for integration patterns
- See A2A SDK documentation
- Run `bun dev.ts project-stats` for system overview
