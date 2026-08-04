import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  FileSearch,
  Building,
  HelpCircle,
  AlertTriangle,
  Send,
  UserCheck,
} from 'lucide-react';
import { InvoiceRecord, ExtractedField } from '../types';

interface MadamLimAssistantProps {
  invoice: InvoiceRecord;
  onConfirmReview: () => void;
  isConfirmed: boolean;
}

export const MadamLimAssistant: React.FC<MadamLimAssistantProps> = ({
  invoice,
  onConfirmReview,
  isConfirmed,
}) => {
  const fields = invoice.fields;

  // Calculate quick confidence summary stats
  const fieldList: ExtractedField[] = Object.values(fields);
  const highCount = fieldList.filter((f) => f.colour === 'green').length;
  const mediumCount = fieldList.filter((f) => f.colour === 'amber').length;
  const lowCount = fieldList.filter((f) => f.colour === 'red').length;
  const missingCount = fieldList.filter(
    (f) =>
      (f.value === 'Missing' || f.confidence === 'Missing information') &&
      f.value !== 'Not stated' &&
      f.confidence !== 'Not stated'
  ).length;

  return (
    <div className="bg-white text-slate-800 rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
      {/* Assistant Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            ML
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <span>Madam Lim&apos;s Review Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            </h4>
            <p className="text-[11px] text-slate-500">
              Accounts Executive extraction review & verification system
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          Source: {invoice.sourceType}
        </span>
      </div>

      {/* Confidence Breakdown Pills */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
          <span className="block text-[10px] text-emerald-700 font-bold uppercase">High Conf.</span>
          <strong className="text-emerald-900 text-base">{highCount}</strong>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
          <span className="block text-[10px] text-amber-700 font-bold uppercase">Medium Conf.</span>
          <strong className="text-amber-900 text-base">{mediumCount}</strong>
        </div>
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
          <span className="block text-[10px] text-rose-700 font-bold uppercase">Low Conf.</span>
          <strong className="text-rose-900 text-base">{lowCount}</strong>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <span className="block text-[10px] text-slate-500 font-bold uppercase">Missing</span>
          <strong className="text-slate-800 text-base">{missingCount}</strong>
        </div>
      </div>

      {/* AI Summary for Madam Lim */}
      <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
          <FileSearch className="w-3.5 h-3.5 text-indigo-600" />
          <span>Extraction Insight Summary:</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          {invoice.assistantSummary ||
            'Document extracted. Please verify all fields carefully before marking as reviewed.'}
        </p>
      </div>

      {/* Assistant Warning Flags */}
      {invoice.assistantWarnings && invoice.assistantWarnings.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Verification Warning Flags ({invoice.assistantWarnings.length})
          </span>
          <ul className="space-y-1 text-xs">
            {invoice.assistantWarnings.map((warn, idx) => (
              <li
                key={idx}
                className="flex items-start space-x-2 bg-amber-50 border border-amber-200 p-2 rounded text-amber-900"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strict System Safeguards Prompt */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-[11px] text-indigo-900 space-y-1">
        <strong className="block text-indigo-950 font-bold flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Strict Control Safeguards Active</span>
        </strong>
        <p className="text-indigo-800 leading-tight">
          SmartCap never auto-approves invoices, alters amounts, or executes payments. Staff confirmation is required to mark this invoice as Reviewed.
        </p>
      </div>

      {/* Confirmation Action Button */}
      <div className="pt-2 border-t border-slate-200">
        {isConfirmed ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Approved & Sent to 3-Way Matching Queue by <strong>{invoice.reviewedBy || 'Madam Lim (Accounts Exec)'}</strong> on{' '}
                {invoice.reviewedAt || 'Just now'}
              </span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
              MATCHING READY
            </span>
          </div>
        ) : (
          <button
            onClick={onConfirmReview}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shadow-emerald-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Confirm & Send to Three-Way Matching Queue</span>
          </button>
        )}
      </div>
    </div>
  );
};
