/**
 * Workflow Validator
 * Validates workflow specifications for correctness
 */

import type { WorkflowSpec } from '../types/workflow.types';
import type { AgentRegistry } from '../registry/agent-registry.service';
import { WorkflowValidationError } from '../types/errors.types';

export class WorkflowValidator {
  constructor(private agentRegistry: AgentRegistry) {}

  /**
   * Validate complete workflow specification
   */
  async validate(spec: WorkflowSpec): Promise<void> {
    // Structural validation
    this.validateStructure(spec);

    // Graph validation
    this.validateGraph(spec);

    // Agent references validation
    await this.validateAgentReferences(spec);

    // Budget validation
    this.validateBudget(spec);
  }

  /**
   * Validate basic structure
   */
  private validateStructure(spec: WorkflowSpec): void {
    if (!spec.name || spec.name.trim().length === 0) {
      throw new WorkflowValidationError('Workflow name is required');
    }

    if (!spec.nodes || spec.nodes.length === 0) {
      throw new WorkflowValidationError('Workflow must have at least one node');
    }

    if (!spec.entryNodeId) {
      throw new WorkflowValidationError('Entry node is required');
    }

    const entryNode = spec.nodes.find(n => n.id === spec.entryNodeId);
    if (!entryNode) {
      throw new WorkflowValidationError(`Entry node ${spec.entryNodeId} not found`);
    }
  }

  /**
   * Validate graph structure (cycles, reachability)
   */
  private validateGraph(spec: WorkflowSpec): void {
    const nodeIds = new Set(spec.nodes.map(n => n.id));
    
    // Validate all edge references exist
    for (const edge of spec.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new WorkflowValidationError(`Edge references non-existent node: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new WorkflowValidationError(`Edge references non-existent node: ${edge.to}`);
      }
    }

    // Check for cycles (optional - some workflows may want cycles for loops)
    const hasCycles = this.detectCycles(spec);
    if (hasCycles) {
      // Log warning but don't fail - cycles might be intentional for loop nodes
      console.warn('Workflow contains cycles - ensure this is intentional');
    }

    // Validate all nodes are reachable from entry
    this.validateReachability(spec);
  }

  /**
   * Validate all agent references exist and are published
   */
  private async validateAgentReferences(spec: WorkflowSpec): Promise<void> {
    const agentNodes = spec.nodes.filter(n => n.type === 'agent' && n.agentRef);
    
    for (const node of agentNodes) {
      if (!node.agentRef) {
        throw new WorkflowValidationError(`Agent node ${node.id} missing agentRef`);
      }

      try {
        const agent = await this.agentRegistry.getAgent(node.agentRef);
        
        if (agent.status !== 'published') {
          throw new WorkflowValidationError(
            `Agent ${node.agentRef} is not published (status: ${agent.status})`
          );
        }

        // Validate chain/token compatibility
        if (!agent.supportedChains.includes(spec.chain)) {
          throw new WorkflowValidationError(
            `Agent ${node.agentRef} does not support chain ${spec.chain}`
          );
        }

        if (!agent.supportedTokens.includes(spec.token)) {
          throw new WorkflowValidationError(
            `Agent ${node.agentRef} does not support token ${spec.token}`
          );
        }
      } catch (error) {
        if (error instanceof WorkflowValidationError) {
          throw error;
        }
        throw new WorkflowValidationError(`Agent ${node.agentRef} not found`);
      }
    }
  }

  /**
   * Validate budget is sufficient
   */
  private validateBudget(spec: WorkflowSpec): void {
    const budget = parseFloat(spec.maxBudget);
    
    if (isNaN(budget) || budget <= 0) {
      throw new WorkflowValidationError('maxBudget must be a positive number');
    }

    // TODO: Estimate workflow cost and compare with budget
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycles(spec: WorkflowSpec): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const adjacencyList = new Map<string, string[]>();
    for (const edge of spec.edges) {
      if (!adjacencyList.has(edge.from)) {
        adjacencyList.set(edge.from, []);
      }
      adjacencyList.get(edge.from)!.push(edge.to);
    }

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of spec.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate all nodes are reachable from entry
   */
  private validateReachability(spec: WorkflowSpec): void {
    const reachable = new Set<string>();
    const queue = [spec.entryNodeId];

    const adjacencyList = new Map<string, string[]>();
    for (const edge of spec.edges) {
      if (!adjacencyList.has(edge.from)) {
        adjacencyList.set(edge.from, []);
      }
      adjacencyList.get(edge.from)!.push(edge.to);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      reachable.add(current);

      const neighbors = adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    const unreachableNodes = spec.nodes.filter(n => !reachable.has(n.id));
    if (unreachableNodes.length > 0) {
      throw new WorkflowValidationError(
        `Unreachable nodes: ${unreachableNodes.map(n => n.id).join(', ')}`
      );
    }
  }
}
