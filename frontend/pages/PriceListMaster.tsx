import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { PriceList, Product } from '../types';
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
  Power,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PriceListMaster: React.FC = () => {
  const {
    priceLists: contextPriceLists,
    products: contextProducts,
    updatePriceListItem,
  } = useApp();

  const [priceLists, setPriceLists] = useState<PriceList[]>(
    contextPriceLists || []
  );
  const [products, setProducts] = useState<Product[]>(
    contextProducts || []
  );

  const [activeListId, setActiveListId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create Price List modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListCode, setNewListCode] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListCurrency, setNewListCurrency] = useState('INR');
  const [newListValidFrom, setNewListValidFrom] = useState('');
  const [newListValidTo, setNewListValidTo] = useState('');
  const [newListIsActive, setNewListIsActive] = useState(true);

  // Row edit states
  const [editingRowProductId, setEditingRowProductId] = useState<string | null>(
    null
  );
  const [editRate, setEditRate] = useState<number>(0);
  const [editUom, setEditUom] = useState<string>('Pcs');
  const [editBoxPcs, setEditBoxPcs] = useState<'Box' | 'Pcs'>('Pcs');

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [fetchedPriceLists, fetchedProducts] = await Promise.allSettled([
        priceListService.getPriceLists(),
        productService.getProducts(),
      ]);

      if (fetchedPriceLists.status === 'fulfilled') {
        const fetched = fetchedPriceLists.value || [];

        setPriceLists(fetched);

        if (fetched.length > 0) {
          const currentStillExists = fetched.some(
            (pl) =>
              pl.id === activeListId ||
              pl.code === activeListId ||
              String(pl.numericId) === activeListId
          );

          if (!currentStillExists) {
            setActiveListId(
              fetched[0].code ||
                fetched[0].id ||
                String(fetched[0].numericId || '')
            );
          }
        } else {
          // Important:
          // Do NOT fall back to Product base rates as fake Price Lists.
          setPriceLists([]);
          setActiveListId('');
        }
      } else if (contextPriceLists) {
        setPriceLists(contextPriceLists);

        if (contextPriceLists.length > 0 && !activeListId) {
          setActiveListId(
            contextPriceLists[0].code ||
              contextPriceLists[0].id ||
              String(contextPriceLists[0].numericId || '')
          );
        }
      }

      if (fetchedProducts.status === 'fulfilled') {
        setProducts(fetchedProducts.value || []);
      } else if (contextProducts) {
        setProducts(contextProducts);
      }
    } catch (err) {
      console.error('Failed to load price list data:', err);
      toast.error('Failed to load price list data.');
    } finally {
      setIsLoading(false);
    }
  }, [
    activeListId,
    contextPriceLists,
    contextProducts,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const selectedPriceList = priceLists.find(
    (pl) =>
      pl.id === activeListId ||
      pl.code === activeListId ||
      String(pl.numericId) === activeListId
  );

  // ------------------------------------------------------------
  // CREATE PRICE LIST
  // ------------------------------------------------------------

  const resetCreateForm = () => {
    setNewListCode('');
    setNewListName('');
    setNewListDescription('');
    setNewListCurrency('INR');
    setNewListValidFrom('');
    setNewListValidTo('');
    setNewListIsActive(true);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    if (isSaving) return;
    setShowCreateModal(false);
    resetCreateForm();
  };

  const handleCreatePriceList = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = newListCode.trim().toUpperCase();
    const name = newListName.trim();

    if (!code) {
      toast.error('Please enter a Price List Code.');
      return;
    }

    if (!name) {
      toast.error('Please enter a Price List Name.');
      return;
    }

    if (
      newListValidFrom &&
      newListValidTo &&
      newListValidTo < newListValidFrom
    ) {
      toast.error('Valid To cannot be earlier than Valid From.');
      return;
    }

    setIsSaving(true);

    try {
      /*
       * Create actual PriceListItems from the existing Product master.
       *
       * These are only initial values for the new Price List.
       * After creation, the Super Admin can use Edit Rate to configure
       * the actual selling rate for each product.
       */
      const items = products
        .filter((product) => {
          const rate = Number(product.baseRate ?? product.rate ?? 0);
          return rate > 0;
        })
        .map((product) => ({
          productId: product.id,
          rate: Number(product.baseRate ?? product.rate ?? 0),
          uom: product.baseUom || 'Pcs',
          boxPcs: (
            product.baseUom?.toLowerCase().includes('box')
              ? 'Box'
              : 'Pcs'
          ) as 'Box' | 'Pcs',
        }));

      const created = await priceListService.createPriceList({
        code,
        name,
        description: newListDescription.trim() || undefined,
        currency: newListCurrency.trim() || 'INR',
        validFrom: newListValidFrom || null,
        validTo: newListValidTo || null,
        isActive: newListIsActive,
        items,
      });

      setPriceLists((prev) => [...prev, created]);

      setActiveListId(
        created.code ||
          created.id ||
          String(created.numericId || '')
      );

      setShowCreateModal(false);
      resetCreateForm();

      toast.success('Price List created successfully in database.');

      // Re-read from backend so the screen reflects MySQL exactly.
      await loadData();
    } catch (err: any) {
      console.error('Create Price List failed:', err);

      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create Price List.';

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ------------------------------------------------------------
  // INLINE PRICE ITEM EDIT
  // ------------------------------------------------------------

  const handleStartEdit = (item: {
    productId: string;
    rate: number;
    uom: string;
    boxPcs: 'Box' | 'Pcs';
  }) => {
    setEditingRowProductId(item.productId);
    setEditRate(item.rate);
    setEditUom(item.uom);
    setEditBoxPcs(item.boxPcs);
  };

  const handleCancelEdit = () => {
    setEditingRowProductId(null);
  };

  const handleSaveEdit = async (productId: string) => {
    if (!selectedPriceList) {
      toast.error('Please select a Price List first.');
      return;
    }

    if (editRate <= 0) {
      toast.error('Rate must be greater than zero.');
      return;
    }

    setIsSaving(true);

    try {
      const targetPlId =
        selectedPriceList.code ||
        selectedPriceList.id ||
        activeListId;

      const updated = await priceListService.updateItemRate(
        targetPlId,
        productId,
        editRate,
        editUom,
        editBoxPcs
      );

      setPriceLists((prev) =>
        prev.map((pl) =>
          pl.id === updated.id || pl.code === updated.code
            ? updated
            : pl
        )
      );

      updatePriceListItem(
        targetPlId,
        productId,
        editRate,
        editUom,
        editBoxPcs
      );

      setEditingRowProductId(null);

      toast.success('Price rate updated successfully in database.');
    } catch (err: any) {
      console.error('Update Price List item failed:', err);

      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update price rate.';

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ------------------------------------------------------------
  // PRICE LIST STATUS
  // ------------------------------------------------------------

  const handleToggleStatus = async () => {
    if (!selectedPriceList) return;

    const newStatus = !selectedPriceList.isActive;

    setIsSaving(true);

    try {
      const targetId =
        selectedPriceList.code || selectedPriceList.id;

      const updated = await priceListService.updateStatus(
        targetId,
        newStatus
      );

      setPriceLists((prev) =>
        prev.map((pl) =>
          pl.id === updated.id || pl.code === updated.code
            ? updated
            : pl
        )
      );

      toast.success(
        `Price list marked as ${
          newStatus ? 'Active' : 'Inactive'
        }.`
      );
    } catch (err: any) {
      console.error('Toggle Price List status failed:', err);

      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update status.';

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ------------------------------------------------------------
  // DISPLAY ONLY REAL PRICE LIST ITEMS
  // ------------------------------------------------------------

  const displayItems = selectedPriceList
    ? selectedPriceList.items
        .map((listItem) => {
          const product = products.find(
            (p) =>
              p.id === listItem.productId ||
              p.materialCode === listItem.productId ||
              p.materialCode === listItem.materialCode
          );

          return {
            productId:
              listItem.materialCode ||
              product?.materialCode ||
              listItem.productId,
            productName:
              listItem.productName ||
              product?.description ||
              'Unknown Product',
            category: product?.category || '—',
            group: product?.group || '—',
            rate: Number(listItem.rate),
            uom: listItem.uom || 'Pcs',
            boxPcs: listItem.boxPcs || 'Pcs',
          };
        })
        .filter((item) => {
          const search = searchTerm.toLowerCase();

          return (
            item.productName.toLowerCase().includes(search) ||
            String(item.productId)
              .toLowerCase()
              .includes(search)
          );
        })
    : [];

  return (
    <div
      className="space-y-6"
      id="price-list-master-section"
    >
      {/* -------------------------------------------------- */}
      {/* TITLE HEADER                                       */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight flex items-center gap-2">
            Base Pricing Matrices
            {isLoading && (
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            )}
          </h1>

          <p className="text-slate-500 text-sm">
            Database-backed price levels, wholesale tiers, and
            alternate unit rules for live dispatch orders.
          </p>
        </div>

        {/* Price list controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenCreateModal}
            id="btn-create-price-list"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-brand-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Price List
          </button>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {priceLists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  setActiveListId(
                    pl.code || pl.id
                  );
                  setEditingRowProductId(null);
                }}
                id={`btn-select-pricelist-${pl.id}`}
                className={`text-xs px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeListId === pl.id ||
                  activeListId === pl.code
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
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* NO PRICE LIST STATE                                */}
      {/* -------------------------------------------------- */}

      {priceLists.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-slate-100 shadow-fiori p-10 text-center"
          id="price-list-empty-state"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <Coins className="w-7 h-7 text-brand-600" />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            No Price Lists Configured
          </h2>

          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            Create your first database-backed Price List to
            configure product selling rates for Live Sale.
          </p>

          <button
            onClick={handleOpenCreateModal}
            id="btn-create-first-price-list"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-brand-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Price List
          </button>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------ */}
          {/* GRID CONTROLS                                    */}
          {/* ------------------------------------------------ */}

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>

              <input
                type="text"
                placeholder="Search price matrix by material code or product name..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                id="price-search-input"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Coins className="h-4 w-4" />
                Real-time MySQL Sync
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
                  {selectedPriceList.isActive
                    ? 'Deactivate Tier'
                    : 'Activate Tier'}
                </button>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* TABLE                                            */}
          {/* ------------------------------------------------ */}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table
                className="w-full text-left border-collapse"
                id="price-list-master-table"
              >
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">
                      Product ID / Code
                    </th>
                    <th className="px-6 py-4">
                      Product Description
                    </th>
                    <th className="px-6 py-4">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right">
                      Applicable Rate (₹)
                    </th>
                    <th className="px-6 py-4 text-center">
                      Config UOM
                    </th>
                    <th className="px-6 py-4 text-center">
                      Unit Metric Type
                    </th>
                    <th className="px-6 py-4 text-center">
                      Edit Control
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400"
                      >
                        No products configured in this Price List.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item) => {
                      const isEditing =
                        editingRowProductId ===
                        item.productId;

                      return (
                        <tr
                          key={item.productId}
                          className={`transition-colors ${
                            isEditing
                              ? 'bg-brand-50/20'
                              : 'hover:bg-slate-50/50'
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

                          <td className="px-6 py-4 text-right font-bold text-slate-950">
                            {isEditing ? (
                              <div className="relative inline-block w-28">
                                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400">
                                  ₹
                                </span>

                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editRate}
                                  onChange={(e) =>
                                    setEditRate(
                                      Number(
                                        e.target.value
                                      )
                                    )
                                  }
                                  id={`input-rate-${item.productId}`}
                                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-brand-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none shadow-sm"
                                />
                              </div>
                            ) : (
                              `₹${Number(
                                item.rate
                              ).toFixed(2)}`
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <select
                                value={editUom}
                                onChange={(e) =>
                                  setEditUom(
                                    e.target.value
                                  )
                                }
                                className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                              >
                                <option value="Box">
                                  Box
                                </option>
                                <option value="Pcs">
                                  Pcs
                                </option>
                                <option value="Case">
                                  Case
                                </option>
                              </select>
                            ) : (
                              <span className="font-semibold text-slate-700">
                                {item.uom}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg">
                                {(['Box', 'Pcs'] as const).map(
                                  (opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        setEditBoxPcs(
                                          opt
                                        )
                                      }
                                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                                        editBoxPcs === opt
                                          ? 'bg-slate-800 text-white'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                {item.boxPcs} Pack basis
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleSaveEdit(
                                      item.productId
                                    )
                                  }
                                  disabled={isSaving}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50"
                                  title="Save Rates to Database"
                                  id={`btn-save-inline-${item.productId}`}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>

                                <button
                                  onClick={
                                    handleCancelEdit
                                  }
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
                                onClick={() =>
                                  handleStartEdit(item)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold transition-all text-[11px]"
                                id={`btn-edit-inline-${item.productId}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Rate
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

            {/* ------------------------------------------------ */}
            {/* MOBILE                                           */}
            {/* ------------------------------------------------ */}

            <div
              className="block md:hidden divide-y divide-slate-100 p-4 space-y-4"
              id="price-mobile-cards"
            >
              {displayItems.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">
                  No products configured in this Price List.
                </p>
              ) : (
                displayItems.map((item) => {
                  const isEditing =
                    editingRowProductId ===
                    item.productId;

                  return (
                    <div
                      key={item.productId}
                      className="pt-4 first:pt-0 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-bold text-brand-600 block">
                            {item.productId}
                          </span>

                          <h4 className="font-semibold text-slate-900 text-sm mt-0.5">
                            {item.productName}
                          </h4>

                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[9px]">
                            {item.category}
                          </span>
                        </div>

                        <div className="text-right">
                          {isEditing ? (
                            <div className="relative inline-block w-24">
                              <span className="absolute inset-y-0 left-0 pl-1.5 flex items-center text-slate-400 text-xs">
                                ₹
                              </span>

                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={editRate}
                                onChange={(e) =>
                                  setEditRate(
                                    Number(
                                      e.target.value
                                    )
                                  )
                                }
                                id={`input-mobile-rate-${item.productId}`}
                                className="w-full pl-5 pr-1 py-1 bg-white border border-brand-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <p className="text-sm font-extrabold text-slate-900">
                              ₹
                              {Number(
                                item.rate
                              ).toFixed(2)}
                            </p>
                          )}

                          <span className="text-[10px] text-slate-500 font-medium block">
                            /{' '}
                            {isEditing
                              ? editUom
                              : item.uom}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/60">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {item.boxPcs} Pack Basis
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleSaveEdit(
                                  item.productId
                                )
                              }
                              disabled={isSaving}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 disabled:opacity-50"
                              id={`btn-save-mobile-${item.productId}`}
                            >
                              {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Save
                            </button>

                            <button
                              onClick={
                                handleCancelEdit
                              }
                              disabled={isSaving}
                              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs"
                              id={`btn-cancel-mobile-${item.productId}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleStartEdit(item)
                            }
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                            id={`btn-edit-mobile-rate-${item.productId}`}
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit Rate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------ */}
      {/* CREATE PRICE LIST MODAL                                */}
      {/* ------------------------------------------------------ */}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          id="create-price-list-modal"
        >
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create Price List
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Create a database-backed pricing tier for Live
                  Sale.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isSaving}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreatePriceList}
              className="p-6 space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Price List Code *
                  </label>

                  <input
                    type="text"
                    value={newListCode}
                    onChange={(e) =>
                      setNewListCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="PL-STANDARD"
                    id="input-price-list-code"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Price List Name *
                  </label>

                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) =>
                      setNewListName(e.target.value)
                    }
                    placeholder="Standard Price List"
                    id="input-price-list-name"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Currency
                  </label>

                  <select
                    value={newListCurrency}
                    onChange={(e) =>
                      setNewListCurrency(e.target.value)
                    }
                    id="select-price-list-currency"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  >
                    <option value="INR">
                      INR — Indian Rupee
                    </option>
                    <option value="USD">
                      USD — US Dollar
                    </option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Status
                  </label>

                  <select
                    value={newListIsActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setNewListIsActive(
                        e.target.value === 'active'
                      )
                    }
                    id="select-price-list-status"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  >
                    <option value="active">
                      Active
                    </option>
                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                {/* Valid From */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Valid From
                  </label>

                  <input
                    type="date"
                    value={newListValidFrom}
                    onChange={(e) =>
                      setNewListValidFrom(
                        e.target.value
                      )
                    }
                    id="input-price-list-valid-from"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Valid To */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Valid To
                  </label>

                  <input
                    type="date"
                    value={newListValidTo}
                    onChange={(e) =>
                      setNewListValidTo(e.target.value)
                    }
                    id="input-price-list-valid-to"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Description
                </label>

                <textarea
                  value={newListDescription}
                  onChange={(e) =>
                    setNewListDescription(
                      e.target.value
                    )
                  }
                  placeholder="Describe this pricing tier..."
                  rows={3}
                  id="textarea-price-list-description"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Initial product info */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-xs font-bold text-blue-800">
                  Initial Product Pricing
                </p>

                <p className="text-[11px] text-blue-700 mt-1">
                  {products.length > 0
                    ? `${products.length} product${
                        products.length === 1
                          ? ''
                          : 's'
                      } will be added using their current Product master base rates. You can edit each Price List rate after creation.`
                    : 'No products are currently available in the Product master.'}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  id="btn-save-price-list"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Price List
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceListMaster;