import React from 'react';
import { History, User, Clock, CheckCircle, Edit3, ShieldAlert, ArrowRight } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailDrawerProps {
  logs: AuditLog[];
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({ logs }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Invoice Audit Trail & Changes Log
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {logs?.length || 0} Events Recorded
        </span>
      </div>

      {!logs || logs.length === 0 ? (
        <p className="text-xs text-slate-500 italic p-4 text-center">
          No audit history logged yet.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {logs.map((log, index) => (
            <div key={log.id ? `${log.id}-${index}` : `log-${index}`} className="relative text-xs space-y-1">
              {/* Dot */}
              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{log.user}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.timestamp}</span>
                </span>
              </div>

              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {log.action}
              </p>

              {log.fieldLabel && (log.oldValue || log.newValue) && (
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-mono flex items-center space-x-2">
                  <span className="text-slate-500">{log.fieldLabel}:</span>
                  <span className="text-rose-600 dark:text-rose-400 line-through">
                    {log.oldValue || 'Empty'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {log.newValue}
                  </span>
                </div>
              )}

              {log.note && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: {log.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
