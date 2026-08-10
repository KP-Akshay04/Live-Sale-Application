import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PriceList, PriceListItem } from '../types';
import {
  Coins,
  Edit2,
  Check,
  X,
  Search,
  ArrowRightLeft,
  ChevronDown,
  Percent
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PriceListMaster: React.FC = () => {
  const { priceLists, products, updatePriceListItem } = useApp();

  const [activeListId, setActiveListId] = useState('PL-STANDARD');
  const [searchTerm, setSearchTerm] = useState('');

  // Row edit states
  const [editingRowProductId, setEditingRowProductId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editUom, setEditUom] = useState<string>('Pcs');
  const [editBoxPcs, setEditBoxPcs] = useState<'Box' | 'Pcs'>('Pcs');

  const selectedPriceList = priceLists.find((pl) => pl.id === activeListId);

  // Trigger inline row edit
  const handleStartEdit = (item: PriceListItem) => {
    setEditingRowProductId(item.productId);
    setEditRate(item.rate);
    setEditUom(item.uom);
    setEditBoxPcs(item.boxPcs);
  };

  const handleCancelEdit = () => {
    setEditingRowProductId(null);
  };

  const handleSaveEdit = (productId: string) => {
    if (editRate <= 0) {
      toast.error('Rate must be greater than zero.');
      return;
    }
    updatePriceListItem(activeListId, productId, editRate, editUom, editBoxPcs);
    setEditingRowProductId(null);
    toast.success('Price rate updated successfully!');
  };

  // Combine items to ensure all products appear even if not yet fully declared in the list item
  const displayItems = products.map((product) => {
    // Find item in active list
    const listItem = selectedPriceList?.items.find((i) => i.productId === product.id);
    return {
      productId: product.id,
      productName: product.description,
      category: product.category,
      group: product.group,
      rate: listItem ? listItem.rate : product.rate,
      uom: listItem ? listItem.uom : product.baseUom,
      boxPcs: listItem ? listItem.boxPcs : 'Box',
    };
  }).filter((item) => {
    return (
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6" id="price-list-master-section">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Base Pricing Matrices
          </h1>
          <p className="text-slate-500 text-sm">
            Configure price levels, wholesale tiers, and alternate unit rules for live dispatch orders.
          </p>
        </div>

        {/* Price list template selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {priceLists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => {
                setActiveListId(pl.id);
                setEditingRowProductId(null);
              }}
              className={`text-xs px-4 py-2 rounded-lg font-bold transition-all ${
                activeListId === pl.id
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {pl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search price matrix by item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="price-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Coins className="h-4 w-4" /> Editing Enabled
          </span>
        </div>
      </div>

      {/* Editable price list table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse" id="price-list-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Applicable Rate (₹)</th>
                <th className="px-6 py-4 text-center">Config UOM</th>
                <th className="px-6 py-4 text-center">Unit Metric Type</th>
                <th className="px-6 py-4 text-center">Edit Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No active product catalog mappings. Create products first.
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => {
                  const isEditing = editingRowProductId === item.productId;
                  return (
                    <tr
                      key={item.productId}
                      className={`transition-colors ${
                        isEditing ? 'bg-brand-50/20' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {item.productId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      {/* Rate Column */}
                      <td className="px-6 py-4 text-right font-bold text-slate-950">
                        {isEditing ? (
                          <div className="relative inline-block w-28">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editRate}
                              onChange={(e) => setEditRate(Number(e.target.value))}
                              id={`input-rate-${item.productId}`}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-brand-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                            />
                          </div>
                        ) : (
                          `₹${item.rate.toFixed(2)}`
                        )}
                      </td>
                      {/* Config UOM Column */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <select
                            value={editUom}
                            onChange={(e) => setEditUom(e.target.value)}
                            className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          >
                            <option value="Box">Box</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Case">Case</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-700">{item.uom}</span>
                        )}
                      </td>
                      {/* Box/Pcs metric toggle */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg">
                            {(['Box', 'Pcs'] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setEditBoxPcs(opt)}
                                className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                                  editBoxPcs === opt
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-500'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {item.boxPcs} Pack basis
                          </span>
                        )}
                      </td>
                      {/* Action edit Column */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(item.productId)}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                              title="Save Rates"
                              id={`btn-save-inline-${item.productId}`}
                            >
                              <Check className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-all"
                              title="Discard"
                              id={`btn-cancel-inline-${item.productId}`}
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item as PriceListItem)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold transition-all text-[11px]"
                            id={`btn-edit-inline-${item.productId}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit Rate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card Grid */}
        <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4" id="price-mobile-cards">
          {displayItems.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs">
              No product catalog mappings found.
            </p>
          ) : (
            displayItems.map((item) => {
              const isEditing = editingRowProductId === item.productId;
              return (
                <div key={item.productId} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-brand-600 block">{item.productId}</span>
                      <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{item.productName}</h4>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[9px]">
                        {item.category}
                      </span>
                    </div>

                    <div className="text-right">
                      {isEditing ? (
                        <div className="relative inline-block w-24">
                          <span className="absolute inset-y-0 left-0 pl-1.5 flex items-center text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editRate}
                            onChange={(e) => setEditRate(Number(e.target.value))}
                            id={`input-mobile-rate-${item.productId}`}
                            className="w-full pl-5 pr-1 py-1 bg-white border border-brand-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-extrabold text-slate-900">₹{item.rate.toFixed(2)}</p>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium block">/ {isEditing ? editUom : item.uom}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/60">
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {item.boxPcs} Pack Basis
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(item.productId)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200"
                          id={`btn-save-mobile-${item.productId}`}
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs"
                          id={`btn-cancel-mobile-${item.productId}`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(item as PriceListItem)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                        id={`btn-edit-mobile-rate-${item.productId}`}
                      >
                        <Edit2 className="h-3 w-3" /> Edit Rate
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceListMaster;
