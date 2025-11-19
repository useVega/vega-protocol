/**
 * Simple Workflow Test Script
 * 
 * Prerequisites:
 * 1. Start echo agent: bun run agents/simple-echo-agent.ts
 * 2. Start transformer agent: bun run agents/text-transformer-agent.ts
 * 
 * Usage:
 * bun run test-workflow.ts
 */

import { Logger } from './src/utils/logger';
import { WorkflowYAMLParser } from './src/workflow/yaml-parser.service';
import { readFileSync } from 'fs';

const logger = new Logger('WorkflowTest');

async function main() {
  logger.info('[WorkflowTest]', '='.repeat(60));
  logger.info('[WorkflowTest]', '📋 Testing Workflow YAML Parsing');
  logger.info('[WorkflowTest]', '='.repeat(60));

  // Test 1: Parse simple workflow
  logger.info('[WorkflowTest]', '\nTest 1: Parsing simple-text-flow.yaml...');
  try {
    const workflowPath = './workflows/simple-text-flow.yaml';
    const workflowYaml = readFileSync(workflowPath, 'utf-8');
    const parser = new WorkflowYAMLParser();
    const spec = parser.parse(workflowYaml, workflowPath);
    
    logger.info('[WorkflowTest]', `✓ Parsed workflow: ${spec.name}`);
    logger.info('[WorkflowTest]', `  Description: ${spec.description}`);
    logger.info('[WorkflowTest]', `  Version: ${spec.version}`);
    logger.info('[WorkflowTest]', `  Nodes: ${spec.nodes.length}`);
    logger.info('[WorkflowTest]', `  Edges: ${spec.edges.length}`);
    
    // Show nodes
    logger.info('[WorkflowTest]', '\n  📦 Nodes:');
    spec.nodes.forEach(node => {
      logger.info('[WorkflowTest]', `    - ${node.id}: ${node.name} (${node.agentRef})`);
    });
    
    // Show edges
    logger.info('[WorkflowTest]', '\n  🔗 Edges:');
    spec.edges.forEach(edge => {
      logger.info('[WorkflowTest]', `    - ${edge.from} → ${edge.to}`);
    });
    
  } catch (error) {
    logger.error('[WorkflowTest]', `✗ Failed: ${(error as Error).message}`);
  }

  // Test 2: Parse advanced workflow
  logger.info('[WorkflowTest]', '\nTest 2: Parsing advanced-text-flow.yaml...');
  try {
    const workflowPath = './workflows/advanced-text-flow.yaml';
    const workflowYaml = readFileSync(workflowPath, 'utf-8');
    const parser = new WorkflowYAMLParser();
    const spec = parser.parse(workflowYaml, workflowPath);
    
    logger.info('[WorkflowTest]', `✓ Parsed workflow: ${spec.name}`);
    logger.info('[WorkflowTest]', `  Description: ${spec.description}`);
    logger.info('[WorkflowTest]', `  Version: ${spec.version}`);
    logger.info('[WorkflowTest]', `  Nodes: ${spec.nodes.length}`);
    logger.info('[WorkflowTest]', `  Edges: ${spec.edges.length}`);
    
    // Show nodes with retry policies
    logger.info('[WorkflowTest]', '\n  📦 Nodes:');
    spec.nodes.forEach(node => {
      const retryInfo = node.retryPolicy 
        ? `(retry: ${node.retryPolicy.maxAttempts}x)` 
        : '';
      logger.info('[WorkflowTest]', `    - ${node.id}: ${node.name} ${retryInfo}`);
    });
    
  } catch (error) {
    logger.error('[WorkflowTest]', `✗ Failed: ${(error as Error).message}`);
  }

  // Test 3: Generate workflow template
  logger.info('[WorkflowTest]', '\nTest 3: Generating workflow template...');
  try {
    const parser = new WorkflowYAMLParser();
    const template = parser.generateTemplate();
    
    logger.info('[WorkflowTest]', '✓ Generated template:');
    logger.info('[WorkflowTest]', '\n' + template);
    
  } catch (error) {
    logger.error('[WorkflowTest]', `✗ Failed: ${(error as Error).message}`);
  }

  logger.info('[WorkflowTest]', '\n' + '='.repeat(60));
  logger.info('[WorkflowTest]', '✓ Workflow tests complete');
  logger.info('[WorkflowTest]', '='.repeat(60));
}

// Run tests
main().catch(error => {
  logger.error('[WorkflowTest]', `Fatal error: ${error.message}`);
  process.exit(1);
});
