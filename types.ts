
export interface Trade {
  id: string;
  timestamp: string;
  exitTimestamp?: string; // New: Exit Time
  session?: string; 
  direction: 'Long' | 'Short'; 
  symbol: string; // New: Ticker
  marketRegime: string; // New: Market Context
  strategyNames: string[];
  taLevels: string[]; 
  delta: number;
  oi: number;
  entryType: string; 
  exitType: string;
  mfe: number;
  mae: number;
  notes?: string;
  imageUrls: string[]; 
}

export enum DeltaCategory {
  HIGH_PLUS = 'High++',
  HIGH = 'High',
  LOW = 'Low',
}

export interface AnalysisResult {
  level: string;
  avgMfe: number;
  avgMae: number;
  medianMfe: number;
  medianMae: number;
  count: number;
  score: number;
}

export interface PairAnalysisResult {
  pair: [string, string];
  avgMfe: number;
  count: number;
}

export interface HeatmapData {
  xLabels: string[]; // Entry Types
  yLabels: string[]; // TA Levels
  grid: Map<string, { avgMfe: number; count: number }>; // Key: "Level::EntryType"
  maxMfe: number;
}

export interface StrategyGroup {
  id: string;
  name: string;
  strategies: string[];
}

export const DEFAULT_TA_LEVELS = [
  'Daily Open',
  'Weekly Open',
  'Monthly Open',
  'Fib 0.618',
  'Fib 0.5',
  'Fib 0.382',
  'POC',
  'VAL',
  'VAH',
  'Previous Day High',
  'Previous Day Low',
  'Golden Pocket',
  'Naked POC',
];

export const DEFAULT_ENTRY_TYPES = [
  'Type 1',
  'Type 2',
  'SFP',
  'Breakout',
  'Retest'
];

export const DEFAULT_STRATEGY_GROUPS: StrategyGroup[] = [
  { id: '1', name: 'Trend Following', strategies: [] },
  { id: '2', name: 'Reversals', strategies: [] },
  { id: '3', name: 'Scalps', strategies: [] }
];

export const DEFAULT_MARKET_REGIMES = [
  'Trending Up',
  'Trending Down',
  'Ranging / Chop',
  'High Volatility',
  'Low Volatility / Compression',
  'News Event'
];
