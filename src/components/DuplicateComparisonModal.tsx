import React from 'react';
import { X, Copy, AlertTriangle, ShieldCheck, Check, Building2, Calendar, FileText, DollarSign, CreditCard } from 'lucide-react';
import { InvoiceRecord, DuplicateMatch } from '../types';

interface DuplicateComparisonModalProps {
  currentInvoice: InvoiceRecord;
  duplicateMatches: DuplicateMatch[];
  existingInvoices: InvoiceRecord[];
  onClose: () => void;
  onResolveDuplicate: (resolution: 'distinct' | 'duplicate_flagged') => void;
}

export const DuplicateComparisonModal: React.FC<DuplicateComparisonModalProps> = ({
  currentInvoice,
  duplicateMatches,
  existingInvoices,
  onClose,
  onResolveDuplicate,
}) => {
  if (!duplicateMatches || duplicateMatches.length === 0) return null;

  const firstMatch = duplicateMatches[0];
  const matchedExisting = existingInvoices.find(
    (inv) => inv.id === firstMatch.matchingInvoiceId
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-amber-500 text-slate-950 px-6 py-4 flex items-center justify-between border-b border-amber-600">
          <div className="flex items-center space-x-3">
            <Copy className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">
                Duplicate Invoice Risk Review
              </h3>
              <p className="text-xs text-amber-950 font-medium">
                Comparing Newly Uploaded Invoice against Existing System Records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-amber-600/50 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 border-b border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Mandatory System Rule:</strong> Possible duplicate detected under rule:{' '}
            <span className="font-bold underline">{firstMatch.rule}</span>. SmartCap will never automatically approve, delete, or combine duplicate invoices. Madam Lim or finance staff must explicitly review both records.
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/50">
          {/* Current Upload */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border-2 border-blue-500/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Current Uploaded Invoice
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentInvoice.filename}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-slate-500 block text-[10px]">Supplier Name</span>
                <strong className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                  {currentInvoice.fields.supplierName?.value || 'N/A'}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">Invoice Number</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                    {currentInvoice.fields.invoiceNumber?.value || 'N/A'}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">Invoice Date</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                    {currentInvoice.fields.invoiceDate?.value || 'N/A'}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">PO Number</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                    {currentInvoice.fields.poNumber?.value || 'N/A'}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">Total Amount</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {currentInvoice.fields.totalAmount?.value || currentInvoice.fields.invoiceAmount?.value || 'N/A'}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-slate-500 block text-[10px]">Supplier Bank Details</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px] block">
                  {currentInvoice.fields.bankDetails?.value || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Matched Record */}
          <div className="bg-amber-50/40 dark:bg-amber-950/20 p-5 rounded-xl border-2 border-amber-400/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-3">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Copy className="w-3.5 h-3.5" />
                <span>Matched System Invoice Record</span>
              </span>
              <span className="text-xs text-amber-800 dark:text-amber-300 font-mono">
                {firstMatch.matchingFilename}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-800">
                <span className="text-amber-800 dark:text-amber-300 block text-[10px]">Supplier Name</span>
                <strong className="text-amber-950 dark:text-amber-100 font-semibold text-sm">
                  {firstMatch.matchingSupplierName}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-800">
                  <span className="text-amber-800 dark:text-amber-300 block text-[10px]">Invoice Number</span>
                  <strong className="text-amber-950 dark:text-amber-100 font-semibold">
                    {firstMatch.matchingInvoiceNumber}
                  </strong>
                </div>
                <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-800">
                  <span className="text-amber-800 dark:text-amber-300 block text-[10px]">Invoice Date</span>
                  <strong className="text-amber-950 dark:text-amber-100 font-semibold">
                    {firstMatch.matchingInvoiceDate}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-800">
                  <span className="text-amber-800 dark:text-amber-300 block text-[10px]">PO Number</span>
                  <strong className="text-amber-950 dark:text-amber-100 font-semibold">
                    {firstMatch.matchingPoNumber}
                  </strong>
                </div>
                <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-800">
                  <span className="text-amber-800 dark:text-amber-300 block text-[10px]">Total Amount</span>
                  <strong className="text-amber-950 dark:text-amber-100 font-bold text-sm">
                    {firstMatch.matchingTotalAmount}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-800">
                <span className="text-amber-800 dark:text-amber-300 block text-[10px]">Existing Status</span>
                <span className="text-amber-950 dark:text-amber-100 font-medium text-[11px] block">
                  {matchedExisting ? matchedExisting.status : 'Reviewed in System'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Recorded decision will be logged in Madam Lim&apos;s invoice audit trail.
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => onResolveDuplicate('duplicate_flagged')}
              className="flex-1 sm:flex-none px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-200 font-semibold text-xs rounded-lg transition-colors border border-rose-300 dark:border-rose-800 cursor-pointer"
            >
              Flag as Confirmed Duplicate
            </button>
            <button
              onClick={() => onResolveDuplicate('distinct')}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Confirm as Distinct Valid Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
