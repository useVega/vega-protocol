/**
 * YAML Workflow Parser
 * Parses YAML DSL into WorkflowSpec
 */

import { parse } from 'yaml';
import type { WorkflowSpec, WorkflowNode, WorkflowEdge } from '../types/workflow.types';
import { WorkflowValidationError } from '../types/errors.types';

export interface WorkflowYAMLSpec {
  name: string;
  description: string;
  version: string;
  chain: string;
  token: string;
  maxBudget: string;
  entryNode: string;
  nodes: {
    [id: string]: {
      type: string;
      agent?: string;
      name: string;
      inputs?: Record<string, any>;
      condition?: string;
      retry?: {
        maxAttempts: number;
        backoffMs: number;
      };
    };
  };
  edges: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
  tags?: string[];
}

export class WorkflowYAMLParser {
  /**
   * Parse YAML string into WorkflowSpec
   */
  parse(yamlContent: string, userId: string): WorkflowSpec {
    try {
      const yaml = parse(yamlContent) as WorkflowYAMLSpec;
      return this.yamlToWorkflowSpec(yaml, userId);
    } catch (error) {
      throw new WorkflowValidationError(
        `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert YAML object to WorkflowSpec
   */
  private yamlToWorkflowSpec(yaml: WorkflowYAMLSpec, userId: string): WorkflowSpec {
    // Validate required fields
    this.validateYAML(yaml);

    // Convert nodes
    const nodes: WorkflowNode[] = Object.entries(yaml.nodes).map(([id, node]) => ({
      id,
      type: node.type as any,
      agentRef: node.agent,
      name: node.name,
      inputs: node.inputs || {},
      condition: node.condition,
      retryPolicy: node.retry,
    }));

    // Convert edges
    const edges: WorkflowEdge[] = yaml.edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      condition: edge.condition,
    }));

    // Generate workflow ID
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: workflowId,
      name: yaml.name,
      description: yaml.description,
      version: yaml.version,
      userId,
      chain: yaml.chain as any,
      token: yaml.token as any,
      maxBudget: yaml.maxBudget,
      nodes,
      edges,
      entryNodeId: yaml.entryNode,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: yaml.tags || [],
    };
  }

  /**
   * Validate YAML structure
   */
  private validateYAML(yaml: WorkflowYAMLSpec): void {
    if (!yaml.name) {
      throw new WorkflowValidationError('Workflow name is required');
    }

    if (!yaml.chain || !yaml.token) {
      throw new WorkflowValidationError('Chain and token are required');
    }

    if (!yaml.maxBudget) {
      throw new WorkflowValidationError('maxBudget is required');
    }

    if (!yaml.nodes || Object.keys(yaml.nodes).length === 0) {
      throw new WorkflowValidationError('Workflow must have at least one node');
    }

    if (!yaml.entryNode) {
      throw new WorkflowValidationError('entryNode is required');
    }

    if (!yaml.nodes[yaml.entryNode]) {
      throw new WorkflowValidationError(`Entry node ${yaml.entryNode} does not exist`);
    }

    // Validate edges reference existing nodes
    if (yaml.edges) {
      for (const edge of yaml.edges) {
        if (!yaml.nodes[edge.from]) {
          throw new WorkflowValidationError(`Edge references non-existent node: ${edge.from}`);
        }
        if (!yaml.nodes[edge.to]) {
          throw new WorkflowValidationError(`Edge references non-existent node: ${edge.to}`);
        }
      }
    }
  }

  /**
   * Generate sample YAML template
   */
  generateTemplate(): string {
    return `name: "My Workflow"
description: "Sample workflow description"
version: "1.0.0"
chain: "base"
token: "USDC"
maxBudget: "5.0"
entryNode: "node1"
tags:
  - sample
  - demo

nodes:
  node1:
    type: agent
    agent: text-summarizer-v1
    name: "Summarize Text"
    inputs:
      text: "{{input.text}}"
      maxLength: 100
    retry:
      maxAttempts: 3
      backoffMs: 1000
      
  node2:
    type: agent
    agent: sentiment-analyzer-v1
    name: "Analyze Sentiment"
    inputs:
      text: "{{node1.output}}"

edges:
  - from: node1
    to: node2
`;
  }
}
