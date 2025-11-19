/**
 * Registry-Based Workflow Executor
 * Executes workflows using agents from the AgentRegistry
 */

import { A2AClient } from '@a2a-js/sdk/client';
import type { Message } from '@a2a-js/sdk';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './src/utils/logger';
import { registry, registerAgents } from './register-agents';
import { 
  WorkflowParser, 
  type Workflow, 
  type WorkflowNode, 
  type WorkflowEdge 
} from './src/workflow/workflow-parser';

const logger = new Logger('WorkflowEngine');

/**
 * Workflow Executor with Registry Integration
 */
class RegistryWorkflowExecutor {
  private nodeOutputs: Map<string, any> = new Map();
  private totalCost: number = 0;

  /**
   * Execute a workflow from YAML file
   */
  async executeWorkflow(workflowPath: string, inputs: Record<string, any>): Promise<any> {
    // Parse and validate workflow
    const workflow = WorkflowParser.parseFile(workflowPath);

    logger.info('='.repeat(70));
    logger.info(`🚀 Executing Workflow: ${workflow.name} v${workflow.version}`);
    logger.info(`   ${workflow.description}`);
    logger.info('='.repeat(70));

    // Validate inputs
    WorkflowParser.validateInputs(workflow, inputs);

    // Store inputs for template resolution
    this.nodeOutputs.set('inputs', inputs);

    // Execute nodes in order (simple sequential execution based on edges)
    const executionOrder = this.topologicalSort(workflow.nodes, workflow.edges);

    logger.info(`\n📋 Execution Plan: ${executionOrder.map(n => n.name).join(' → ')}\n`);

    for (const node of executionOrder) {
      await this.executeNode(node, workflow);
    }

    // Collect outputs
    const outputs: Record<string, any> = {};
    for (const [key, schema] of Object.entries(workflow.outputs)) {
      const outputSchema = schema as any;
      if (outputSchema.value) {
        outputs[key] = this.resolveTemplate(outputSchema.value);
      }
    }

    logger.info('\n' + '='.repeat(70));
    logger.info('✅ Workflow Execution Complete!');
    logger.info(`💰 Total Cost: ${this.totalCost.toFixed(2)} ${workflow.budgetToken}`);
    logger.info(`📊 Budget Used: ${((this.totalCost / workflow.maxBudget) * 100).toFixed(1)}%`);
    logger.info('='.repeat(70));

    return { outputs, totalCost: this.totalCost };
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(node: WorkflowNode, workflow: Workflow): Promise<void> {
    logger.info(`\n▶️  Executing: ${node.name} (${node.id})`);
    logger.info(`   Agent Ref: ${node.ref}`);

    try {
      // Look up agent in registry
      const agent = await registry.getAgent(node.ref);
      logger.info(`   ✓ Found agent: ${agent.name} v${agent.version}`);
      logger.info(`   📍 Endpoint: ${agent.endpointUrl}`);
      logger.info(`   💵 Price: ${agent.pricing.amount} ${agent.pricing.token}`);

      // Resolve input templates
      const resolvedInputs: Record<string, any> = {};
      for (const [key, value] of Object.entries(node.inputs)) {
        resolvedInputs[key] = this.resolveTemplate(value);
      }

      logger.info(`   📥 Inputs: ${JSON.stringify(resolvedInputs)}`);

      // Create A2A client using agent card URL
      const agentCardUrl = `${agent.endpointUrl}/.well-known/agent-card.json`;
      const client = await A2AClient.fromCardUrl(agentCardUrl);

      // Build A2A message
      const message: Message = {
        kind: 'message',
        messageId: uuidv4(),
        role: 'user',
        parts: [
          {
            kind: 'data',
            data: resolvedInputs,
          },
        ],
      };

      // Call agent with retry logic
      const maxAttempts = node.retry?.maxAttempts || 1;
      const backoffMs = node.retry?.backoffMs || 0;
      let attempt = 0;
      let result: any = null;

      while (attempt < maxAttempts) {
        try {
          attempt++;
          if (attempt > 1) {
            logger.info(`   🔄 Retry attempt ${attempt}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
          }

          const response = await client.sendMessage({
            message,
            configuration: { blocking: true },
          });

          if ('error' in response) {
            throw new Error(`Agent error: ${response.error.message}`);
          }

          result = response.result;
          break;
        } catch (error) {
          if (attempt >= maxAttempts) {
            throw error;
          }
          logger.warn(`   ⚠️  Attempt ${attempt} failed: ${(error as Error).message}`);
        }
      }

      // Extract output from result
      let output: any = {};
      if (result.kind === 'message') {
        for (const part of result.parts) {
          if (part.kind === 'data') {
            output = { ...output, ...part.data };
          }
          if (part.kind === 'text') {
            output.text = part.text;
          }
        }
      }

      // Store node output
      this.nodeOutputs.set(node.id, {
        status: 'success',
        output,
      });

      // Update total cost
      this.totalCost += parseFloat(agent.pricing.amount);

      logger.info(`   ✅ Success!`);
      logger.info(`   📤 Output: ${JSON.stringify(output).substring(0, 100)}...`);
    } catch (error) {
      logger.error(`   ❌ Failed: ${(error as Error).message}`);
      this.nodeOutputs.set(node.id, {
        status: 'failed',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Resolve template strings like {{inputs.message}} or {{node.output}}
   */
  private resolveTemplate(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Match {{path.to.value}} patterns
    const templateRegex = /\{\{([^}]+)\}\}/g;
    let resolved = value;

    const matches = Array.from(value.matchAll(templateRegex));
    for (const match of matches) {
      const path = match[1]?.trim();
      if (!path) continue;
      const resolvedValue = this.resolvePath(path);
      resolved = resolved.replace(match[0], String(resolvedValue));
    }

    return resolved;
  }

  /**
   * Resolve a path like "inputs.message" or "echo_step.output.echo"
   */
  private resolvePath(path: string): any {
    const parts = path.split('.');
    let current: any = null;

    // Start with the first part (inputs, node id, etc.)
    const root = parts[0];
    if (!root) {
      throw new Error(`Invalid path: ${path}`);
    }
    
    if (this.nodeOutputs.has(root)) {
      current = this.nodeOutputs.get(root);
    } else {
      throw new Error(`Unknown path root: ${root}`);
    }

    // Navigate through the rest of the path
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Cannot resolve path: ${path} (failed at ${part})`);
      }
    }

    return current;
  }

  /**
   * Simple topological sort for node execution order
   */
  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph
    for (const node of nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // Build graph from edges
    for (const edge of edges) {
      graph.get(edge.from)!.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // Find nodes with no dependencies
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    const sorted: WorkflowNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeMap.get(nodeId)!);

      for (const neighbor of graph.get(nodeId)!) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Workflow contains a cycle!');
    }

    return sorted;
  }
}

/**
 * Main execution
 */
async function main() {
  // Register agents first
  await registerAgents();

  // Create executor
  const executor = new RegistryWorkflowExecutor();

  // Execute workflow
  const result = await executor.executeWorkflow(
    './workflows/registry-text-pipeline.yaml',
    {
      message: 'Hello from the Agentic Ecosystem!',
    }
  );

  logger.info('\n📊 Final Results:');
  logger.info(`   Original: ${result.outputs.original}`);
  logger.info(`   Uppercase: ${result.outputs.uppercase}`);
  logger.info(`   Reversed: ${result.outputs.reversed}`);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error(`Workflow execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

export { RegistryWorkflowExecutor };
