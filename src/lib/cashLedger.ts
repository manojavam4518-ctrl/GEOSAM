import { prisma } from './prisma';

export interface LedgerColumnConfig {
  id: string;
  key: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'SELECT';
  isSystem: boolean;
  isCalculation: boolean;
  calcRole: 'NONE' | 'CASH_IN' | 'CASH_OUT' | 'BANK_DEPOSIT' | 'BALANCE';
  enabled: boolean;
  order: number;
  required?: boolean;
}

export const DEFAULT_LEDGER_COLUMNS: LedgerColumnConfig[] = [
  {
    id: 'col_date',
    key: 'date',
    name: 'Date',
    type: 'DATE',
    isSystem: true,
    isCalculation: false,
    calcRole: 'NONE',
    enabled: true,
    order: 0,
    required: true,
  },
  {
    id: 'col_cashReceived',
    key: 'cashReceived',
    name: 'Cash Received',
    type: 'CURRENCY',
    isSystem: true,
    isCalculation: true,
    calcRole: 'CASH_IN',
    enabled: true,
    order: 1,
    required: false,
  },
  {
    id: 'col_receivedFrom',
    key: 'receivedFrom',
    name: 'Received From',
    type: 'TEXT',
    isSystem: true,
    isCalculation: false,
    calcRole: 'NONE',
    enabled: true,
    order: 2,
    required: false,
  },
  {
    id: 'col_purpose',
    key: 'purpose',
    name: 'Purpose / Transaction Details',
    type: 'TEXT',
    isSystem: true,
    isCalculation: false,
    calcRole: 'NONE',
    enabled: true,
    order: 3,
    required: false,
  },
  {
    id: 'col_paidTo',
    key: 'paidTo',
    name: 'Paid To',
    type: 'TEXT',
    isSystem: true,
    isCalculation: false,
    calcRole: 'NONE',
    enabled: true,
    order: 4,
    required: false,
  },
  {
    id: 'col_paidAmount',
    key: 'paidAmount',
    name: 'Paid Amount',
    type: 'CURRENCY',
    isSystem: true,
    isCalculation: true,
    calcRole: 'CASH_OUT',
    enabled: true,
    order: 5,
    required: false,
  },
  {
    id: 'col_bankDeposit',
    key: 'bankDeposit',
    name: 'Bank Deposit',
    type: 'CURRENCY',
    isSystem: true,
    isCalculation: true,
    calcRole: 'BANK_DEPOSIT',
    enabled: true,
    order: 6,
    required: false,
  },
  {
    id: 'col_cashInHand',
    key: 'cashInHand',
    name: 'Cash in Hand',
    type: 'CURRENCY',
    isSystem: true,
    isCalculation: true,
    calcRole: 'BALANCE',
    enabled: true,
    order: 7,
    required: false,
  },
  {
    id: 'col_remarks',
    key: 'remarks',
    name: 'Remarks',
    type: 'TEXT',
    isSystem: true,
    isCalculation: false,
    calcRole: 'NONE',
    enabled: true,
    order: 8,
    required: false,
  },
];

/**
 * Returns or initializes ledger column configuration for an organization.
 */
export async function getOrganizationLedgerConfig(organizationId: string) {
  let config = await (prisma as any).cashLedgerConfig.findUnique({
    where: { organizationId },
  });

  if (!config) {
    config = await (prisma as any).cashLedgerConfig.create({
      data: {
        organizationId,
        columns: DEFAULT_LEDGER_COLUMNS,
        initialCashInHand: 0.0,
      },
    });
  }

  // Ensure default system columns exist if columns is an array
  let columns: LedgerColumnConfig[] = (config.columns as any) || DEFAULT_LEDGER_COLUMNS;
  if (!Array.isArray(columns) || columns.length === 0) {
    columns = DEFAULT_LEDGER_COLUMNS;
  }

  // Sort by order
  columns.sort((a, b) => a.order - b.order);

  return {
    ...config,
    columns,
  };
}

/**
 * Calculates running balances and overall financial summary for ledger entries.
 * Balance equation:
 * Cash Balance = Initial + Total Received - Total Paid - Total Bank Deposit
 */
export function calculateLedgerBalances(entries: any[], initialCash: number = 0) {
  let running = Number(initialCash) || 0;
  let totalCashReceived = 0;
  let totalPaidAmount = 0;
  let totalBankDeposit = 0;

  // Compute in chronological order
  const computedEntries = entries.map((entry) => {
    const received = Number(entry.cashReceived) || 0;
    const paid = Number(entry.paidAmount) || 0;
    const deposit = Number(entry.bankDeposit) || 0;

    totalCashReceived += received;
    totalPaidAmount += paid;
    totalBankDeposit += deposit;

    // Cash In increases balance, Cash Paid and Bank Deposit decrease cash in hand
    running = running + received - paid - deposit;

    return {
      ...entry,
      cashInHand: running,
    };
  });

  return {
    entries: computedEntries,
    summary: {
      initialCashInHand: Number(initialCash) || 0,
      totalCashReceived,
      totalPaidAmount,
      totalBankDeposit,
      currentCashInHand: running,
      netChange: totalCashReceived - totalPaidAmount - totalBankDeposit,
      entryCount: entries.length,
    },
  };
}
