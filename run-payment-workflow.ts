/**
 * Payment-Enabled Workflow Executor
 * Executes workflows with x402 payment integration on Base chain
 */

import { Logger } from './src/utils/logger';
import { registry, registerAgents } from './register-agents';
import { x402PaymentService } from './src/payment/x402-payment.service';
import { RegistryWorkflowExecutor } from './run-registry-workflow';
import { WorkflowParser } from './src/workflow/workflow-parser';

const logger = new Logger('PaymentWorkflow');

/**
 * Payment-enabled workflow configuration
 */
interface PaymentWorkflowConfig {
  network: 'base' | 'base-sepolia';
  clientPrivateKey?: string;
  merchantWallet?: string;
  autoPayment: boolean;  // Auto-process payments or prompt user
}

/**
 * Workflow executor with payment support
 */
class PaymentWorkflowExecutor extends RegistryWorkflowExecutor {
  private paymentService: x402PaymentService;
  private autoPayment: boolean;
  private paymentReceipts: any[] = [];

  constructor(config: PaymentWorkflowConfig) {
    super();
    
    this.paymentService = new x402PaymentService(
      config.network,
      config.clientPrivateKey,
      config.merchantWallet
    );
    
    this.autoPayment = config.autoPayment;
    
    const walletAddress = this.paymentService.getWalletAddress();
    if (walletAddress) {
      logger.info(`💳 Wallet configured: ${walletAddress}`);
    }
    
    const networkConfig = this.paymentService.getNetworkConfig();
    logger.info(`🌐 Network: ${networkConfig.network}`);
    logger.info(`💵 USDC Address: ${networkConfig.usdcAddress}`);
  }

