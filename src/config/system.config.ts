/**
 * System Configuration
 * Global settings for the agentic ecosystem
 */

export const CONFIG = {
  // Platform Settings
  platform: {
    name: 'Agentic Ecosystem',
    version: '0.1.0',
    feePercentage: 10, // 10% platform fee
  },

  // Execution Settings
  execution: {
    maxConcurrentRuns: 10,
    defaultRetryAttempts: 3,
    defaultRetryBackoffMs: 1000,
    executionTimeoutMs: 300000, // 5 minutes
    nodeTimeoutMs: 60000, // 1 minute per node
  },

  // Payment Settings
  payment: {
    minBudget: '0.01', // Minimum budget per workflow
    maxBudget: '10000', // Maximum budget per workflow
    settlementDelayMs: 5000, // Delay before settlement
  },

  // Agent Registry Settings
  registry: {
    maxAgentsPerDeveloper: 100,
    minAgentNameLength: 3,
    maxAgentNameLength: 100,
  },

  // Trust & Reputation
  reputation: {
    minScoreForPublish: 0,
    defaultScore: 3.0,
    minFeedbackRating: 1,
    maxFeedbackRating: 5,
  },

  // Monitoring
  monitoring: {
    metricsRetentionDays: 30,
    logRetentionDays: 90,
    enableDetailedLogs: true,
  },
};

export type SystemConfig = typeof CONFIG;
