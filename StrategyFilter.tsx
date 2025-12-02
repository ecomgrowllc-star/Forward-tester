import React, { useMemo } from 'react';
import { Filter, Check, Folder } from 'lucide-react';
import { StrategyGroup } from '../types';

interface StrategyFilterProps {
  strategies: string[];
  strategyGroups: StrategyGroup[];
  selectedStrategies: string[];
  onToggle: (strategy: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

const StrategyFilter: React.FC<StrategyFilterProps> = ({
  strategies,
  strategyGroups,
  selectedStrategies,
  onToggle,
  onSelectAll,
  onClear,
}) => {
  if (strategies.length === 0) return null;

  const allSelected = strategies.length > 0 && selectedStrategies.length === strategies.length;

  // Organize strategies into groups for display
  const groupedDisplay = useMemo(() => {
    const grouped = new Map<string, string[]>(); // GroupID -> Strategies[]
    const ungrouped: string[] = [];
    const strategyToGroupMap = new Map<string, string>(); // Strategy -> GroupID (for dedup)

    // Map strategies to first matching group
    strategyGroups.forEach(g => {
        const stratsInGroup = g.strategies.filter(s => strategies.includes(s));
        if (stratsInGroup.length > 0) {
            grouped.set(g.id, stratsInGroup);
            stratsInGroup.forEach(s => strategyToGroupMap.set(s, g.id));
        }
    });

    // Find ungrouped
    strategies.forEach(s => {
        if (!strategyToGroupMap.has(s)) {
            ungrouped.push(s);
        }
    });

    return { grouped, ungrouped };
  }, [strategies, strategyGroups]);

  const toggleGroup = (groupId: string) => {
      const groupStrats = groupedDisplay.grouped.get(groupId) || [];
      const allInGroupSelected = groupStrats.every(s => selectedStrategies.includes(s));
      
      if (allInGroupSelected) {
          // Deselect all in group
          groupStrats.forEach(s => {
             if (selectedStrategies.includes(s)) onToggle(s);
          });
      } else {
          // Select all in group
           groupStrats.forEach(s => {
             if (!selectedStrategies.includes(s)) onToggle(s);
          });
      }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          Filter Analysis by Strategy
        </h3>
        <div className="flex gap-2 text-xs">
          <button onClick={onSelectAll} className={`px-3 py-1 rounded hover:bg-zinc-800 transition-colors ${allSelected ? 'text-indigo-400 font-medium' : 'text-zinc-500'}`}>
            Select All
          </button>
          <span className="text-zinc-700">|</span>
          <button onClick={onClear} className="px-3 py-1 rounded hover:bg-zinc-800 text-zinc-500 transition-colors hover:text-rose-400">
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Render Groups */}
        {strategyGroups.map(group => {
            const strats = groupedDisplay.grouped.get(group.id);
            if (!strats) return null;
            
            return (
                <div key={group.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-3">
                    <button 
                        onClick={() => toggleGroup(group.id)}
                        className="text-xs font-bold text-zinc-400 mb-2 flex items-center gap-2 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        <Folder className="w-3 h-3 text-amber-500/80" /> {group.name}
                    </button>
                    <div className="flex flex-wrap gap-2">
                        {strats.map(strategy => {
                            const isSelected = selectedStrategies.includes(strategy);
                            return (
                                <button key={strategy} onClick={() => onToggle(strategy)} className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 border select-none ${isSelected ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                                    {strategy}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )
        })}

        {/* Render Ungrouped */}
        {groupedDisplay.ungrouped.length > 0 && (
             <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-3">
                <div className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Ungrouped</div>
                <div className="flex flex-wrap gap-2">
                    {groupedDisplay.ungrouped.map(strategy => {
                        const isSelected = selectedStrategies.includes(strategy);
                        return (
                            <button key={strategy} onClick={() => onToggle(strategy)} className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 border select-none ${isSelected ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
                                {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                                {strategy}
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StrategyFilter;