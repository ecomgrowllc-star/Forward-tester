
import React, { useState } from 'react';
import { Trade } from '../types';
import { Download, Upload, Trash2, FileSpreadsheet, AlertCircle, Image as ImageIcon, X, ChevronLeft, ChevronRight, Pencil, Database, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { getSessionFromTime, calculateDuration, formatDuration } from '../services/analysisService';

interface DataManagementProps {
  displayTrades: Trade[]; 
  allTrades: Trade[];     
  setAllTrades: (trades: Trade[]) => void;
  onEditTrade?: (trade: Trade) => void;
  onLoadSamples?: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ displayTrades, allTrades, setAllTrades, onEditTrade, onLoadSamples }) => {
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openLightbox = (images: string[]) => {
      setLightboxImages(images);
      setCurrentImageIndex(0);
  };

  const closeLightbox = () => {
      setLightboxImages(null);
      setCurrentImageIndex(0);
  };

  const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (lightboxImages) {
          setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
      }
  };

  const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (lightboxImages) {
          setCurrentImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      }
  };

  const handleExport = () => {
    const dataToExport = displayTrades;
    
    const csvData = dataToExport.map(t => ({
      ...t,
      strategyNames: t.strategyNames.join('|'), 
      taLevels: t.taLevels.join('|'),
      notes: t.notes || '',
      imageUrls: t.imageUrls.join('|')
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'trade_journal_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const requiredHeaders = ['timestamp', 'delta', 'oi', 'mfe', 'mae', 'entryType', 'exitType'];
          const fileHeaders = results.meta.fields || [];
          const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

          if (missingHeaders.length > 0) {
            alert(`Import Failed: The CSV is missing required columns:\n${missingHeaders.join(', ')}\n\nPlease ensure the file format is correct.`);
            return;
          }

          const validationErrors: string[] = [];
          const validTrades: Trade[] = [];

          results.data.forEach((d: any, index: number) => {
            if (Object.keys(d).length === 0) return;

            const delta = parseFloat(d.delta);
            const oi = parseFloat(d.oi);
            const mfe = parseFloat(d.mfe);
            const mae = parseFloat(d.mae);

            if (isNaN(delta) || isNaN(oi) || isNaN(mfe) || isNaN(mae)) return;

            const timestamp = d.timestamp;
            const session = d.session || getSessionFromTime(timestamp);

            validTrades.push({
              id: d.id || uuidv4(), 
              timestamp: timestamp,
              exitTimestamp: d.exitTimestamp,
              session: session,
              direction: d.direction === 'Short' ? 'Short' : 'Long',
              symbol: d.symbol || 'UNK',
              marketRegime: d.marketRegime || 'Unknown',
              strategyNames: d.strategyNames ? d.strategyNames.split('|') : (d.strategyName ? [d.strategyName] : []),
              taLevels: d.taLevels ? d.taLevels.split('|') : [], 
              delta,
              oi,
              entryType: d.entryType,
              exitType: d.exitType,
              mfe,
              mae,
              notes: d.notes || '',
              imageUrls: d.imageUrls ? d.imageUrls.split('|') : (d.imageUrl ? [d.imageUrl] : [])
            });
          });

          const existingIds = new Set(allTrades.map(t => t.id));
          const newUniqueTrades = validTrades.filter(t => !existingIds.has(t.id));

          if (newUniqueTrades.length > 0) {
            setAllTrades([...allTrades, ...newUniqueTrades]);
            alert(`Successfully imported ${newUniqueTrades.length} new trades.`);
          } else {
            alert(`No new trades found.`);
          }
        },
      });
    }
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    const newMasterList = allTrades.filter(t => t.id !== id);
    setAllTrades(newMasterList);
  };

  const isFiltered = displayTrades.length !== allTrades.length;
  
  const getSessionColor = (session?: string) => {
      switch(session) {
          case 'S1': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
          case 'S2': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
          case 'S3': return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
          case 'IS4': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
          case 'S4': return 'bg-zinc-700/30 text-zinc-400 border-zinc-700/50';
          default: return 'bg-zinc-700/30 text-zinc-400';
      }
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-lg mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                Data Management
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
                {isFiltered 
                    ? `Showing ${displayTrades.length} of ${allTrades.length} trades (Filtered)`
                    : `Showing all ${allTrades.length} trades`
                }
            </p>
        </div>
        <div className="flex gap-2">
            {onLoadSamples && (
                 <button 
                    type="button"
                    onClick={onLoadSamples}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    <Database className="w-4 h-4" />
                    Load Samples
                </button>
            )}
            <label className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors">
                <Upload className="w-4 h-4" />
                Import CSV
                <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <button 
                onClick={handleExport}
                disabled={displayTrades.length === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm shadow-lg shadow-indigo-600/20 transition-all"
            >
                <Download className="w-4 h-4" />
                Export View
            </button>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[400px] rounded-lg border border-zinc-800 relative">
        <table className="w-full text-left text-xs text-zinc-400">
           <thead className="bg-zinc-900 sticky top-0 z-10 shadow-sm">
               <tr>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Asset</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Dir</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Session</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Dur.</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Chart</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Context</th>
                   <th className="p-4 font-semibold text-zinc-500 uppercase tracking-wider">Delta</th>
                   <th className="p-4 text-right font-semibold text-zinc-500 uppercase tracking-wider">MFE</th>
                   <th className="p-4 text-right font-semibold text-zinc-500 uppercase tracking-wider">MAE</th>
                   <th className="p-4 text-center font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
               </tr>
           </thead>
           <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/30">
               {displayTrades.map((t) => (
                   <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors group">
                       <td className="p-4 font-mono font-bold text-white">{t.symbol}</td>
                       <td className="p-4 font-mono text-zinc-500 whitespace-nowrap">
                           {new Date(t.timestamp).toLocaleDateString()}
                           <div className="text-[10px] text-zinc-600">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                       </td>
                       <td className="p-4">
                           <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border ${t.direction === 'Short' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                               {t.direction === 'Short' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                               {t.direction}
                           </span>
                       </td>
                       <td className="p-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getSessionColor(t.session)}`}>
                               {t.session || 'N/A'}
                           </span>
                       </td>
                       <td className="p-4 font-mono text-zinc-400">
                           {t.exitTimestamp ? formatDuration(calculateDuration(t.timestamp, t.exitTimestamp)) : '-'}
                       </td>
                       <td className="p-4">
                            {t.imageUrls && t.imageUrls.length > 0 ? (
                                <button 
                                    onClick={() => openLightbox(t.imageUrls)}
                                    className="relative w-10 h-8 rounded overflow-hidden border border-zinc-700 hover:border-indigo-500 transition-colors group/img"
                                >
                                    <img src={t.imageUrls[0]} alt="thumb" className="w-full h-full object-cover" />
                                    {t.imageUrls.length > 1 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] font-bold text-white">
                                            +{t.imageUrls.length - 1}
                                        </div>
                                    )}
                                </button>
                            ) : (
                                <span className="text-zinc-700">-</span>
                            )}
                       </td>
                       <td className="p-4 text-xs text-zinc-400 max-w-[100px] truncate" title={t.marketRegime}>
                           {t.marketRegime}
                       </td>
                       <td className="p-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                               Math.abs(t.delta) > 20 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                               Math.abs(t.delta) > 7 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                               'bg-zinc-700/30 text-zinc-400'
                           }`}>
                             {t.delta.toFixed(1)}
                           </span>
                       </td>
                       <td className="p-4 text-right font-mono text-emerald-400 font-medium">{t.mfe}%</td>
                       <td className="p-4 text-right font-mono text-rose-400 font-medium">{t.mae}%</td>
                       <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                             {onEditTrade && (
                                <button 
                                    onClick={() => onEditTrade(t)}
                                    className="text-zinc-600 hover:text-indigo-400 transition-colors p-1 rounded hover:bg-indigo-500/10"
                                    title="Edit"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                             )}
                             <button 
                                onClick={() => handleDelete(t.id)}
                                className="text-zinc-600 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-500/10"
                                title="Delete"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </td>
                   </tr>
               ))}
               {displayTrades.length === 0 && (
                   <tr>
                       <td colSpan={11} className="p-12 text-center text-zinc-500">
                           {allTrades.length > 0 
                             ? <div className="flex flex-col items-center gap-2"><AlertCircle className="w-6 h-6 opacity-50"/> <span>No trades match current filter criteria.</span></div>
                             : (
                                <div className="flex flex-col items-center gap-3">
                                    <span>No trades logged yet.</span>
                                </div>
                             )
                           }
                       </td>
                   </tr>
               )}
           </tbody>
        </table>
      </div>

      {/* Lightbox Modal */}
      {lightboxImages && (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animation-fade-in" onClick={closeLightbox}>
                <div className="relative max-w-6xl max-h-[95vh] w-full flex flex-col items-center">
                    <button 
                        className="absolute -top-10 right-0 text-zinc-400 hover:text-white transition-colors"
                        onClick={closeLightbox}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="relative w-full h-[80vh] flex items-center justify-center">
                        <img 
                            src={lightboxImages[currentImageIndex]} 
                            alt={`Trade Screenshot ${currentImageIndex + 1}`} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-zinc-800"
                            onClick={(e) => e.stopPropagation()} 
                        />
                        
                        {/* Navigation Arrows */}
                        {lightboxImages.length > 1 && (
                            <>
                                <button 
                                    onClick={prevImage}
                                    className="absolute left-2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all backdrop-blur-sm"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button 
                                    onClick={nextImage}
                                    className="absolute right-2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all backdrop-blur-sm"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Pagination Indicator */}
                    {lightboxImages.length > 1 && (
                        <div className="mt-4 flex gap-2">
                            {lightboxImages.map((_, idx) => (
                                <div 
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${idx === currentImageIndex ? 'bg-indigo-500 scale-125' : 'bg-zinc-700 hover:bg-zinc-500'}`}
                                />
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-2 text-zinc-400 text-sm">
                        Image {currentImageIndex + 1} of {lightboxImages.length}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DataManagement;
