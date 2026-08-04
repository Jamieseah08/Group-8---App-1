import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  FileCheck2,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Configure worker URL for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  dataUrl: string;
  filename: string;
  fileType: string;
  sourceType: string;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('Failed to convert dataUrl to Blob:', e);
    return null;
  }
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  dataUrl,
  filename,
  fileType,
  sourceType,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // PDF.js canvas state
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const isPdf =
    (fileType && fileType.toLowerCase().includes('pdf')) ||
    (filename && filename.toLowerCase().endsWith('.pdf'));

  // Create blob URL for fallbacks / new tab opening
  useEffect(() => {
    if (!dataUrl) {
      setBlobUrl(null);
      return;
    }

    if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http')) {
      setBlobUrl(dataUrl);
      return;
    }

    if (dataUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(dataUrl);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      }
    }

    setBlobUrl(dataUrl);
  }, [dataUrl]);

  // Load and Render PDF with PDF.js onto Canvas
  useEffect(() => {
    let active = true;

    if (!isPdf || !dataUrl) {
      pdfDocRef.current = null;
      return;
    }

    const renderPdfPage = async (pdfDoc: any, pageNum: number, currentScale: number, currentRotate: number) => {
      if (!canvasRef.current) return;
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        if (!active || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: currentScale * 1.4, rotation: currentRotate });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };

    const loadDocument = async () => {
      setPdfLoading(true);
      setPdfError(false);

      try {
        let pdfData: Uint8Array | ArrayBuffer;

        if (dataUrl.startsWith('data:')) {
          const parts = dataUrl.split(',');
          const base64 = parts[1] || '';
          const binaryStr = atob(base64);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          pdfData = bytes;
        } else {
          const response = await fetch(dataUrl);
          pdfData = await response.arrayBuffer();
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;

        if (!active) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setPageNumber(1);
        setPdfLoading(false);

        await renderPdfPage(pdf, 1, zoom, rotation);
      } catch (err) {
        console.error('PDF.js loading failed:', err);
        if (active) {
          setPdfError(true);
          setPdfLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [dataUrl, isPdf]);

  // Handle re-rendering when pageNumber, zoom, or rotation changes
  useEffect(() => {
    if (!isPdf || !pdfDocRef.current || pdfLoading || pdfError) return;

    const renderCurrentPage = async () => {
      if (!canvasRef.current || !pdfDocRef.current) return;
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom * 1.4, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    };

    renderCurrentPage();
  }, [pageNumber, zoom, rotation, isPdf, pdfLoading, pdfError]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPageNumber(1);
  };

  const handleOpenNewTab = () => {
    const targetUrl = blobUrl || dataUrl;
    if (targetUrl) {
      const newWin = window.open(targetUrl, '_blank');
      if (!newWin) {
        alert('Please allow popups to open document in a new tab.');
      }
    }
  };

  return (
    <div
      className={`bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-sm ${
        isFullscreen ? 'fixed inset-4 z-50 bg-slate-950 border-slate-700 shadow-2xl' : ''
      }`}
    >
      {/* Document Toolbar */}
      <div className="bg-slate-800/90 px-4 py-2.5 border-b border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 truncate pr-2">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold truncate text-slate-200" title={filename}>
            {filename}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600 uppercase shrink-0">
            {sourceType}
          </span>
        </div>

        {/* View & Page Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* PDF Page Navigation */}
          {isPdf && numPages > 1 && (
            <div className="flex items-center space-x-1 mr-2 pr-2 border-r border-slate-700">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-300">
                {pageNumber} / {numPages}
              </span>
              <button
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
                className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Zoom & Rotation Controls */}
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-1 text-slate-400 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            title="Rotate Clockwise"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            title="Reset View"
            className="text-[11px] px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition-colors cursor-pointer ml-1"
          >
            Reset
          </button>

          {(blobUrl || dataUrl) && (
            <button
              onClick={handleOpenNewTab}
              title="Open document in new tab"
              className="p-1.5 hover:bg-slate-700 rounded text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer ml-1 flex items-center gap-1 text-xs"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Document Render Canvas */}
      <div className="flex-1 bg-slate-950/80 p-3 overflow-auto flex items-center justify-center relative min-h-[450px]">
        {dataUrl ? (
          isPdf ? (
            pdfLoading ? (
              <div className="text-center p-8 text-slate-400">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-300">Rendering PDF Page...</p>
              </div>
            ) : pdfError ? (
              <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-xl max-w-sm">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-200">PDF Browser Preview Safeguard</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Click below to open and view the original PDF document in a browser window.
                </p>
                <button
                  onClick={handleOpenNewTab}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open PDF Document</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-2 max-w-full max-h-full">
                <canvas
                  ref={canvasRef}
                  className="max-w-full rounded shadow-xl border border-slate-800 bg-white object-contain"
                />
              </div>
            )
          ) : (
            <div
              className="transition-transform duration-200 ease-out flex items-center justify-center w-full h-full"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={blobUrl || dataUrl}
                alt={`Invoice document: ${filename}`}
                className="max-w-full max-h-[68vh] object-contain rounded shadow-lg border border-slate-800 bg-white"
              />
            </div>
          )
        ) : (
          <div className="text-center p-8 text-slate-400">
            <FileCheck2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No document preview loaded</p>
            <p className="text-xs text-slate-500 mt-1">
              Select an invoice from the queue to view its source file.
            </p>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Original Invoice Source • Canvas Rendered</span>
        </span>
        <button
          onClick={handleOpenNewTab}
          className="text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer text-[10px]"
        >
          Open original file ↗
        </button>
      </div>
    </div>
  );
};
