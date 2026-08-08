import React from 'react';
import {
  ExtractedField,
  ConfidenceLevel,
  ConfidenceColour,
  LineItem,
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
  ListOrdered,
  Plus,
  Trash2,
} from 'lucide-react';

interface FieldEditorProps {
  fields: Record<string, ExtractedField>;
  onFieldChange: (fieldKey: string, newValue: string) => void;
  onFieldReasonChange?: (fieldKey: string, newReason: string) => void;
  onFieldConfidenceChange?: (fieldKey: string, newConfidence: ConfidenceLevel, newColour: ConfidenceColour) => void;
  lineItems?: LineItem[];
  onLineItemsChange?: (lineItems: LineItem[]) => void;
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
  lineItems = [],
  onLineItemsChange,
  readOnly = false,
}) => {
  const handleItemChange = (index: number, key: keyof LineItem, val: string) => {
    if (!onLineItemsChange) return;
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [key]: val,
    };
    onLineItemsChange(updated);
  };

  const handleAddItem = () => {
    if (!onLineItemsChange) return;
    const newItem: LineItem = {
      description: '',
      quantity: 'Not stated',
      unitPrice: 'Not stated',
      amount: 'Not stated',
    };
    onLineItemsChange([...lineItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (!onLineItemsChange) return;
    const updated = lineItems.filter((_, i) => i !== index);
    onLineItemsChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <span>Extraction Results</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({FIELD_ORDER.length} Extracted Fields)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review and edit extracted invoice values. High-confidence items are auto-verified.
          </p>
        </div>
      </div>

      {/* Main Extracted Fields Grid */}
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
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
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
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 italic'
                        : isLow
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-700 dark:text-red-300 font-bold'
                        : isAmber
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
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
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 italic'
                        : isLow
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-700 dark:text-red-300 font-bold'
                        : isAmber
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                )}
              </div>

              {/* Reason note */}
              {field.reason && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-0.5">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{field.reason}</span>
                </p>
              )}

              {/* Supplier Bank Account Warning */}
              {isBankDetail && (
                <div className="mt-2 p-2.5 bg-indigo-50/80 dark:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule:</strong> Do not change supplier bank details automatically. Staff must verify against official accounting records before confirming.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LINE ITEMS SECTION FOR THREE-WAY MATCHING */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <ListOrdered className="w-4 h-4 text-indigo-600" />
              <span>Line Item Details (Three-Way Matching)</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-semibold">
                {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Extracted line item details required for Purchase Order, Goods Receipt, and Invoice matching. Missing fields show "Not stated".
            </p>
          </div>

          {!readOnly && onLineItemsChange && (
            <button
              onClick={handleAddItem}
              type="button"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          )}
        </div>

        {lineItems.length === 0 ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 italic">
            No line items extracted. Click "Add Line Item" if required.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-3 py-2">Item Description</th>
                  <th className="px-3 py-2 w-28">Quantity</th>
                  <th className="px-3 py-2 w-32">Unit Price</th>
                  <th className="px-3 py-2 w-32">Line Amount</th>
                  {!readOnly && onLineItemsChange && <th className="px-3 py-2 w-12 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {lineItems.map((item, idx) => {
                  const isDescNotStated = !item.description || item.description === 'Not stated';
                  const isQtyNotStated = !item.quantity || item.quantity === 'Not stated';
                  const isPriceNotStated = !item.unitPrice || item.unitPrice === 'Not stated';
                  const isAmtNotStated = !item.amount || item.amount === 'Not stated';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2 text-center font-mono text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Item Description */}
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={item.description}
                          disabled={readOnly}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g., Office Ergonomic Chairs / Not stated"
                          className={`w-full p-1.5 text-xs rounded border outline-none font-medium ${
                            isDescNotStated
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 italic'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-500'
                          }`}
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={item.quantity}
                          disabled={readOnly}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="Not stated"
                          className={`w-full p-1.5 text-xs rounded border outline-none font-mono ${
                            isQtyNotStated
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 italic'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-500'
                          }`}
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={item.unitPrice}
                          disabled={readOnly}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="Not stated"
                          className={`w-full p-1.5 text-xs rounded border outline-none font-mono ${
                            isPriceNotStated
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 italic'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-500'
                          }`}
                        />
                      </td>

                      {/* Line Amount */}
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={item.amount || 'Not stated'}
                          disabled={readOnly}
                          onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                          placeholder="Not stated"
                          className={`w-full p-1.5 text-xs rounded border outline-none font-mono ${
                            isAmtNotStated
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 italic'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-500'
                          }`}
                        />
                      </td>

                      {/* Action */}
                      {!readOnly && onLineItemsChange && (
                        <td className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded"
                            title="Remove Line Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

