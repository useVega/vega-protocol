/**
 * Execute Workflow Script
 * 
 * Actually runs workflows against live A2A agents and shows real outputs
 * 
 * Prerequisites:
 * 1. Start echo agent: bun run agents/simple-echo-agent.ts
 * 2. Start transformer agent: bun run agents/text-transformer-agent.ts
 * 
 * Usage:
 * bun run execute-workflow.ts
 */

import { Logger } from './src/utils/logger';
import { A2AAgentCaller } from './src/execution/a2a-agent-caller.service';
import type { Message } from '@a2a-js/sdk';

const logger = new Logger('WorkflowExecutor');

async function main() {
  logger.info('[WorkflowExecutor]', '='.repeat(60));
  logger.info('[WorkflowExecutor]', '🚀 Live Workflow Execution');
  logger.info('[WorkflowExecutor]', '='.repeat(60));

  const a2aCaller = new A2AAgentCaller();

  // Test 1: Simple Echo Agent
  logger.info('[WorkflowExecutor]', '\n📋 Test 1: Echo Agent');
  logger.info('[WorkflowExecutor]', '─'.repeat(60));
  
  try {
    const echoInput: Message = {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'user',
      parts: [
        {
          kind: 'text',
          text: 'Hello from the Agentic Ecosystem!'
        }
      ]
    };

    logger.info('[WorkflowExecutor]', 'Calling echo agent at http://localhost:3001...');
    const echoResult = await a2aCaller.callAgent(
      'http://localhost:3001/.well-known/agent-card.json',
      'Hello from the Agentic Ecosystem!'
    );

    logger.info('[WorkflowExecutor]', '✓ Echo agent response:');
    if (echoResult.kind === 'message') {
      for (const part of echoResult.parts) {
        if (part.kind === 'text') {
          logger.info('[WorkflowExecutor]', `  Text: ${part.text}`);
        }
        if (part.kind === 'data') {
          logger.info('[WorkflowExecutor]', `  Data: ${JSON.stringify(part.data, null, 2)}`);
        }
      }
    }
  } catch (error) {
    logger.error('[WorkflowExecutor]', `✗ Echo agent failed: ${(error as Error).message}`);
  }

  // Test 2: Text Transformer Agent
  logger.info('[WorkflowExecutor]', '\n📋 Test 2: Text Transformer Agent (Uppercase)');
  logger.info('[WorkflowExecutor]', '─'.repeat(60));
  
  try {
    logger.info('[WorkflowExecutor]', 'Calling transformer agent at http://localhost:3002...');
    const transformResult = await a2aCaller.callAgentWithInputs(
      'http://localhost:3002/.well-known/agent-card.json',
      {
        text: 'hello world from agentic ecosystem',
        operation: 'uppercase'
      }
    );

    logger.info('[WorkflowExecutor]', '✓ Transformer agent response:');
    if (transformResult.kind === 'message') {
      for (const part of transformResult.parts) {
        if (part.kind === 'text') {
          logger.info('[WorkflowExecutor]', `  Text: ${part.text}`);
        }
        if (part.kind === 'data') {
          logger.info('[WorkflowExecutor]', `  Data: ${JSON.stringify(part.data, null, 2)}`);
        }
      }
    }
  } catch (error) {
    logger.error('[WorkflowExecutor]', `✗ Transformer failed: ${(error as Error).message}`);
  }

  // Test 3: Chained Workflow (Echo → Transform)
  logger.info('[WorkflowExecutor]', '\n📋 Test 3: Chained Workflow (Echo → Transform)');
  logger.info('[WorkflowExecutor]', '─'.repeat(60));
  
  try {
    // Step 1: Echo
    logger.info('[WorkflowExecutor]', 'Step 1: Calling echo agent...');
    const echoResult = await a2aCaller.callAgent(
      'http://localhost:3001/.well-known/agent-card.json',
      'hello agentic world'
    );

    let echoOutput = '';
    if (echoResult.kind === 'message') {
      for (const part of echoResult.parts) {
        if (part.kind === 'data' && typeof part.data === 'object' && part.data !== null) {
          const data = part.data as Record<string, any>;
          echoOutput = data.echo || '';
          logger.info('[WorkflowExecutor]', `  Echo output: "${echoOutput}"`);
        }
      }
    }

    // Step 2: Transform the echo output
    logger.info('[WorkflowExecutor]', 'Step 2: Calling transformer agent with echo output...');
    const transformResult = await a2aCaller.callAgentWithInputs(
      'http://localhost:3002/.well-known/agent-card.json',
      {
        text: echoOutput,
        operation: 'uppercase'
      }
    );

    logger.info('[WorkflowExecutor]', '✓ Final workflow output:');
    if (transformResult.kind === 'message') {
      for (const part of transformResult.parts) {
        if (part.kind === 'text') {
          logger.info('[WorkflowExecutor]', `  Transformed: ${part.text}`);
        }
        if (part.kind === 'data') {
          const data = part.data as Record<string, any>;
          logger.info('[WorkflowExecutor]', `  Original: "${data.original}"`);
          logger.info('[WorkflowExecutor]', `  Result: "${data.transformed}"`);
          logger.info('[WorkflowExecutor]', `  Stats: ${JSON.stringify(data.stats)}`);
        }
      }
    }
  } catch (error) {
    logger.error('[WorkflowExecutor]', `✗ Chained workflow failed: ${(error as Error).message}`);
  }

  // Test 4: Multiple Transformations
  logger.info('[WorkflowExecutor]', '\n📋 Test 4: Multiple Transformations Pipeline');
  logger.info('[WorkflowExecutor]', '─'.repeat(60));
  
  try {
    const inputText = 'hello world from agentic ecosystem';
    logger.info('[WorkflowExecutor]', `Input: "${inputText}"`);

    // Step 1: Title case
    logger.info('[WorkflowExecutor]', '\nStep 1: Title case...');
    const titleResult = await a2aCaller.callAgentWithInputs(
      'http://localhost:3002/.well-known/agent-card.json',
      { text: inputText, operation: 'titlecase' }
    );
    let titleText = inputText;
    if (titleResult.kind === 'message') {
      for (const part of titleResult.parts) {
        if (part.kind === 'data') {
          titleText = (part.data as any).transformed;
          logger.info('[WorkflowExecutor]', `  → "${titleText}"`);
        }
      }
    }

    // Step 2: Uppercase
    logger.info('[WorkflowExecutor]', '\nStep 2: Uppercase...');
    const upperResult = await a2aCaller.callAgentWithInputs(
      'http://localhost:3002/.well-known/agent-card.json',
      { text: titleText, operation: 'uppercase' }
    );
    let upperText = titleText;
    if (upperResult.kind === 'message') {
      for (const part of upperResult.parts) {
        if (part.kind === 'data') {
          upperText = (part.data as any).transformed;
          logger.info('[WorkflowExecutor]', `  → "${upperText}"`);
        }
      }
    }

    // Step 3: Reverse
    logger.info('[WorkflowExecutor]', '\nStep 3: Reverse...');
    const reverseResult = await a2aCaller.callAgentWithInputs(
      'http://localhost:3002/.well-known/agent-card.json',
      { text: upperText, operation: 'reverse' }
    );
    if (reverseResult.kind === 'message') {
      for (const part of reverseResult.parts) {
        if (part.kind === 'data') {
          const reversed = (part.data as any).transformed;
          logger.info('[WorkflowExecutor]', `  → "${reversed}"`);
        }
      }
    }

    logger.info('[WorkflowExecutor]', '\n✓ Pipeline complete!');
  } catch (error) {
    logger.error('[WorkflowExecutor]', `✗ Pipeline failed: ${(error as Error).message}`);
  }

  // Test 5: Check agent availability
  logger.info('[WorkflowExecutor]', '\n📋 Test 5: Agent Health Checks');
  logger.info('[WorkflowExecutor]', '─'.repeat(60));
  
  try {
    logger.info('[WorkflowExecutor]', 'Checking echo agent...');
    const echoAvailable = await a2aCaller.checkAgentAvailability('http://localhost:3001/.well-known/agent-card.json');
    logger.info('[WorkflowExecutor]', `  Echo agent: ${echoAvailable ? '✓ Available' : '✗ Unavailable'}`);

    logger.info('[WorkflowExecutor]', 'Checking transformer agent...');
    const transformerAvailable = await a2aCaller.checkAgentAvailability('http://localhost:3002/.well-known/agent-card.json');
    logger.info('[WorkflowExecutor]', `  Transformer agent: ${transformerAvailable ? '✓ Available' : '✗ Unavailable'}`);
  } catch (error) {
    logger.error('[WorkflowExecutor]', `✗ Health check failed: ${(error as Error).message}`);
  }

  logger.info('[WorkflowExecutor]', '\n' + '='.repeat(60));
  logger.info('[WorkflowExecutor]', '✓ All workflow executions complete!');
  logger.info('[WorkflowExecutor]', '='.repeat(60));
}

// Run the executor
main().catch(error => {
  logger.error('[WorkflowExecutor]', `Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
