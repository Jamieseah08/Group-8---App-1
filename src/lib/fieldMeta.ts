import { ConfidenceColour, ConfidenceLevel, ExtractedField } from '../types';

export const FIELD_ORDER: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'supplierName', label: 'Supplier Name', placeholder: 'e.g. Acme Logistics Pte Ltd' },
  { key: 'supplierRegNo', label: 'Supplier Reg No. / Tax ID', placeholder: 'e.g. 201234567M' },
  { key: 'invoiceNumber', label: 'Invoice Number', placeholder: 'e.g. INV-2026-8891' },
  { key: 'invoiceDate', label: 'Invoice Date', placeholder: 'e.g. 2026-07-15' },
  { key: 'poNumber', label: 'Purchase Order (PO) #', placeholder: 'e.g. PO-90021' },
  { key: 'paymentTerms', label: 'Payment Terms', placeholder: 'e.g. Net 30 days, Payment Upon Receipt' },
  { key: 'paymentMethod', label: 'Payment Method', placeholder: 'e.g. Bank Transfer, Cheque, Cash, PayNow' },
  { key: 'dueDate', label: 'Due Date', placeholder: 'e.g. 2026-08-14' },
  { key: 'currency', label: 'Currency', placeholder: 'e.g. SGD' },
  { key: 'invoiceAmount', label: 'Invoice Amount (Subtotal)', placeholder: 'e.g. $1,250.00' },
  { key: 'taxAmount', label: 'Tax Amount (GST/VAT)', placeholder: 'e.g. $112.50' },
  { key: 'totalAmount', label: 'Total Amount Payable', placeholder: 'e.g. $1,362.50' },
  { key: 'bankDetails', label: 'Supplier Bank Details', placeholder: 'e.g. DBS Bank 120-987-6543 / SWIFT: DBSSSGSG' },
];

export function getConfidenceBadgeProps(confidence: ConfidenceLevel, colour: ConfidenceColour) {
  switch (colour) {
    case 'green':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'amber':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    case 'red':
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
        iconColor: 'text-rose-600 dark:text-rose-400',
      };
    case 'grey':
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
        iconColor: 'text-slate-500 dark:text-slate-400',
      };
  }
}

export function createEmptyField(key: string, label: string): ExtractedField {
  if (key === 'paymentTerms') {
    return {
      key,
      label,
      value: 'Not stated',
      confidence: 'Not stated',
      colour: 'grey',
      reason: 'No payment terms found on the invoice.',
      reviewRequired: false,
    };
  }
  if (key === 'taxAmount') {
    return {
      key,
      label,
      value: 'Not stated',
      confidence: 'Not stated',
      colour: 'grey',
      reason: 'No separate tax amount found on the invoice.',
      reviewRequired: false,
    };
  }
  if (key === 'supplierRegNo') {
    return {
      key,
      label,
      value: 'Not stated',
      confidence: 'Not stated',
      colour: 'grey',
      reason: 'Supplier registration or tax ID was not provided on the invoice.',
      reviewRequired: false,
    };
  }
  return {
    key,
    label,
    value: 'Missing',
    confidence: 'Missing information',
    colour: 'grey',
    reason: 'Field not extracted yet',
    reviewRequired: true,
  };
}
