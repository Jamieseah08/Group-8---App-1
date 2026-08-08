import { InvoiceRecord } from '../types';

export const SPREADSHEET_ID = '13xu1LcP2MBADKqQ1tc02NIk7ZsHp9nbFA8BmOS-SnnA';
export const SHEET_NAME = 'Reviewed_Invoices';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`;

export interface ExportResult {
  success: boolean;
  message: string;
  actionType?: 'saved' | 'updated' | 'mixed';
  savedCount?: number;
  updatedCount?: number;
  updatedRows?: number;
}

export const HEADERS = [
  'Invoice Number',
  'Supplier Name',
  'Invoice Date',
  'PO Number',
  'Item Description',
  'Quantity',
  'Unit Price',
  'Total Payable Amount',
  'Extraction Confidence',
  'Payment Method',
  'Matching Status',
];

export function isEligibleForExport(inv: InvoiceRecord): boolean {
  const isMatchingReady =
    inv.status === 'Ready for Three-Way Matching' || inv.status === 'Reviewed';
  const isNotDuplicate = inv.status !== 'Confirmed Duplicate';
  const isNotUnderReview =
    inv.status !== 'Needs Review' &&
    inv.status !== 'Ready for Review' &&
    inv.status !== 'Duplicate Risk';
  return isMatchingReady && isNotDuplicate && isNotUnderReview;
}

export function formatInvoiceRows(inv: InvoiceRecord): string[][] {
  const invoiceNumber = inv.fields.invoiceNumber?.value || 'N/A';

  const supplierName =
    inv.fields.supplierName?.value !== 'Missing' && inv.fields.supplierName?.value
      ? inv.fields.supplierName.value
      : inv.filename;

  const invoiceDate = inv.fields.invoiceDate?.value || 'N/A';

  const poNumber = inv.fields.poNumber?.value || 'N/A';

  const currency = inv.fields.currency?.value || 'SGD';
  const totalAmountVal = inv.fields.totalAmount?.value || '0.00';
  const totalPayableAmount = `${currency} $${totalAmountVal}`;

  let extractionConfidence = 'High Confidence';
  if (inv.hasLowConfidence) {
    extractionConfidence = 'Low Confidence';
  } else if (inv.hasMissingInfo) {
    extractionConfidence = 'Missing Information';
  }

  const paymentMethod = inv.fields.paymentMethod?.value || 'Not stated';

  const matchingStatus = 'Ready for Three-Way Matching';

  const items =
    inv.lineItems && inv.lineItems.length > 0
      ? inv.lineItems
      : [
          {
            description: 'Not stated',
            quantity: 'Not stated',
            unitPrice: 'Not stated',
          },
        ];

  return items.map((item) => [
    invoiceNumber,
    supplierName,
    invoiceDate,
    poNumber,
    item.description || 'Not stated',
    item.quantity || 'Not stated',
    item.unitPrice || 'Not stated',
    totalPayableAmount,
    extractionConfidence,
    paymentMethod,
    matchingStatus,
  ]);
}

export function formatInvoiceRow(inv: InvoiceRecord): string[] {
  return formatInvoiceRows(inv)[0];
}

export async function appendInvoiceToSheet(
  accessToken: string,
  invoices: InvoiceRecord | InvoiceRecord[]
): Promise<ExportResult> {
  const rawList = Array.isArray(invoices) ? invoices : [invoices];
  
  // Filter: Only export invoices that have been reviewed by Madam Lim and have a Matching Status of "Ready for Three-Way Matching".
  // Do not export invoices that are still under review or confirmed duplicates.
  const invoiceList = rawList.filter(isEligibleForExport);

  if (invoiceList.length === 0) {
    return {
      success: false,
      message:
        'No eligible invoices to export. Invoices must be reviewed by Madam Lim and ready for Three-Way Matching.',
    };
  }

  try {
    // 1. Fetch current values from Google Sheet
    const { values: rawValues, sheetTabUsed } = await getExistingSheetValues(accessToken);

    // 2. Ensure headers exist
    let sheetRows = ensureHeaders(rawValues);

    let savedCount = 0;
    let updatedCount = 0;

    for (const inv of invoiceList) {
      const invNum = (inv.fields.invoiceNumber?.value || 'N/A').trim().toLowerCase();
      const supplierName =
        inv.fields.supplierName?.value !== 'Missing' && inv.fields.supplierName?.value
          ? inv.fields.supplierName.value
          : inv.filename;
      const supplier = supplierName.trim().toLowerCase();

      const newFormattedRows = formatInvoiceRows(inv);

      // Find all matching row indices in sheetRows (Supplier Name + Invoice Number)
      const matchingIndices: number[] = [];
      for (let i = 1; i < sheetRows.length; i++) {
        const rowInvNum = (sheetRows[i][0] || '').trim().toLowerCase();
        const rowSupplier = (sheetRows[i][1] || '').trim().toLowerCase();

        if (rowInvNum === invNum && rowSupplier === supplier) {
          matchingIndices.push(i);
        }
      }

      if (matchingIndices.length > 0) {
        // Match found -> Update existing row(s)
        updatedCount++;
        const firstMatchIndex = matchingIndices[0];

        // Remove old matching row(s) from back to front
        for (let i = matchingIndices.length - 1; i >= 0; i--) {
          sheetRows.splice(matchingIndices[i], 1);
        }

        // Insert updated row(s) at position of first match
        sheetRows.splice(firstMatchIndex, 0, ...newFormattedRows);
      } else {
        // No match -> Append as new row(s)
        savedCount++;
        sheetRows.push(...newFormattedRows);
      }
    }

    // 3. Save full updated dataset back to Google Sheet
    await writeSheetValues(accessToken, sheetTabUsed, sheetRows);

    let statusText = '';
    let actionType: 'saved' | 'updated' | 'mixed' = 'saved';

    if (savedCount > 0 && updatedCount === 0) {
      actionType = 'saved';
      statusText =
        invoiceList.length === 1
          ? 'Saved to Google Sheet'
          : `Saved ${savedCount} invoice(s) to Google Sheet`;
    } else if (updatedCount > 0 && savedCount === 0) {
      actionType = 'updated';
      statusText =
        invoiceList.length === 1
          ? 'Updated in Google Sheet'
          : `Updated ${updatedCount} invoice(s) in Google Sheet`;
    } else {
      actionType = 'mixed';
      statusText = `Saved ${savedCount} new and updated ${updatedCount} existing invoice(s) in Google Sheet`;
    }

    return {
      success: true,
      message: `${statusText}!`,
      actionType,
      savedCount,
      updatedCount,
      updatedRows: sheetRows.length - 1,
    };
  } catch (err: any) {
    console.error('Failed to export to Google Sheets:', err);
    return {
      success: false,
      message: err.message || 'Failed to save to Google Sheet. Please check permissions.',
    };
  }
}

async function getExistingSheetValues(accessToken: string): Promise<{
  values: string[][];
  sheetTabUsed: string;
}> {
  // 1. Try reading with SHEET_NAME ('Reviewed_Invoices')
  const urlWithTab = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${SHEET_NAME}'!A:K`;
  const resWithTab = await fetch(urlWithTab, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (resWithTab.ok) {
    const data = await resWithTab.json();
    return {
      values: data.values || [],
      sheetTabUsed: SHEET_NAME,
    };
  }

  // 2. Fallback to default sheet range A:K
  const urlDefault = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A:K`;
  const resDefault = await fetch(urlDefault, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (resDefault.ok) {
    const data = await resDefault.json();
    return {
      values: data.values || [],
      sheetTabUsed: '',
    };
  }

  return {
    values: [],
    sheetTabUsed: SHEET_NAME,
  };
}

function ensureHeaders(rows: string[][]): string[][] {
  if (rows.length === 0) {
    return [HEADERS];
  }
  const firstRow = rows[0];
  const firstCell = (firstRow[0] || '').trim().toLowerCase();
  const secondCell = (firstRow[1] || '').trim().toLowerCase();

  if (firstCell !== 'invoice number' && secondCell !== 'supplier name') {
    return [HEADERS, ...rows];
  }
  return rows;
}

async function writeSheetValues(
  accessToken: string,
  sheetTabUsed: string,
  values: string[][]
): Promise<void> {
  const rangePrefix = sheetTabUsed ? `'${sheetTabUsed}'!` : '';
  const rangeA_K = `${rangePrefix}A:K`;
  const rangeA1 = `${rangePrefix}A1`;

  // Clear old contents first to remove stale rows if dataset shrank
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${rangeA_K}:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }).catch((err) => {
    console.warn('Clear range notice:', err);
  });

  // Write updated row matrix
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${rangeA1}?valueInputOption=USER_ENTERED`;
  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: rangeA1,
      majorDimension: 'ROWS',
      values: values,
    }),
  });

  if (!updateRes.ok) {
    const errJson = await updateRes.json().catch(() => ({}));
    const errorDetail = errJson.error?.message || updateRes.statusText;
    throw new Error(`Google Sheets API Error: ${errorDetail}`);
  }
}

