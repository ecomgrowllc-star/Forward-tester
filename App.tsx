
import React, { useState, useEffect, useMemo } from 'react';
import TradeForm from './components/TradeForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import DataManagement from './components/DataManagement';
import Settings from './components/Settings';
import StrategyFilter from './components/StrategyFilter';
import DateRangeFilter from './components/DateRangeFilter';
import { Trade, StrategyGroup, DEFAULT_TA_LEVELS, DEFAULT_ENTRY_TYPES, DEFAULT_STRATEGY_GROUPS } from './types';
import { LayoutDashboard, PlusCircle, LineChart, Settings as SettingsIcon, FileEdit } from 'lucide-react';
import { getSessionFromTime } from './services/analysisService';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_TRADES: Trade[] = [
  {
    id: 'sample-1',
    timestamp: '2025-12-02T21:46:00', // 09:46 PM
    session: 'S3',
    direction: 'Short',
    symbol: 'BTCUSDT',
    marketRegime: 'Trending Down',
    strategyNames: ['levels only'],
    taLevels: ['Daily Open', 'Weekly Open', 'Monthly Open'],
    delta: -1.0,
    oi: 150000,
    entryType: 'Type 1',
    exitType: 'TP Full',
    mfe: 7,
    mae: 0.5,
    notes: 'Clean rejection from monthly open confluence.',
    imageUrls: []
  },
  {
    id: 'sample-2',
    timestamp: '2025-12-02T09:44:00', // 09:44 AM
    session: 'S1',
    direction: 'Short',
    symbol: 'BTCUSDT',
    marketRegime: 'Trending Down',
    strategyNames: ['of sfp'],
    taLevels: ['Previous Day High'],
    delta: -10.0,
    oi: 450000,
    entryType: 'SFP',
    exitType: 'Manual',
    mfe: 5,
    mae: 0.5,
    notes: 'Classic SFP of PDH with high delta divergence.',
    imageUrls: []
  },
  {
    id: 'sample-3',
    timestamp: '2025-12-02T21:43:00', // 09:43 PM
    session: 'S3',
    direction: 'Long',
    symbol: 'BTCUSDT',
    marketRegime: 'Ranging / Chop',
    strategyNames: ['levels only'],
    taLevels: ['Previous Day High'],
    delta: 1.0,
    oi: 100000,
    entryType: 'Retest',
    exitType: 'Stop Loss',
    mfe: 2,
    mae: 1,
    notes: 'Choppy PA, early exit.',
    imageUrls: []
  },
  {
    id: 'sample-4',
    timestamp: '2025-12-02T13:42:00', // 01:42 PM
    session: 'S2',
    direction: 'Long',
    symbol: 'BTCUSDT',
    marketRegime: 'High Volatility',
    strategyNames: ['levels only'],
    taLevels: ['Daily Open', 'Naked POC'],
    delta: 21.0,
    oi: 800000,
    entryType: 'Type 2',
    exitType: 'TP 2',
    mfe: 5,
    mae: 1,
    notes: 'High volatility expansion trade.',
    imageUrls: []
  },
  {
    id: 'sample-5',
    timestamp: '2025-12-02T21:40:00', // 09:40 PM
    session: 'S3',
    direction: 'Short',
    symbol: 'BTCUSDT',
    marketRegime: 'Trending Down',
    strategyNames: ['of sfp', 'levels only'],
    taLevels: ['Naked POC', 'Daily Open', 'Previous Day Low', 'Fib 0.618'],
    delta: -1.0,
    oi: 150000,
    entryType: 'SFP',
    exitType: 'TP 1',
    mfe: 3,
    mae: 0.88,
    notes: 'Multiple confluences aligned perfectly.',
    imageUrls: []
  }
];

