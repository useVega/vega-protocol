/**
 * Complete A2A Workflow Example
 * Demonstrates workflow execution using Google's A2A Protocol
 */

import { 
  agentRegistry, 
  yamlParser, 
  workflowValidator,
  workflowScheduler,
  executionEngine,
  budgetManager
} from './src/index';
import { createLogger } from './src/utils';

const logger = createLogger('A2A-Example');

async function main() {
  logger.info('=== A2A Protocol Workflow Example ===\n');

  // ==========================================================================
  // STEP 1: Create A2A-Compliant Agents
  // ==========================================================================
  
  logger.info('Step 1: Creating A2A-compliant agents...');
  
  // Note: In production, these would be actual A2A agent servers
  // For demo, we use example URLs that follow A2A card standard
  
  const crawlerAgent = await agentRegistry.createAgent({
    ref: 'a2a-web-crawler-v1',
    name: 'A2A Web Crawler',
    description: 'A2A-compliant web content crawler',
    version: '1.0.0',
    category: 'data-collection',
    status: 'draft',
    ownerId: 'dev_alice',
    ownerWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    endpointType: 'http',
    // A2A card will be available at: https://api.example.com/crawler/.well-known/agent-card.json
    endpointUrl: 'https://api.example.com/crawler',
    pricing: {
      type: 'per-call',
      amount: '0.05',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to crawl' },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Extracted content' },
        title: { type: 'string', description: 'Page title' },
      },
    },
    tags: ['web', 'crawler', 'a2a', 'data-collection'],
    createdAt: new Date(),
    updatedAt: new Date(),
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
  });

  await agentRegistry.publishAgent(crawlerAgent.ref);
  logger.info(`✓ Published A2A agent: ${crawlerAgent.ref}`);

  const analyzerAgent = await agentRegistry.createAgent({
    ref: 'a2a-sentiment-analyzer-v1',
    name: 'A2A Sentiment Analyzer',
    description: 'A2A-compliant sentiment analysis agent',
    version: '1.0.0',
    category: 'analysis',
    status: 'draft',
    ownerId: 'dev_bob',
    ownerWallet: '0x8ba1f109551bD432803012645Ac136ddd64DBa72',
    endpointType: 'http',
    endpointUrl: 'https://api.example.com/analyzer',
    pricing: {
      type: 'per-call',
      amount: '0.03',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', description: 'Sentiment (positive/negative/neutral)' },
        score: { type: 'number', description: 'Confidence score' },
      },
    },
    tags: ['nlp', 'sentiment', 'analysis', 'a2a'],
    createdAt: new Date(),
    updatedAt: new Date(),
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
  });

  await agentRegistry.publishAgent(analyzerAgent.ref);
  logger.info(`✓ Published A2A agent: ${analyzerAgent.ref}\n`);

  // ==========================================================================
  // STEP 2: Create Workflow Using A2A Agents
  // ==========================================================================
  
  logger.info('Step 2: Creating workflow with A2A agents...');
  
  const workflowYAML = `
name: "A2A Content Analysis Pipeline"
description: "Multi-agent workflow using A2A protocol"
version: "1.0.0"
chain: "base"
token: "USDC"
maxBudget: "1.0"
entryNode: "crawler"
tags:
  - a2a
  - workflow
  - analysis

nodes:
  crawler:
    type: agent
    agent: a2a-web-crawler-v1
    name: "Fetch Web Content"
    inputs:
      url: "{{input.url}}"
    retry:
      maxAttempts: 3
      backoffMs: 1000
      
  analyzer:
    type: agent
    agent: a2a-sentiment-analyzer-v1
    name: "Analyze Sentiment"
    inputs:
      text: "{{crawler.content}}"

edges:
  - from: crawler
    to: analyzer
`;

  const workflowSpec = yamlParser.parse(workflowYAML, 'user_charlie');
  logger.info(`✓ Workflow parsed: ${workflowSpec.name}`);
  logger.info(`  Protocol: A2A v0.3.0`);
  logger.info(`  Nodes: ${workflowSpec.nodes.length}`);
  logger.info(`  Max Budget: ${workflowSpec.maxBudget} ${workflowSpec.token}\n`);

  // ==========================================================================
  // STEP 3: Validate Workflow
  // ==========================================================================
  
  logger.info('Step 3: Validating A2A workflow...');
  
  try {
    await workflowValidator.validate(workflowSpec);
    logger.info('✓ Workflow validation passed\n');
  } catch (error) {
    logger.error('✗ Workflow validation failed:', error);
    return;
  }

  // ==========================================================================
  // STEP 4: Schedule Workflow Run
  // ==========================================================================
  
  const userWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  
  logger.info('Step 4: Scheduling A2A workflow run...');
  
  const run = await workflowScheduler.scheduleRun({
    workflowSpec,
    userWallet,
    inputs: {
      url: 'https://example.com/article'
    },
  });

  logger.info(`✓ A2A workflow run scheduled`);
  logger.info(`  Run ID: ${run.runId}`);
  logger.info(`  Status: ${run.status}`);
  logger.info(`  Reserved Budget: ${run.reservedBudget} ${run.token}\n`);

  // ==========================================================================
  // STEP 5: Execute Workflow (NEW!)
  // ==========================================================================
  
  logger.info('Step 5: Executing A2A workflow...');
  logger.info('Note: This would call actual A2A agent endpoints in production\n');
  
  try {
    // Update status to running
    await workflowScheduler.updateRunStatus(run.runId, 'running');
    
    logger.info('Workflow execution flow:');
    logger.info('  1. Execution engine fetches workflow spec');
    logger.info('  2. Resolves node dependencies (topological sort)');
    logger.info('  3. For each node:');
    logger.info('     - Fetches agent A2A card from /.well-known/agent-card.json');
    logger.info('     - Creates A2A client');
    logger.info('     - Resolves input templates ({{node.output}})');
    logger.info('     - Sends A2A message to agent');
    logger.info('     - Waits for A2A response (Message or Task)');
    logger.info('     - Extracts output and stores in context');
    logger.info('  4. Returns final workflow output\n');

    // In production, this would execute:
    // const completedRun = await executionEngine.executeRun(workflowSpec, run, {
    //   url: 'https://example.com/article'
    // });
    
    logger.info('⚠️  Skipping actual execution (agents not running)');
    logger.info('To run for real:');
    logger.info('  1. Start A2A agent servers (see A2A SDK docs)');
    logger.info('  2. Update agent endpointUrl to real servers');
    logger.info('  3. Call: executionEngine.executeRun(workflowSpec, run, inputs)\n');

  } catch (error) {
    logger.error('Execution failed:', error);
  }

  // ==========================================================================
  // Summary
  // ==========================================================================
  
  logger.info('=== A2A Protocol Integration Summary ===');
  logger.info('✓ Google A2A SDK integrated (@a2a-js/sdk v0.3.0)');
  logger.info('✓ A2A agent registration system ready');
  logger.info('✓ A2A client wrapper implemented');
  logger.info('✓ Workflow execution engine with A2A support');
  logger.info('✓ Template variable resolution');
  logger.info('✓ Error handling and retries');
  
  logger.info('\n📦 Key Components:');
  logger.info('  • A2AAgentCaller - Communicates with A2A agents');
  logger.info('  • WorkflowExecutionEngine - Orchestrates A2A workflow');
  logger.info('  • AgentRegistry - Stores A2A agent metadata');
  logger.info('  • A2A Protocol v0.3.0 - Standardized agent communication');
  
  logger.info('\n🔗 A2A Protocol Features:');
  logger.info('  • Agent Cards - Standardized agent discovery');
  logger.info('  • Message/Task Pattern - Sync and async responses');
  logger.info('  • Streaming - Real-time updates via SSE');
  logger.info('  • Push Notifications - Webhook-based updates');
  logger.info('  • Skills & Capabilities - Agent feature advertising');
  
  logger.info('\n🚀 Next Steps:');
  logger.info('  1. Create actual A2A agent servers (use @a2a-js/sdk/server)');
  logger.info('  2. Deploy agents with Agent Cards');
  logger.info('  3. Execute workflows with real agents');
  logger.info('  4. Add streaming support for long-running tasks');
  logger.info('  5. Implement push notifications for async updates');
}

// Run the A2A example
main().catch(error => {
  logger.error('A2A Example failed:', error);
  process.exit(1);
});