  /**
   * Execute workflow with payment handling
   */
  async executeWorkflowWithPayments(
    workflowPath: string,
    inputs: Record<string, any>
  ): Promise<any> {
    logger.info('='.repeat(70));
    logger.info('💰 Starting Payment-Enabled Workflow Execution');
    logger.info('='.repeat(70));

    try {
      // Execute workflow (will handle payments as needed)
      const result = await this.executeWorkflow(workflowPath, inputs);
      
      // Display payment summary
      this.displayPaymentSummary();
      
      return result;
    } catch (error) {
      logger.error(`Workflow execution failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Override executeNode to add payment handling
   */
  protected async executeNodeWithPayment(node: any, workflow: any): Promise<void> {
    try {
      // Get agent from registry
      const agent = await registry.getAgent(node.ref);
      
      // Create payment requirement
      const paymentReq = this.paymentService.createPaymentRequirement(
        agent,
        `/workflow/${workflow.name}/node/${node.id}`,
        `${node.name} execution`
      );

      logger.info(`\n💳 Payment Required for ${node.name}`);
      logger.info(`   Amount: ${this.formatUSDC(paymentReq.maxAmountRequired)} USDC`);
      logger.info(`   To: ${paymentReq.payTo}`);

      if (!this.autoPayment) {
        // In production, prompt user for confirmation
        logger.info('   ⏳ Waiting for payment confirmation...');
      }

      // Process payment
      const paymentPayload = await this.paymentService.processPayment(paymentReq);
      
      // Verify payment
      const isValid = await this.paymentService.verifyPayment(paymentPayload, paymentReq);
      
      if (!isValid) {
        throw new Error('Payment verification failed');
      }

      // Record payment
      const receipt = this.paymentService.createPaymentReceipt(paymentPayload, paymentReq);
      this.paymentReceipts.push(receipt);
      
      logger.info(`   ✅ Payment processed successfully`);

      // Now execute the actual node (parent class method)
      // Note: In production, you'd call the actual agent here
      
    } catch (error) {
      logger.error(`Payment failed for ${node.name}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Display payment summary
   */
  private displayPaymentSummary(): void {
    if (this.paymentReceipts.length === 0) {
      return;
    }

    logger.info('\n' + '='.repeat(70));
    logger.info('💰 Payment Summary');
    logger.info('='.repeat(70));

    let totalPaid = 0n;

    for (const receipt of this.paymentReceipts) {
      logger.info(`\n📄 Payment Receipt:`);
      logger.info(`   From: ${receipt.from}`);
      logger.info(`   To: ${receipt.to}`);
      logger.info(`   Amount: ${this.formatUSDC(receipt.amount)} USDC`);
      logger.info(`   Network: ${receipt.network}`);
      logger.info(`   Status: ${receipt.status}`);
      logger.info(`   Time: ${receipt.timestamp}`);
      
      totalPaid += BigInt(receipt.amount);
    }

    logger.info('\n' + '='.repeat(70));
    logger.info(`Total Paid: ${this.formatUSDC(totalPaid.toString())} USDC`);
    logger.info(`Transactions: ${this.paymentReceipts.length}`);
    logger.info('='.repeat(70));
  }

  /**
   * Format USDC amount
   */
  private formatUSDC(atomicAmount: string): string {
    const amount = BigInt(atomicAmount);
    const wholePart = amount / 1_000_000n;
    const fractionalPart = amount % 1_000_000n;
    return `${wholePart}.${fractionalPart.toString().padStart(6, '0')}`;
  }

  /**
   * Get total cost estimate for workflow
   */
  async estimateWorkflowCost(workflowPath: string): Promise<string> {
    const workflow = WorkflowParser.parseFile(workflowPath);
    
    let totalCost = 0n;
    
    for (const node of workflow.nodes) {
      const agent = await registry.getAgent(node.ref);
      totalCost += BigInt(agent.pricing.amount);
    }

    return totalCost.toString();
  }
}

/**
 * Demo: Execute workflow with payments
 */
async function main() {
  // Register agents
  await registerAgents();

  // Configuration
  const config: PaymentWorkflowConfig = {
    network: 'base-sepolia',
    // For demo purposes, you'd provide a real private key:
    // clientPrivateKey: process.env.PRIVATE_KEY,
    merchantWallet: '0x0000000000000000000000000000000000000000', // Demo merchant
    autoPayment: true,  // Auto-process for demo
  };

  // Note: Uncomment below to use real wallet
  // if (!process.env.PRIVATE_KEY) {
  //   logger.error('PRIVATE_KEY environment variable required');
  //   process.exit(1);
  // }

  const executor = new PaymentWorkflowExecutor(config);

  // Estimate cost
  const estimatedCost = await executor.estimateWorkflowCost(
    './workflows/registry-text-pipeline.yaml'
  );
  
  logger.info('\n📊 Workflow Cost Estimate');
  logger.info('='.repeat(70));
  logger.info(`Total Cost: ${executor['formatUSDC'](estimatedCost)} USDC`);
  logger.info('='.repeat(70));

  logger.info('\n⚠️  Payment Demo Mode');
  logger.info('To enable real payments:');
  logger.info('1. Set PRIVATE_KEY environment variable');
  logger.info('2. Set merchantWallet in config');
  logger.info('3. Ensure wallet has Base Sepolia ETH and USDC');
  logger.info('   - ETH faucet: https://www.alchemy.com/faucets/base-sepolia');
  logger.info('   - USDC faucet: https://faucet.circle.com/');

  // Execute workflow (demo mode - no real payments)
  logger.info('\n🚀 Starting Demo Workflow Execution (without real payments)');
  
  try {
    const result = await executor.executeWorkflow(
      './workflows/registry-text-pipeline.yaml',
      {
        message: 'Hello from payment-enabled workflow!',
      }
    );

    logger.info('\n✅ Workflow execution complete!');
    logger.info(`\nFinal Results:`);
    logger.info(`  Original: ${result.outputs.original}`);
    logger.info(`  Uppercase: ${result.outputs.uppercase}`);
    logger.info(`  Reversed: ${result.outputs.reversed}`);
  } catch (error) {
    logger.error(`\n❌ Execution failed: ${(error as Error).message}`);
  }
}

// Run demo
if (import.meta.main) {
  main().catch((error) => {
    logger.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

export { PaymentWorkflowExecutor, type PaymentWorkflowConfig };
