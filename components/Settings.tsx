import React, { useState } from 'react';
import { Trash2, Plus, Settings as SettingsIcon, Tag, List, LucideIcon, Folder, FolderPlus, Check, AlertTriangle } from 'lucide-react';
import { StrategyGroup } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SettingsProps {
  taLevels: string[];
  setTaLevels: (levels: string[]) => void;
  entryTypes: string[];
  setEntryTypes: (types: string[]) => void;
  strategyGroups: StrategyGroup[];
  setStrategyGroups: (groups: StrategyGroup[]) => void;
  allStrategies: string[];
}

interface ListSectionProps {
  title: string;
  desc: string;
  items: string[];
  newItem: string;
  setNewItem: (val: string) => void;
  onAdd: (e: React.FormEvent) => void;
  onDelete: (item: string) => void;
  icon: LucideIcon;
  placeholder: string;
}

const ListSection: React.FC<ListSectionProps> = ({ title, desc, items, newItem, setNewItem, onAdd, onDelete, icon: Icon, placeholder }) => {
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
      setItemToDelete(null);
    }
  };

  const isDuplicate = items.includes(newItem.trim());
  const isValid = newItem.trim().length > 0 && !isDuplicate;

  return (
    <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-lg flex flex-col h-full relative overflow-hidden">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-indigo-400" /> {title}
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      </div>
      
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] mb-6 custom-scrollbar pr-2">
        {items.map((item: string) => (
          <div key={item} className="flex justify-between items-center bg-zinc-900/50 border border-zinc-800/50 p-3 rounded-lg group hover:border-zinc-700 transition-all">
            <span className="text-sm text-zinc-300 font-medium">{item}</span>
            <button 
              onClick={() => setItemToDelete(item)}
              className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-rose-500/10 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-sm border-2 border-dashed border-zinc-800 rounded-lg">
                No items defined.
            </div>
        )}
      </div>

      <form onSubmit={onAdd} className="flex gap-2 mt-auto relative">
        <input 
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-zinc-900 border rounded-lg p-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 ${isDuplicate ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50'}`}
        />
        <button 
          type="submit"
          disabled={!isValid}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
          title={isDuplicate ? "Item already exists" : "Add item"}
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Confirmation Overlay */}
      {itemToDelete && (
        <div className="absolute inset-0 z-20 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 animation-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl shadow-2xl w-full max-w-sm">
             <div className="flex flex-col items-center text-center mb-6">
                <div className="bg-rose-500/10 p-3 rounded-full mb-3">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                </div>
                <h4 className="text-white font-bold text-lg">Confirm Deletion</h4>
                <p className="text-zinc-400 text-sm mt-2">
                  Are you sure you want to remove <span className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{itemToDelete}</span>?
                  This will remove it from the dropdown options.
                </p>
             </div>
             <div className="flex gap-3">
               <button 
                 onClick={() => setItemToDelete(null)}
                 className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={confirmDelete}
                 className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-rose-600/20"
               >
                 Delete
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GroupManagement: React.FC<{
    groups: StrategyGroup[];
    setGroups: (g: StrategyGroup[]) => void;
    allStrategies: string[];
}> = ({ groups, setGroups, allStrategies }) => {
    const [newGroupName, setNewGroupName] = useState('');
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    const handleAddGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if(newGroupName.trim()) {
            setGroups([...groups, { id: uuidv4(), name: newGroupName.trim(), strategies: [] }]);
            setNewGroupName('');
        }
    };

    const handleDeleteGroup = (id: string) => {
        setGroups(groups.filter(g => g.id !== id));
    };

    const toggleStrategyInGroup = (groupId: string, strat: string) => {
        setGroups(groups.map(g => {
            if (g.id !== groupId) return g;
            const exists = g.strategies.includes(strat);
            return {
                ...g,
                strategies: exists ? g.strategies.filter(s => s !== strat) : [...g.strategies, strat]
            };
        }));
    };

    return (
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 shadow-lg flex flex-col h-full md:col-span-2">
            <div className="mb-6 border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <Folder className="w-5 h-5 text-amber-400" /> Strategy Groups
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Organize your strategies into folders for easier filtering (e.g. 'Scalps', 'Swings').</p>
            </div>

            <div className="flex gap-2 mb-6">
                <input 
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New Group Name..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
                />
                <button 
                    onClick={handleAddGroup}
                    disabled={!newGroupName.trim()}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <FolderPlus className="w-4 h-4" /> Create
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {groups.map(group => (
                    <div key={group.id} className={`bg-zinc-900/50 border ${expandedGroup === group.id ? 'border-indigo-500/50 bg-zinc-900' : 'border-zinc-800/50'} rounded-lg p-4 transition-all`}>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-zinc-200">{group.name}</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
                                    {expandedGroup === group.id ? 'Done' : 'Edit'}
                                </button>
                                <button onClick={() => handleDeleteGroup(group.id)} className="text-zinc-600 hover:text-rose-400">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        {expandedGroup === group.id ? (
                            <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                {allStrategies.length === 0 && <p className="text-xs text-zinc-500 italic">No strategies found.</p>}
                                {allStrategies.map(strat => (
                                    <label key={strat} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-zinc-800/50">
                                        <div className={`w-3 h-3 rounded-sm border ${group.strategies.includes(strat) ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'} flex items-center justify-center`}>
                                            {group.strategies.includes(strat) && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={group.strategies.includes(strat)} 
                                            onChange={() => toggleStrategyInGroup(group.id, strat)}
                                        />
                                        {strat}
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1">
                                {group.strategies.length === 0 && <span className="text-xs text-zinc-600 italic">Empty</span>}
                                {group.strategies.map(s => (
                                    <span key={s} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">{s}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({ 
    taLevels, setTaLevels, 
    entryTypes, setEntryTypes,
    strategyGroups, setStrategyGroups,
    allStrategies 
}) => {
  const [newLevel, setNewLevel] = useState('');
  const [newEntryType, setNewEntryType] = useState('');

  const handleAddLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLevel.trim() && !taLevels.includes(newLevel.trim())) {
      setTaLevels([...taLevels, newLevel.trim()]);
      setNewLevel('');
    }
  };

  const handleDeleteLevel = (level: string) => {
    setTaLevels(taLevels.filter(l => l !== level));
  };

  const handleAddEntryType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEntryType.trim() && !entryTypes.includes(newEntryType.trim())) {
      setEntryTypes([...entryTypes, newEntryType.trim()]);
      setNewEntryType('');
    }
  };

  const handleDeleteEntryType = (type: string) => {
    setEntryTypes(entryTypes.filter(t => t !== type));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
        <ListSection 
            title="TA Levels" 
            desc="Define the technical levels or confluences available in the dropdowns."
            items={taLevels}
            newItem={newLevel}
            setNewItem={setNewLevel}
            onAdd={handleAddLevel}
            onDelete={handleDeleteLevel}
            icon={List}
            placeholder="Add level..."
        />
        
        <ListSection 
            title="Entry Models" 
            desc="Define your entry triggers to categorize setups."
            items={entryTypes}
            newItem={newEntryType}
            setNewItem={setNewEntryType}
            onAdd={handleAddEntryType}
            onDelete={handleDeleteEntryType}
            icon={Tag}
            placeholder="Add type..."
        />

        <GroupManagement 
            groups={strategyGroups} 
            setGroups={setStrategyGroups} 
            allStrategies={allStrategies} 
        />
    </div>
  );
};

export default Settings;