/**
 * Test Payment-Enabled Workflow Executor
 * Executes workflow with automatic x402 payment handling
 */

import { PaymentEnabledWorkflowExecutor } from './run-payment-enabled-workflow';
import { registerAgents } from './register-agents';
import { Logger } from './src/utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = new Logger('TestPaymentWorkflow');

async function main() {
  try {
    logger.info('='.repeat(70));
    logger.info('💰 Testing Payment-Enabled Workflow Executor');
    logger.info('='.repeat(70));

    // Configuration from environment
    const network = (process.env.PAYMENT_NETWORK || 'base-sepolia') as 'base' | 'base-sepolia';
    const privateKey = process.env.PRIVATE_KEY;
    const autoPayment = process.env.AUTO_PAYMENT !== 'false';

    if (!privateKey) {
      logger.error('❌ PRIVATE_KEY not configured in .env');
      logger.info('   Set PRIVATE_KEY in .env file to enable payments');
      process.exit(1);
    }

    logger.info(`🌐 Network: ${network}`);
    logger.info(`🤖 Auto-payment: ${autoPayment ? 'enabled' : 'disabled'}`);
    logger.info('');

    // Register agents first
    logger.info('📝 Registering agents...');
    await registerAgents();
    logger.info('✅ Agents registered\n');

    // Create executor
    const executor = new PaymentEnabledWorkflowExecutor({
      network,
      privateKey,
      autoPayment,
      maxPaymentPerAgent: 1_000_000, // 1 USDC max per agent
    });

    // Execute workflow
    const workflowPath = './workflows/registry-text-pipeline.yaml';
    const inputs = {
      message: 'Hello from payment-enabled workflow!',
    };

    logger.info(`📋 Workflow: ${workflowPath}`);
    logger.info(`📥 Inputs: ${JSON.stringify(inputs)}`);
    logger.info('');

    const result = await executor.executeWorkflow(workflowPath, inputs);

    logger.info('\n' + '='.repeat(70));
    logger.info('🎉 Workflow Complete!');
    logger.info('='.repeat(70));
    logger.info(`📤 Outputs:`);
    logger.info(JSON.stringify(result.outputs, null, 2));
    logger.info(`\n💰 Total Cost: ${(result.totalCost / 1_000_000).toFixed(6)} USDC`);
    logger.info('='.repeat(70));

  } catch (error) {
    logger.error(`\n❌ Workflow execution failed: ${(error as Error).message}`);
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

main();
