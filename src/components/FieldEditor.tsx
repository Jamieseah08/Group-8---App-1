import React from 'react';
import {
  ExtractedField,
  ConfidenceLevel,
  ConfidenceColour,
} from '../types';
import { FIELD_ORDER, getConfidenceBadgeProps } from '../lib/fieldMeta';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Info,
  Building2,
  CreditCard,
  Receipt,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';

interface FieldEditorProps {
  fields: Record<string, ExtractedField>;
  onFieldChange: (fieldKey: string, newValue: string) => void;
  onFieldReasonChange?: (fieldKey: string, newReason: string) => void;
  onFieldConfidenceChange?: (fieldKey: string, newConfidence: ConfidenceLevel, newColour: ConfidenceColour) => void;
  readOnly?: boolean;
}

const FIELD_ICONS: Record<string, React.FC<{ className?: string }>> = {
  supplierName: Building2,
  supplierRegNo: Receipt,
  invoiceNumber: FileText,
  invoiceDate: Calendar,
  poNumber: FileText,
  paymentTerms: Info,
  paymentMethod: CreditCard,
  dueDate: Calendar,
  currency: DollarSign,
  invoiceAmount: DollarSign,
  taxAmount: DollarSign,
  totalAmount: DollarSign,
  bankDetails: CreditCard,
};

export const FieldEditor: React.FC<FieldEditorProps> = ({
  fields,
  onFieldChange,
  onFieldReasonChange,
  onFieldConfidenceChange,
  readOnly = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <span>Extraction Results</span>
            <span className="text-xs font-normal text-slate-500">
              ({FIELD_ORDER.length} Extracted Fields)
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and edit extracted invoice values. High-confidence items are auto-verified.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
        {FIELD_ORDER.map((item) => {
          const defaultField: ExtractedField = item.key === 'paymentTerms'
            ? {
                key: item.key,
                label: item.label,
                value: 'Not stated',
                confidence: 'Not stated',
                colour: 'grey',
                reason: 'No payment terms found on the invoice.',
                reviewRequired: false,
              }
            : item.key === 'taxAmount'
            ? {
                key: item.key,
                label: item.label,
                value: 'Not stated',
                confidence: 'Not stated',
                colour: 'grey',
                reason: 'No separate tax amount found on the invoice.',
                reviewRequired: false,
              }
            : item.key === 'supplierRegNo'
            ? {
                key: item.key,
                label: item.label,
                value: 'Not stated',
                confidence: 'Not stated',
                colour: 'grey',
                reason: 'Supplier registration or tax ID was not provided on the invoice.',
                reviewRequired: false,
              }
            : {
                key: item.key,
                label: item.label,
                value: 'Missing',
                confidence: 'Missing information',
                colour: 'grey',
                reason: 'Field not extracted',
                reviewRequired: true,
              };

          const field = fields[item.key] || defaultField;

          const Icon = FIELD_ICONS[item.key] || FileText;
          const badgeProps = getConfidenceBadgeProps(field.confidence, field.colour);
          const isMissing = field.value === 'Missing' || field.confidence === 'Missing information';
          const isNotStated = field.value === 'Not stated' || field.confidence === 'Not stated';
          const isLow = field.colour === 'red';
          const isAmber = field.colour === 'amber';
          const isBankDetail = item.key === 'bankDetails';

          return (
            <div
              key={item.key}
              className={`space-y-1 ${isBankDetail ? 'md:col-span-2' : ''}`}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{item.label}</span>
                </label>

                {/* Confidence Badge */}
                <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${badgeProps.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dot}`} />
                  <span>{field.confidence}</span>
                </div>
              </div>

              {/* Input Control */}
              <div className="relative">
                {isBankDetail ? (
                  <textarea
                    rows={2}
                    value={field.value}
                    disabled={readOnly}
                    onChange={(e) => onFieldChange(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    className={`w-full p-2 text-sm rounded border outline-none font-mono transition-all ${
                      isMissing || isNotStated
                        ? 'bg-slate-100 border-slate-300 text-slate-500 italic'
                        : isLow
                        ? 'bg-red-50 border-red-300 font-bold text-red-700'
                        : isAmber
                        ? 'bg-amber-50 border-amber-300 font-bold text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    disabled={readOnly}
                    onChange={(e) => onFieldChange(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    className={`w-full p-2 text-sm rounded border outline-none transition-all ${
                      isMissing || isNotStated
                        ? 'bg-slate-100 border-slate-300 text-slate-500 italic'
                        : isLow
                        ? 'bg-red-50 border-red-300 font-bold text-red-700'
                        : isAmber
                        ? 'bg-amber-50 border-amber-300 font-bold text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800 font-medium focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                )}
              </div>

              {/* Reason note */}
              {field.reason && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{field.reason}</span>
                </p>
              )}

              {/* Supplier Bank Account Warning */}
              {isBankDetail && (
                <div className="mt-2 p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-200 text-[11px] text-indigo-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule:</strong> Do not change supplier bank details automatically. Staff must verify against official accounting records before confirming.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
