export type ConfidenceLevel =
  | 'High confidence'
  | 'Medium confidence'
  | 'Low confidence'
  | 'Missing information'
  | 'Not stated';

export type ConfidenceColour = 'green' | 'amber' | 'red' | 'grey';

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: ConfidenceLevel;
  colour: ConfidenceColour;
  reason: string;
  reviewRequired: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  fieldKey?: string;
  fieldLabel?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

export type DuplicateRuleType =
  | 'Same supplier and invoice number'
  | 'Same supplier, amount and invoice date'
  | 'Same purchase order number and amount';

export interface DuplicateMatch {
  rule: DuplicateRuleType;
  matchingInvoiceId: string;
  matchingInvoiceNumber: string;
  matchingSupplierName: string;
  matchingTotalAmount: string;
  matchingInvoiceDate: string;
  matchingPoNumber: string;
  matchingFilename: string;
}

export type InvoiceStatus =
  | 'Needs Review'
  | 'Ready for Review'
  | 'Duplicate Risk'
  | 'Confirmed Duplicate'
  | 'Reviewed'
  | 'Ready for Three-Way Matching';

export interface LineItem {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount?: string;
}

export interface InvoiceRecord {
  id: string;
  filename: string;
  fileType: string; // e.g. "image/png", "application/pdf"
  fileDataUrl: string; // Base64 or object URL for display preview
  uploadedAt: string;
  sourceType: 'PDF' | 'Scanned' | 'Photo' | 'Handwritten';
  status: InvoiceStatus;
  reviewConfirmed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;

  // Extracted line item details required for Three-Way Matching
  lineItems?: LineItem[];

  // Extracted fields map keyed by field identifier
  fields: {
    supplierName: ExtractedField;
    supplierRegNo: ExtractedField;
    invoiceNumber: ExtractedField;
    invoiceDate: ExtractedField;
    poNumber: ExtractedField;
    paymentTerms: ExtractedField;
    paymentMethod: ExtractedField;
    dueDate: ExtractedField;
    currency: ExtractedField;
    invoiceAmount: ExtractedField;
    taxAmount: ExtractedField;
    totalAmount: ExtractedField;
    bankDetails: ExtractedField;
  };

  hasMissingInfo: boolean;
  hasLowConfidence: boolean;
  isDuplicateRisk: boolean;
  duplicateMatches: DuplicateMatch[];

  assistantSummary: string;
  assistantWarnings: string[];

  auditLogs: AuditLog[];
  exportedToSheetAt?: string;
  sheetRowSaved?: boolean;
}

export interface DashboardStats {
  totalUploaded: number;
  readyForReview: number;
  missingInfo: number;
  lowConfidence: number;
  possibleDuplicates: number;
  confirmedDuplicates: number;
  reviewed: number;
  readyForThreeWayMatching: number;
}
