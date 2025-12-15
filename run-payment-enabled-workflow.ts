/**
 * Payment-Enabled Registry Workflow Executor
 * Uses PaymentAwareClient to handle x402 payments automatically
 */

import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@a2a-js/sdk';
import { Wallet } from 'ethers';
import { Logger } from './src/utils/logger';
import { registry, registerAgents } from './register-agents';
import { 
  WorkflowParser, 
  type Workflow, 
  type WorkflowNode, 
  type WorkflowEdge 
} from './src/workflow/workflow-parser';
import { PaymentAwareClient } from './src/payment/payment-aware-client';

const logger = new Logger('PaymentWorkflow');

/**
 * Configuration for payment-enabled workflows
 */
export interface PaymentWorkflowConfig {
  network: 'base' | 'base-sepolia';
  privateKey?: string;
  autoPayment?: boolean;
  maxPaymentPerAgent?: number;
}

/**
 * Workflow executor with automatic x402 payment handling
 */
export class PaymentEnabledWorkflowExecutor {
  private nodeOutputs: Map<string, any> = new Map();
  private totalCost: number = 0;
  private wallet?: Wallet;
  private autoPayment: boolean;
  private maxPaymentPerAgent: number;
  private network: string;

  constructor(config: PaymentWorkflowConfig) {
    this.network = config.network;
    this.autoPayment = config.autoPayment ?? true;
    this.maxPaymentPerAgent = config.maxPaymentPerAgent ?? Number.MAX_SAFE_INTEGER;

    if (config.privateKey) {
      this.wallet = new Wallet(config.privateKey);
      logger.info(`💳 Wallet configured: ${this.wallet.address}`);
      logger.info(`🌐 Network: ${config.network}`);
    } else {
      logger.warn('⚠️  No wallet configured - payments will fail');
    }
  }

  /**
   * Execute a workflow from YAML file with automatic payment handling
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

    // Execute nodes in order
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
    logger.info(`💰 Total Cost: ${this.formatUSDC(this.totalCost)} USDC`);
    logger.info(`📊 Budget Used: ${((this.totalCost / workflow.maxBudget) * 100).toFixed(1)}%`);
    logger.info('='.repeat(70));

    return { outputs, totalCost: this.totalCost };
  }

  /**
   * Execute a single workflow node with automatic payment handling
   */
  private async executeNode(node: WorkflowNode, workflow: Workflow): Promise<void> {
    logger.info(`\n▶️  Executing: ${node.name} (${node.id})`);
    logger.info(`   Agent Ref: ${node.ref}`);

    try {
      // Look up agent in registry
      const agent = await registry.getAgent(node.ref);
      logger.info(`   ✓ Found agent: ${agent.name} v${agent.version}`);
      logger.info(`   📍 Endpoint: ${agent.endpointUrl}`);
      logger.info(`   💵 Price: ${this.formatUSDC(parseFloat(agent.pricing.amount))} USDC`);

      // Resolve input templates
      const resolvedInputs: Record<string, any> = {};
      for (const [key, value] of Object.entries(node.inputs)) {
        resolvedInputs[key] = this.resolveTemplate(value);
      }

      logger.info(`   📥 Inputs: ${JSON.stringify(resolvedInputs)}`);

      // Create payment-aware client
      const agentCardUrl = `${agent.endpointUrl}/.well-known/agent-card.json`;
      const client = await PaymentAwareClient.fromCardUrl(agentCardUrl, {
        wallet: this.wallet,
        autoPayment: this.autoPayment,
        maxPaymentAmount: this.maxPaymentPerAgent,
      });

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

      // Call agent with retry logic (PaymentAwareClient handles payment automatically)
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
   * Topological sort for workflow execution order
   */
  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map(nodes.map(n => [n.id, 0]));
    const adjacency = new Map<string, string[]>(nodes.map(n => [n.id, []]));

    // Build graph
    for (const edge of edges) {
      adjacency.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // Find nodes with no dependencies
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Sort
    const sorted: WorkflowNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) {
        sorted.push(node);
      }

      for (const neighbor of adjacency.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Workflow contains cycles');
    }

    return sorted;
  }

  /**
   * Resolve template strings like {{inputs.message}} or {{node.output}}
   */
  private resolveTemplate(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

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
   * Resolve a path like "inputs.message" or "echo.output.text"
   */
  private resolvePath(path: string): any {
    const parts = path.split('.');
    let current: any = this.nodeOutputs.get(parts[0] || '');

    for (let i = 1; i < parts.length; i++) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[parts[i] || ''];
    }

    return current;
  }

  /**
   * Format atomic units to human-readable USDC
   */
  private formatUSDC(atomicAmount: number): string {
    return (atomicAmount / 1_000_000).toFixed(6);
  }
}
