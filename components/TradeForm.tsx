
import React, { useState, useRef, useEffect } from 'react';
import { Trade, DEFAULT_MARKET_REGIMES } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Save, Plus, X, Image as ImageIcon, Upload, Trash2, Eraser, AlertCircle, CalendarClock, TrendingUp, TrendingDown, Sparkles, Smartphone, Layers, Activity, Bitcoin, Timer } from 'lucide-react';
import { getSessionFromTime } from '../services/analysisService';
import { generateSingleTradeNote } from '../services/geminiService';

interface TradeFormProps {
  initialData?: Trade; // If present, we are editing
  onAddTrade: (trade: Trade) => void;
  onClose: () => void;
  availableTaLevels: string[];
  availableEntryTypes: string[];
  availableStrategies?: string[]; 
}

const DRAFT_KEY = 'forwardtest_draft_trade';

// Helper to get local date string for datetime-local input
const toLocalISOString = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCurrentLocalTime = () => {
    return toLocalISOString(new Date().toISOString());
};

const TradeForm: React.FC<TradeFormProps> = ({ initialData, onAddTrade, onClose, availableTaLevels, availableEntryTypes, availableStrategies = [] }) => {
  const [strategyNames, setStrategyNames] = useState<string[]>([]);
  const [strategyInput, setStrategyInput] = useState('');
  
  const [entryDate, setEntryDate] = useState<string>(getCurrentLocalTime());
  const [exitDate, setExitDate] = useState<string>(''); // Optional exit time
  
  const [direction, setDirection] = useState<'Long' | 'Short'>('Long');
  const [symbol, setSymbol] = useState<string>('');
  const [marketRegime, setMarketRegime] = useState<string>(DEFAULT_MARKET_REGIMES[0]);

  const [taLevels, setTaLevels] = useState<string[]>(Array(10).fill('None'));
  const [delta, setDelta] = useState<string>('0');
  const [oi, setOi] = useState<string>('0');
  const [entryType, setEntryType] = useState<string>(availableEntryTypes[0] || '');
  const [exitType, setExitType] = useState('Manual');
  const [mfe, setMfe] = useState<string>('0');
  const [mae, setMae] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Quick Log Mode for Mobile
  const [isQuickMode, setIsQuickMode] = useState(false);

  // Initialization: Load Initial Data OR Draft
  useEffect(() => {
    if (initialData) {
        setStrategyNames(initialData.strategyNames);
        setEntryDate(toLocalISOString(initialData.timestamp));
        if (initialData.exitTimestamp) setExitDate(toLocalISOString(initialData.exitTimestamp));
        setDirection(initialData.direction || 'Long');
        setSymbol(initialData.symbol || '');
        setMarketRegime(initialData.marketRegime || DEFAULT_MARKET_REGIMES[0]);
        setTaLevels(initialData.taLevels);
        setDelta(initialData.delta.toString());
        setOi(initialData.oi.toString());
        setEntryType(initialData.entryType);
        setExitType(initialData.exitType);
        setMfe(initialData.mfe.toString());
        setMae(initialData.mae.toString());
        setNotes(initialData.notes || '');
        setImageUrls(initialData.imageUrls || []);
        return; 
    }

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
        try {
            const draft = JSON.parse(savedDraft);
            setStrategyNames(draft.strategyNames || []);
            if (draft.entryDate) setEntryDate(draft.entryDate);
            setDirection(draft.direction || 'Long');
            setSymbol(draft.symbol || '');
            setMarketRegime(draft.marketRegime || DEFAULT_MARKET_REGIMES[0]);
            setTaLevels(draft.taLevels || Array(10).fill('None'));
            setDelta(draft.delta || '0');
            setOi(draft.oi || '0');
            setEntryType(draft.entryType || availableEntryTypes[0] || '');
            setExitType(draft.exitType || 'Manual');
            setMfe(draft.mfe || '0');
            setMae(draft.mae || '0');
            setNotes(draft.notes || '');
            setImageUrls(draft.imageUrls || []);
            setIsDraftLoaded(true);
        } catch (e) {
            console.error("Failed to load draft", e);
        }
    }
  }, [initialData, availableEntryTypes]);

  // Auto-Save
  useEffect(() => {
    if (initialData) return;

    const draftData = {
        entryDate,
        direction,
        symbol,
        marketRegime,
        strategyNames,
        taLevels,
        delta,
        oi,
        entryType,
        exitType,
        mfe,
        mae,
        notes,
        imageUrls
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [initialData, entryDate, direction, symbol, marketRegime, strategyNames, taLevels, delta, oi, entryType, exitType, mfe, mae, notes, imageUrls]);

  const handleDiscardDraft = () => {
    if(confirm("Are you sure you want to discard this draft?")) {
        localStorage.removeItem(DRAFT_KEY);
        setEntryDate(getCurrentLocalTime());
        setDirection('Long');
        setSymbol('');
        setStrategyNames([]);
        setTaLevels(Array(10).fill('None'));
        setDelta('0');
        setOi('0');
        setEntryType(availableEntryTypes[0] || '');
        setExitType('Manual');
        setMfe('0');
        setMae('0');
        setNotes('');
        setImageUrls([]);
        setIsDraftLoaded(false);
    }
  };

  const handleLevelChange = (index: number, value: string) => {
    const newLevels = [...taLevels];
    newLevels[index] = value;
    setTaLevels(newLevels);
  };

  const handleAddStrategy = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const val = strategyInput.trim();
      if (val && !strategyNames.includes(val)) {
          setStrategyNames([...strategyNames, val]);
          setStrategyInput('');
      }
  };

  const handleRemoveStrategy = (name: string) => {
      setStrategyNames(strategyNames.filter(s => s !== name));
  };

  const handleStrategySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val && !strategyNames.includes(val)) {
          setStrategyNames([...strategyNames, val]);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            resolve(dataUrl);
          }
          img.src = event.target?.result as string;
        }
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(newImages => {
      setImageUrls(prev => [...prev, ...newImages]);
    });
    
    e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strategyNames.length === 0) {
        alert("Please add at least one strategy.");
        return;
    }

    if (!symbol.trim()) {
        alert("Please enter an Asset/Ticker symbol.");
        return;
    }

    setIsSaving(true);

    let finalNotes = notes;

    // AI Auto-Fill for Notes if empty
    if ((!finalNotes || finalNotes.trim() === '') && !isQuickMode) {
        const tradeDataForAI = {
            direction,
            strategyNames,
            taLevels: taLevels.filter(l => l !== 'None'),
            delta,
            mfe,
            mae,
            entryType,
            symbol: symbol || 'Unknown Asset'
        };
        try {
            const generatedNote = await generateSingleTradeNote(tradeDataForAI);
            if (generatedNote) {
                finalNotes = generatedNote;
            }
        } catch (err) {
            console.error("Failed to generate note", err);
        }
    }

    const isoEntryDate = new Date(entryDate).toISOString();
    const isoExitDate = exitDate ? new Date(exitDate).toISOString() : undefined;
    
    const newTrade: Trade = {
      id: initialData ? initialData.id : uuidv4(), // Preserve ID if editing
      symbol: symbol.toUpperCase(),
      timestamp: isoEntryDate,
      exitTimestamp: isoExitDate,
      session: getSessionFromTime(isoEntryDate),
      direction,
      strategyNames,
      taLevels,
      delta: parseFloat(delta),
      oi: parseFloat(oi),
      entryType,
      exitType,
      mfe: parseFloat(mfe),
      mae: parseFloat(mae),
      notes: finalNotes,
      imageUrls: imageUrls,
      marketRegime: marketRegime || DEFAULT_MARKET_REGIMES[0]
    };
    
    onAddTrade(newTrade);
    setIsSaving(false);
    onClose();
  };

  const levelOptions = ['None', ...availableTaLevels];
  const unusedStrategies = availableStrategies.filter(s => !strategyNames.includes(s));

  return (
    <div className="glass-panel rounded-xl shadow-2xl p-8 max-w-4xl mx-auto animation-fade-in relative">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {initialData ? 'Edit Existing Trade' : (isDraftLoaded ? 'Resume Draft Trade' : 'Log New Trade')}
                {isDraftLoaded && !initialData && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30">Draft Loaded</span>}
            </h2>
        </div>
        <div className="flex items-center gap-3">
            <button 
                type="button"
                onClick={() => setIsQuickMode(!isQuickMode)}
                className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors border ${isQuickMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
            >
                <Smartphone className="w-3 h-3" /> Quick Mode
            </button>
            {!initialData && isDraftLoaded && (
                <button 
                    onClick={handleDiscardDraft}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-rose-500/10 transition-colors"
                >
                    <Eraser className="w-3 h-3" />
                </button>
            )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Date, Symbol & Direction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3 text-indigo-400" /> Entry Date <span className="text-rose-500">*</span>
                </label>
                <input
                    type="datetime-local"
                    required
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Bitcoin className="w-3 h-3 text-amber-500" /> Symbol (Optional)
                </label>
                <input
                    type="text"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all uppercase placeholder:text-zinc-600"
                    placeholder="e.g. BTCUSDT"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
            </div>
            
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Direction <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setDirection('Long')}
                        className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all border ${direction === 'Long' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                        <TrendingUp className="w-4 h-4" /> Long
                    </button>
                    <button
                        type="button"
                        onClick={() => setDirection('Short')}
                        className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all border ${direction === 'Short' ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                        <TrendingDown className="w-4 h-4" /> Short
                    </button>
                </div>
            </div>
        </div>

        {/* Strategies */}
        <div className="space-y-3">
             <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                Strategies <span className="text-rose-500">*</span>
             </label>
             <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3">
                <div className="flex flex-wrap gap-2">
                    {strategyNames.map(s => (
                        <span key={s} className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {s}
                            <button type="button" onClick={() => handleRemoveStrategy(s)} className="hover:text-white"><X className="w-3 h-3"/></button>
                        </span>
                    ))}
                    {strategyNames.length === 0 && <span className="text-zinc-500 text-sm italic py-1">No strategies selected</span>}
                </div>
                
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                            placeholder="Type new strategy & press Enter..."
                            value={strategyInput}
                            onChange={(e) => setStrategyInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddStrategy(); }}}
                        />
                        <button type="button" onClick={() => handleAddStrategy()} className="absolute right-2 top-2 text-zinc-400 hover:text-white">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    {unusedStrategies.length > 0 && (
                        <select 
                            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500 max-w-[200px]"
                            onChange={handleStrategySelect}
                            value=""
                        >
                            <option value="" disabled>Select existing...</option>
                            {unusedStrategies.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                </div>
             </div>
        </div>

        {/* Detailed Section - Hidden in Quick Mode */}
        {!isQuickMode && (
            <div className="space-y-8 animation-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">Exit Type</label>
                        <input
                        type="text"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
                        value={exitType}
                        onChange={(e) => setExitType(e.target.value)}
                        placeholder="e.g. TP 2 Hit"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">Market Regime</label>
                        <select
                            value={marketRegime}
                            onChange={(e) => setMarketRegime(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                        >
                            {DEFAULT_MARKET_REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                {/* TA Levels */}
                <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800/50">
                    <label className="block text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        TA Confluence Levels
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {taLevels.map((level, idx) => (
                        <div key={idx} className="relative group">
                            <select
                            value={level}
                            onChange={(e) => handleLevelChange(idx, e.target.value)}
                            className={`w-full appearance-none bg-zinc-900 border ${level !== 'None' ? 'border-indigo-500/30 text-indigo-200 bg-indigo-500/5' : 'border-zinc-800 text-zinc-400'} rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-colors`}
                            >
                            {levelOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                            </select>
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-zinc-600"></div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Delta</label>
                        <input
                        type="number"
                        step="any"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                        value={delta}
                        onChange={(e) => setDelta(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">OI</label>
                        <input
                        type="number"
                        step="any"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                        value={oi}
                        onChange={(e) => setOi(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80">MFE %</label>
                        <input
                        type="number"
                        step="0.01"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-emerald-400 font-mono focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                        value={mfe}
                        onChange={(e) => setMfe(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-rose-500/80">MAE %</label>
                        <input
                        type="number"
                        step="0.01"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-rose-400 font-mono focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition-all"
                        value={mae}
                        onChange={(e) => setMae(e.target.value)}
                        />
                    </div>
                </div>

                {/* Entry Type */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Entry Mechanism</label>
                    <div className="flex flex-wrap gap-3">
                        {availableEntryTypes.map((type) => (
                        <label 
                            key={type} 
                            className={`
                                relative cursor-pointer px-4 py-3 rounded-lg border transition-all duration-200 select-none
                                ${entryType === type 
                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}
                            `}
                        >
                            <input
                            type="radio"
                            name="entryType"
                            value={type}
                            checked={entryType === type}
                            onChange={() => setEntryType(type)}
                            className="sr-only"
                            />
                            <span className="text-sm font-medium">{type}</span>
                        </label>
                        ))}
                    </div>
                </div>

                {/* Exit Time */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                        <Timer className="w-3 h-3 text-zinc-400" /> Exit Time (Optional)
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                        value={exitDate}
                        onChange={(e) => setExitDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                    />
                    <p className="text-[10px] text-zinc-500">Used to calculate trade duration.</p>
                </div>
            </div>
        )}

        {/* Section 5: Screenshot */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Trade Screenshots
          </label>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {imageUrls.map((url, idx) => (
                   <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
                      <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/70 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                   </div>
                ))}
                
                {/* Upload Button */}
                <button
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-zinc-800/50 hover:bg-zinc-800 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors gap-2"
                >
                   <Upload className="w-6 h-6" />
                   <span className="text-xs">Add Images</span>
                </button>
             </div>
             <p className="text-[10px] text-zinc-500 text-center">Supported: JPEG, PNG. Max 800px (auto-resized). Stored locally.</p>
             <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                multiple
                onChange={handleImageUpload} 
                className="hidden" 
             />
          </div>
        </div>

        {/* Section 6: Notes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex justify-between">
            <span>Trade Notes</span>
            {!isQuickMode && <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> Leave empty to AI auto-fill</span>}
          </label>
          <textarea
            rows={4}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 resize-none"
            placeholder="Record your thoughts... or leave blank and let AI summarize based on the data above."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="pt-4 flex items-center justify-between gap-4">
            {!initialData && (
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-indigo-400" />
                    <span>Auto-saving draft...</span>
                </div>
            )}
            <button
            type="submit"
            disabled={availableEntryTypes.length === 0 || isSaving}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
            {isSaving ? (
                <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    {notes ? 'Saving...' : 'AI Writing Notes...'}
                </>
            ) : (
                <>
                    <Save className="w-5 h-5" />
                    {initialData ? 'Update Trade' : 'Save Trade to Journal'}
                </>
            )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
