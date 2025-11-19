/**
 * Workflow Execution Engine
 * Orchestrates workflow execution using A2A protocol
 */

import type { WorkflowSpec, WorkflowRun, NodeRun } from '../types';
import type { A2AExecutionResult } from '../types/a2a.types';
import { A2AAgentCaller } from './a2a-agent-caller.service';
import { AgentRegistry } from '../registry';
import { TemplateResolver } from '../utils/template-resolver';
import { createLogger } from '../utils';
import { ExecutionError } from '../types/errors.types';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('ExecutionEngine');

export class WorkflowExecutionEngine {
  private templateResolver = new TemplateResolver();

  constructor(
    private agentRegistry: AgentRegistry,
    private agentCaller: A2AAgentCaller
  ) {}

  /**
   * Execute a workflow run
   */
  async executeRun(
    workflowSpec: WorkflowSpec,
    run: WorkflowRun,
    inputs?: Record<string, any>
  ): Promise<WorkflowRun> {
    logger.info(`Starting execution of run: ${run.runId}`);

    try {
      // Build execution context
      const context: Record<string, any> = {
        input: inputs || {},
      };

      // Get execution order (topological sort)
      const executionOrder = this.getExecutionOrder(workflowSpec);
      logger.info(`Execution order: ${executionOrder.join(' -> ')}`);

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = workflowSpec.nodes.find(n => n.id === nodeId);
        if (!node) {
          throw new ExecutionError(`Node ${nodeId} not found in workflow`);
        }

        logger.info(`Executing node: ${node.id} (${node.name})`);

        // Execute the node
        const nodeRun = await this.executeNode(node, context, run.runId);

        // Store result in context
        context[node.id] = nodeRun.output;

        logger.info(`Node ${node.id} completed with cost: ${nodeRun.cost}`);
      }

      // Update run status
      run.status = 'completed';
      run.endedAt = new Date();
      const lastNodeId = executionOrder[executionOrder.length - 1];
      run.output = lastNodeId ? context[lastNodeId] : undefined;

      logger.info(`Workflow run ${run.runId} completed successfully`);
      return run;

    } catch (error) {
      logger.error(`Workflow run ${run.runId} failed:`, error);
      run.status = 'failed';
      run.endedAt = new Date();
      run.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    node: any,
    context: Record<string, any>,
    runId: string
  ): Promise<NodeRun> {
    const nodeRun: NodeRun = {
      nodeRunId: uuidv4(),
      runId,
      nodeId: node.id,
      agentRef: node.agentRef || '',
      status: 'running',
      startedAt: new Date(),
      inputs: {},
      cost: '0',
      retryCount: 0,
      logs: [],
    };

    try {
      // Resolve inputs using template resolver
      const resolvedInputs = this.templateResolver.resolveObject(node.inputs, context);
      nodeRun.inputs = resolvedInputs;

      logger.debug(`Node ${node.id} resolved inputs:`, resolvedInputs);

      // Get agent definition
      const agent = await this.agentRegistry.getAgent(node.agentRef);
      
      // Ensure agent has endpoint URL (A2A card URL)
      if (!agent.endpointUrl) {
        throw new ExecutionError(`Agent ${node.agentRef} has no endpoint URL`);
      }

      // Construct card URL (A2A standard location)
      const cardUrl = `${agent.endpointUrl}/.well-known/agent-card.json`;

      // Call agent via A2A protocol
      const result = await this.agentCaller.callAgentWithInputs(
        cardUrl,
        resolvedInputs,
        runId // Use runId as contextId for tracing
      );

      // Extract output from result
      nodeRun.output = this.extractOutput(result);
      nodeRun.status = 'completed';
      nodeRun.endedAt = new Date();
      nodeRun.cost = agent.pricing.amount; // Use agent's pricing

      logger.info(`Node ${node.id} execution successful`);
      return nodeRun;

    } catch (error) {
      logger.error(`Node ${node.id} execution failed:`, error);
      nodeRun.status = 'failed';
      nodeRun.endedAt = new Date();
      nodeRun.error = error instanceof Error ? error.message : String(error);
      
      // Check if retry is configured
      if (node.retryPolicy && nodeRun.retryCount < node.retryPolicy.maxAttempts) {
        nodeRun.retryCount++;
        logger.info(`Retrying node ${node.id}, attempt ${nodeRun.retryCount}`);
        
        // Wait for backoff period
        await new Promise(resolve => setTimeout(resolve, node.retryPolicy.backoffMs));
        
        // Retry execution
        return this.executeNode(node, context, runId);
      }

      throw error;
    }
  }

  /**
   * Extract output from A2A execution result
   */
  private extractOutput(result: A2AExecutionResult): any {
    if (result.kind === 'message') {
      // Extract text from message parts
      const textParts = result.parts
        .filter((p: any) => p.kind === 'text')
        .map((p: any) => p.text);
      
      return textParts.length === 1 ? textParts[0] : textParts;
    } else if (result.kind === 'task') {
      // Extract artifacts from task
      if (result.artifacts && result.artifacts.length > 0) {
        const artifact = result.artifacts[0];
        if (artifact && artifact.parts) {
          const textParts = artifact.parts
            .filter((p: any) => p.kind === 'text')
            .map((p: any) => p.text);
          
          return {
            taskId: result.id,
            status: result.status.state,
            output: textParts.length === 1 ? textParts[0] : textParts,
          };
        }
      }
      
      return {
        taskId: result.id,
        status: result.status.state,
      };
    }

    return result;
  }

  /**
   * Get execution order using topological sort
   */
  private getExecutionOrder(spec: WorkflowSpec): string[] {
    const nodes = spec.nodes.map(n => n.id);
    const edges = spec.edges;

    // Build adjacency list
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach(node => {
      graph.set(node, []);
      inDegree.set(node, 0);
    });

    // Build graph
    edges.forEach(edge => {
      graph.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    });

    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no dependencies
    inDegree.forEach((degree, node) => {
      if (degree === 0) {
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = graph.get(current) || [];
      neighbors.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      throw new ExecutionError('Workflow contains cycles or unreachable nodes');
    }

    return result;
  }
}
