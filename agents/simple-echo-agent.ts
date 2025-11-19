/**
 * Simple Echo Agent - A2A Protocol Example
 * 
 * This is a minimal A2A-compliant agent that echoes back messages.
 * Perfect for testing the Agentic Ecosystem's A2A integration.
 * 
 * Run: bun run agents/simple-echo-agent.ts
 * Test: curl http://localhost:3001/.well-known/agent-card.json
 */

import express from 'express';
import type { Task, Message } from '@a2a-js/sdk';
import { Logger } from '../src/utils/logger';

const logger = new Logger('EchoAgent');

// Types from A2A SDK
interface AgentCapability {
  kind: string;
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
}

interface AgentExecutor {
  execute(input: Message): Promise<Message | Task>;
  cancelTask(taskId: string): Promise<void>;
}

// Define agent capabilities
const capabilities: AgentCapability[] = [
  {
    kind: 'skill',
    name: 'echo',
    description: 'Echoes back the input message with metadata',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' }
      },
      required: ['message']
    },
    outputSchema: {
      type: 'object',
      properties: {
        echo: { type: 'string', description: 'Echoed message' },
        receivedAt: { type: 'string', description: 'Timestamp' },
        messageLength: { type: 'number', description: 'Length of message' }
      }
    }
  }
];

/**
 * Simple Echo Agent Implementation
 */
class EchoAgentExecutor implements AgentExecutor {
  /**
   * Execute the agent's main logic
   */
  async execute(input: Message): Promise<Message | Task> {
    logger.info('[EchoAgent]', `Received message: ${input.messageId}`);

    try {
      // Extract message text
      const messageText = this.extractMessage(input);
      
      // Process message
      const result = {
        echo: messageText,
        receivedAt: new Date().toISOString(),
        messageLength: messageText.length,
        metadata: {
          contextId: input.contextId,
          originalMessageId: input.messageId
        }
      };

      logger.info('[EchoAgent]', `Echoing: "${messageText}"`);

      // Return sync response as Message
      return {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        contextId: input.contextId,
        parts: [
          {
            kind: 'text',
            text: `Echo: ${messageText}`
          },
          {
            kind: 'data',
            data: result
          }
        ]
      };
    } catch (error) {
      logger.error('[EchoAgent]', `Error: ${(error as Error).message}`);
      
      return {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        contextId: input.contextId,
        parts: [
          {
            kind: 'text',
            text: `Error: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<void> {
    logger.info('[EchoAgent]', `Cancel requested for task: ${taskId}`);
    // Echo agent is synchronous, no cancellation needed
  }

  /**
   * Extract message text from A2A message parts
   */
  private extractMessage(message: Message): string {
    for (const part of message.parts) {
      if (part.kind === 'text') {
        return part.text;
      }
      if (part.kind === 'data' && typeof part.data === 'object' && part.data !== null) {
        const data = part.data as Record<string, any>;
        if ('message' in data) return String(data.message);
        if ('text' in data) return String(data.text);
        if ('input' in data) return String(data.input);
      }
    }
    throw new Error('No message text found in input');
  }
}

/**
 * Create and start Express server
 */
const app = express();
app.use(express.json());

const executor = new EchoAgentExecutor();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'Simple Echo Agent',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Agent Card - A2A Discovery
 */
app.get('/.well-known/agent-card.json', (req, res) => {
  res.json({
    name: 'Simple Echo Agent',
    description: 'A simple A2A agent that echoes back messages with metadata',
    version: '1.0.0',
    url: `http://${HOST}:${PORT}`,
    api: `http://${HOST}:${PORT}`,
    author: 'Agentic Ecosystem',
    contactEmail: 'support@agentic-eco.example',
    homepage: `http://${HOST}:${PORT}`,
    capabilities,
    endpoints: {
      execute: '/execute',
      cancel: '/cancel/:taskId',
      health: '/health'
    },
    metadata: {
      protocol: 'A2A v0.3.0',
      responseTime: '< 100ms',
      availability: '24/7'
    }
  });
});

/**
 * Execute endpoint - Main A2A interaction
 */
app.post('/execute', async (req, res) => {
  try {
    const message: Message = req.body;
    
    // Validate message structure
    if (!message || message.kind !== 'message') {
      return res.status(400).json({
        error: 'Invalid message format. Expected A2A Message.'
      });
    }

    logger.info('[EchoAgent]', `POST /execute - MessageId: ${message.messageId}`);

    // Execute agent
    const result = await executor.execute(message);
    
    res.json({ result });
  } catch (error) {
    logger.error('[EchoAgent]', `Execute failed: ${(error as Error).message}`);
    res.status(500).json({
      error: (error as Error).message
    });
  }
});

/**
 * A2A JSON-RPC endpoint - Root "/"
 * This is the standard A2A protocol endpoint per the SDK
 */
app.post('/', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;
    
    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: Expected JSON-RPC 2.0'
        },
        id: null
      });
    }

    logger.info('[EchoAgent]', `POST / - JSON-RPC method: ${method}, id: ${id}`);

    // Handle message/send method
    if (method === 'message/send') {
      const { message } = params;
      
      if (!message || message.kind !== 'message') {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: Expected A2A Message'
          },
          id
        });
      }

      logger.info('[EchoAgent]', `Executing message/send - MessageId: ${message.messageId}`);

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
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      },
      id
    });
  } catch (error) {
    logger.error('[EchoAgent]', `JSON-RPC handler failed: ${(error as Error).message}`);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: { details: (error as Error).message }
      },
      id: req.body.id || null
    });
  }
});

/**
 * Cancel endpoint - Task cancellation
 */
app.post('/cancel/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.info('[EchoAgent]', `POST /cancel/${taskId}`);
    
    await executor.cancelTask(taskId);
    
    res.json({
      success: true,
      taskId,
      message: 'Task cancelled'
    });
  } catch (error) {
    logger.error('[EchoAgent]', `Cancel failed: ${(error as Error).message}`);
    res.status(500).json({
      error: (error as Error).message
    });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  logger.info('[EchoAgent]', '='.repeat(60));
  logger.info('[EchoAgent]', '🤖 Simple Echo Agent - A2A Protocol v0.3.0');
  logger.info('[EchoAgent]', '='.repeat(60));
  logger.info('[EchoAgent]', `✓ Server running on http://${HOST}:${PORT}`);
  logger.info('[EchoAgent]', `✓ Agent Card: http://${HOST}:${PORT}/.well-known/agent-card.json`);
  logger.info('[EchoAgent]', `✓ Health Check: http://${HOST}:${PORT}/health`);
  logger.info('[EchoAgent]', `✓ Execute: POST http://${HOST}:${PORT}/execute`);
  logger.info('[EchoAgent]', '='.repeat(60));
  logger.info('[EchoAgent]', 'Ready to receive A2A messages! 🚀');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('[EchoAgent]', 'SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[EchoAgent]', 'SIGINT received, shutting down gracefully...');
  process.exit(0);
});
