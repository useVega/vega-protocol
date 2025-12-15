/**
 * Register Agents in the AgentRegistry
 * This script registers our A2A agents in the registry system
 */

import { AgentRegistry } from './src/registry/agent-registry.service';
import type { AgentDefinition } from './src/types/agent.types';
import { Logger } from './src/utils/logger';

const logger = new Logger('Registry');
const registry = new AgentRegistry();

/**
 * Define agents to register
 */
const agents: Partial<AgentDefinition>[] = [
  {
    ref: 'echo-agent',
    name: 'Simple Echo Agent',
    version: '1.0.0',
    description: 'A simple A2A agent that echoes back messages with metadata',
    category: 'other',
    endpointType: 'http',
    endpointUrl: 'http://localhost:3001',
    ownerWallet: '0x0000000000000000000000000000000000000000',
    pricing: {
      type: 'per-call',
      amount: '100',
      token: 'USDC',
      chain: 'base',
      requiresPayment: true,
      paymentNetwork: 'base-sepolia',
    },
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
    status: 'published',
    ownerId: 'agentic-ecosystem',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to echo' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        echo: { type: 'string' },
        receivedAt: { type: 'string' },
        messageLength: { type: 'number' },
        metadata: { type: 'object' },
      },
    },
    tags: ['echo', 'utility', 'a2a', 'testing'],
  },
  {
    ref: 'text-transformer',
    name: 'Text Transformer Agent',
    version: '1.0.0',
    description: 'A2A agent for text transformations (uppercase, lowercase, reverse, etc.)',
    category: 'transformation',
    endpointType: 'http',
    endpointUrl: 'http://localhost:3002',
    ownerWallet: '0x0000000000000000000000000000000000000000',
    pricing: {
      type: 'per-call',
      amount: '150',
      token: 'USDC',
      chain: 'base',
      requiresPayment: true,
      paymentNetwork: 'base-sepolia',
    },
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
    status: 'published',
    ownerId: 'agentic-ecosystem',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        operation: { 
          type: 'string', 
          enum: ['uppercase', 'lowercase', 'reverse', 'wordcount', 'capitalize', 'titlecase']
        },
      },
      required: ['text', 'operation'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        original: { type: 'string' },
        transformed: { type: 'string' },
        operation: { type: 'string' },
        stats: { type: 'object' },
        processedAt: { type: 'string' },
      },
    },
    tags: ['text', 'transformer', 'nlp', 'a2a', 'utility'],
  },
];

/**
 * Register all agents
 */
async function registerAgents() {
  logger.info('='.repeat(60));
  logger.info('📝 Registering Agents in AgentRegistry');
  logger.info('='.repeat(60));

  for (const agent of agents) {
    try {
      // Check if agent already exists
      try {
        const existing = await registry.getAgent(agent.ref!);
        logger.info(`Agent ${agent.ref} already registered, updating...`);
        
        // Update existing agent
        await registry.updateAgent(agent.ref!, {
          ...agent,
          updatedAt: new Date(),
        } as AgentDefinition);
        
        logger.info(`✓ Updated agent: ${agent.ref} (${agent.name})`);
      } catch (error) {
        // Agent doesn't exist, create it
        const created = await registry.createAgent({
          ...agent,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as AgentDefinition);
        
        // Publish the agent
        await registry.publishAgent(created.ref);
        
        logger.info(`✓ Registered agent: ${agent.ref} (${agent.name})`);
      }

      logger.info(`  - Endpoint: ${agent.endpointUrl}`);
      logger.info(`  - Price: ${agent.pricing?.amount} ${agent.pricing?.token}/${agent.pricing?.type}`);
      logger.info(`  - Category: ${agent.category}`);
      logger.info('');
    } catch (error) {
      logger.error(`Failed to register ${agent.ref}: ${(error as Error).message}`);
    }
  }

  // Display summary
  logger.info('='.repeat(60));
  logger.info('📊 Registry Summary');
  logger.info('='.repeat(60));

  const allAgents = await registry.listAgents({ status: 'published' });
  logger.info(`Total published agents: ${allAgents.length}`);
  
  for (const agent of allAgents) {
    logger.info(`  - ${agent.ref}: ${agent.name} v${agent.version}`);
  }

  logger.info('='.repeat(60));
  logger.info('✓ Registration complete!');
  
  return registry;
}

// Execute registration
if (import.meta.main) {
  registerAgents()
    .then(() => {
      logger.info('🎉 All agents registered successfully!');
    })
    .catch((error) => {
      logger.error(`Registration failed: ${error.message}`);
      process.exit(1);
    });
}

export { registry, registerAgents };
