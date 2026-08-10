import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SchemeList, SchemeListItem } from '../types';
import {
  TicketPercent,
  Search,
  Edit2,
  Check,
  X,
  BadgeAlert,
  HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SchemeListMaster: React.FC = () => {
  const { schemeLists, products, updateSchemeListItem } = useApp();

  const [activeListId, setActiveListId] = useState('SL-SUMMER-SPECIAL');
  const [searchTerm, setSearchTerm] = useState('');

  // Row inline edit state
  const [editingRowProductId, setEditingRowProductId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editUom, setEditUom] = useState<string>('Pcs');
  const [editBoxPcs, setEditBoxPcs] = useState<'Box' | 'Pcs'>('Pcs');
  const [editBuyQty, setEditBuyQty] = useState<number>(10);
  const [editFreeQty, setEditFreeQty] = useState<number>(1);

  const selectedSchemeList = schemeLists.find((sl) => sl.id === activeListId);

  const handleStartEdit = (item: SchemeListItem) => {
    setEditingRowProductId(item.productId);
    setEditRate(item.rate);
    setEditUom(item.uom);
    setEditBoxPcs(item.boxPcs);
    setEditBuyQty(item.buyQty);
    setEditFreeQty(item.freeQty);
  };

  const handleCancelEdit = () => {
    setEditingRowProductId(null);
  };

  const handleSaveEdit = (productId: string) => {
    if (editBuyQty <= 0) {
      toast.error('Buy Quantity must be at least 1.');
      return;
    }
    if (editFreeQty < 0) {
      toast.error('Free Quantity cannot be negative.');
      return;
    }
    updateSchemeListItem(activeListId, productId, editRate, editUom, editBoxPcs, editBuyQty, editFreeQty);
    setEditingRowProductId(null);
    toast.success('Promotional scheme deals configured!');
  };

  const displayItems = products.map((product) => {
    const listItem = selectedSchemeList?.items.find((i) => i.productId === product.id);
    return {
      productId: product.id,
      productName: product.description,
      category: product.category,
      group: product.group,
      rate: listItem ? listItem.rate : product.rate,
      uom: listItem ? listItem.uom : product.baseUom,
      boxPcs: listItem ? listItem.boxPcs : 'Box',
      buyQty: listItem ? listItem.buyQty : 10,
      freeQty: listItem ? listItem.freeQty : 0,
    };
  }).filter((item) => {
    return (
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6" id="scheme-list-master-section">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Volume & Promotional Scheme Grid
          </h1>
          <p className="text-slate-500 text-sm">
            Control automated dealer-specific promotional schemes like Buy-X-Get-Y-Free, deal pricing, and bulk dispatches.
          </p>
        </div>

        {/* Scheme lists selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {schemeLists.map((sl) => (
            <button
              key={sl.id}
              onClick={() => {
                setActiveListId(sl.id);
                setEditingRowProductId(null);
              }}
              className={`text-xs px-4 py-2 rounded-lg font-bold transition-all ${
                activeListId === sl.id
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sl.name}
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
            placeholder="Search promotional scheme metrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="scheme-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <TicketPercent className="h-4 w-4" /> Real-time Calculation
          </span>
        </div>
      </div>

      {/* Grid Layout Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="scheme-list-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-right">Promo Deal Rate (₹)</th>
                <th className="px-6 py-4 text-center">Config UOM</th>
                <th className="px-6 py-4 text-center">Packaging</th>
                <th className="px-6 py-4 text-center font-bold text-brand-600">Buy Quantity</th>
                <th className="px-6 py-4 text-center font-bold text-emerald-600">Free Quantity</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No active product structures. Register products first.
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => {
                  const isEditing = editingRowProductId === item.productId;
                  const isDealActive = item.freeQty > 0;
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
                        <div>
                          <p>{item.productName}</p>
                          {isDealActive && !isEditing && (
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider mt-1">
                              Offer: Buy {item.buyQty} Get {item.freeQty} Free
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Deal Rate column */}
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {isEditing ? (
                          <div className="relative inline-block w-24">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editRate}
                              onChange={(e) => setEditRate(Number(e.target.value))}
                              className="w-full pl-6 pr-1 py-1.5 bg-white border border-brand-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                            />
                          </div>
                        ) : (
                          `₹${item.rate.toFixed(2)}`
                        )}
                      </td>
                      {/* Config UOM column */}
                      <td className="px-6 py-4 text-center font-semibold">
                        {isEditing ? (
                          <select
                            value={editUom}
                            onChange={(e) => setEditUom(e.target.value)}
                            className="bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                          >
                            <option value="Box">Box</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Case">Case</option>
                          </select>
                        ) : (
                          item.uom
                        )}
                      </td>
                      {/* Packaging column */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <select
                            value={editBoxPcs}
                            onChange={(e) => setEditBoxPcs(e.target.value as 'Box' | 'Pcs')}
                            className="bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                          >
                            <option value="Box">Box basis</option>
                            <option value="Pcs">Pcs basis</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 font-bold text-[10px]">
                            {item.boxPcs} Pack
                          </span>
                        )}
                      </td>
                      {/* Buy Qty column */}
                      <td className="px-6 py-4 text-center font-bold text-slate-800">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editBuyQty}
                            onChange={(e) => setEditBuyQty(Number(e.target.value))}
                            className="w-16 px-1.5 py-1.5 bg-white border border-brand-500 rounded-lg text-xs text-center font-bold text-slate-900 focus:outline-none"
                          />
                        ) : (
                          item.buyQty
                        )}
                      </td>
                      {/* Free Qty column */}
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editFreeQty}
                            onChange={(e) => setEditFreeQty(Number(e.target.value))}
                            className="w-16 px-1.5 py-1.5 bg-white border border-brand-500 rounded-lg text-xs text-center font-bold text-slate-900 focus:outline-none"
                          />
                        ) : (
                          item.freeQty
                        )}
                      </td>
                      {/* Actions column */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(item.productId)}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                              title="Save Scheme Setup"
                              id={`btn-save-scheme-${item.productId}`}
                            >
                              <Check className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-all"
                              title="Discard"
                              id={`btn-cancel-scheme-${item.productId}`}
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item as SchemeListItem)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold transition-all text-[11px]"
                            id={`btn-edit-scheme-${item.productId}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Config Deal
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
      </div>
    </div>
  );
};

export default SchemeListMaster;
