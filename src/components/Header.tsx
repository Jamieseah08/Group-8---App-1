import React from 'react';
import { FileUp, ShieldCheck, UserCheck, Sparkles, Building2 } from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  reviewedCount: number;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  reviewedCount,
  totalCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-xs flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              SmartCap
            </h1>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded border border-slate-200 tracking-wider">
              Finance Control
            </span>
          </div>
        </div>

        {/* User Context & Actions */}
        <div className="flex items-center space-x-4">
          {/* Persona Badge for Madam Lim */}
          <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs">
            <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs">
              ML
            </div>
            <div>
              <span className="text-slate-800 font-bold block leading-tight">Madam Lim</span>
              <span className="text-[10px] text-slate-500 font-medium">Accounts Executive</span>
            </div>
          </div>

          {/* Quick Review Meter */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              <strong className="text-slate-900">{reviewedCount}</strong> / {totalCount} Reviewed
            </span>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>
    </header>
  );
};
