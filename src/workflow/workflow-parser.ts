/**
 * YAML Workflow Parser
 * Parses and validates YAML workflow files
 */

import { parse } from 'yaml';
import { readFileSync } from 'fs';

/**
 * Workflow input/output schema
 */
export interface WorkflowSchema {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
  value?: string;  // For outputs with template values
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
}

/**
 * Workflow node definition
 */
export interface WorkflowNode {
  id: string;
  ref: string;  // Agent ref in registry
  name: string;
  description: string;
  inputs: Record<string, any>;
  retry?: RetryConfig;
}

/**
 * Workflow edge definition
 */
export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  name: string;
  version: string;
  description: string;
  chain: string;
  maxBudget: number;
  budgetToken: string;
  inputs: Record<string, WorkflowSchema>;
  outputs: Record<string, WorkflowSchema>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, any>;
}

/**
 * Workflow validation error
 */
export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

/**
 * YAML Workflow Parser
 */
export class WorkflowParser {
  /**
   * Parse a workflow from a YAML file
   */
  static parseFile(filePath: string): Workflow {
    const content = readFileSync(filePath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Parse a workflow from YAML content
   */
  static parse(content: string): Workflow {
    try {
      const workflow = parse(content) as Workflow;
      this.validate(workflow);
      return workflow;
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        throw error;
      }
      throw new WorkflowValidationError(`Failed to parse workflow: ${(error as Error).message}`);
    }
  }

  /**
   * Validate workflow structure
   */
  private static validate(workflow: Workflow): void {
    // Required top-level fields
    if (!workflow.name) {
      throw new WorkflowValidationError('Workflow must have a name');
    }
    if (!workflow.version) {
      throw new WorkflowValidationError('Workflow must have a version');
    }
    if (!workflow.description) {
      throw new WorkflowValidationError('Workflow must have a description');
    }
    if (!workflow.chain) {
      throw new WorkflowValidationError('Workflow must specify a chain');
    }
    if (typeof workflow.maxBudget !== 'number' || workflow.maxBudget <= 0) {
      throw new WorkflowValidationError('Workflow must have a valid maxBudget');
    }
    if (!workflow.budgetToken) {
      throw new WorkflowValidationError('Workflow must specify a budgetToken');
    }

    // Validate inputs
    if (!workflow.inputs || typeof workflow.inputs !== 'object') {
      throw new WorkflowValidationError('Workflow must have inputs object');
    }

    // Validate outputs
    if (!workflow.outputs || typeof workflow.outputs !== 'object') {
      throw new WorkflowValidationError('Workflow must have outputs object');
    }

    // Validate nodes
    if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      throw new WorkflowValidationError('Workflow must have at least one node');
    }

    const nodeIds = new Set<string>();
    for (const node of workflow.nodes) {
      this.validateNode(node, nodeIds);
    }

    // Validate edges
    if (!Array.isArray(workflow.edges)) {
      throw new WorkflowValidationError('Workflow must have edges array');
    }

    for (const edge of workflow.edges) {
      this.validateEdge(edge, nodeIds);
    }

    // Check for cycles (basic check)
    this.checkForCycles(workflow.nodes, workflow.edges);
  }

