/**
 * Example: Complete Workflow Creation and Execution Flow
 * This demonstrates how to use the Agentic Ecosystem
 */

import { 
  agentRegistry, 
  yamlParser, 
  workflowValidator,
  workflowScheduler,
  budgetManager
} from './src/index';
import { createLogger } from './src/utils';

const logger = createLogger('Example');

async function main() {
  logger.info('=== Agentic Ecosystem Example ===\n');

  // ==========================================================================
  // STEP 1: Create and Publish Agents
  // ==========================================================================
  
  logger.info('Step 1: Creating agents...');
  
  // Create a web crawler agent
  const crawlerAgent = await agentRegistry.createAgent({
    ref: 'web-crawler-v1',
    name: 'Web Content Crawler',
    description: 'Fetches and extracts content from web pages',
    version: '1.0.0',
    category: 'data-collection',
    status: 'draft',
    ownerId: 'dev_alice',
    ownerWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    endpointType: 'http',
    endpointUrl: 'https://api.example.com/crawl',
    pricing: {
      type: 'per-call',
      amount: '0.05',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        title: { type: 'string' },
      },
    },
    tags: ['web', 'crawler', 'content'],
    createdAt: new Date(),
    updatedAt: new Date(),
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
  });

  // Publish the crawler
  await agentRegistry.publishAgent(crawlerAgent.ref);
  logger.info(`✓ Published agent: ${crawlerAgent.ref}`);

  // Create a sentiment analyzer agent
  const analyzerAgent = await agentRegistry.createAgent({
    ref: 'sentiment-analyzer-v1',
    name: 'Sentiment Analyzer',
    description: 'Analyzes sentiment of text content',
    version: '1.0.0',
    category: 'analysis',
    status: 'draft',
    ownerId: 'dev_bob',
    ownerWallet: '0x8ba1f109551bD432803012645Ac136ddd64DBa72',
    endpointType: 'http',
    endpointUrl: 'https://api.example.com/sentiment',
    pricing: {
      type: 'per-call',
      amount: '0.03',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string' },
        score: { type: 'number' },
      },
    },
    tags: ['nlp', 'sentiment', 'analysis'],
    createdAt: new Date(),
    updatedAt: new Date(),
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
  });

  await agentRegistry.publishAgent(analyzerAgent.ref);
  logger.info(`✓ Published agent: ${analyzerAgent.ref}\n`);

  // ==========================================================================
  // STEP 2: List Available Agents
  // ==========================================================================
  
  logger.info('Step 2: Listing available agents...');
  
  const publishedAgents = await agentRegistry.listAgents({ 
    status: 'published',
    chain: 'base',
    token: 'USDC'
  });
  
  logger.info(`Found ${publishedAgents.length} published agents:`);
  publishedAgents.forEach(agent => {
    logger.info(`  - ${agent.name} (${agent.ref}): ${agent.pricing.amount} ${agent.pricing.token}`);
  });
  logger.info('');

  // ==========================================================================
  // STEP 3: Create Workflow from YAML
  // ==========================================================================
  
  logger.info('Step 3: Creating workflow from YAML...');
  
  const workflowYAML = `
name: "Web Content Analysis"
description: "Crawl web page and analyze sentiment"
version: "1.0.0"
chain: "base"
token: "USDC"
maxBudget: "1.0"
entryNode: "crawler"
tags:
  - web
  - analysis

nodes:
  crawler:
    type: agent
    agent: web-crawler-v1
    name: "Fetch Content"
    inputs:
      url: "{{input.url}}"
    retry:
      maxAttempts: 3
      backoffMs: 1000
      
  analyzer:
    type: agent
    agent: sentiment-analyzer-v1
    name: "Analyze Sentiment"
    inputs:
      text: "{{crawler.content}}"

edges:
  - from: crawler
    to: analyzer
`;

  const workflowSpec = yamlParser.parse(workflowYAML, 'user_charlie');
  logger.info(`✓ Workflow parsed: ${workflowSpec.name}`);
  logger.info(`  Nodes: ${workflowSpec.nodes.length}`);
  logger.info(`  Edges: ${workflowSpec.edges.length}`);
  logger.info(`  Max Budget: ${workflowSpec.maxBudget} ${workflowSpec.token}\n`);

  // ==========================================================================
  // STEP 4: Validate Workflow
  // ==========================================================================
  
  logger.info('Step 4: Validating workflow...');
  
  try {
    await workflowValidator.validate(workflowSpec);
    logger.info('✓ Workflow validation passed\n');
  } catch (error) {
    logger.error('✗ Workflow validation failed:', error);
    return;
  }

  // ==========================================================================
  // STEP 5: Add Funds to User Wallet
  // ==========================================================================
  
  const userWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  
  logger.info('Step 5: Checking user balance...');
  const balance = await budgetManager.getBalance(userWallet, 'USDC');
  logger.info(`Current balance: ${balance} USDC\n`);

  // ==========================================================================
  // STEP 6: Schedule Workflow Run
  // ==========================================================================
  
  logger.info('Step 6: Scheduling workflow run...');
  
  const run = await workflowScheduler.scheduleRun({
    workflowSpec,
    userWallet,
    inputs: {
      url: 'https://example.com/article'
    },
  });

  logger.info(`✓ Workflow run scheduled`);
  logger.info(`  Run ID: ${run.runId}`);
  logger.info(`  Status: ${run.status}`);
  logger.info(`  Reserved Budget: ${run.reservedBudget} ${run.token}`);
  logger.info(`  Chain: ${run.chain}\n`);

  // ==========================================================================
  // STEP 7: Check Queue Status
  // ==========================================================================
  
  logger.info('Step 7: Checking queue status...');
  
  const queueStatus = workflowScheduler.getQueueStatus();
  logger.info(`Queue length: ${queueStatus.queueLength}`);
  logger.info(`Running workflows: ${queueStatus.runningCount}\n`);

  // ==========================================================================
  // STEP 8: Get Next Run from Queue (Execution Worker would do this)
  // ==========================================================================
  
  logger.info('Step 8: Getting next run from queue...');
  
  const nextRun = await workflowScheduler.getNextRun();
  if (nextRun) {
    logger.info(`✓ Retrieved run: ${nextRun.runId}`);
    logger.info('  [Execution engine would process this run]\n');
  }

  // ==========================================================================
  // Summary
  // ==========================================================================
  
  logger.info('=== Summary ===');
  logger.info(`✓ Created ${publishedAgents.length} agents`);
  logger.info(`✓ Parsed and validated workflow`);
  logger.info(`✓ Scheduled workflow run`);
  logger.info(`✓ Reserved ${run.reservedBudget} ${run.token} budget`);
  logger.info('\n✨ Example completed successfully!');
  logger.info('\nNext steps:');
  logger.info('  1. Implement execution engine to run workflows');
  logger.info('  2. Add payment distribution logic');
  logger.info('  3. Implement agent HTTP caller');
  logger.info('  4. Add trust and reputation system');
}

// Run the example
main().catch(error => {
  logger.error('Example failed:', error);
  process.exit(1);
});
