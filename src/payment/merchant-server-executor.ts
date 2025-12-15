/**
 * Merchant Server Executor - Production-ready x402 payment executor
 * Handles payment verification and settlement for merchant agents
 * Uses the library's default facilitator (https://x402.org/facilitator)
 */

import {
  x402ServerExecutor,
  verifyPayment,
  settlePayment,
} from 'a2a-x402';
import type {
  AgentExecutor,
  PaymentPayload,
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
  x402ExtensionConfig,
  FacilitatorClient,
} from 'a2a-x402';
import { Logger } from '../utils/logger';

const logger = new Logger('MerchantExecutor');

export class MerchantServerExecutor extends x402ServerExecutor {
  private facilitator?: FacilitatorClient;

  constructor(
    delegate: AgentExecutor,
    config?: Partial<x402ExtensionConfig>,
    facilitator?: FacilitatorClient
  ) {
    super(delegate, config);

    // Allow custom facilitator injection, otherwise uses library's default
    this.facilitator = facilitator;

    if (facilitator) {
      logger.info('🔧 Using custom facilitator client');
    } else {
      logger.info('🌐 Using default facilitator (https://x402.org/facilitator)');
    }
  }

  async verifyPayment(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    logger.info('\n=== VERIFYING PAYMENT ===');
    logger.info(`Network: ${requirements.network}`);
    logger.info(`Asset: ${requirements.asset}`);
    logger.info(`Amount: ${requirements.maxAmountRequired}`);
    logger.info(`Pay To: ${requirements.payTo}`);

    // Uses library's verifyPayment with default facilitator or custom one
    const response = await verifyPayment(payload, requirements, this.facilitator);

    if (response.isValid) {
      logger.info('✅ Payment Verified Successfully!');
      logger.info(`   Payer: ${response.payer}`);
    } else {
      logger.error('⛔ Payment Verification Failed!');
      logger.error(`   Reason: ${response.invalidReason}`);
    }

    return response;
  }

  async settlePayment(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<SettleResponse> {
    logger.info('\n=== SETTLING PAYMENT ===');
    logger.info(`Network: ${requirements.network}`);
    logger.info(`Asset: ${requirements.asset}`);
    logger.info(`Amount: ${requirements.maxAmountRequired}`);

    // Uses library's settlePayment with default facilitator or custom one
    const response = await settlePayment(payload, requirements, this.facilitator);

    if (response.success) {
      logger.info('✅ Payment Settled Successfully!');
      logger.info(`   Transaction: ${response.transaction}`);
      logger.info(`   Network: ${response.network}`);
      logger.info(`   Payer: ${response.payer}`);
    } else {
      logger.error('⛔ Payment Settlement Failed!');
      logger.error(`   Reason: ${response.errorReason}`);
    }

    return response;
  }
}
