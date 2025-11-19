/**
 * Workflow Scheduling Service
 * Handles workflow run scheduling and queuing
 */

import type { WorkflowSpec, WorkflowRun } from '../types';
import type { BudgetManager } from '../payment/budget-manager.service';
import { WorkflowValidationError } from '../types/errors.types';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduleWorkflowRequest {
  workflowSpec: WorkflowSpec;
  userWallet: string;
  inputs?: Record<string, any>;
}

export class WorkflowScheduler {
  private runs: Map<string, WorkflowRun> = new Map();
  private queue: string[] = []; // Queue of run IDs

  constructor(private budgetManager: BudgetManager) {}

  /**
   * Schedule a new workflow run
   */
  async scheduleRun(request: ScheduleWorkflowRequest): Promise<WorkflowRun> {
    const { workflowSpec, userWallet, inputs } = request;

    // Create workflow run
    const run: WorkflowRun = {
      runId: uuidv4(),
      workflowId: workflowSpec.id,
      userId: workflowSpec.userId,
      userWallet,
      status: 'queued',
      createdAt: new Date(),
      chain: workflowSpec.chain,
      token: workflowSpec.token,
      reservedBudget: workflowSpec.maxBudget,
      spentBudget: '0',
    };

    try {
      // Reserve budget
      await this.budgetManager.reserveBudget({
        runId: run.runId,
        userWallet,
        amount: workflowSpec.maxBudget,
        token: workflowSpec.token,
        chain: workflowSpec.chain,
      });

      // Store run
      this.runs.set(run.runId, run);

      // Add to queue
      this.queue.push(run.runId);

      console.log(`Workflow run ${run.runId} scheduled and queued`);
      
      return run;
    } catch (error) {
      throw new WorkflowValidationError(
        `Failed to schedule workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get next run from queue
   */
  async getNextRun(): Promise<WorkflowRun | null> {
    if (this.queue.length === 0) {
      return null;
    }

    const runId = this.queue.shift()!;
    const run = this.runs.get(runId);

    if (!run) {
      console.warn(`Run ${runId} not found in queue`);
      return this.getNextRun(); // Try next in queue
    }

    return run;
  }

  /**
   * Get workflow run by ID
   */
  async getRun(runId: string): Promise<WorkflowRun | undefined> {
    return this.runs.get(runId);
  }

  /**
   * Update run status
   */
  async updateRunStatus(
    runId: string,
    status: WorkflowRun['status'],
    updates?: Partial<WorkflowRun>
  ): Promise<WorkflowRun> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new WorkflowValidationError(`Run ${runId} not found`);
    }

    const updatedRun = {
      ...run,
      ...updates,
      status,
    };

    // Set timestamps based on status
    if (status === 'running' && !updatedRun.startedAt) {
      updatedRun.startedAt = new Date();
    } else if (['completed', 'failed', 'cancelled'].includes(status) && !updatedRun.endedAt) {
      updatedRun.endedAt = new Date();
    }

    this.runs.set(runId, updatedRun);
    return updatedRun;
  }

  /**
   * Cancel a queued or running workflow
   */
  async cancelRun(runId: string): Promise<WorkflowRun> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new WorkflowValidationError(`Run ${runId} not found`);
    }

    if (['completed', 'failed', 'cancelled'].includes(run.status)) {
      throw new WorkflowValidationError(`Cannot cancel run with status: ${run.status}`);
    }

    // Remove from queue if still queued
    const queueIndex = this.queue.indexOf(runId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }

    // Release budget
    await this.budgetManager.releaseBudget(runId);

    return this.updateRunStatus(runId, 'cancelled');
  }

  /**
   * Get all runs for a user
   */
  async getUserRuns(userId: string): Promise<WorkflowRun[]> {
    return Array.from(this.runs.values()).filter(run => run.userId === userId);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { queueLength: number; runningCount: number } {
    const runningCount = Array.from(this.runs.values()).filter(
      r => r.status === 'running'
    ).length;

    return {
      queueLength: this.queue.length,
      runningCount,
    };
  }
}
