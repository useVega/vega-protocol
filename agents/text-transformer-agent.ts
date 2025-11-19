/**
 * Text Transformer Agent - A2A Protocol Example
 * 
 * Transforms text in various ways: uppercase, lowercase, reverse, word count, etc.
 * Demonstrates a practical A2A agent that can be chained with other agents.
 * 
 * Run: bun run agents/text-transformer-agent.ts
 * Test: curl http://localhost:3002/.well-known/agent-card.json
 */

import express from 'express';
import type { Task, Message } from '@a2a-js/sdk';
import { Logger } from '../src/utils/logger';

const logger = new Logger('TextTransformer');

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

// Transformation operations
type TransformOperation = 'uppercase' | 'lowercase' | 'reverse' | 'wordcount' | 'capitalize' | 'titlecase';

// Define agent capabilities
const capabilities: AgentCapability[] = [
  {
    kind: 'skill',
    name: 'text-transformation',
    description: 'Transforms text in various ways (uppercase, lowercase, reverse, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to transform' },
        operation: { 
          type: 'string', 
          enum: ['uppercase', 'lowercase', 'reverse', 'wordcount', 'capitalize', 'titlecase'],
          description: 'Type of transformation to apply'
        }
      },
      required: ['text', 'operation']
    },
    outputSchema: {
      type: 'object',
      properties: {
        original: { type: 'string', description: 'Original text' },
        transformed: { type: 'string', description: 'Transformed text' },
        operation: { type: 'string', description: 'Operation performed' },
        stats: { 
          type: 'object',
          properties: {
            originalLength: { type: 'number' },
            transformedLength: { type: 'number' },
            wordCount: { type: 'number' }
          }
        }
      }
    }
  }
];

/**
 * Text Transformer Agent Implementation
 */
class TextTransformerExecutor implements AgentExecutor {
  /**
   * Execute text transformation
   */
  async execute(input: Message): Promise<Message | Task> {
    logger.info('[TextTransformer]', `Received message: ${input.messageId}`);

    try {
      // Extract input data
      const { text, operation } = this.extractInput(input);
      
      // Validate operation
      if (!this.isValidOperation(operation)) {
        throw new Error(`Invalid operation: ${operation}. Valid operations: uppercase, lowercase, reverse, wordcount, capitalize, titlecase`);
      }

      // Perform transformation
      const transformed = this.transform(text, operation);
      
      // Calculate stats
      const stats = {
        originalLength: text.length,
        transformedLength: transformed.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length
      };

      const result = {
        original: text,
        transformed,
        operation,
        stats,
        processedAt: new Date().toISOString()
      };

      logger.info('[TextTransformer]', `Transformed text using ${operation}`);

      // Return sync response as Message
      return {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        contextId: input.contextId,
        parts: [
          {
            kind: 'text',
            text: transformed
          },
          {
            kind: 'data',
            data: result
          }
        ]
      };
    } catch (error) {
      logger.error('[TextTransformer]', `Error: ${(error as Error).message}`);
      
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
    logger.info('[TextTransformer]', `Cancel requested for task: ${taskId}`);
    // Text transformation is synchronous, no cancellation needed
  }

  /**
   * Extract input data from A2A message
   */
  private extractInput(message: Message): { text: string; operation: TransformOperation } {
    let text: string | undefined;
    let operation: TransformOperation | undefined;

    for (const part of message.parts) {
      if (part.kind === 'text') {
        // Try to parse as JSON or use as-is
        try {
          const parsed = JSON.parse(part.text);
          if (parsed.text) text = parsed.text;
          if (parsed.operation) operation = parsed.operation;
        } catch {
          // Not JSON, use text as-is
          if (!text) text = part.text;
        }
      }
      if (part.kind === 'data' && typeof part.data === 'object' && part.data !== null) {
        const data = part.data as Record<string, any>;
        if (data.text) text = String(data.text);
        if (data.operation) operation = data.operation as TransformOperation;
      }
    }

    if (!text) {
      throw new Error('No text found in message');
    }
    if (!operation) {
      // Default to uppercase if not specified
      operation = 'uppercase';
    }

    return { text, operation };
  }

  /**
   * Check if operation is valid
   */
  private isValidOperation(operation: string): operation is TransformOperation {
    return ['uppercase', 'lowercase', 'reverse', 'wordcount', 'capitalize', 'titlecase'].includes(operation);
  }

  /**
   * Perform text transformation
   */
  private transform(text: string, operation: TransformOperation): string {
    switch (operation) {
      case 'uppercase':
        return text.toUpperCase();
      
      case 'lowercase':
        return text.toLowerCase();
      
      case 'reverse':
        return text.split('').reverse().join('');
      
      case 'wordcount':
        const count = text.split(/\s+/).filter(w => w.length > 0).length;
        return `Word count: ${count}`;
      
      case 'capitalize':
        return text.charAt(0).toUpperCase() + text.slice(1);
      
      case 'titlecase':
        return text
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      
      default:
        return text;
    }
  }
}

/**
 * Create and start Express server
 */
const app = express();
app.use(express.json());

const executor = new TextTransformerExecutor();
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || 'localhost';

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'Text Transformer Agent',
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
    name: 'Text Transformer Agent',
    description: 'Transforms text in various ways: uppercase, lowercase, reverse, word count, capitalize, title case',
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
      responseTime: '< 50ms',
      availability: '24/7',
      operations: ['uppercase', 'lowercase', 'reverse', 'wordcount', 'capitalize', 'titlecase']
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

    logger.info('[TextTransformer]', `POST /execute - MessageId: ${message.messageId}`);

    // Execute agent
    const result = await executor.execute(message);
    
    res.json({ result });
  } catch (error) {
    logger.error('[TextTransformer]', `Execute failed: ${(error as Error).message}`);
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

    logger.info('[TextTransformer]', `POST / - JSON-RPC method: ${method}, id: ${id}`);

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

      logger.info('[TextTransformer]', `Executing message/send - MessageId: ${message.messageId}`);

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
    logger.error('[TextTransformer]', `JSON-RPC handler failed: ${(error as Error).message}`);
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
    logger.info('[TextTransformer]', `POST /cancel/${taskId}`);
    
    await executor.cancelTask(taskId);
    
    res.json({
      success: true,
      taskId,
      message: 'Task cancelled'
    });
  } catch (error) {
    logger.error('[TextTransformer]', `Cancel failed: ${(error as Error).message}`);
    res.status(500).json({
      error: (error as Error).message
    });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  logger.info('[TextTransformer]', '='.repeat(60));
  logger.info('[TextTransformer]', '🔄 Text Transformer Agent - A2A Protocol v0.3.0');
  logger.info('[TextTransformer]', '='.repeat(60));
  logger.info('[TextTransformer]', `✓ Server running on http://${HOST}:${PORT}`);
  logger.info('[TextTransformer]', `✓ Agent Card: http://${HOST}:${PORT}/.well-known/agent-card.json`);
  logger.info('[TextTransformer]', `✓ Health Check: http://${HOST}:${PORT}/health`);
  logger.info('[TextTransformer]', `✓ Execute: POST http://${HOST}:${PORT}/execute`);
  logger.info('[TextTransformer]', '='.repeat(60));
  logger.info('[TextTransformer]', 'Ready to transform text! 🚀');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('[TextTransformer]', 'SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[TextTransformer]', 'SIGINT received, shutting down gracefully...');
  process.exit(0);
});
