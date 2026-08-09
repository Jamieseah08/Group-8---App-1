import React from 'react';
import { InvoiceRecord, InvoiceStatus } from '../types';
import {
  FileText,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Clock,
  Plus,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface UploadedInvoicesQueueProps {
  invoices: InvoiceRecord[];
  selectedInvoiceId: string | null;
  onSelectInvoice: (id: string) => void;
  onOpenUpload: () => void;
}

export const UploadedInvoicesQueue: React.FC<UploadedInvoicesQueueProps> = ({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
  onOpenUpload,
}) => {
  if (invoices.length === 0) return null;

  const getStatusBadge = (status: InvoiceStatus, isDuplicate: boolean) => {
    if (status === 'Confirmed Duplicate') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <Copy className="w-2.5 h-2.5 text-rose-600 shrink-0" />
          <span>Confirmed Dup</span>
        </span>
      );
    }
    if (status === 'Ready for Three-Way Matching' || status === 'Reviewed') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
          <span>Matching Ready</span>
        </span>
      );
    }
    if (status === 'Duplicate Risk' || isDuplicate) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Copy className="w-2.5 h-2.5 text-amber-600 shrink-0" />
          <span>Duplicate Risk</span>
        </span>
      );
    }
    switch (status) {
      case 'Ready for Review':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Clock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
            <span>Ready</span>
          </span>
        );
      case 'Needs Review':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
            <span>Needs Review</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Uploaded Invoices Queue ({invoices.length})
          </h3>
          <span className="text-[10px] text-slate-500">
            Click any invoice below to switch review view
          </span>
        </div>
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add More Invoices</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-300">
        {invoices.map((inv, index) => {
          const isSelected = inv.id === selectedInvoiceId;
          const supplierName =
            inv.fields.supplierName?.value !== 'Missing'
              ? inv.fields.supplierName?.value
              : inv.filename;
          const invoiceNum = inv.fields.invoiceNumber?.value || 'N/A';
          const amount =
            inv.fields.totalAmount?.value !== 'Missing'
              ? inv.fields.totalAmount?.value
              : inv.fields.invoiceAmount?.value || '';

          return (
            <button
              key={inv.id}
              onClick={() => onSelectInvoice(inv.id)}
              className={`flex-none w-56 p-2.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    #{index + 1}
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {supplierName}
                  </p>
                </div>
                {getStatusBadge(inv.status, inv.isDuplicateRisk)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono text-slate-600 truncate max-w-[100px]">
                  {invoiceNum}
                </span>
                <span className="font-bold text-slate-900">{amount}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
