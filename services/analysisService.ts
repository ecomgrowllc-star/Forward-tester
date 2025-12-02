
import { Trade, DeltaCategory, AnalysisResult, PairAnalysisResult, HeatmapData } from '../types';

// Helper to categorize Delta (Absolute values)
export const getDeltaCategory = (delta: number): DeltaCategory => {
  const absDelta = Math.abs(delta);
  
  if (absDelta > 20) return DeltaCategory.HIGH_PLUS; // > +/- 20
  if (absDelta > 7) return DeltaCategory.HIGH;      // +/- 7 to +/- 20
  return DeltaCategory.LOW;                         // 0 to +/- 7
};

// Helper to determine Session from Timestamp
export const getSessionFromTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const hour = date.getHours();

  // S1: 5am - 11am (05:00 - 10:59)
  if (hour >= 5 && hour < 11) return 'S1';
  
  // S2: 11am - 5pm (11:00 - 16:59)
  if (hour >= 11 && hour < 17) return 'S2';
  
  // S3: 5pm - 11pm (17:00 - 22:59)
  if (hour >= 17 && hour < 23) return 'S3';
  
  // IS4: 1am - 5am (01:00 - 04:59) - Prioritize specific subset first
  if (hour >= 1 && hour < 5) return 'IS4';

  // S4: 11pm - 5am (Remaining hours: 23, 00)
  return 'S4';
};

// Calculate Duration in Minutes
export const calculateDuration = (entryTime: string, exitTime?: string): number => {
    if (!exitTime) return 0;
    const start = new Date(entryTime).getTime();
    const end = new Date(exitTime).getTime();
    return Math.max(0, (end - start) / (1000 * 60)); // Minutes
};

// Format Duration string
export const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '-';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
};

// Calculate percentile for OI
export const getOIPercentileValue = (trades: Trade[], percentile: number): number => {
  if (trades.length === 0) return 0;
  const ois = trades.map((t) => t.oi).sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * ois.length);
  return ois[Math.min(index, ois.length - 1)];
};

// Helper to calculate median
const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  } else {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
};

// Single Factor Analysis
export const calculateSingleFactorStats = (trades: Trade[]): AnalysisResult[] => {
  const statsMap = new Map<string, { mfes: number[]; maes: number[] }>();

  trades.forEach((trade) => {
    const uniqueLevels = new Set(trade.taLevels.filter((l) => l !== 'None' && l !== ''));
    uniqueLevels.forEach((level) => {
      const current = statsMap.get(level) || { mfes: [], maes: [] };
      current.mfes.push(trade.mfe);
      current.maes.push(trade.mae);
      statsMap.set(level, current);
    });
  });

  const results: AnalysisResult[] = [];
  statsMap.forEach((val, key) => {
    const count = val.mfes.length;
    const totalMfe = val.mfes.reduce((a, b) => a + b, 0);
    const totalMae = val.maes.reduce((a, b) => a + b, 0);
    
    results.push({
      level: key,
      avgMfe: totalMfe / count,
      avgMae: totalMae / count,
      medianMfe: calculateMedian(val.mfes),
      medianMae: calculateMedian(val.maes),
      count: count,
      score: (totalMfe / count) - (totalMae / count),
    });
  });

  return results.sort((a, b) => b.avgMfe - a.avgMfe);
};

// Session Analysis
export const calculateSessionStats = (trades: Trade[]): AnalysisResult[] => {
    const statsMap = new Map<string, { mfes: number[]; maes: number[] }>();
  
    trades.forEach((trade) => {
      const session = trade.session || 'N/A';
      const current = statsMap.get(session) || { mfes: [], maes: [] };
      current.mfes.push(trade.mfe);
      current.maes.push(trade.mae);
      statsMap.set(session, current);
    });
  
    const results: AnalysisResult[] = [];
    statsMap.forEach((val, key) => {
      const count = val.mfes.length;
      const totalMfe = val.mfes.reduce((a, b) => a + b, 0);
      const totalMae = val.maes.reduce((a, b) => a + b, 0);
      
      results.push({
        level: key, // Reusing 'level' field for session name
        avgMfe: totalMfe / count,
        avgMae: totalMae / count,
        medianMfe: calculateMedian(val.mfes),
        medianMae: calculateMedian(val.maes),
        count: count,
        score: (totalMfe / count) - (totalMae / count),
      });
    });
  
    const order = ['S1', 'S2', 'S3', 'S4', 'IS4', 'N/A'];
    return results.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
};

// Combinatorial Analysis
export const calculatePairStats = (trades: Trade[]): PairAnalysisResult[] => {
  const pairMap = new Map<string, { totalMfe: number; count: number; p1: string; p2: string }>();

  trades.forEach((trade) => {
    const activeLevels = trade.taLevels.filter((l) => l !== 'None' && l !== '').sort();
    
    for (let i = 0; i < activeLevels.length; i++) {
      for (let j = i + 1; j < activeLevels.length; j++) {
        const p1 = activeLevels[i];
        const p2 = activeLevels[j];
        const key = `${p1}|${p2}`;
        
        const current = pairMap.get(key) || { totalMfe: 0, count: 0, p1, p2 };
        pairMap.set(key, {
          totalMfe: current.totalMfe + trade.mfe,
          count: current.count + 1,
          p1,
          p2
        });
      }
    }
  });

  const results: PairAnalysisResult[] = [];
  pairMap.forEach((val) => {
    results.push({
      pair: [val.p1, val.p2],
      avgMfe: val.totalMfe / val.count,
      count: val.count
    });
  });

  return results.filter(r => r.count >= 2).sort((a, b) => b.avgMfe - a.avgMfe);
};

