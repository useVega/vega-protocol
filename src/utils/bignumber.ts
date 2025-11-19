/**
 * BigNumber Utilities
 * Helper functions for working with string-based numbers
 */

/**
 * Add two string numbers
 */
export function add(a: string, b: string): string {
  return (parseFloat(a) + parseFloat(b)).toString();
}

/**
 * Subtract two string numbers
 */
export function subtract(a: string, b: string): string {
  return (parseFloat(a) - parseFloat(b)).toString();
}

/**
 * Multiply two string numbers
 */
export function multiply(a: string, b: string): string {
  return (parseFloat(a) * parseFloat(b)).toString();
}

/**
 * Divide two string numbers
 */
export function divide(a: string, b: string): string {
  const divisor = parseFloat(b);
  if (divisor === 0) {
    throw new Error('Division by zero');
  }
  return (parseFloat(a) / divisor).toString();
}

/**
 * Compare two string numbers
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compare(a: string, b: string): number {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  
  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

/**
 * Check if a >= b
 */
export function gte(a: string, b: string): boolean {
  return compare(a, b) >= 0;
}

/**
 * Check if a <= b
 */
export function lte(a: string, b: string): boolean {
  return compare(a, b) <= 0;
}

/**
 * Get the larger of two numbers
 */
export function max(a: string, b: string): string {
  return compare(a, b) >= 0 ? a : b;
}

/**
 * Get the smaller of two numbers
 */
export function min(a: string, b: string): string {
  return compare(a, b) <= 0 ? a : b;
}

/**
 * Format number with decimals
 */
export function format(value: string, decimals: number = 2): string {
  return parseFloat(value).toFixed(decimals);
}

/**
 * Parse percentage (10% of value)
 */
export function percentage(value: string, percent: number): string {
  return multiply(value, (percent / 100).toString());
}
