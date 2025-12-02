import React from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}) => {
  const hasFilter = startDate || endDate;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl mb-6">
      <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold uppercase tracking-wider min-w-[120px]">
        <Calendar className="w-4 h-4 text-indigo-400" />
        <span>Date Range</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <div className="relative group">
          <label className="absolute -top-2 left-2 bg-zinc-900 px-1 text-[10px] text-zinc-500 font-medium group-focus-within:text-indigo-400 transition-colors">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-36 h-9"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <span className="text-zinc-600">-</span>

        <div className="relative group">
          <label className="absolute -top-2 left-2 bg-zinc-900 px-1 text-[10px] text-zinc-500 font-medium group-focus-within:text-indigo-400 transition-colors">
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-36 h-9"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {hasFilter && (
          <button
            onClick={onClear}
            className="ml-auto sm:ml-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400 bg-zinc-800 hover:bg-zinc-800/80 px-3 py-2 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" />
            Clear Dates
          </button>
        )}
      </div>
    </div>
  );
};

export default DateRangeFilter;