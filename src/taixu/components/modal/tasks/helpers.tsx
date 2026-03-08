import { Compass, Flag, Heart } from 'lucide-react';
import React from 'react';

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case '主线任务':
      return <Flag className="w-4 h-4" />;
    case '支线任务':
      return <Compass className="w-4 h-4" />;
    case '情趣任务':
      return <Heart className="w-4 h-4" />;
    default:
      return null;
  }
};

export const getCategoryColor = (category: string) => {
  switch (category) {
    case '主线任务':
      return 'text-amber-600 bg-amber-50 border-amber-100';
    case '支线任务':
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case '情趣任务':
      return 'text-rose-600 bg-rose-50 border-rose-100';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};
