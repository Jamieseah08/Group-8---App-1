import React from 'react';
import { Copy, AlertTriangle, ArrowRight, Eye, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DuplicateMatch, InvoiceStatus } from '../types';

interface DuplicateWarningBannerProps {
  duplicateMatches: DuplicateMatch[];
  status?: InvoiceStatus;
  onOpenComparison: () => void;
}

export const DuplicateWarningBanner: React.FC<DuplicateWarningBannerProps> = ({
  duplicateMatches,
  status,
  onOpenComparison,
}) => {
  if (!duplicateMatches || duplicateMatches.length === 0) return null;

  const isConfirmed = status === 'Confirmed Duplicate';

  if (isConfirmed) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-600 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  Confirmed Duplicate Record ({duplicateMatches.length} Match)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-200 text-rose-900 rounded-full border border-rose-300">
                  Confirmed Duplicate
                </span>
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-300 mt-1">
                Madam Lim reviewed this invoice and flagged it as a confirmed duplicate in the system.
              </p>

              <ul className="mt-2 space-y-1">
                {duplicateMatches.map((match, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-rose-950 dark:text-rose-200 flex items-center space-x-2 bg-rose-100/80 dark:bg-rose-900/40 px-2.5 py-1 rounded border border-rose-300 dark:border-rose-700/60"
                  >
                    <Copy className="w-3.5 h-3.5 text-rose-700 dark:text-rose-300" />
                    <span>
                      <strong>Matched Rule:</strong> {match.rule} — System Record{' '}
                      <strong className="underline">{match.matchingInvoiceNumber}</strong> ({match.matchingSupplierName}, {match.matchingTotalAmount})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={onOpenComparison}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Re-Inspect Duplicate Records</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Possible Duplicate Invoice Detected ({duplicateMatches.length})
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                Review Required
              </span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-300 mt-1">
              SmartCap cross-referenced system archives and detected matching records. Staff verification required.
            </p>

            <ul className="mt-2 space-y-1">
              {duplicateMatches.map((match, idx) => (
                <li
                  key={idx}
                  className="text-xs text-amber-950 dark:text-amber-200 flex items-center space-x-2 bg-amber-100/80 dark:bg-amber-900/40 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700/60"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                  <span>
                    <strong>Rule Triggered:</strong> {match.rule} — Matching Invoice{' '}
                    <strong className="underline">{match.matchingInvoiceNumber}</strong> ({match.matchingSupplierName}, {match.matchingTotalAmount})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          onClick={onOpenComparison}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Eye className="w-4 h-4" />
          <span>Compare Duplicate Records</span>
        </button>
      </div>
    </div>
  );
};
