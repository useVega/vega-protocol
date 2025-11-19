/**
 * Workflow Runner Script
 * 
 * This script demonstrates how to:
 * 1. Register A2A agents with the ecosystem
 * 2. Load and parse YAML workflows
 * 3. Execute workflows with real agent endpoints
 * 4. Track execution progress
 * 
 * Prerequisites:
 * - Start echo agent: bun run agents/simple-echo-agent.ts
 * - Start transformer agent: bun run agents/text-transformer-agent.ts
 * 
 * Usage:
 * bun run run-workflow.ts
 */

import { Logger } from './src/utils/logger';
import { AgentRegistry } from './src/registry/agent-registry.service';
import { WorkflowYAMLParser } from './src/workflow/yaml-parser.service';
import { WorkflowValidator } from './src/workflow/workflow-validator.service';
import { WorkflowScheduler } from './src/workflow/workflow-scheduler.service';
import { BudgetManager } from './src/payment/budget-manager.service';
import { WorkflowExecutionEngine } from './src/execution/execution-engine.service';
import { A2AAgentCaller } from './src/execution/a2a-agent-caller.service';
import { readFileSync } from 'fs';

const logger = new Logger('WorkflowRunner');

async function main() {
  logger.info('[WorkflowRunner]', '='.repeat(60));
  logger.info('[WorkflowRunner]', '🚀 Workflow Runner - Live A2A Execution');
  logger.info('[WorkflowRunner]', '='.repeat(60));

  // Initialize services
  logger.info('[WorkflowRunner]', 'Initializing services...');
  const agentRegistry = new AgentRegistry();
  const budgetManager = new BudgetManager();
  const a2aCaller = new A2AAgentCaller();
  const yamlParser = new WorkflowYAMLParser();
  const validator = new WorkflowValidator(agentRegistry);
  const scheduler = new WorkflowScheduler(budgetManager);
  const executionEngine = new WorkflowExecutionEngine(agentRegistry, a2aCaller);

  logger.info('[WorkflowRunner]', '✓ All services initialized');

  // Step 1: Register A2A agents
  logger.info('[WorkflowRunner]', '\nStep 1: Registering A2A agents...');
  
  const echoAgent = await agentRegistry.createAgent({
    name: 'Simple Echo Agent',
    description: 'Echoes messages with metadata',
    category: 'other',
    endpoint: 'http://localhost:3001',
    version: '1.0.0',
    owner: '0x1234567890123456789012345678901234567890',
    pricing: {
      type: 'per-call',
      amount: '0.05',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      required: ['message']
    },
    outputSchema: {
      type: 'object',
      properties: {
        echo: { type: 'string' },
        receivedAt: { type: 'string' },
        messageLength: { type: 'number' }
      }
    }
  });
  await agentRegistry.publishAgent(echoAgent.ref);
  logger.info('[WorkflowRunner]', `✓ Registered: ${echoAgent.name} (${echoAgent.ref})`);

  const transformerAgent = await agentRegistry.createAgent({
    name: 'Text Transformer Agent',
    description: 'Transforms text in various ways',
    category: 'data_processing',
    endpoint: 'http://localhost:3002',
    version: '1.0.0',
    owner: '0x1234567890123456789012345678901234567890',
    pricing: {
      model: 'per-call',
      basePrice: '0.08',
      token: 'USDC',
      chain: 'base',
    },
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        operation: { type: 'string', enum: ['uppercase', 'lowercase', 'reverse', 'wordcount', 'capitalize', 'titlecase'] }
      },
      required: ['text', 'operation']
    },
    outputSchema: {
      type: 'object',
      properties: {
        original: { type: 'string' },
        transformed: { type: 'string' },
        operation: { type: 'string' },
        stats: { type: 'object' }
      }
    }
  });
  await agentRegistry.publishAgent(transformerAgent.ref);
  logger.info('[WorkflowRunner]', `✓ Registered: ${transformerAgent.name} (${transformerAgent.ref})`);

  // Step 2: Load and parse workflow
  logger.info('[WorkflowRunner]', '\nStep 2: Loading workflow...');
  
  const workflowPath = './workflows/simple-text-flow.yaml';
  const workflowYaml = readFileSync(workflowPath, 'utf-8');
  const workflowSpec = yamlParser.parse(workflowYaml);
  
  logger.info('[WorkflowRunner]', `✓ Loaded workflow: ${workflowSpec.name}`);
  logger.info('[WorkflowRunner]', `  Description: ${workflowSpec.description}`);
  logger.info('[WorkflowRunner]', `  Nodes: ${workflowSpec.nodes.length}`);
  logger.info('[WorkflowRunner]', `  Max Budget: ${workflowSpec.payment.maxBudget} ${workflowSpec.payment.token}`);

  // Step 3: Validate workflow
  logger.info('[WorkflowRunner]', '\nStep 3: Validating workflow...');
  
  const validation = await validator.validate(workflowSpec);
  if (!validation.valid) {
    logger.error('[WorkflowRunner]', '✗ Workflow validation failed:');
    validation.errors.forEach(error => {
      logger.error('[WorkflowRunner]', `  - ${error}`);
    });
    return;
  }
  
  logger.info('[WorkflowRunner]', '✓ Workflow validation passed');

  // Step 4: Schedule workflow run
  logger.info('[WorkflowRunner]', '\nStep 4: Scheduling workflow run...');
  
  const userId = 'user-demo-123';
  const inputs = {
    message: 'Hello from the Agentic Ecosystem!'
  };
  
  const run = await scheduler.scheduleRun(workflowSpec, userId, inputs);
  logger.info('[WorkflowRunner]', `✓ Workflow scheduled`);
  logger.info('[WorkflowRunner]', `  Run ID: ${run.runId}`);
  logger.info('[WorkflowRunner]', `  Status: ${run.status}`);
  logger.info('[WorkflowRunner]', `  Reserved Budget: ${run.reservedBudget} ${workflowSpec.payment.token}`);

  // Step 5: Execute workflow with real agents
  logger.info('[WorkflowRunner]', '\nStep 5: Executing workflow with live A2A agents...');
  logger.info('[WorkflowRunner]', '─'.repeat(60));
  
  try {
    const result = await executionEngine.executeRun(workflowSpec, run, inputs);
    
    logger.info('[WorkflowRunner]', '─'.repeat(60));
    logger.info('[WorkflowRunner]', '✓ Workflow execution completed!');
    logger.info('[WorkflowRunner]', `  Status: ${result.status}`);
    logger.info('[WorkflowRunner]', `  Total Cost: ${result.totalCost} ${workflowSpec.payment.token}`);
    logger.info('[WorkflowRunner]', `  Completed At: ${result.completedAt}`);
    
    // Display node results
    logger.info('[WorkflowRunner]', '\n📊 Node Results:');
    result.nodeRuns.forEach(nodeRun => {
      logger.info('[WorkflowRunner]', `  ${nodeRun.nodeId}:`);
      logger.info('[WorkflowRunner]', `    Status: ${nodeRun.status}`);
      logger.info('[WorkflowRunner]', `    Cost: ${nodeRun.cost} ${workflowSpec.payment.token}`);
      if (nodeRun.output) {
        logger.info('[WorkflowRunner]', `    Output: ${JSON.stringify(nodeRun.output, null, 2).split('\n').join('\n      ')}`);
      }
      if (nodeRun.error) {
        logger.error('[WorkflowRunner]', `    Error: ${nodeRun.error}`);
      }
    });
    
    // Display final output
    if (result.output) {
      logger.info('[WorkflowRunner]', '\n🎯 Final Output:');
      logger.info('[WorkflowRunner]', JSON.stringify(result.output, null, 2));
    }
    
  } catch (error) {
    logger.error('[WorkflowRunner]', `✗ Workflow execution failed: ${(error as Error).message}`);
    logger.error('[WorkflowRunner]', (error as Error).stack || '');
  }

  logger.info('[WorkflowRunner]', '\n' + '='.repeat(60));
  logger.info('[WorkflowRunner]', '✓ Workflow runner complete');
  logger.info('[WorkflowRunner]', '='.repeat(60));
}

// Run the workflow
main().catch(error => {
  logger.error('[WorkflowRunner]', `Fatal error: ${error.message}`);
  process.exit(1);
});