// Heatmap Matrix (TA Level vs Entry Type)
export const calculateHeatmapStats = (trades: Trade[]): HeatmapData => {
  const levelSet = new Set<string>();
  const entrySet = new Set<string>();
  const matrix = new Map<string, { totalMfe: number; count: number }>();

  trades.forEach(trade => {
    if (!trade.entryType) return;
    entrySet.add(trade.entryType);

    const activeLevels = trade.taLevels.filter(l => l !== 'None' && l !== '');
    activeLevels.forEach(level => {
      levelSet.add(level);
      const key = `${level}::${trade.entryType}`;
      const current = matrix.get(key) || { totalMfe: 0, count: 0 };
      matrix.set(key, {
        totalMfe: current.totalMfe + trade.mfe,
        count: current.count + 1
      });
    });
  });

  const grid = new Map<string, { avgMfe: number; count: number }>();
  let maxMfe = 0;

  matrix.forEach((val, key) => {
    const avg = val.totalMfe / val.count;
    if (avg > maxMfe) maxMfe = avg;
    grid.set(key, { avgMfe: avg, count: val.count });
  });

  const sortedX = Array.from(entrySet).sort();
  const sortedY = Array.from(levelSet).sort();

  return {
    xLabels: sortedX,
    yLabels: sortedY,
    grid,
    maxMfe
  };
};

// Heatmap Matrix (TA Level vs Session)
export const calculateSessionLevelHeatmap = (trades: Trade[]): HeatmapData => {
  const levelSet = new Set<string>();
  const sessionSet = new Set<string>();
  const matrix = new Map<string, { totalMfe: number; count: number }>();

  trades.forEach(trade => {
    const session = trade.session || 'N/A';
    sessionSet.add(session);

    const activeLevels = trade.taLevels.filter(l => l !== 'None' && l !== '');
    activeLevels.forEach(level => {
      levelSet.add(level);
      const key = `${level}::${session}`;
      const current = matrix.get(key) || { totalMfe: 0, count: 0 };
      matrix.set(key, {
        totalMfe: current.totalMfe + trade.mfe,
        count: current.count + 1
      });
    });
  });

  const grid = new Map<string, { avgMfe: number; count: number }>();
  let maxMfe = 0;

  matrix.forEach((val, key) => {
    const avg = val.totalMfe / val.count;
    if (avg > maxMfe) maxMfe = avg;
    grid.set(key, { avgMfe: avg, count: val.count });
  });

  const sessionOrder = ['S1', 'S2', 'S3', 'S4', 'IS4', 'N/A'];
  const sortedX = Array.from(sessionSet).sort((a, b) => {
      return sessionOrder.indexOf(a) - sessionOrder.indexOf(b);
  });
  
  const sortedY = Array.from(levelSet).sort();

  return {
    xLabels: sortedX,
    yLabels: sortedY,
    grid,
    maxMfe
  };
};

// Heatmap Matrix (TA Level vs Delta)
export const calculateDeltaLevelHeatmap = (trades: Trade[]): HeatmapData => {
  const levelSet = new Set<string>();
  const deltaSet = new Set<string>();
  const matrix = new Map<string, { totalMfe: number; count: number }>();

  trades.forEach(trade => {
    const deltaCat = getDeltaCategory(trade.delta);
    deltaSet.add(deltaCat);

    const activeLevels = trade.taLevels.filter(l => l !== 'None' && l !== '');
    activeLevels.forEach(level => {
      levelSet.add(level);
      const key = `${level}::${deltaCat}`;
      const current = matrix.get(key) || { totalMfe: 0, count: 0 };
      matrix.set(key, {
        totalMfe: current.totalMfe + trade.mfe,
        count: current.count + 1
      });
    });
  });

  const grid = new Map<string, { avgMfe: number; count: number }>();
  let maxMfe = 0;

  matrix.forEach((val, key) => {
    const avg = val.totalMfe / val.count;
    if (avg > maxMfe) maxMfe = avg;
    grid.set(key, { avgMfe: avg, count: val.count });
  });

  const deltaOrder = [DeltaCategory.HIGH_PLUS, DeltaCategory.HIGH, DeltaCategory.LOW];
  const sortedX = Array.from(deltaSet).sort((a, b) => {
      return deltaOrder.indexOf(a as DeltaCategory) - deltaOrder.indexOf(b as DeltaCategory);
  });
  
  const sortedY = Array.from(levelSet).sort();

  return {
    xLabels: sortedX,
    yLabels: sortedY,
    grid,
    maxMfe
  };
};

export const getBestLevelForCondition = (
  trades: Trade[],
  conditionFn: (t: Trade, oiThreshold: number) => boolean
): AnalysisResult | null => {
    if (trades.length === 0) return null;
    
    const oiThreshold = getOIPercentileValue(trades, 75);
    const filteredTrades = trades.filter(t => conditionFn(t, oiThreshold));
    
    if (filteredTrades.length === 0) return null;

    const stats = calculateSingleFactorStats(filteredTrades);
    return stats.length > 0 ? stats[0] : null;
};
