import React, { useState, useEffect } from 'react';
import {
  InvoiceRecord,
  DashboardStats,
  ExtractedField,
  AuditLog,
  DuplicateMatch,
  ConfidenceLevel,
  ConfidenceColour,
} from './types';
import { Header } from './components/Header';
import { DashboardStatsView } from './components/DashboardStats';
import { InvoiceListTable } from './components/InvoiceListTable';
import { ThreeWayMatchingQueue } from './components/ThreeWayMatchingQueue';
import { DocumentViewer } from './components/DocumentViewer';
import { FieldEditor } from './components/FieldEditor';
import { MadamLimAssistant } from './components/MadamLimAssistant';
import { AuditTrailDrawer } from './components/AuditTrailDrawer';
import { DuplicateWarningBanner } from './components/DuplicateWarningBanner';
import { DuplicateComparisonModal } from './components/DuplicateComparisonModal';
import { InvoiceUploadModal } from './components/InvoiceUploadModal';
import { UploadedInvoicesQueue } from './components/UploadedInvoicesQueue';
import { checkForDuplicates } from './lib/duplicateChecker';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  Building2,
  GitCompare,
} from 'lucide-react';

const STORAGE_KEY = 'smartcap_invoices_v1';

function normalizeInvoice(inv: InvoiceRecord): InvoiceRecord {
  let updatedFields = { ...inv.fields };
  let changed = false;

  if (
    inv.fields.paymentTerms &&
    (inv.fields.paymentTerms.value === 'Missing' ||
      inv.fields.paymentTerms.confidence === 'Missing information' ||
      inv.fields.paymentTerms.reason?.includes('No explicit payment terms') ||
      inv.fields.paymentTerms.reason?.includes('No payment terms'))
  ) {
    updatedFields.paymentTerms = {
      ...inv.fields.paymentTerms,
      value: 'Not stated',
      confidence: 'Not stated',
      colour: 'grey',
      reason: 'No payment terms found on the invoice.',
      reviewRequired: false,
    };
    changed = true;
  }

  if (
    inv.fields.taxAmount &&
    (inv.fields.taxAmount.value === '0.00' ||
      inv.fields.taxAmount.value === '$0.00' ||
      inv.fields.taxAmount.value === '0' ||
      inv.fields.taxAmount.value === '0.0' ||
      inv.fields.taxAmount.value === 'SGD 0.00' ||
      inv.fields.taxAmount.value === 'USD 0.00' ||
      inv.fields.taxAmount.value === 'Missing' ||
      inv.fields.taxAmount.confidence === 'Missing information' ||
      inv.fields.taxAmount.reason?.includes('No separate tax') ||
      inv.fields.taxAmount.reason?.includes('Tax unverified'))
  ) {
    updatedFields.taxAmount = {
      ...inv.fields.taxAmount,
      value: 'Not stated',
      confidence: 'Not stated',
      colour: 'grey',
      reason: 'No separate tax amount found on the invoice.',
      reviewRequired: false,
    };
    changed = true;
  }

  if (
    inv.fields.supplierRegNo &&
    (inv.fields.supplierRegNo.value === 'Missing' ||
      inv.fields.supplierRegNo.value === 'N/A' ||
      inv.fields.supplierRegNo.value === 'None' ||
      inv.fields.supplierRegNo.confidence === 'Missing information' ||
      inv.fields.supplierRegNo.reason?.includes('Reg number not') ||
      inv.fields.supplierRegNo.reason?.includes('Field not extracted') ||
      inv.fields.supplierRegNo.reason?.includes('not provided'))
  ) {
    updatedFields.supplierRegNo = {
      ...inv.fields.supplierRegNo,
      value: 'Not stated',
      confidence: 'Not stated',
      colour: 'grey',
      reason: 'Supplier registration or tax ID was not provided on the invoice.',
      reviewRequired: false,
    };
    changed = true;
  }

  const fieldValues: ExtractedField[] = Object.values(updatedFields);
  const correctHasMissingInfo = fieldValues.some(
    (f) =>
      (f.confidence === 'Missing information' || f.value === 'Missing') &&
      f.value !== 'Not stated' &&
      f.confidence !== 'Not stated'
  );
  const correctHasLowConfidence = fieldValues.some(
    (f) => f.confidence === 'Low confidence' || f.colour === 'red'
  );

  let normalizedStatus = inv.status;
  if ((inv.status as string) === 'Reviewed') {
    normalizedStatus = 'Ready for Three-Way Matching';
  }

  return {
    ...inv,
    status: normalizedStatus,
    fields: updatedFields,
    hasMissingInfo: correctHasMissingInfo,
    hasLowConfidence: correctHasLowConfidence,
  };
}

