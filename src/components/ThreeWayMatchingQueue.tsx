import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  Search,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  AlertCircle,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { InvoiceRecord } from '../types';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
} from '../lib/googleAuth';
import {
  appendInvoiceToSheet,
  SPREADSHEET_URL,
  SHEET_NAME,
} from '../lib/googleSheets';
import { User } from 'firebase/auth';

interface ThreeWayMatchingQueueProps {
  invoices: InvoiceRecord[];
  onSelectInvoice: (invoiceId: string) => void;
  onSwitchToReviewTab: () => void;
  onInvoiceExported?: (invoiceIds: string[], timestamp: string) => void;
}

export const ThreeWayMatchingQueue: React.FC<ThreeWayMatchingQueueProps> = ({
  invoices,
  onSelectInvoice,
  onSwitchToReviewTab,
  onInvoiceExported,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [isBatchExporting, setIsBatchExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    url?: string;
  } | null>(null);

  // Initialize Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, accToken) => {
        setAuthUser(user);
        setToken(accToken);
        setIsAuthLoading(false);
      },
      () => {
        setAuthUser(null);
        setToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setAuthUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Google Sign-In was cancelled or failed.',
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
    setToken(null);
  };

  // Filter invoices for Three-Way Matching Queue:
  // Must be reviewed/approved (status === 'Ready for Three-Way Matching' or 'Reviewed')
  // Confirmed duplicates are strictly excluded!
  const matchingInvoices = invoices.filter(
    (inv) =>
      (inv.status === 'Ready for Three-Way Matching' || inv.status === 'Reviewed') &&
      inv.status !== 'Confirmed Duplicate'
  );

  const filteredInvoices = matchingInvoices.filter((inv) => {
    const sName = inv.fields.supplierName?.value || '';
    const invNum = inv.fields.invoiceNumber?.value || '';
    const poNum = inv.fields.poNumber?.value || '';
    const regNo = inv.fields.supplierRegNo?.value || '';
    const query = searchTerm.toLowerCase();

    return (
      sName.toLowerCase().includes(query) ||
      invNum.toLowerCase().includes(query) ||
      poNum.toLowerCase().includes(query) ||
      regNo.toLowerCase().includes(query) ||
      inv.filename.toLowerCase().includes(query)
    );
  });

  // Export Single Invoice to Google Sheet
  const handleExportSingle = async (inv: InvoiceRecord) => {
    setFeedback(null);
    let activeToken = token;

    if (!activeToken) {
      try {
        const authRes = await googleSignIn();
        if (authRes) {
          setAuthUser(authRes.user);
          setToken(authRes.accessToken);
          activeToken = authRes.accessToken;
        } else {
          return;
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: 'Google authentication required to save to Google Sheets.',
        });
        return;
      }
    }

    setExportingId(inv.id);
    try {
      const res = await appendInvoiceToSheet(activeToken, inv);
      const nowStr = new Date().toLocaleString('en-SG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (res.success) {
        if (onInvoiceExported) {
          onInvoiceExported([inv.id], nowStr);
        }
        setFeedback({
          type: 'success',
          text: `Saved Invoice ${inv.fields.invoiceNumber?.value || inv.id} to Google Sheet under "${SHEET_NAME}"! Status set to "Ready for Matching".`,
          url: SPREADSHEET_URL,
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to export invoice to Google Sheets.',
      });
    } finally {
      setExportingId(null);
    }
  };

  // Export All Invoices in Queue to Google Sheet
  const handleExportBatch = async () => {
    if (matchingInvoices.length === 0) return;
    setFeedback(null);
    let activeToken = token;

    if (!activeToken) {
      try {
        const authRes = await googleSignIn();
        if (authRes) {
          setAuthUser(authRes.user);
          setToken(authRes.accessToken);
          activeToken = authRes.accessToken;
        } else {
          return;
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: 'Google authentication required to save to Google Sheets.',
        });
        return;
      }
    }

    setIsBatchExporting(true);
    try {
      const res = await appendInvoiceToSheet(activeToken, matchingInvoices);
      const nowStr = new Date().toLocaleString('en-SG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (res.success) {
        if (onInvoiceExported) {
          onInvoiceExported(
            matchingInvoices.map((i) => i.id),
            nowStr
          );
        }
        setFeedback({
          type: 'success',
          text: `Successfully saved all ${matchingInvoices.length} invoice(s) to Google Sheet under "${SHEET_NAME}"! Status set to "Ready for Matching".`,
          url: SPREADSHEET_URL,
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to export invoices to Google Sheets.',
      });
    } finally {
      setIsBatchExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Information Banner */}
      <div className="bg-gradient-to-r from-emerald-900/90 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-300 shrink-0 mt-0.5">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold tracking-tight">
                Three-Way Matching Queue
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {matchingInvoices.length} Invoices Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Approved invoices are automatically sent here after review and are ready for processing by the Three-Way Matching application.
            </p>
            <p className="text-[11px] text-emerald-200/80 mt-1.5 max-w-2xl leading-relaxed font-normal">
              Invoices in this queue have completed review in SmartCap and are waiting for the enterprise accounting system to perform Purchase Order, Goods Receipt, and Invoice matching.
            </p>
          </div>
        </div>

        <button
          onClick={onSwitchToReviewTab}
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-sm"
        >
          Back to Review Dashboard
        </button>
      </div>

      {/* Google Sheets Connection & Sync Banner */}
      <div className="bg-emerald-950/40 dark:bg-emerald-950/30 border border-emerald-800/60 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-600/20 rounded-xl border border-emerald-500/40 text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                Google Sheets Integration
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sheet: {SHEET_NAME}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Target Spreadsheet:{' '}
              <a
                href={SPREADSHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>Reviewed_Invoices (13xu1LcP2MB...)</span>
                <ExternalLink className="w-3 h-3 ml-0.5 inline" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {authUser ? (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-300 bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Connected as {authUser.email}</span>
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Disconnect Google Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isAuthLoading}
              className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 font-medium text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs border border-slate-300 dark:border-slate-700"
            >
              {isAuthLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Sign in with Google</span>
            </button>
          )}

          <button
            onClick={handleExportBatch}
            disabled={isBatchExporting || matchingInvoices.length === 0}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isBatchExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving All to Sheet...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Save All Queue ({matchingInvoices.length}) to Google Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>

          {feedback.url && (
            <a
              href={feedback.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[11px] rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-1 shrink-0 ml-3"
            >
              <span>Open Google Sheet</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Invoices Ready for Matching ({matchingInvoices.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search supplier, reg #, invoice #, PO #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Supplier & Tax ID</th>
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">PO #</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Google Sheet Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <GitCompare className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No invoices in the Three-Way Matching Queue
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {matchingInvoices.length === 0
                        ? 'When Madam Lim reviews and approves invoices from the Review Dashboard, they will automatically appear in this queue.'
                        : 'No records match your search criteria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const sName =
                    inv.fields.supplierName?.value !== 'Missing'
                      ? inv.fields.supplierName?.value
                      : inv.filename;
                  const regNo = inv.fields.supplierRegNo?.value || 'Not stated';
                  const invNum = inv.fields.invoiceNumber?.value || 'N/A';
                  const invDate = inv.fields.invoiceDate?.value || 'N/A';
                  const poNum = inv.fields.poNumber?.value || 'N/A';
                  const currency = inv.fields.currency?.value || 'SGD';
                  const total = inv.fields.totalAmount?.value || '0.00';
                  const payMethod = inv.fields.paymentMethod?.value || 'Not stated';
                  const isExporting = exportingId === inv.id;
                  const isSaved = inv.sheetRowSaved;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div>
                            <span className="block font-bold">{sName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Reg/Tax ID: {regNo}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                            #{invNum}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{invDate}</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {poNum !== 'N/A' && poNum !== 'Missing' ? (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200 font-semibold">
                            {poNum}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                        {currency} ${total}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{payMethod}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Ready for Matching</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isSaved ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Saved to Google Sheet</span>
                            </span>
                            {inv.exportedToSheetAt && (
                              <span className="text-[10px] text-slate-400 block">
                                {inv.exportedToSheetAt}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Not saved yet
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleExportSingle(inv)}
                          disabled={isExporting}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-2xs ${
                            isSaved
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-900/50'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                          title="Save details (Invoice #, Supplier, Date, PO #, Total Payable, Extraction Confidence, Payment Method, Review Status, Matching Status) to Google Sheet"
                        >
                          {isExporting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>{isSaved ? 'Re-Save' : 'Save to Google Sheet'}</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => onSelectInvoice(inv.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Inspect</span>
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
    </div>
  );
};
