import React from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  HelpCircle,
  Copy,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { DashboardStats } from '../types';

interface DashboardStatsProps {
  stats: DashboardStats;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const DashboardStatsView: React.FC<DashboardStatsProps> = ({
  stats,
  activeFilter,
  onFilterChange,
}) => {
  const statCards = [
    {
      id: 'all',
      label: 'Total Uploaded',
      value: stats.totalUploaded,
      icon: FileText,
      iconColor: 'text-indigo-600',
      activeBorder: 'border-indigo-600 ring-2 ring-indigo-500/20',
    },
    {
      id: 'ready',
      label: 'Needs Review',
      value: stats.readyForReview,
      icon: Clock,
      iconColor: 'text-amber-500',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
    },
    {
      id: 'missing',
      label: 'Missing Info',
      value: stats.missingInfo,
      icon: HelpCircle,
      iconColor: 'text-slate-500',
      activeBorder: 'border-slate-500 ring-2 ring-slate-400/20',
    },
    {
      id: 'low',
      label: 'Low Confidence',
      value: stats.lowConfidence,
      icon: AlertTriangle,
      iconColor: 'text-rose-600',
      activeBorder: 'border-rose-600 ring-2 ring-rose-500/20',
    },
    {
      id: 'duplicate',
      label: 'Possible Duplicates',
      value: stats.possibleDuplicates,
      icon: Copy,
      iconColor: 'text-amber-600',
      activeBorder: 'border-amber-600 ring-2 ring-amber-500/20',
    },
    {
      id: 'confirmed_duplicate',
      label: 'Confirmed Duplicate',
      value: stats.confirmedDuplicates,
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      activeBorder: 'border-rose-600 ring-2 ring-rose-500/20',
    },
    {
      id: 'three_way_matching',
      label: 'Ready for 3-Way Matching',
      value: stats.readyForThreeWayMatching ?? stats.reviewed,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      activeBorder: 'border-emerald-600 ring-2 ring-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 mb-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onFilterChange(card.id)}
            className={`text-left p-3.5 rounded-xl border bg-white transition-all cursor-pointer shadow-2xs ${
              isSelected
                ? `${card.activeBorder} shadow-sm font-semibold`
                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {card.value}
            </div>
          </button>
        );
      })}
    </div>
  );
};
