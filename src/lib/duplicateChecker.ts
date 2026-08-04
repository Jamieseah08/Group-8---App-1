import { DuplicateMatch, InvoiceRecord } from '../types';

function normalize(val: string | undefined): string {
  if (!val) return '';
  const cleaned = val.trim().toLowerCase().replace(/^(missing|unclear|n\/a|none|-)$/, '');
  return cleaned;
}

function normalizeAmount(val: string | undefined): string {
  if (!val) return '';
  const cleaned = val.toLowerCase().replace(/[^0-9.]/g, '');
  if (!cleaned) return '';
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? '' : parsed.toFixed(2);
}

export function checkForDuplicates(
  currentInvoice: Partial<InvoiceRecord>,
  existingInvoices: InvoiceRecord[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  const fields = currentInvoice.fields;
  if (!fields) return matches;

  const currentId = currentInvoice.id;
  const supplierName = normalize(fields.supplierName?.value);
  const invoiceNumber = normalize(fields.invoiceNumber?.value);
  const invoiceDate = normalize(fields.invoiceDate?.value);
  const poNumber = normalize(fields.poNumber?.value);
  const amount = normalizeAmount(fields.totalAmount?.value || fields.invoiceAmount?.value);

  for (const existing of existingInvoices) {
    if (existing.id === currentId) continue; // Don't match against self

    const eFields = existing.fields;
    const eSupplierName = normalize(eFields.supplierName?.value);
    const eInvoiceNumber = normalize(eFields.invoiceNumber?.value);
    const eInvoiceDate = normalize(eFields.invoiceDate?.value);
    const ePoNumber = normalize(eFields.poNumber?.value);
    const eAmount = normalizeAmount(eFields.totalAmount?.value || eFields.invoiceAmount?.value);

    // Rule 1: Same supplier and invoice number
    if (
      supplierName &&
      invoiceNumber &&
      eSupplierName &&
      eInvoiceNumber &&
      supplierName === eSupplierName &&
      invoiceNumber === eInvoiceNumber
    ) {
      matches.push({
        rule: 'Same supplier and invoice number',
        matchingInvoiceId: existing.id,
        matchingInvoiceNumber: eFields.invoiceNumber?.value || 'N/A',
        matchingSupplierName: eFields.supplierName?.value || 'N/A',
        matchingTotalAmount: eFields.totalAmount?.value || eFields.invoiceAmount?.value || 'N/A',
        matchingInvoiceDate: eFields.invoiceDate?.value || 'N/A',
        matchingPoNumber: eFields.poNumber?.value || 'N/A',
        matchingFilename: existing.filename,
      });
      continue; // Move to next invoice to avoid duplicate entries for same invoice
    }

    // Rule 2: Same supplier, amount and invoice date
    if (
      supplierName &&
      amount &&
      invoiceDate &&
      eSupplierName &&
      eAmount &&
      eInvoiceDate &&
      supplierName === eSupplierName &&
      amount === eAmount &&
      invoiceDate === eInvoiceDate
    ) {
      matches.push({
        rule: 'Same supplier, amount and invoice date',
        matchingInvoiceId: existing.id,
        matchingInvoiceNumber: eFields.invoiceNumber?.value || 'N/A',
        matchingSupplierName: eFields.supplierName?.value || 'N/A',
        matchingTotalAmount: eFields.totalAmount?.value || eFields.invoiceAmount?.value || 'N/A',
        matchingInvoiceDate: eFields.invoiceDate?.value || 'N/A',
        matchingPoNumber: eFields.poNumber?.value || 'N/A',
        matchingFilename: existing.filename,
      });
      continue;
    }

    // Rule 3: Same purchase order number and amount
    if (
      poNumber &&
      amount &&
      ePoNumber &&
      eAmount &&
      poNumber === ePoNumber &&
      amount === eAmount
    ) {
      matches.push({
        rule: 'Same purchase order number and amount',
        matchingInvoiceId: existing.id,
        matchingInvoiceNumber: eFields.invoiceNumber?.value || 'N/A',
        matchingSupplierName: eFields.supplierName?.value || 'N/A',
        matchingTotalAmount: eFields.totalAmount?.value || eFields.invoiceAmount?.value || 'N/A',
        matchingInvoiceDate: eFields.invoiceDate?.value || 'N/A',
        matchingPoNumber: eFields.poNumber?.value || 'N/A',
        matchingFilename: existing.filename,
      });
    }
  }

  return matches;
}