  /**
   * Validate a single node
   */
  private static validateNode(node: WorkflowNode, nodeIds: Set<string>): void {
    if (!node.id) {
      throw new WorkflowValidationError('Node must have an id');
    }
    if (nodeIds.has(node.id)) {
      throw new WorkflowValidationError(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);

    if (!node.ref) {
      throw new WorkflowValidationError(`Node ${node.id} must have a ref (agent reference)`);
    }
    if (!node.name) {
      throw new WorkflowValidationError(`Node ${node.id} must have a name`);
    }
    if (!node.inputs || typeof node.inputs !== 'object') {
      throw new WorkflowValidationError(`Node ${node.id} must have inputs object`);
    }

    // Validate retry config if present
    if (node.retry) {
      if (typeof node.retry.maxAttempts !== 'number' || node.retry.maxAttempts < 1) {
        throw new WorkflowValidationError(`Node ${node.id} retry.maxAttempts must be >= 1`);
      }
      if (typeof node.retry.backoffMs !== 'number' || node.retry.backoffMs < 0) {
        throw new WorkflowValidationError(`Node ${node.id} retry.backoffMs must be >= 0`);
      }
    }
  }

  /**
   * Validate a single edge
   */
  private static validateEdge(edge: WorkflowEdge, nodeIds: Set<string>): void {
    if (!edge.from) {
      throw new WorkflowValidationError('Edge must have a from node');
    }
    if (!edge.to) {
      throw new WorkflowValidationError('Edge must have a to node');
    }
    if (!nodeIds.has(edge.from)) {
      throw new WorkflowValidationError(`Edge references unknown node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      throw new WorkflowValidationError(`Edge references unknown node: ${edge.to}`);
    }
  }

  /**
   * Check for cycles in the workflow graph
   */
  private static checkForCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
    const graph = new Map<string, string[]>();
    
    // Build adjacency list
    for (const node of nodes) {
      graph.set(node.id, []);
    }
    for (const edge of edges) {
      graph.get(edge.from)!.push(edge.to);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of graph.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          throw new WorkflowValidationError('Workflow contains a cycle');
        }
      }
    }
  }

  /**
   * Get workflow summary
   */
  static getSummary(workflow: Workflow): string {
    const lines = [
      `Workflow: ${workflow.name} v${workflow.version}`,
      `Description: ${workflow.description}`,
      `Chain: ${workflow.chain}`,
      `Budget: ${workflow.maxBudget} ${workflow.budgetToken}`,
      `Nodes: ${workflow.nodes.length}`,
      `Edges: ${workflow.edges.length}`,
    ];

    if (workflow.metadata) {
      lines.push(`Estimated Cost: ${workflow.metadata.estimatedCost || 'N/A'}`);
      lines.push(`Estimated Duration: ${workflow.metadata.estimatedDuration || 'N/A'}`);
    }

    return lines.join('\n');
  }

  /**
   * Extract all template variables from the workflow
   */
  static extractTemplateVariables(workflow: Workflow): Set<string> {
    const variables = new Set<string>();
    const templateRegex = /\{\{([^}]+)\}\}/g;

    const extractFromValue = (value: any) => {
      if (typeof value === 'string') {
        const matches = value.matchAll(templateRegex);
        for (const match of matches) {
          const path = match[1]?.trim();
          if (path) {
            variables.add(path);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const v of Object.values(value)) {
          extractFromValue(v);
        }
      }
    };

    // Extract from node inputs
    for (const node of workflow.nodes) {
      extractFromValue(node.inputs);
    }

    // Extract from outputs
    for (const output of Object.values(workflow.outputs)) {
      if (output.value) {
        extractFromValue(output.value);
      }
    }

    // Extract from edge conditions
    for (const edge of workflow.edges) {
      if (edge.condition) {
        extractFromValue(edge.condition);
      }
    }

    return variables;
  }

  /**
   * Validate inputs against workflow schema
   */
  static validateInputs(workflow: Workflow, inputs: Record<string, any>): void {
    for (const [key, schema] of Object.entries(workflow.inputs)) {
      // Check required inputs
      if (schema.required && !(key in inputs)) {
        throw new WorkflowValidationError(`Missing required input: ${key}`);
      }

      // Check input type
      if (key in inputs) {
        const value = inputs[key];
        const actualType = typeof value;
        
        if (schema.type === 'string' && actualType !== 'string') {
          throw new WorkflowValidationError(`Input ${key} must be a string, got ${actualType}`);
        }
        if (schema.type === 'number' && actualType !== 'number') {
          throw new WorkflowValidationError(`Input ${key} must be a number, got ${actualType}`);
        }
        if (schema.type === 'boolean' && actualType !== 'boolean') {
          throw new WorkflowValidationError(`Input ${key} must be a boolean, got ${actualType}`);
        }

        // Check enum values
        if (schema.enum && !schema.enum.includes(value)) {
          throw new WorkflowValidationError(
            `Input ${key} must be one of: ${schema.enum.join(', ')}, got ${value}`
          );
        }
      }
    }
  }
}
