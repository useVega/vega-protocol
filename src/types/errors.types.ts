/**
 * Error Types
 * Defines custom error classes for the agentic ecosystem
 */

export class AgentEcoError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AgentEcoError';
  }
}

export class ValidationError extends AgentEcoError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class PaymentError extends AgentEcoError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', 402, details);
    this.name = 'PaymentError';
  }
}

export class AgentNotFoundError extends AgentEcoError {
  constructor(agentRef: string) {
    super(`Agent not found: ${agentRef}`, 'AGENT_NOT_FOUND', 404);
    this.name = 'AgentNotFoundError';
  }
}

export class InsufficientBudgetError extends AgentEcoError {
  constructor(required: string, available: string) {
    super(
      `Insufficient budget: required ${required}, available ${available}`,
      'INSUFFICIENT_BUDGET',
      402
    );
    this.name = 'InsufficientBudgetError';
  }
}

export class WorkflowValidationError extends AgentEcoError {
  constructor(message: string, details?: any) {
    super(message, 'WORKFLOW_VALIDATION_ERROR', 400, details);
    this.name = 'WorkflowValidationError';
  }
}

export class ExecutionError extends AgentEcoError {
  constructor(message: string, details?: any) {
    super(message, 'EXECUTION_ERROR', 500, details);
    this.name = 'ExecutionError';
  }
}
