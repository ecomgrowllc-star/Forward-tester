
import React, { useMemo, useState, useEffect } from 'react';
import { Trade, DeltaCategory } from '../types';
import {
  calculateSingleFactorStats,
  calculatePairStats,
  getDeltaCategory,
  getBestLevelForCondition,
  calculateHeatmapStats,
  calculateSessionStats,
  calculateSessionLevelHeatmap,
  calculateDeltaLevelHeatmap,
  calculateDuration
} from '../services/analysisService';
import { generateTradeInsight } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import { BrainCircuit, Activity, Layers, Target, TrendingUp, Sparkles, FilterX, Table, Grid3X3, ScatterChart as ScatterIcon, Clock, Flame, TrendingDown, Hourglass, Coins } from 'lucide-react';

interface AnalyticsDashboardProps {
  trades: Trade[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ trades }) => {
  const [analysisDirection, setAnalysisDirection] = useState<'All' | 'Long' | 'Short'>('All');
  const [analysisAsset, setAnalysisAsset] = useState<string>('All');
  const [aiInsight, setAiInsight] = useState<string | null>(() => {
    return localStorage.getItem('forwardtest_ai_insight');
  });
  const [loadingAi, setLoadingAi] = useState(false);

  // Get unique assets from trades
  const uniqueAssets = useMemo(() => {
      const assets = new Set(trades.map(t => t.symbol || 'UNK'));
      return ['All', ...Array.from(assets).sort()];
  }, [trades]);

  const displayedTrades = useMemo(() => {
      let result = trades;
      if (analysisDirection !== 'All') {
          result = result.filter(t => t.direction === analysisDirection);
      }
      if (analysisAsset !== 'All') {
          result = result.filter(t => t.symbol === analysisAsset);
      }
      return result;
  }, [trades, analysisDirection, analysisAsset]);

  const singleFactorStats = useMemo(() => calculateSingleFactorStats(displayedTrades), [displayedTrades]);
  const sessionStats = useMemo(() => calculateSessionStats(displayedTrades), [displayedTrades]);
  const pairStats = useMemo(() => calculatePairStats(displayedTrades), [displayedTrades]);
  const heatmapStats = useMemo(() => calculateHeatmapStats(displayedTrades), [displayedTrades]);
  const sessionLevelStats = useMemo(() => calculateSessionLevelHeatmap(displayedTrades), [displayedTrades]);
  const deltaLevelStats = useMemo(() => calculateDeltaLevelHeatmap(displayedTrades), [displayedTrades]);
  
  const assetStats = useMemo(() => {
      // Calculate asset stats from trades *filtered by direction* only, not by asset itself (to show list)
      const baseTrades = analysisDirection === 'All' ? trades : trades.filter(t => t.direction === analysisDirection);
      const map = new Map<string, { mfe: number; count: number }>();
      baseTrades.forEach(t => {
          const sym = t.symbol || 'UNK';
          const curr = map.get(sym) || { mfe: 0, count: 0 };
          map.set(sym, { mfe: curr.mfe + t.mfe, count: curr.count + 1 });
      });
      return Array.from(map.entries()).map(([symbol, data]) => ({
          symbol,
          avgMfe: data.mfe / data.count,
          count: data.count
      })).sort((a, b) => b.avgMfe - a.avgMfe);
  }, [trades, analysisDirection]);

  const durationData = useMemo(() => {
      return displayedTrades
        .filter(t => t.exitTimestamp)
        .map(t => ({
            duration: calculateDuration(t.timestamp, t.exitTimestamp),
            mfe: t.mfe,
            id: t.id
        }));
  }, [displayedTrades]);
  
  const scatterData = useMemo(() => {
    return displayedTrades.map(t => ({
      delta: t.delta,
      mfe: t.mfe,
      entryType: t.entryType,
      id: t.id
    }));
  }, [displayedTrades]);
  
  const bestHighDeltaHighOI = useMemo(() => {
    return getBestLevelForCondition(displayedTrades, (t, threshold) => {
      const cat = getDeltaCategory(t.delta);
      return (cat === DeltaCategory.HIGH || cat === DeltaCategory.HIGH_PLUS) && t.oi > threshold;
    });
  }, [displayedTrades]);

  const bestLowDeltaLowOI = useMemo(() => {
    return getBestLevelForCondition(displayedTrades, (t, threshold) => {
      const cat = getDeltaCategory(t.delta);
      return (cat === DeltaCategory.LOW) && t.oi <= threshold; 
    });
  }, [displayedTrades]);

  const mostCommonEntry = useMemo(() => {
    if (displayedTrades.length === 0) return 'N/A';
    
    const counts: Record<string, number> = {};
    displayedTrades.forEach(t => {
      counts[t.entryType] = (counts[t.entryType] || 0) + 1;
    });

    let maxEntry = '';
    let maxCount = 0;

    Object.entries(counts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxEntry = type;
      }
    });

    return maxEntry ? `${maxEntry} (${maxCount})` : 'N/A';
  }, [displayedTrades]);

  useEffect(() => {
    if (aiInsight) {
      localStorage.setItem('forwardtest_ai_insight', aiInsight);
    }
  }, [aiInsight]);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const insight = await generateTradeInsight(singleFactorStats, pairStats, displayedTrades);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
        <div className="bg-zinc-800 p-4 rounded-full mb-4 shadow-xl">
           <FilterX className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No Data Available</h3>
        <p className="max-w-md text-center text-sm">
            Current filters returned 0 trades. Try selecting more strategies or log a new trade.
        </p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, sub, colorClass }: any) => (
    <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="relative z-10">
            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colorClass.replace('text-', 'text-')}`} /> {title}
            </h3>
            <p className="text-2xl font-bold text-white truncate font-mono">
                {value}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animation-fade-in">
        <div className="flex flex-wrap justify-end gap-4">
            {/* Asset Filter */}
            <div className="bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 inline-flex items-center gap-2 px-3">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider"><Coins className="w-3 h-3 inline mb-0.5"/> Asset:</span>
                <select 
                    value={analysisAsset} 
                    onChange={(e) => setAnalysisAsset(e.target.value)}
                    className="bg-transparent text-xs font-medium text-zinc-300 outline-none cursor-pointer hover:text-white"
                >
                    {uniqueAssets.map(asset => <option key={asset} value={asset}>{asset}</option>)}
                </select>
            </div>

            <div className="bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 inline-flex">
                {(['All', 'Long', 'Short'] as const).map(dir => (
                    <button
                        key={dir}
                        onClick={() => setAnalysisDirection(dir)}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${analysisDirection === dir 
                            ? (dir === 'Long' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : dir === 'Short' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'bg-zinc-700 text-white') 
                            : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {dir === 'Long' && <TrendingUp className="w-3 h-3"/>}
                        {dir === 'Short' && <TrendingDown className="w-3 h-3"/>}
                        {dir}
                    </button>
                ))}
            </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            icon={Target} 
            title="High Delta Edge" 
            value={bestHighDeltaHighOI ? bestHighDeltaHighOI.level : 'N/A'}
            sub="Best performing level with High Delta & High OI"
            colorClass="text-emerald-500"
        />
        <StatCard 
            icon={Target} 
            title="Low Delta Edge" 
            value={bestLowDeltaLowOI ? bestLowDeltaLowOI.level : 'N/A'}
            sub="Best performing level with Low Delta & Low OI"
            colorClass="text-blue-500"
        />
        <StatCard 
            icon={Layers} 
            title="Best Pair" 
            value={pairStats.length > 0 ? `${pairStats[0].pair[0]} + ${pairStats[0].pair[1]}` : 'N/A'}
            sub="Highest Avg MFE Confluence"
            colorClass="text-amber-500"
        />
        <StatCard 
            icon={TrendingUp} 
            title="Top Setup" 
            value={mostCommonEntry}
            sub="Most frequent entry mechanism"
            colorClass="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" /> Asset Leaderboard
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {assetStats.length === 0 && <p className="text-zinc-500 text-sm">No asset data available.</p>}
                  {assetStats.map((stat, i) => (
                      <div key={stat.symbol} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                          <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-zinc-500 w-4">#{i+1}</span>
                              <span className="font-bold text-white text-sm">{stat.symbol}</span>
                          </div>
                          <div className="text-right">
                              <div className="text-emerald-400 font-mono font-bold text-sm">{stat.avgMfe.toFixed(2)}%</div>
                              <div className="text-[10px] text-zinc-500">{stat.count} trades</div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Hourglass className="w-5 h-5 text-amber-400" /> Duration vs MFE
                </h3>
                <div className="h-64 w-full">
                    {durationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} horizontal={false} />
                                <XAxis 
                                    type="number" 
                                    dataKey="duration" 
                                    name="Duration (mins)" 
                                    stroke="#71717a" 
                                    tick={{fontSize: 11, fill: '#a1a1aa'}}
                                    label={{ value: 'Duration (Minutes)', position: 'insideBottom', offset: -10, fill: '#52525b', fontSize: 10 }}
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="mfe" 
                                    name="MFE" 
                                    stroke="#71717a" 
                                    tick={{fontSize: 11, fill: '#a1a1aa'}}
                                    label={{ value: 'MFE %', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10 }}
                                />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#e4e4e7' }}
                                    formatter={(value: any, name: any) => [name === 'Duration (mins)' ? `${Math.round(value)}m` : `${value}%`, name]}
                                />
                                <Scatter name="Duration" data={durationData} fill="#f59e0b" fillOpacity={0.6} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-lg">
                            Log Exit Times to see Duration Analytics
                        </div>
                    )}
                </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Performance by Level (Avg MFE vs MAE)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={singleFactorStats.slice(0, 8)}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                    dataKey="level" 
                    stroke="#71717a" 
                    tick={{fontSize: 11, fill: '#a1a1aa'}} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <YAxis 
                    stroke="#71717a" 
                    tick={{fontSize: 11, fill: '#a1a1aa'}} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{fill: '#27272a', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="avgMfe" name="Avg MFE %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgMae" name="Avg MAE %" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <BrainCircuit className="w-5 h-5 text-purple-400" />
               AI Analyst
             </h3>
             <button
               onClick={handleGenerateInsight}
               disabled={loadingAi}
               className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 px-3 py-1.5 rounded-full transition-all flex items-center gap-2 disabled:opacity-50"
             >
               {loadingAi ? (
                 <span className="flex items-center gap-2">Thinking...</span>
               ) : (
                 <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-purple-400" /> Analyze</span>
               )}
             </button>
          </div>
          
          <div className="flex-1 bg-zinc-950/50 rounded-lg p-4 overflow-y-auto max-h-[300px] text-sm text-zinc-300 leading-relaxed border border-zinc-800/50 shadow-inner font-mono">
            {aiInsight ? (
              <div className="markdown-prose whitespace-pre-wrap">{aiInsight}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 gap-3">
                <BrainCircuit className="w-8 h-8 opacity-20" />
                <p className="text-xs max-w-[200px]">
                  Click "Analyze" to have Gemini identify hidden patterns in your selected strategies.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-emerald-400" />
                Heatmap: Entry vs TA Level
            </h3>
            
            {heatmapStats.xLabels.length > 0 && heatmapStats.yLabels.length > 0 ? (
                <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                        <div className="grid gap-1" style={{ 
                            gridTemplateColumns: `auto repeat(${heatmapStats.xLabels.length}, 1fr)` 
                        }}>
                            <div className="h-10"></div>
                            {heatmapStats.xLabels.map(entry => (
                                <div key={entry} className="h-10 flex items-center justify-center text-[10px] font-semibold text-zinc-500 uppercase rotate-0 text-center px-1 break-words leading-tight bg-zinc-900/50 rounded">
                                    {entry}
                                </div>
                            ))}
                            {heatmapStats.yLabels.map(level => (
                                <React.Fragment key={level}>
                                    <div className="flex items-center justify-end pr-3 text-xs font-medium text-zinc-400 h-10 truncate bg-zinc-900/30 rounded-l mb-1">
                                        {level}
                                    </div>
                                    {heatmapStats.xLabels.map(entry => {
                                        const key = `${level}::${entry}`;
                                        const cell = heatmapStats.grid.get(key);
                                        const intensity = cell ? Math.min(1, Math.max(0.1, cell.avgMfe / heatmapStats.maxMfe)) : 0;
                                        
                                        return (
                                            <div 
                                                key={key} 
                                                className="h-10 rounded relative group transition-all hover:scale-105 hover:z-10 hover:shadow-lg border border-transparent hover:border-white/20 mb-1"
                                                style={{ 
                                                    backgroundColor: cell ? `rgba(16, 185, 129, ${intensity})` : 'rgba(39, 39, 42, 0.3)',
                                                }}
                                            >
                                                {cell && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                                                        {cell.avgMfe.toFixed(1)}%
                                                    </div>
                                                )}
                                                {cell && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl text-xs z-20 hidden group-hover:block pointer-events-none">
                                                        <div className="text-zinc-400 mb-1">{entry} @ {level}</div>
                                                        <div className="text-emerald-400 font-bold">Avg MFE: {cell.avgMfe.toFixed(2)}%</div>
                                                        <div className="text-zinc-500">Count: {cell.count}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 italic text-sm border-2 border-dashed border-zinc-800 rounded-lg">
                    Not enough data intersection to build heatmap.
                </div>
            )}
        </div>

        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" />
                Heatmap: Session vs TA Level
            </h3>
            
            {sessionLevelStats.xLabels.length > 0 && sessionLevelStats.yLabels.length > 0 ? (
                <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                        <div className="grid gap-1" style={{ 
                            gridTemplateColumns: `auto repeat(${sessionLevelStats.xLabels.length}, 1fr)` 
                        }}>
                            <div className="h-10"></div>
                            {sessionLevelStats.xLabels.map(session => (
                                <div key={session} className="h-10 flex items-center justify-center text-[10px] font-semibold text-zinc-500 uppercase rotate-0 text-center px-1 break-words leading-tight bg-zinc-900/50 rounded">
                                    {session}
                                </div>
                            ))}
                            {sessionLevelStats.yLabels.map(level => (
                                <React.Fragment key={level}>
                                    <div className="flex items-center justify-end pr-3 text-xs font-medium text-zinc-400 h-10 truncate bg-zinc-900/30 rounded-l mb-1">
                                        {level}
                                    </div>
                                    {sessionLevelStats.xLabels.map(session => {
                                        const key = `${level}::${session}`;
                                        const cell = sessionLevelStats.grid.get(key);
                                        const intensity = cell ? Math.min(1, Math.max(0.1, cell.avgMfe / sessionLevelStats.maxMfe)) : 0;
                                        
                                        return (
                                            <div 
                                                key={key} 
                                                className="h-10 rounded relative group transition-all hover:scale-105 hover:z-10 hover:shadow-lg border border-transparent hover:border-white/20 mb-1"
                                                style={{ 
                                                    backgroundColor: cell ? `rgba(14, 165, 233, ${intensity})` : 'rgba(39, 39, 42, 0.3)', 
                                                }}
                                            >
                                                {cell && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                                                        {cell.avgMfe.toFixed(1)}%
                                                    </div>
                                                )}
                                                {cell && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl text-xs z-20 hidden group-hover:block pointer-events-none">
                                                        <div className="text-zinc-400 mb-1">{session} @ {level}</div>
                                                        <div className="text-sky-400 font-bold">Avg MFE: {cell.avgMfe.toFixed(2)}%</div>
                                                        <div className="text-zinc-500">Count: {cell.count}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 italic text-sm border-2 border-dashed border-zinc-800 rounded-lg">
                    Not enough data intersection to build heatmap.
                </div>
            )}
        </div>

        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl overflow-hidden lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Flame className="w-5 h-5 text-violet-400" />
                Heatmap: Delta vs TA Level
            </h3>
            
            {deltaLevelStats.xLabels.length > 0 && deltaLevelStats.yLabels.length > 0 ? (
                <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                        <div className="grid gap-1" style={{ 
                            gridTemplateColumns: `auto repeat(${deltaLevelStats.xLabels.length}, 1fr)` 
                        }}>
                            <div className="h-10"></div>
                            {deltaLevelStats.xLabels.map(delta => (
                                <div key={delta} className="h-10 flex items-center justify-center text-[10px] font-semibold text-zinc-500 uppercase rotate-0 text-center px-1 break-words leading-tight bg-zinc-900/50 rounded">
                                    {delta}
                                </div>
                            ))}
                            {deltaLevelStats.yLabels.map(level => (
                                <React.Fragment key={level}>
                                    <div className="flex items-center justify-end pr-3 text-xs font-medium text-zinc-400 h-10 truncate bg-zinc-900/30 rounded-l mb-1">
                                        {level}
                                    </div>
                                    {deltaLevelStats.xLabels.map(delta => {
                                        const key = `${level}::${delta}`;
                                        const cell = deltaLevelStats.grid.get(key);
                                        const intensity = cell ? Math.min(1, Math.max(0.1, cell.avgMfe / deltaLevelStats.maxMfe)) : 0;
                                        
                                        return (
                                            <div 
                                                key={key} 
                                                className="h-10 rounded relative group transition-all hover:scale-105 hover:z-10 hover:shadow-lg border border-transparent hover:border-white/20 mb-1"
                                                style={{ 
                                                    backgroundColor: cell ? `rgba(139, 92, 246, ${intensity})` : 'rgba(39, 39, 42, 0.3)', 
                                                }}
                                            >
                                                {cell && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                                                        {cell.avgMfe.toFixed(1)}%
                                                    </div>
                                                )}
                                                {cell && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl text-xs z-20 hidden group-hover:block pointer-events-none">
                                                        <div className="text-zinc-400 mb-1">{delta} @ {level}</div>
                                                        <div className="text-violet-400 font-bold">Avg MFE: {cell.avgMfe.toFixed(2)}%</div>
                                                        <div className="text-zinc-500">Count: {cell.count}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 italic text-sm border-2 border-dashed border-zinc-800 rounded-lg">
                    Not enough data intersection to build heatmap.
                </div>
            )}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ScatterIcon className="w-5 h-5 text-pink-400" />
                Correlation: Delta vs MFE
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} horizontal={false} />
                        <XAxis 
                            type="number" 
                            dataKey="delta" 
                            name="Delta" 
                            stroke="#71717a" 
                            tick={{fontSize: 11, fill: '#a1a1aa'}}
                            label={{ value: 'Delta', position: 'insideBottom', offset: -10, fill: '#52525b', fontSize: 10 }}
                        />
                        <YAxis 
                            type="number" 
                            dataKey="mfe" 
                            name="MFE" 
                            stroke="#71717a" 
                            tick={{fontSize: 11, fill: '#a1a1aa'}}
                            label={{ value: 'MFE %', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10 }}
                        />
                        <ZAxis type="number" dataKey="id" range={[50, 50]} /> 
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                            itemStyle={{ color: '#e4e4e7' }}
                            formatter={(value: any, name: any, props: any) => {
                                if (name === 'Delta') return [value, 'Delta'];
                                if (name === 'MFE') return [`${value}%`, 'MFE'];
                                return [value, name];
                            }}
                            labelFormatter={() => ''}
                        />
                        <Scatter name="Trades" data={scatterData} fill="#f472b6" fillOpacity={0.6} stroke="#be185d" strokeWidth={1} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            Performance by Session (Overview)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sessionStats}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                    dataKey="level" 
                    stroke="#71717a" 
                    tick={{fontSize: 12, fill: '#a1a1aa'}} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <YAxis 
                    stroke="#71717a" 
                    tick={{fontSize: 11, fill: '#a1a1aa'}} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{fill: '#27272a', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="avgMfe" name="Avg MFE %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgMae" name="Avg MAE %" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>
      </div>
      
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Top Confluence Pairs
        </h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase bg-zinc-900/80 text-zinc-500 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Level 1</th>
                <th className="px-6 py-4">Level 2</th>
                <th className="px-6 py-4 text-right">Avg MFE %</th>
                <th className="px-6 py-4 text-right">Occurrence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {pairStats.slice(0, 10).map((stat, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-indigo-300">{stat.pair[0]}</td>
                  <td className="px-6 py-4 font-medium text-indigo-300">{stat.pair[1]}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400">{stat.avgMfe.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right font-mono text-zinc-400">{stat.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
