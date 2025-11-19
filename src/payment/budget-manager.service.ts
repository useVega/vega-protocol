/**
 * Budget Manager Service
 * Handles budget reservation, tracking, and release
 */

import type { BudgetReservation } from '../types/payment.types';
import type { ChainType, TokenSymbol } from '../types/chain.types';
import { InsufficientBudgetError, PaymentError } from '../types/errors.types';
import { v4 as uuidv4 } from 'uuid';

export interface ReserveBudgetRequest {
  runId: string;
  userWallet: string;
  amount: string;
  token: TokenSymbol;
  chain: ChainType;
}

export class BudgetManager {
  private reservations: Map<string, BudgetReservation> = new Map();
  
  // Mock wallet balances for MVP
  private walletBalances: Map<string, Map<TokenSymbol, string>> = new Map();

  constructor() {
    // Initialize with some mock balances for testing
    this.initializeMockBalances();
  }

  /**
   * Reserve budget for a workflow run
   */
  async reserveBudget(request: ReserveBudgetRequest): Promise<BudgetReservation> {
    const { runId, userWallet, amount, token, chain } = request;

    // Check if wallet has sufficient balance
    const balance = await this.getBalance(userWallet, token);
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(balance);

    if (balanceNum < amountNum) {
      throw new InsufficientBudgetError(amount, balance);
    }

    // Create reservation
    const reservation: BudgetReservation = {
      reservationId: uuidv4(),
      runId,
      userWallet,
      amount,
      token,
      chain,
      status: 'reserved',
      createdAt: new Date(),
    };

    this.reservations.set(runId, reservation);

    // Deduct from available balance (mock implementation)
    await this.updateBalance(userWallet, token, (balanceNum - amountNum).toString());

    console.log(`Budget reserved: ${amount} ${token} for run ${runId}`);

    return reservation;
  }

  /**
   * Get remaining budget for a run
   */
  async getRemainingBudget(runId: string): Promise<string> {
    const reservation = this.reservations.get(runId);
    if (!reservation) {
      throw new PaymentError(`No budget reservation found for run ${runId}`);
    }

    // TODO: Calculate actual spent amount from payment events
    return reservation.amount;
  }

  /**
   * Release budget (refund unused amount)
   */
  async releaseBudget(runId: string, spentAmount?: string): Promise<void> {
    const reservation = this.reservations.get(runId);
    if (!reservation) {
      throw new PaymentError(`No budget reservation found for run ${runId}`);
    }

    const reservedAmount = parseFloat(reservation.amount);
    const spent = spentAmount ? parseFloat(spentAmount) : 0;
    const refundAmount = reservedAmount - spent;

    if (refundAmount > 0) {
      // Refund to wallet
      const currentBalance = parseFloat(await this.getBalance(reservation.userWallet, reservation.token));
      await this.updateBalance(
        reservation.userWallet,
        reservation.token,
        (currentBalance + refundAmount).toString()
      );

      console.log(`Refunded ${refundAmount} ${reservation.token} to ${reservation.userWallet}`);
    }

    // Mark as released
    reservation.status = 'released';
    this.reservations.set(runId, reservation);
  }

  /**
   * Mark budget as settled
   */
  async settleBudget(runId: string): Promise<void> {
    const reservation = this.reservations.get(runId);
    if (!reservation) {
      throw new PaymentError(`No budget reservation found for run ${runId}`);
    }

    reservation.status = 'settled';
    this.reservations.set(runId, reservation);

    console.log(`Budget settled for run ${runId}`);
  }

  /**
   * Get balance for wallet and token
   */
  async getBalance(wallet: string, token: TokenSymbol): Promise<string> {
    const walletBalances = this.walletBalances.get(wallet);
    if (!walletBalances) {
      return '0';
    }
    return walletBalances.get(token) || '0';
  }

  /**
   * Update wallet balance (mock implementation)
   */
  private async updateBalance(wallet: string, token: TokenSymbol, amount: string): Promise<void> {
    if (!this.walletBalances.has(wallet)) {
      this.walletBalances.set(wallet, new Map());
    }
    this.walletBalances.get(wallet)!.set(token, amount);
  }

  /**
   * Initialize mock balances for testing
   */
  private initializeMockBalances(): void {
    // Mock wallet with 1000 USDC
    const mockWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    this.walletBalances.set(mockWallet, new Map([
      ['USDC', '1000.0'],
      ['USDT', '500.0'],
      ['ETH', '2.5'],
    ]));
  }

  /**
   * Add funds to wallet (for testing)
   */
  async addFunds(wallet: string, token: TokenSymbol, amount: string): Promise<void> {
    const currentBalance = parseFloat(await this.getBalance(wallet, token));
    const newBalance = currentBalance + parseFloat(amount);
    await this.updateBalance(wallet, token, newBalance.toString());
  }
}
