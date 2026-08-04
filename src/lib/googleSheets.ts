import { InvoiceRecord } from '../types';

export const SPREADSHEET_ID = '13xu1LcP2MBADKqQ1tc02NIk7ZsHp9nbFA8BmOS-SnnA';
export const SHEET_NAME = 'Reviewed_Invoices';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`;

export interface ExportResult {
  success: boolean;
  message: string;
  updatedRows?: number;
}

export const HEADERS = [
  'Invoice Number',
  'Supplier Name',
  'Invoice Date',
  'PO Number',
  'Total Payable Amount',
  'Extraction Confidence',
  'Payment Method',
  'Review Status',
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

export function formatInvoiceRow(inv: InvoiceRecord): string[] {
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

  const reviewStatus = 'Reviewed';

  const matchingStatus = 'Ready for Three-Way Matching';

  return [
    invoiceNumber,
    supplierName,
    invoiceDate,
    poNumber,
    totalPayableAmount,
    extractionConfidence,
    paymentMethod,
    reviewStatus,
    matchingStatus,
  ];
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
      message: 'No eligible invoices to export. Invoices must be reviewed by Madam Lim and ready for Three-Way Matching.',
    };
  }

  try {
    // 1. Check if range exists or has headers
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${SHEET_NAME}'!A1:I1`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let needsHeaders = false;
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (!checkData.values || checkData.values.length === 0) {
        needsHeaders = true;
      }
    } else {
      needsHeaders = true;
    }

    const rowsToAppend: string[][] = [];
    if (needsHeaders) {
      rowsToAppend.push(HEADERS);
    }

    for (const inv of invoiceList) {
      rowsToAppend.push(formatInvoiceRow(inv));
    }

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${SHEET_NAME}'!A:I:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${SHEET_NAME}'!A:I`,
        majorDimension: 'ROWS',
        values: rowsToAppend,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorDetail = errJson.error?.message || response.statusText;
      
      // Fallback: if 'Reviewed_Invoices' tab doesn't exist yet, try appending to default range or A:I
      if (errorDetail.includes('Unable to parse range') || response.status === 400) {
        const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A:I:append?valueInputOption=USER_ENTERED`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: 'A:I',
            majorDimension: 'ROWS',
            values: rowsToAppend,
          }),
        });

        if (fallbackRes.ok) {
          return {
            success: true,
            message: `Successfully saved ${invoiceList.length} invoice(s) to Google Sheet!`,
            updatedRows: invoiceList.length,
          };
        }
      }

      throw new Error(`Google Sheets API Error: ${errorDetail}`);
    }

    return {
      success: true,
      message: `Successfully saved ${invoiceList.length} invoice(s) to sheet "${SHEET_NAME}"!`,
      updatedRows: invoiceList.length,
    };
  } catch (err: any) {
    console.error('Failed to export to Google Sheets:', err);
    return {
      success: false,
      message: err.message || 'Failed to save to Google Sheet. Please check permissions.',
    };
  }
}

