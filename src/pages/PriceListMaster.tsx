import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { PriceList, PriceListItem, Product } from '../types';
import { priceListService } from '../services/priceListService';
import { productService } from '../services/productService';
import {
  Coins,
  Edit2,
  Check,
  X,
  Search,
  Loader2,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  Power
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PriceListMaster: React.FC = () => {
  const { priceLists: contextPriceLists, products: contextProducts, updatePriceListItem, currentUser } = useApp();

  const [priceLists, setPriceLists] = useState<PriceList[]>(contextPriceLists || []);
  const [products, setProducts] = useState<Product[]>(contextProducts || []);
  const [activeListId, setActiveListId] = useState<string>('PL-STANDARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Row edit states
  const [editingRowProductId, setEditingRowProductId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editUom, setEditUom] = useState<string>('Pcs');
  const [editBoxPcs, setEditBoxPcs] = useState<'Box' | 'Pcs'>('Pcs');

  // Load Price Lists and Products from MySQL Backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPriceLists, fetchedProducts] = await Promise.allSettled([
        priceListService.getPriceLists(),
        productService.getProducts(),
      ]);

      if (fetchedPriceLists.status === 'fulfilled' && fetchedPriceLists.value.length > 0) {
        setPriceLists(fetchedPriceLists.value);
        // Ensure activeListId points to a valid price list
        if (!fetchedPriceLists.value.some((pl) => pl.id === activeListId || pl.code === activeListId)) {
          setActiveListId(fetchedPriceLists.value[0].code || fetchedPriceLists.value[0].id);
        }
      } else if (contextPriceLists && contextPriceLists.length > 0) {
        setPriceLists(contextPriceLists);
      }

      if (fetchedProducts.status === 'fulfilled' && fetchedProducts.value.length > 0) {
        setProducts(fetchedProducts.value);
      } else if (contextProducts && contextProducts.length > 0) {
        setProducts(contextProducts);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [contextPriceLists, contextProducts, activeListId]);

  useEffect(() => {
    loadData();
  }, []);

  const selectedPriceList = priceLists.find(
    (pl) => pl.id === activeListId || pl.code === activeListId || String(pl.numericId) === activeListId
  ) || priceLists[0];

  // Trigger inline row edit
  const handleStartEdit = (item: { productId: string; rate: number; uom: string; boxPcs: 'Box' | 'Pcs' }) => {
    setEditingRowProductId(item.productId);
    setEditRate(item.rate);
    setEditUom(item.uom);
    setEditBoxPcs(item.boxPcs);
  };

  const handleCancelEdit = () => {
    setEditingRowProductId(null);
  };

  const handleSaveEdit = async (productId: string) => {
    if (editRate <= 0) {
      toast.error('Rate must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const targetPlId = selectedPriceList?.code || selectedPriceList?.id || activeListId;
      const updated = await priceListService.updateItemRate(
        targetPlId,
        productId,
        editRate,
        editUom,
        editBoxPcs
      );

      // Update local state
      setPriceLists((prev) =>
        prev.map((pl) => (pl.id === updated.id || pl.code === updated.code ? updated : pl))
      );

      // Also update context for backward compatibility
      updatePriceListItem(targetPlId, productId, editRate, editUom, editBoxPcs);

      setEditingRowProductId(null);
      toast.success('Price rate updated successfully in database!');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update price rate';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active / inactive status of current price list
  const handleToggleStatus = async () => {
    if (!selectedPriceList) return;
    const newStatus = !selectedPriceList.isActive;
    setIsSaving(true);
    try {
      const targetId = selectedPriceList.code || selectedPriceList.id;
      const updated = await priceListService.updateStatus(targetId, newStatus);
      setPriceLists((prev) =>
        prev.map((pl) => (pl.id === updated.id || pl.code === updated.code ? updated : pl))
      );
      toast.success(`Price list marked as ${newStatus ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Combine items to ensure all products appear even if not yet fully declared in the list item
  const displayItems = products
    .map((product) => {
      // Find item in active list
      const listItem = selectedPriceList?.items.find(
        (i) => i.productId === product.id || i.productId === product.materialCode || i.materialCode === product.materialCode
      );
      return {
        productId: product.materialCode || product.id,
        productName: product.description,
        category: product.category,
        group: product.group,
        rate: listItem ? listItem.rate : product.baseRate || product.rate,
        uom: listItem ? listItem.uom : product.baseUom,
        boxPcs: (listItem ? listItem.boxPcs : (product.baseUom?.toLowerCase().includes('box') ? 'Box' : 'Pcs')) as 'Box' | 'Pcs',
      };
    })
    .filter((item) => {
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
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight flex items-center gap-2">
            Base Pricing Matrices
            {isLoading && <Loader2 className="w-5 h-5 animate-spin text-brand-600" />}
          </h1>
          <p className="text-slate-500 text-sm">
            Database-backed price levels, wholesale tiers, and alternate unit rules for live dispatch orders.
          </p>
        </div>

        {/* Price list template selector and controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {priceLists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  setActiveListId(pl.code || pl.id);
                  setEditingRowProductId(null);
                }}
                id={`btn-select-pricelist-${pl.id}`}
                className={`text-xs px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeListId === pl.id || activeListId === pl.code
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pl.name}
                {!pl.isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-red-100 text-red-700 rounded font-semibold">
                    Inactive
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            title="Refresh Price Lists"
            id="btn-refresh-price-lists"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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
            placeholder="Search price matrix by material code or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="price-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Coins className="h-4 w-4" /> Real-time MySQL Sync
          </span>

          {selectedPriceList && (
            <button
              onClick={handleToggleStatus}
              disabled={isSaving}
              id="btn-toggle-active-status"
              className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                selectedPriceList.isActive
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {selectedPriceList.isActive ? 'Deactivate Tier' : 'Activate Tier'}
            </button>
          )}
        </div>
      </div>

      {/* Editable price list table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse" id="price-list-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Product ID / Code</th>
                <th className="px-6 py-4">Product Description</th>
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
                    No active product catalog mappings found.
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
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-brand-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none shadow-sm"
                            />
                          </div>
                        ) : (
                          `₹${Number(item.rate).toFixed(2)}`
                        )}
                      </td>
                      {/* Config UOM Column */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <select
                            value={editUom}
                            onChange={(e) => setEditUom(e.target.value)}
                            className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
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
                              disabled={isSaving}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50"
                              title="Save Rates to Database"
                              id={`btn-save-inline-${item.productId}`}
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-all"
                              title="Discard"
                              id={`btn-cancel-inline-${item.productId}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item)}
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
                        <p className="text-sm font-extrabold text-slate-900">₹{Number(item.rate).toFixed(2)}</p>
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
                          disabled={isSaving}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 disabled:opacity-50"
                          id={`btn-save-mobile-${item.productId}`}
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs"
                          id={`btn-cancel-mobile-${item.productId}`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(item)}
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
