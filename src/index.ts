/**
 * Main Application Entry Point
 * Agentic Ecosystem - Multi-Agent Workflow Platform with A2A Protocol
 */

import { createLogger } from './utils';
import { AgentRegistry } from './registry';
import { WorkflowYAMLParser, WorkflowValidator, WorkflowScheduler } from './workflow';
import { BudgetManager } from './payment';
import { A2AAgentCaller, WorkflowExecutionEngine } from './execution';
import { CONFIG } from './config';

const logger = createLogger('Main');

// Initialize core services
logger.info('Initializing Agentic Ecosystem with A2A Protocol...');

// 1. Agent Registry
const agentRegistry = new AgentRegistry();
logger.info('✓ Agent Registry initialized');

// 2. Budget Manager
const budgetManager = new BudgetManager();
logger.info('✓ Budget Manager initialized');

// 3. A2A Agent Caller
const a2aAgentCaller = new A2AAgentCaller();
logger.info('✓ A2A Agent Caller initialized');

// 4. Workflow Services
const yamlParser = new WorkflowYAMLParser();
const workflowValidator = new WorkflowValidator(agentRegistry);
const workflowScheduler = new WorkflowScheduler(budgetManager);
logger.info('✓ Workflow Services initialized');

// 5. Execution Engine
const executionEngine = new WorkflowExecutionEngine(agentRegistry, a2aAgentCaller);
logger.info('✓ Execution Engine initialized');

// System information
logger.info('System Configuration:', {
  version: CONFIG.platform.version,
  platformFee: `${CONFIG.platform.feePercentage}%`,
  maxConcurrentRuns: CONFIG.execution.maxConcurrentRuns,
  protocol: 'A2A v0.3.0',
});

logger.info('🚀 Agentic Ecosystem is ready with A2A Protocol support!');

// Export services for use in API or tests
export {
  agentRegistry,
  budgetManager,
  a2aAgentCaller,
  yamlParser,
  workflowValidator,
  workflowScheduler,
  executionEngine,
};

// Demo: Create a sample agent
async function createSampleAgent() {
  logger.info('Creating sample A2A-compliant agent...');
  
  const sampleAgent = await agentRegistry.createAgent({
    ref: 'text-summarizer-v1',
    name: 'Text Summarizer',
    description: 'Summarizes long text content into concise summaries',
    version: '1.0.0',
    category: 'summarization',
    status: 'draft',
    ownerId: 'user_123',
    ownerWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    endpointType: 'http',
    endpointUrl: 'https://api.example.com/summarize',
    pricing: {
      type: 'per-call',
      amount: '0.02',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        maxLength: { type: 'number' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
      },
    },
    tags: ['text', 'nlp', 'summarization', 'a2a'],
    createdAt: new Date(),
    updatedAt: new Date(),
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
  });

  // Publish the agent
  await agentRegistry.publishAgent(sampleAgent.ref);
  
  logger.info('✓ Sample A2A agent created and published:', sampleAgent.ref);
  return sampleAgent;
}

// Run demo if this is the main module
if (import.meta.main) {
  (async () => {
    try {
      await createSampleAgent();
      
      logger.info('✨ Demo completed successfully!');
      logger.info('Next: Run example-a2a.ts to see A2A execution in action');
    } catch (error) {
      logger.error('Demo failed:', error);
    }
  })();
}
