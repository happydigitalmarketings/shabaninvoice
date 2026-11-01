import type { InvoiceItem } from '../types/invoice.types';

/**
 * Calculate totals for a single invoice line item.
 * Supports both intra-state (CGST+SGST) and inter-state (IGST) tax modes.
 */
export function calculateLineItem(
  item: Partial<InvoiceItem>,
  isInterState: boolean
): Partial<InvoiceItem> {
  const quantity = Number(item.quantity) || 0;
  const unitRate = Number(item.unitRate) || 0;
  const taxableAmount = roundTo(quantity * unitRate, 2);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = roundTo(taxableAmount * (Number(item.igstRate) || 0) / 100, 2);
  } else {
    cgstAmount = roundTo(taxableAmount * (Number(item.cgstRate) || 0) / 100, 2);
    sgstAmount = roundTo(taxableAmount * (Number(item.sgstRate) || 0) / 100, 2);
  }

  const totalAmount = roundTo(taxableAmount + cgstAmount + sgstAmount + igstAmount, 2);

  return {
    ...item,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
  };
}

/**
 * Calculate invoice-level totals from all line items.
 */
export interface InvoiceTotals {
  subTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
}

export function calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  let subTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const item of items) {
    subTotal  += item.taxableAmount  || 0;
    totalCgst += item.cgstAmount     || 0;
    totalSgst += item.sgstAmount     || 0;
    totalIgst += item.igstAmount     || 0;
  }

  const totalTax    = roundTo(totalCgst + totalSgst + totalIgst, 2);
  const exactTotal  = roundTo(subTotal + totalTax, 2);
  const grandTotal  = Math.round(exactTotal);
  const roundOff    = roundTo(grandTotal - exactTotal, 2);

  return {
    subTotal:  roundTo(subTotal, 2),
    totalCgst: roundTo(totalCgst, 2),
    totalSgst: roundTo(totalSgst, 2),
    totalIgst: roundTo(totalIgst, 2),
    totalTax,
    grandTotal,
    roundOff,
  };
}

function roundTo(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}