export default function App() {
  // 1. Trades - Lazy Initialization with Migration Logic
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const saved = localStorage.getItem('forwardtest_trades');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration logic
        const migrated = parsed.map((t: any) => {
          // Migrate single imageUrl to imageUrls array
          let imgs: string[] = t.imageUrls || [];
          if (imgs.length === 0 && t.imageUrl) {
            imgs = [t.imageUrl];
          }

          return {
            ...t,
            strategyNames: t.strategyNames || (t.strategyName ? [t.strategyName] : []),
            notes: t.notes || '',
            imageUrls: imgs,
            session: t.session || getSessionFromTime(t.timestamp), // Backfill session if missing
            direction: t.direction || 'Long', // Backfill direction if missing
            symbol: t.symbol || 'UNK', // Backfill symbol if missing
            marketRegime: t.marketRegime || 'Unknown' // Backfill marketRegime if missing
          };
        });
        
        return migrated;
      }
      // If no data found at all (first visit), load samples
      return SAMPLE_TRADES;
    } catch (e) {
      console.error("Failed to load trades", e);
      return SAMPLE_TRADES;
    }
  });

  const [view, setView] = useState<'dashboard' | 'entry' | 'settings'>('dashboard');
  const [hasDraft, setHasDraft] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  
  // 2. Settings - Lazy Initialization
  const [taLevels, setTaLevels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('forwardtest_taLevels');
      return saved ? JSON.parse(saved) : DEFAULT_TA_LEVELS;
    } catch (e) {
      return DEFAULT_TA_LEVELS;
    }
  });

  const [entryTypes, setEntryTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('forwardtest_entryTypes');
      return saved ? JSON.parse(saved) : DEFAULT_ENTRY_TYPES;
    } catch (e) {
      return DEFAULT_ENTRY_TYPES;
    }
  });

  const [strategyGroups, setStrategyGroups] = useState<StrategyGroup[]>(() => {
    try {
      const saved = localStorage.getItem('forwardtest_strategyGroups');
      return saved ? JSON.parse(saved) : DEFAULT_STRATEGY_GROUPS;
    } catch (e) {
      return DEFAULT_STRATEGY_GROUPS;
    }
  });
  
  // 3. Filters
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('forwardtest_strategies');
      if (saved) return JSON.parse(saved);
      // Default to empty (show all)
      return [];
    } catch (e) {
      return [];
    }
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('forwardtest_startDate') || '';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('forwardtest_endDate') || '';
  });

  // Derived state: Unique strategies (Flattened)
  const allStrategies = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => t.strategyNames.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [trades]);

  // Derived state: Filtered trades
  const filteredTrades = useMemo(() => {
    let result = trades;
    
    // 1. Filter by Strategy (Multi-strategy aware: Show if ANY of trade's strategies are selected)
    if (selectedStrategies.length > 0) {
      result = result.filter(t => 
        t.strategyNames.some(s => selectedStrategies.includes(s))
      );
    } 
    // CHANGE: If selectedStrategies is empty, we show ALL trades. 
    // Removed the "else if" block that was hiding data.

    // 2. Filter by Date Range
    if (startDate || endDate) {
      result = result.filter(t => {
        const tradeDate = new Date(t.timestamp).getTime();
        let validStart = true;
        let validEnd = true;
        if (startDate) validStart = tradeDate >= new Date(startDate).setHours(0, 0, 0, 0);
        if (endDate) validEnd = tradeDate <= new Date(endDate).setHours(23, 59, 59, 999);
        return validStart && validEnd;
      });
    }

    return result;
  }, [trades, selectedStrategies, startDate, endDate]);

  // Persistence
  useEffect(() => { localStorage.setItem('forwardtest_trades', JSON.stringify(trades)); }, [trades]);
  useEffect(() => { localStorage.setItem('forwardtest_taLevels', JSON.stringify(taLevels)); }, [taLevels]);
  useEffect(() => { localStorage.setItem('forwardtest_entryTypes', JSON.stringify(entryTypes)); }, [entryTypes]);
  useEffect(() => { localStorage.setItem('forwardtest_strategyGroups', JSON.stringify(strategyGroups)); }, [strategyGroups]);
  useEffect(() => { localStorage.setItem('forwardtest_strategies', JSON.stringify(selectedStrategies)); }, [selectedStrategies]);
  useEffect(() => { localStorage.setItem('forwardtest_startDate', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('forwardtest_endDate', endDate); }, [endDate]);

  // Check for draft on mount and view change
  useEffect(() => {
    const checkDraft = () => {
      const draft = localStorage.getItem('forwardtest_draft_trade');
      setHasDraft(!!draft);
    };
    checkDraft();
    window.addEventListener('storage', checkDraft);
    return () => window.removeEventListener('storage', checkDraft);
  }, [view, trades]);

  const handleSaveTrade = (trade: Trade) => {
    setTrades((prev) => {
        // Check if updating existing trade
        const index = prev.findIndex(t => t.id === trade.id);
        if (index >= 0) {
            const updated = [...prev];
            updated[index] = trade;
            return updated;
        }
        // Else add new
        return [trade, ...prev];
    });

    // Auto-select new strategies so they appear immediately if we are filtering
    const newStrats = trade.strategyNames.filter(s => !selectedStrategies.includes(s));
    if (newStrats.length > 0 && selectedStrategies.length > 0) {
        // Only append if user has an active filter selection. 
        setSelectedStrategies(prev => [...prev, ...newStrats]);
    }
    
    // Clear states
    if (!editingTrade) {
        localStorage.removeItem('forwardtest_draft_trade');
        setHasDraft(false);
    }
    setEditingTrade(null);
    setView('dashboard');
  };

  const handleEditTrade = (trade: Trade) => {
      setEditingTrade(trade);
      setView('entry');
  };
  
  const handleLoadSamples = () => {
      if (confirm("This will add 5 sample trades to your journal. Continue?")) {
          // Prevent duplicates by ID
          const existingIds = new Set(trades.map(t => t.id));
          const newSamples = SAMPLE_TRADES.filter(t => !existingIds.has(t.id));
          
          if (newSamples.length === 0) {
              alert("Sample trades already exist in your journal.");
          } else {
              setTrades(prev => [...newSamples, ...prev]);
              
              // CRITICAL: Clear all filters to ensure new data is visible immediately
              setSelectedStrategies([]);
              setStartDate('');
              setEndDate('');
              
              alert(`Added ${newSamples.length} sample trades.`);
          }
      }
  };

  const handleToggleStrategy = (strategy: string) => {
    if (selectedStrategies.includes(strategy)) {
      setSelectedStrategies(prev => prev.filter(s => s !== strategy));
    } else {
      setSelectedStrategies(prev => [...prev, strategy]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-violet-900/10 rounded-full blur-[100px]"></div>
      </div>

      <nav className="fixed top-0 left-0 h-full w-20 md:w-64 bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-800 flex flex-col z-20 transition-all">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
             <LineChart className="w-5 h-5 text-white" />
          </div>
          <span className="hidden md:block font-bold text-lg text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            ForwardTest
          </span>
        </div>
        
        <div className="flex-1 py-6 space-y-2 px-3">
          <button onClick={() => { setView('dashboard'); setEditingTrade(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${view === 'dashboard' ? 'bg-zinc-800 text-indigo-400 border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}`}>
            <LayoutDashboard className={`w-5 h-5 transition-colors ${view === 'dashboard' ? 'text-indigo-400' : 'group-hover:text-zinc-100'}`} />
            <span className="hidden md:block font-medium">Dashboard</span>
          </button>
          <button onClick={() => { setView('entry'); setEditingTrade(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${view === 'entry' && !editingTrade ? 'bg-zinc-800 text-indigo-400 border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}`}>
            <PlusCircle className={`w-5 h-5 transition-colors ${view === 'entry' && !editingTrade ? 'text-indigo-400' : 'group-hover:text-zinc-100'}`} />
            <span className="hidden md:block font-medium">Log Trade</span>
          </button>
          <button onClick={() => { setView('settings'); setEditingTrade(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${view === 'settings' ? 'bg-zinc-800 text-indigo-400 border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}`}>
            <SettingsIcon className={`w-5 h-5 transition-colors ${view === 'settings' ? 'text-indigo-400' : 'group-hover:text-zinc-100'}`} />
            <span className="hidden md:block font-medium">Settings</span>
          </button>
        </div>

        <div className="p-6 border-t border-zinc-800">
           <div className="bg-zinc-800/50 rounded-lg p-3 text-xs border border-zinc-700/50">
              <div className="flex justify-between items-center mb-1 text-zinc-400">
                <span>Trades Logged</span>
                <span className="font-mono text-indigo-400">{trades.length}</span>
              </div>
              <div className="w-full bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(trades.length, 100)}%` }}></div>
              </div>
           </div>
        </div>
      </nav>

      <main className="ml-20 md:ml-64 p-6 md:p-12 max-w-7xl mx-auto relative z-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    {view === 'dashboard' ? 'Analytics Dashboard' : view === 'entry' ? (editingTrade ? 'Edit Trade' : 'New Trade Entry') : 'Configuration'}
                </h1>
                <p className="text-zinc-400 text-sm max-w-xl">
                    {view === 'dashboard' ? 'Real-time forward testing analytics. Filter strategies to analyze them alone or in combination.' 
                     : view === 'entry' ? 'Log execution details, market conditions, and outcome metrics.'
                     : 'Manage your strategy vocabulary, groups, TA levels, and entry models.'}
                </p>
            </div>
            
            {/* Resume Draft Button - Only show if NOT editing */}
            {view === 'dashboard' && hasDraft && !editingTrade && (
              <button 
                onClick={() => setView('entry')}
                className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-amber-500/5 animate-pulse"
              >
                <FileEdit className="w-4 h-4" />
                Resume Unsaved Draft
              </button>
            )}
        </header>

        {view === 'entry' && (
           <TradeForm 
             initialData={editingTrade || undefined}
             onAddTrade={handleSaveTrade} 
             onClose={() => { setView('dashboard'); setEditingTrade(null); }} 
             availableTaLevels={taLevels}
             availableEntryTypes={entryTypes}
             availableStrategies={allStrategies}
            />
        )}

        {view === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <StrategyFilter 
                strategies={allStrategies}
                strategyGroups={strategyGroups}
                selectedStrategies={selectedStrategies}
                onToggle={handleToggleStrategy}
                onSelectAll={() => setSelectedStrategies(allStrategies)}
                onClear={() => setSelectedStrategies([])}
              />
              <div className="lg:mt-[26px]">
                <DateRangeFilter 
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onClear={() => { setStartDate(''); setEndDate(''); }}
                />
              </div>
            </div>
            
            <AnalyticsDashboard trades={filteredTrades} />
            <DataManagement 
                displayTrades={filteredTrades} 
                allTrades={trades} 
                setAllTrades={setTrades} 
                onEditTrade={handleEditTrade}
                onLoadSamples={handleLoadSamples}
            />
          </>
        )}

        {view === 'settings' && (
          <Settings 
            taLevels={taLevels} setTaLevels={setTaLevels}
            entryTypes={entryTypes} setEntryTypes={setEntryTypes}
            strategyGroups={strategyGroups} setStrategyGroups={setStrategyGroups}
            allStrategies={allStrategies}
          />
        )}
      </main>
    </div>
  );
}
