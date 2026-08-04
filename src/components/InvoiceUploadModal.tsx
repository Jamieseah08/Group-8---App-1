import React, { useState, useRef } from 'react';
import {
  X,
  FileUp,
  Camera,
  FileText,
  Sparkles,
  Loader2,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface InvoiceUploadModalProps {
  onClose: () => void;
  onUploadFile: (
    fileBase64: string,
    mimeType: string,
    filename: string,
    sourceType: 'PDF' | 'Scanned' | 'Photo' | 'Handwritten'
  ) => Promise<void>;
  isProcessing: boolean;
}

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  onClose,
  onUploadFile,
  isProcessing,
}) => {
  const [sourceType, setSourceType] = useState<
    'PDF' | 'Scanned' | 'Photo' | 'Handwritten'
  >('PDF');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    current: number;
    currentFilename: string;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFilesBatch(Array.from(files));
  };

  const processFilesBatch = async (files: File[]) => {
    setErrorMessage(null);
    if (files.length === 0) return;

    // Filter files by size
    const validFiles: File[] = [];
    const oversizeFiles: string[] = [];

    files.forEach((f) => {
      if (f.size > 20 * 1024 * 1024) {
        oversizeFiles.push(f.name);
      } else {
        validFiles.push(f);
      }
    });

    if (oversizeFiles.length > 0) {
      setErrorMessage(
        `Skipped ${oversizeFiles.length} file(s) exceeding 20MB: ${oversizeFiles.join(', ')}`
      );
    }

    if (validFiles.length === 0) return;

    setBatchProgress({
      total: validFiles.length,
      current: 1,
      currentFilename: validFiles[0].name,
    });

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setBatchProgress({
        total: validFiles.length,
        current: i + 1,
        currentFilename: file.name,
      });

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const resultStr = reader.result as string;
            const isPdf =
              file.type.toLowerCase().includes('pdf') ||
              file.name.toLowerCase().endsWith('.pdf');
            const fileSourceType = isPdf ? 'PDF' : sourceType;
            await onUploadFile(resultStr, file.type || (isPdf ? 'application/pdf' : 'image/png'), file.name, fileSourceType);
          } catch (err: any) {
            console.error('Failed to extract file:', file.name, err);
          }
          resolve();
        };
        reader.onerror = () => {
          console.error('Failed to read file:', file.name);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setBatchProgress(null);
    onClose();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFilesBatch(Array.from(e.dataTransfer.files));
    }
  };

  // Helper to generate a realistic synthetic sample invoice canvas image base64 for quick instant testing!
  const handleGenerateSampleInvoice = async (samplePreset: 'standard' | 'handwritten' | 'duplicate_test') => {
    setErrorMessage(null);

    // Render synthetic invoice onto canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper texture
    ctx.fillStyle = samplePreset === 'handwritten' ? '#fbf8ed' : '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);

    // Decorative Header
    ctx.fillStyle = samplePreset === 'handwritten' ? '#2d3748' : '#1e293b';
    ctx.fillRect(40, 40, 720, 8);

    if (samplePreset === 'handwritten') {
      // Handwritten style drawing
      ctx.font = '24px "Caveat", "Brush Script MT", cursive, sans-serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('HANDWRITTEN SUPPLIER LOGISTICS', 50, 90);
      ctx.fillText('Reg No: 201889921K', 50, 120);

      ctx.fillText('TAX INVOICE #: HW-2026-904', 450, 90);
      ctx.fillText('Date: 15 July 2026', 450, 120);
      ctx.fillText('PO #: PO-77123', 450, 150);

      ctx.beginPath();
      ctx.moveTo(50, 180);
      ctx.lineTo(750, 180);
      ctx.strokeStyle = '#1e3a8a';
      ctx.stroke();

      ctx.fillText('Items Description:', 50, 220);
      ctx.fillText('1. Custom Freight & Warehousing Services - $2,400.00', 70, 260);
      ctx.fillText('2. Express Courier Surcharge - $150.00', 70, 300);

      ctx.fillText('Subtotal: $2,550.00', 480, 380);
      ctx.fillText('GST (9%): $229.50', 480, 420);
      ctx.fillText('Total Payable: $2,779.50', 480, 470);

      ctx.fillText('Bank: DBS Bank Ltd', 50, 540);
      ctx.fillText('Account #: 003-901827-4 (Note: fainted digits)', 50, 580);
      ctx.fillText('PayNow UEN: 201889921K', 50, 620);
    } else if (samplePreset === 'duplicate_test') {
      // Standard corporate invoice designed to test duplicate detection!
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('SINGAPORE OFFICE SUPPLIES PTE LTD', 50, 90);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('UEN / Reg: 201509812M | GST Reg: M9001234', 50, 115);

      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#2563eb';
      ctx.fillText('TAX INVOICE', 500, 90);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('Invoice No: INV-2026-8891', 500, 115);
      ctx.fillText('Date: 2026-07-15', 500, 135);
      ctx.fillText('PO No: PO-90021', 500, 155);

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(50, 190, 700, 30);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('DESCRIPTION', 60, 210);
      ctx.fillText('QTY', 400, 210);
      ctx.fillText('UNIT PRICE', 500, 210);
      ctx.fillText('AMOUNT', 650, 210);

      ctx.font = '13px sans-serif';
      ctx.fillText('Ergonomic Mesh Office Chairs', 60, 250);
      ctx.fillText('5', 400, 250);
      ctx.fillText('$250.00', 500, 250);
      ctx.fillText('$1,250.00', 650, 250);

      ctx.fillText('Subtotal:', 500, 320);
      ctx.fillText('$1,250.00', 650, 320);
      ctx.fillText('GST (9%):', 500, 350);
      ctx.fillText('$112.50', 650, 350);
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Total Amount Payable:', 450, 390);
      ctx.fillText('$1,362.50', 650, 390);

      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Bank Transfer Details:', 50, 450);
      ctx.font = '12px sans-serif';
      ctx.fillText('Bank: Overseas-Chinese Banking Corp (OCBC)', 50, 475);
      ctx.fillText('Account Name: Singapore Office Supplies Pte Ltd', 50, 495);
      ctx.fillText('Account No: 687-123456-001', 50, 515);
    } else {
      // Standard printed invoice
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('VERTEX GLOBAL TECHNOLOGIES', 50, 90);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Co Reg No: 202011234D | GST Reg: M8009988', 50, 115);

      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#0284c7';
      ctx.fillText('OFFICIAL INVOICE', 500, 90);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('Invoice #: VTX-99081', 500, 115);
      ctx.fillText('Date: 2026-07-28', 500, 135);
      ctx.fillText('PO #: PO-88200', 500, 155);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(50, 190, 700, 30);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ITEM / SERVICE', 60, 210);
      ctx.fillText('AMOUNT', 650, 210);

      ctx.font = '13px sans-serif';
      ctx.fillText('Enterprise Cloud Infrastructure Hosting & Maintenance', 60, 250);
      ctx.fillText('$3,200.00', 650, 250);

      ctx.fillText('Subtotal:', 500, 320);
      ctx.fillText('$3,200.00', 650, 320);
      ctx.fillText('GST (9%):', 500, 350);
      ctx.fillText('$288.00', 650, 350);
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Total Payable:', 480, 390);
      ctx.fillText('$3,488.00', 650, 390);

      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Remittance Bank Details:', 50, 450);
      ctx.font = '12px sans-serif';
      ctx.fillText('Bank Name: United Overseas Bank (UOB)', 50, 475);
      ctx.fillText('Account Number: 301-889-102-4', 50, 495);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const filename =
      samplePreset === 'handwritten'
        ? 'Handwritten_Invoice_HW2026.png'
        : samplePreset === 'duplicate_test'
        ? 'OfficeSupplies_INV20268891.png'
        : 'Vertex_Invoice_VTX99081.png';

    const sType = samplePreset === 'handwritten' ? 'Handwritten' : 'PDF';

    await onUploadFile(dataUrl, 'image/png', filename, sType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload Invoice Document
              </h3>
              <p className="text-xs text-slate-500">
                PDF, Scanned Image, Photo, or Handwritten Invoice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Invoice Format Category:
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { id: 'PDF', label: 'PDF Invoice' },
              { id: 'Scanned', label: 'Scanned Doc' },
              { id: 'Photo', label: 'Camera Photo' },
              { id: 'Handwritten', label: 'Handwritten' },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSourceType(type.id as any)}
                className={`py-2 px-2.5 rounded-lg border font-medium text-center transition-all cursor-pointer ${
                  sourceType === type.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {isProcessing || batchProgress ? (
            <div className="space-y-3 py-4 w-full max-w-xs mx-auto">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {batchProgress
                    ? `Extracting Invoice ${batchProgress.current} of ${batchProgress.total}...`
                    : 'AI Extracting Invoice Fields...'}
                </p>
                {batchProgress && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                    {batchProgress.currentFilename}
                  </p>
                )}
              </div>
              {batchProgress && batchProgress.total > 1 && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-slate-500">
                Gemini AI is reading text, confidence levels, and checking for missing fields independently.
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <FileUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Click to choose file(s) or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Upload <strong>one or multiple</strong> supplier invoices (PDF, JPG, JPEG, PNG up to 20MB)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Instant Test Preset Generator */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Or Generate Synthetic Test Document:</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleGenerateSampleInvoice('duplicate_test')}
              className="p-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-200 dark:border-blue-800 text-left transition-colors cursor-pointer"
            >
              <strong className="block font-semibold">Test Standard Invoice</strong>
              <span className="text-[10px] text-blue-600 dark:text-blue-300">
                Singapore Office Supplies Pte Ltd ($1,362.50)
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleGenerateSampleInvoice('handwritten')}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800 text-left transition-colors cursor-pointer"
            >
              <strong className="block font-semibold">Test Handwritten Invoice</strong>
              <span className="text-[10px] text-amber-600 dark:text-amber-300">
                Faint pen script with missing supplier reg #
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
