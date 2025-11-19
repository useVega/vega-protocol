/**
 * Agent Registry Service
 * Handles CRUD operations for agent definitions
 */

import type { AgentDefinition, AgentCategory, AgentStatus } from '../types/agent.types';
import type { ChainType, TokenSymbol } from '../types/chain.types';
import { AgentNotFoundError, ValidationError } from '../types/errors.types';

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();

  /**
   * Register a new agent
   */
  async createAgent(agent: AgentDefinition): Promise<AgentDefinition> {
    if (this.agents.has(agent.ref)) {
      throw new ValidationError(`Agent with ref ${agent.ref} already exists`);
    }

    // Validate agent definition
    this.validateAgent(agent);

    agent.createdAt = new Date();
    agent.updatedAt = new Date();
    agent.status = 'draft';

    this.agents.set(agent.ref, agent);
    return agent;
  }

  /**
   * Get agent by reference
   */
  async getAgent(ref: string): Promise<AgentDefinition> {
    const agent = this.agents.get(ref);
    if (!agent) {
      throw new AgentNotFoundError(ref);
    }
    return agent;
  }

  /**
   * List agents with filters
   */
  async listAgents(filters?: {
    category?: AgentCategory;
    status?: AgentStatus;
    chain?: ChainType;
    token?: TokenSymbol;
    ownerId?: string;
    tags?: string[];
  }): Promise<AgentDefinition[]> {
    let agents = Array.from(this.agents.values());

    if (filters) {
      if (filters.category) {
        agents = agents.filter(a => a.category === filters.category);
      }
      if (filters.status) {
        agents = agents.filter(a => a.status === filters.status);
      }
      if (filters.chain) {
        agents = agents.filter(a => a.supportedChains.includes(filters.chain!));
      }
      if (filters.token) {
        agents = agents.filter(a => a.supportedTokens.includes(filters.token!));
      }
      if (filters.ownerId) {
        agents = agents.filter(a => a.ownerId === filters.ownerId);
      }
      if (filters.tags && filters.tags.length > 0) {
        agents = agents.filter(a => 
          filters.tags!.some(tag => a.tags.includes(tag))
        );
      }
    }

    return agents;
  }

  /**
   * Update agent definition
   */
  async updateAgent(ref: string, updates: Partial<AgentDefinition>): Promise<AgentDefinition> {
    const agent = await this.getAgent(ref);
    
    const updatedAgent = {
      ...agent,
      ...updates,
      ref: agent.ref, // Prevent ref change
      updatedAt: new Date(),
    };

    this.validateAgent(updatedAgent);
    this.agents.set(ref, updatedAgent);
    
    return updatedAgent;
  }

  /**
   * Publish an agent (change status to published)
   */
  async publishAgent(ref: string): Promise<AgentDefinition> {
    const agent = await this.getAgent(ref);
    
    // Additional validation before publishing
    if (agent.endpointType === 'http' && !agent.endpointUrl) {
      throw new ValidationError('HTTP agents must have an endpointUrl');
    }

    return this.updateAgent(ref, { status: 'published' });
  }

  /**
   * Deprecate an agent
   */
  async deprecateAgent(ref: string): Promise<AgentDefinition> {
    return this.updateAgent(ref, { status: 'deprecated' });
  }

  /**
   * Delete an agent (only drafts can be deleted)
   */
  async deleteAgent(ref: string): Promise<void> {
    const agent = await this.getAgent(ref);
    
    if (agent.status !== 'draft') {
      throw new ValidationError('Only draft agents can be deleted');
    }

    this.agents.delete(ref);
  }

  /**
   * Validate agent pricing and endpoint
   */
  async validateAgentInvocation(ref: string): Promise<boolean> {
    const agent = await this.getAgent(ref);
    
    // Check if agent is published
    if (agent.status !== 'published') {
      throw new ValidationError(`Agent ${ref} is not published`);
    }

    // Check endpoint availability (for HTTP agents)
    if (agent.endpointType === 'http') {
      // TODO: Implement HTTP health check
      return true;
    }

    return true;
  }

  /**
   * Validate agent definition
   */
  private validateAgent(agent: AgentDefinition): void {
    if (!agent.ref || agent.ref.trim().length === 0) {
      throw new ValidationError('Agent ref is required');
    }

    if (!agent.name || agent.name.trim().length === 0) {
      throw new ValidationError('Agent name is required');
    }

    if (!agent.version) {
      throw new ValidationError('Agent version is required');
    }

    if (!agent.pricing || !agent.pricing.amount) {
      throw new ValidationError('Agent pricing is required');
    }

    if (agent.endpointType === 'http' && agent.status === 'published' && !agent.endpointUrl) {
      throw new ValidationError('HTTP agents must have an endpointUrl');
    }

    if (!agent.supportedChains || agent.supportedChains.length === 0) {
      throw new ValidationError('Agent must support at least one chain');
    }

    if (!agent.supportedTokens || agent.supportedTokens.length === 0) {
      throw new ValidationError('Agent must support at least one token');
    }
  }
}
