import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ChevronRight,
  Eye,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { InvoiceRecord, InvoiceStatus } from '../types';

interface InvoiceListTableProps {
  invoices: InvoiceRecord[];
  selectedInvoiceId: string | null;
  onSelectInvoice: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const InvoiceListTable: React.FC<InvoiceListTableProps> = ({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
  onDeleteInvoice,
  activeFilter,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter invoices based on active tab & search query
  const filteredInvoices = invoices.filter((inv) => {
    // Search match
    const sName = inv.fields.supplierName?.value || '';
    const invNum = inv.fields.invoiceNumber?.value || '';
    const poNum = inv.fields.poNumber?.value || '';
    const matchesSearch =
      sName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.filename.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filter match
    if (activeFilter === 'all') return true;
    if (activeFilter === 'ready')
      return (
        inv.status !== 'Reviewed' &&
        inv.status !== 'Ready for Three-Way Matching' &&
        inv.status !== 'Confirmed Duplicate'
      );
    if (activeFilter === 'missing') return inv.hasMissingInfo && inv.status !== 'Confirmed Duplicate';
    if (activeFilter === 'low') return inv.hasLowConfidence && inv.status !== 'Confirmed Duplicate';
    if (activeFilter === 'duplicate')
      return (
        inv.status === 'Duplicate Risk' ||
        (inv.isDuplicateRisk &&
          inv.status !== 'Confirmed Duplicate' &&
          inv.status !== 'Reviewed' &&
          inv.status !== 'Ready for Three-Way Matching')
      );
    if (activeFilter === 'confirmed_duplicate') return inv.status === 'Confirmed Duplicate';
    if (activeFilter === 'reviewed' || activeFilter === 'three_way_matching')
      return (
        (inv.status === 'Reviewed' || inv.status === 'Ready for Three-Way Matching') &&
        inv.status !== 'Confirmed Duplicate'
      );

    return true;
  });

  const getStatusBadge = (status: InvoiceStatus, isDuplicate: boolean) => {
    if (status === 'Confirmed Duplicate') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <Copy className="w-3 h-3 text-rose-600" />
          <span>Confirmed Duplicate</span>
        </span>
      );
    }

    if (status === 'Duplicate Risk' || isDuplicate) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <Copy className="w-3 h-3 text-amber-600" />
          <span>Duplicate Risk</span>
        </span>
      );
    }

    switch (status) {
      case 'Ready for Three-Way Matching':
      case 'Reviewed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Ready for Three-Way Matching</span>
          </span>
        );
      case 'Ready for Review':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            <Clock className="w-3 h-3 text-indigo-600" />
            <span>Ready for Review</span>
          </span>
        );
      case 'Needs Review':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Needs Review</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Search & Filter Header */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Uploaded Invoices</span>
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
            {invoices.length} total
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search supplier, invoice #, PO #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>
              Showing <strong>{filteredInvoices.length}</strong> of{' '}
              <strong>{invoices.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Supplier Name</th>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">PO #</th>
              <th className="py-3 px-4">Total Amount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    No invoices found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload a PDF, scanned document, photo, or handwritten invoice to begin.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = inv.id === selectedInvoiceId;
                const supplierName = inv.fields.supplierName?.value || 'Missing';
                const invoiceNumber = inv.fields.invoiceNumber?.value || 'Missing';
                const invoiceDate = inv.fields.invoiceDate?.value || 'Missing';
                const poNumber = inv.fields.poNumber?.value || 'Missing';
                const totalAmount =
                  inv.fields.totalAmount?.value ||
                  inv.fields.invoiceAmount?.value ||
                  'Missing';

                return (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv.id)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {supplierName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {inv.filename}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                      {invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {invoiceDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {poNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {totalAmount}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inv.status, inv.isDuplicateRisk)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInvoice(inv.id);
                        }}
                        className="p-1.5 hover:bg-blue-100 text-blue-600 dark:hover:bg-blue-900 dark:text-blue-400 rounded transition-colors"
                        title="Review Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteInvoice(inv.id);
                        }}
                        className="p-1.5 hover:bg-rose-100 text-rose-600 dark:hover:bg-rose-900 dark:text-rose-400 rounded transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