export default function App() {
  // Start with empty state as requested: "since this is a new app, exclude all sample invoices"
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed: InvoiceRecord[] = JSON.parse(saved);
      return parsed.map(normalizeInvoice);
    } catch {
      return [];
    }
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'review' | 'three_way_matching'>('review');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [activeComparisonMatches, setActiveComparisonMatches] = useState<DuplicateMatch[] | null>(null);

  // Save to localStorage whenever invoices update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }, [invoices]);

  // Compute Dashboard Stats
  const stats: DashboardStats = {
    totalUploaded: invoices.length,
    readyForReview: invoices.filter(
      (i) =>
        i.status !== 'Ready for Three-Way Matching' &&
        i.status !== 'Reviewed' &&
        i.status !== 'Confirmed Duplicate'
    ).length,
    missingInfo: invoices.filter(
      (i) => i.hasMissingInfo && i.status !== 'Confirmed Duplicate'
    ).length,
    lowConfidence: invoices.filter(
      (i) => i.hasLowConfidence && i.status !== 'Confirmed Duplicate'
    ).length,
    possibleDuplicates: invoices.filter(
      (i) =>
        i.status === 'Duplicate Risk' ||
        (i.isDuplicateRisk &&
          i.status !== 'Confirmed Duplicate' &&
          i.status !== 'Reviewed' &&
          i.status !== 'Ready for Three-Way Matching')
    ).length,
    confirmedDuplicates: invoices.filter((i) => i.status === 'Confirmed Duplicate').length,
    reviewed: invoices.filter(
      (i) =>
        (i.status === 'Reviewed' || i.status === 'Ready for Three-Way Matching') &&
        i.status !== 'Confirmed Duplicate'
    ).length,
    readyForThreeWayMatching: invoices.filter(
      (i) =>
        (i.status === 'Ready for Three-Way Matching' || i.status === 'Reviewed') &&
        i.status !== 'Confirmed Duplicate'
    ).length,
  };

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || null;

  // Handle Invoice File Upload & Server AI Extraction
  const handleUploadFile = async (
    fileBase64: string,
    mimeType: string,
    filename: string,
    sourceType: 'PDF' | 'Scanned' | 'Photo' | 'Handwritten'
  ) => {
    setIsProcessingUpload(true);
    try {
      const response = await fetch('/api/extract-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64,
          mimeType,
          filename,
          sourceType,
        }),
      });

      let extractedData: any = {};
      try {
        if (response.ok) {
          const data = await response.json();
          extractedData = data.extractedData || {};
        }
      } catch {
        extractedData = {};
      }

      const nowStr = new Date().toLocaleString('en-SG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const newId = `INV-${Date.now().toString().slice(-6)}`;

      // Construct Invoice Record from Extracted Data
      const newInvoice: InvoiceRecord = {
        id: newId,
        filename,
        fileType: mimeType,
        fileDataUrl: fileBase64,
        uploadedAt: nowStr,
        sourceType,
        status: 'Needs Review',
        reviewConfirmed: false,
        fields: {
          supplierName: extractedData.supplierName || {
            key: 'supplierName',
            label: 'Supplier Name',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          supplierRegNo: extractedData.supplierRegNo &&
            extractedData.supplierRegNo.value !== 'Missing' &&
            extractedData.supplierRegNo.value !== 'N/A' &&
            extractedData.supplierRegNo.value !== 'None' &&
            extractedData.supplierRegNo.confidence !== 'Missing information' &&
            extractedData.supplierRegNo.confidence !== 'Not stated'
            ? extractedData.supplierRegNo
            : {
                key: 'supplierRegNo',
                label: 'Supplier Reg No. / Tax ID',
                value: 'Not stated',
                confidence: 'Not stated',
                colour: 'grey',
                reason: 'Supplier registration or tax ID was not provided on the invoice.',
                reviewRequired: false,
              },
          invoiceNumber: extractedData.invoiceNumber || {
            key: 'invoiceNumber',
            label: 'Invoice Number',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          invoiceDate: extractedData.invoiceDate || {
            key: 'invoiceDate',
            label: 'Invoice Date',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          poNumber: extractedData.poNumber || {
            key: 'poNumber',
            label: 'PO Number',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          paymentTerms: extractedData.paymentTerms && extractedData.paymentTerms.value !== 'Missing' && extractedData.paymentTerms.confidence !== 'Missing information'
            ? extractedData.paymentTerms
            : {
                key: 'paymentTerms',
                label: 'Payment Terms',
                value: 'Not stated',
                confidence: 'Not stated',
                colour: 'grey',
                reason: 'No payment terms found on the invoice.',
                reviewRequired: false,
              },
          paymentMethod: extractedData.paymentMethod || {
            key: 'paymentMethod',
            label: 'Payment Method',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          dueDate: extractedData.dueDate || {
            key: 'dueDate',
            label: 'Due Date',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          currency: extractedData.currency || {
            key: 'currency',
            label: 'Currency',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          invoiceAmount: extractedData.invoiceAmount || {
            key: 'invoiceAmount',
            label: 'Invoice Amount',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          taxAmount: extractedData.taxAmount &&
            extractedData.taxAmount.value !== 'Missing' &&
            extractedData.taxAmount.value !== '0.00' &&
            extractedData.taxAmount.value !== '$0.00' &&
            extractedData.taxAmount.value !== '0' &&
            extractedData.taxAmount.confidence !== 'Not stated' &&
            extractedData.taxAmount.confidence !== 'Missing information'
            ? extractedData.taxAmount
            : {
                key: 'taxAmount',
                label: 'Tax Amount',
                value: 'Not stated',
                confidence: 'Not stated',
                colour: 'grey',
                reason: 'No separate tax amount found on the invoice.',
                reviewRequired: false,
              },
          totalAmount: extractedData.totalAmount || {
            key: 'totalAmount',
            label: 'Total Amount',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
          bankDetails: extractedData.bankDetails || {
            key: 'bankDetails',
            label: 'Bank Details',
            value: 'Missing',
            confidence: 'Missing information',
            colour: 'grey',
            reason: 'Field not extracted',
            reviewRequired: true,
          },
        },
        lineItems: Array.isArray(extractedData.lineItems) && extractedData.lineItems.length > 0
          ? extractedData.lineItems.map((item: any) => ({
              description: item.description || 'Not stated',
              quantity: item.quantity || 'Not stated',
              unitPrice: item.unitPrice || 'Not stated',
              amount: item.amount || 'Not stated',
            }))
          : [
              {
                description: 'Not stated',
                quantity: 'Not stated',
                unitPrice: 'Not stated',
                amount: 'Not stated',
              },
            ],
        hasMissingInfo: false,
        hasLowConfidence: false,
        isDuplicateRisk: false,
        duplicateMatches: [],
        assistantSummary:
          extractedData.assistantSummary ||
          'Extracted invoice information. Please verify all details.',
        assistantWarnings: extractedData.assistantWarnings || [],
        auditLogs: [
          {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: nowStr,
            user: 'SmartCap AI System',
            action: `Uploaded & Extracted ${sourceType} invoice (${filename})`,
          },
        ],
      };

      // Evaluate Flags
      const fieldValues: ExtractedField[] = Object.values(newInvoice.fields);
      newInvoice.hasMissingInfo = fieldValues.some(
        (f) =>
          (f.confidence === 'Missing information' || f.value === 'Missing') &&
          f.value !== 'Not stated' &&
          f.confidence !== 'Not stated'
      );
      newInvoice.hasLowConfidence = fieldValues.some(
        (f) => f.confidence === 'Low confidence' || f.colour === 'red'
      );

      // Duplicate Check against existing invoices using functional state update
      setInvoices((prevInvoices) => {
        const dupMatches = checkForDuplicates(newInvoice, prevInvoices);
        const updatedLogs = [...newInvoice.auditLogs];

        if (dupMatches.length > 0) {
          updatedLogs.push({
            id: `LOG-DUP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: nowStr,
            user: 'SmartCap AI Engine',
            action: `Flagged possible duplicate invoice matching rule: ${dupMatches[0].rule}`,
          });
        }

        const finalInvoice: InvoiceRecord = {
          ...newInvoice,
          isDuplicateRisk: dupMatches.length > 0,
          duplicateMatches: dupMatches,
          status: dupMatches.length > 0 ? 'Duplicate Risk' : 'Needs Review',
          auditLogs: updatedLogs,
        };

        return [finalInvoice, ...prevInvoices];
      });
      setSelectedInvoiceId(newId);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Handle Field Edits by Finance Staff
  const handleFieldChange = (fieldKey: string, newValue: string) => {
    if (!selectedInvoice) return;

    const oldField = selectedInvoice.fields[fieldKey as keyof typeof selectedInvoice.fields];
    if (!oldField) return;

    const oldValue = oldField.value;
    if (oldValue === newValue) return;

    const nowStr = new Date().toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const updatedFields = {
      ...selectedInvoice.fields,
      [fieldKey]: {
        ...oldField,
        value: newValue,
        // If staff manually corrected a missing or low confidence field, update confidence
        confidence:
          newValue && newValue !== 'Missing' && newValue !== 'Not stated'
            ? 'High confidence'
            : newValue === 'Not stated'
            ? 'Not stated'
            : 'Missing information',
        colour:
          newValue && newValue !== 'Missing' && newValue !== 'Not stated'
            ? 'green'
            : 'grey',
        reason:
          newValue && newValue !== 'Missing' && newValue !== 'Not stated'
            ? 'Staff verified'
            : oldField.reason,
      },
    };

    const newAuditLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowStr,
      user: 'Madam Lim (Accounts Exec)',
      action: `Updated field ${oldField.label}`,
      fieldKey,
      fieldLabel: oldField.label,
      oldValue,
      newValue,
    };

    // Re-eval flags
    const fieldValues: ExtractedField[] = Object.values(updatedFields);
    const hasMissing = fieldValues.some(
      (f) =>
        (f.confidence === 'Missing information' || f.value === 'Missing') &&
        f.value !== 'Not stated' &&
        f.confidence !== 'Not stated'
    );
    const hasLow = fieldValues.some(
      (f) => f.confidence === 'Low confidence' || f.colour === 'red'
    );

    // Re-check duplicates if key fields changed
    const updatedInvoiceObj: InvoiceRecord = {
      ...selectedInvoice,
      fields: updatedFields,
      hasMissingInfo: hasMissing,
      hasLowConfidence: hasLow,
      auditLogs: [newAuditLog, ...selectedInvoice.auditLogs],
    };

    const reCheckedDups = checkForDuplicates(updatedInvoiceObj, invoices);
    updatedInvoiceObj.isDuplicateRisk = reCheckedDups.length > 0;
    updatedInvoiceObj.duplicateMatches = reCheckedDups;

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === selectedInvoice.id ? updatedInvoiceObj : inv))
    );
  };

  const handleLineItemsChange = (newLineItems: any[]) => {
    if (!selectedInvoice) return;
    const nowStr = new Date().toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const newAuditLog: AuditLog = {
      id: `LOG-LINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowStr,
      user: 'Madam Lim (Accounts Exec)',
      action: 'Updated line item details for Three-Way Matching',
    };
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === selectedInvoice.id
          ? {
              ...inv,
              lineItems: newLineItems,
              auditLogs: [newAuditLog, ...inv.auditLogs],
            }
          : inv
      )
    );
  };

  // Handle Staff Review Confirmation
  const handleConfirmReview = () => {
    if (!selectedInvoice) return;

    const nowStr = new Date().toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const newAuditLog: AuditLog = {
      id: `LOG-CONF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowStr,
      user: 'Madam Lim (Accounts Exec)',
      action: 'Approved & Sent to Three-Way Matching Queue',
    };

    const updatedInvoice: InvoiceRecord = {
      ...selectedInvoice,
      status: 'Ready for Three-Way Matching',
      reviewConfirmed: true,
      reviewedBy: 'Madam Lim (Accounts Exec)',
      reviewedAt: nowStr,
      auditLogs: [newAuditLog, ...selectedInvoice.auditLogs],
    };

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === selectedInvoice.id ? updatedInvoice : inv))
    );
  };

  // Handle Duplicate Risk Resolution
  const handleResolveDuplicate = (resolution: 'distinct' | 'duplicate_flagged') => {
    if (!selectedInvoice) return;

    const nowStr = new Date().toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const actionText =
      resolution === 'distinct'
        ? 'Acknowledged & confirmed as distinct valid invoice'
        : 'Flagged as confirmed duplicate record';

    const newAuditLog: AuditLog = {
      id: `LOG-RESOLVE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowStr,
      user: 'Madam Lim (Accounts Exec)',
      action: actionText,
    };

    const isConfirmedDuplicate = resolution === 'duplicate_flagged';

    const updatedInvoice: InvoiceRecord = {
      ...selectedInvoice,
      isDuplicateRisk: false,
      duplicateMatches: resolution === 'distinct' ? [] : selectedInvoice.duplicateMatches,
      status: isConfirmedDuplicate ? 'Confirmed Duplicate' : 'Ready for Three-Way Matching',
      reviewConfirmed: !isConfirmedDuplicate,
      reviewedBy: 'Madam Lim (Accounts Exec)',
      reviewedAt: nowStr,
      auditLogs: [newAuditLog, ...selectedInvoice.auditLogs],
    };

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === selectedInvoice.id ? updatedInvoice : inv))
    );

    setActiveComparisonMatches(null);
  };

  const handleInvoiceExported = (invoiceIds: string[], timestamp: string) => {
    const idSet = new Set(invoiceIds);
    setInvoices((prev) =>
      prev.map((inv) =>
        idSet.has(inv.id)
          ? {
              ...inv,
              sheetRowSaved: true,
              exportedToSheetAt: timestamp,
              auditLogs: [
                {
                  id: `LOG-SHEET-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  timestamp,
                  user: 'SmartCap System',
                  action: 'Exported invoice details to Google Sheet "Reviewed_Invoices"',
                },
                ...inv.auditLogs,
              ],
            }
          : inv
      )
    );
  };

  const handleDeleteInvoice = (idToDelete: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== idToDelete));
    if (selectedInvoiceId === idToDelete) {
      setSelectedInvoiceId(null);
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    if (filter === 'three_way_matching') {
      setMainTab('three_way_matching');
    } else {
      setMainTab('review');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        reviewedCount={stats.reviewed}
        totalCount={stats.totalUploaded}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6 bg-white dark:bg-slate-900 px-3 pt-2 rounded-xl shadow-2xs">
          <button
            onClick={() => setMainTab('review')}
            className={`flex items-center space-x-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              mainTab === 'review'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Invoice Capture & Review</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setMainTab('three_way_matching')}
            className={`flex items-center space-x-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              mainTab === 'three_way_matching'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-4 h-4 text-emerald-600" />
            <span>Three-Way Matching Queue</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                stats.readyForThreeWayMatching > 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {stats.readyForThreeWayMatching}
            </span>
          </button>
        </div>

        {/* Dashboard Overview Banner */}
        <DashboardStatsView
          stats={stats}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />

        {/* View Switch: Table Dashboard vs Selected Invoice Review Workbench vs Three-Way Matching Queue */}
        {selectedInvoice ? (
          /* WORKBENCH VIEW */
          <div className="space-y-4">
            {/* Uploaded Invoices Queue Navigation Bar */}
            <UploadedInvoicesQueue
              invoices={invoices}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={(id) => setSelectedInvoiceId(id)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />

            {/* Workbench Top Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedInvoiceId(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                  title="Back to All Invoices"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedInvoice.fields.supplierName?.value !== 'Missing'
                        ? selectedInvoice.fields.supplierName?.value
                        : selectedInvoice.filename}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      #{selectedInvoice.fields.invoiceNumber?.value || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Uploaded on {selectedInvoice.uploadedAt} • Format: {selectedInvoice.sourceType}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedInvoiceId(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Close Workbench
                </button>
              </div>
            </div>

            {/* Duplicate Warning Alert Banner */}
            {(selectedInvoice.status === 'Duplicate Risk' ||
              selectedInvoice.status === 'Confirmed Duplicate' ||
              selectedInvoice.isDuplicateRisk) && (
              <DuplicateWarningBanner
                duplicateMatches={selectedInvoice.duplicateMatches}
                status={selectedInvoice.status}
                onOpenComparison={() =>
                  setActiveComparisonMatches(selectedInvoice.duplicateMatches)
                }
              />
            )}

            {/* Side-by-Side Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (5 Cols): Document Viewer */}
              <div className="lg:col-span-5 h-[750px] sticky top-20">
                <DocumentViewer
                  dataUrl={selectedInvoice.fileDataUrl}
                  filename={selectedInvoice.filename}
                  fileType={selectedInvoice.fileType}
                  sourceType={selectedInvoice.sourceType}
                />
              </div>

              {/* Right Column (7 Cols): Extracted Fields, Assistant & Audit */}
              <div className="lg:col-span-7 space-y-6">
                {/* Madam Lim Assistant Panel */}
                <MadamLimAssistant
                  invoice={selectedInvoice}
                  onConfirmReview={handleConfirmReview}
                  isConfirmed={
                    selectedInvoice.status === 'Ready for Three-Way Matching' ||
                    selectedInvoice.status === 'Reviewed'
                  }
                />

                {/* Field Review Editor */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <FieldEditor
                    fields={selectedInvoice.fields}
                    onFieldChange={handleFieldChange}
                    lineItems={selectedInvoice.lineItems || []}
                    onLineItemsChange={handleLineItemsChange}
                  />
                </div>

                {/* Audit Trail Drawer */}
                <AuditTrailDrawer logs={selectedInvoice.auditLogs} />
              </div>
            </div>
          </div>
        ) : mainTab === 'three_way_matching' ? (
          /* THREE WAY MATCHING QUEUE */
          <ThreeWayMatchingQueue
            invoices={invoices}
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            onSwitchToReviewTab={() => setMainTab('review')}
            onInvoiceExported={handleInvoiceExported}
          />
        ) : (
          /* DASHBOARD TABLE VIEW */
          <InvoiceListTable
            invoices={invoices}
            selectedInvoiceId={selectedInvoiceId}
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            onDeleteInvoice={handleDeleteInvoice}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />
        )}
      </main>

      {/* Upload Modal */}
      {isUploadOpen && (
        <InvoiceUploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadFile={handleUploadFile}
          isProcessing={isProcessingUpload}
        />
      )}

      {/* Duplicate Comparison Modal */}
      {activeComparisonMatches && selectedInvoice && (
        <DuplicateComparisonModal
          currentInvoice={selectedInvoice}
          duplicateMatches={activeComparisonMatches}
          existingInvoices={invoices}
          onClose={() => setActiveComparisonMatches(null)}
          onResolveDuplicate={handleResolveDuplicate}
        />
      )}
    </div>
  );
}
