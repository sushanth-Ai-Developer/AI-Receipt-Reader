
import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ValidationBadgeProps {
  needsReview: boolean;
  missingCount: number;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ needsReview, missingCount }) => {
  if (needsReview) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 animate-pulse">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Needs Review ({missingCount})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
      <CheckCircle2 className="w-4 h-4" />
      <span className="text-xs font-bold uppercase tracking-wider">Ready</span>
    </div>
  );
};
