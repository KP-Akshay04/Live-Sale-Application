import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SchemeList, SchemeListItem } from '../types';
import { Modal } from '../components/common/Modal';
import {
  TicketPercent,
  Search,
  Plus,
  Trash2,
  Package,
  Eye,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SchemeListMaster: React.FC = () => {
  const { schemeLists, products, addSchemeList, deleteSchemeList } = useApp();

  const [searchTerm, setSearchTerm] = useState('');

  // Add Scheme Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSchemeId, setNewSchemeId] = useState('');
  const [newSchemeName, setNewSchemeName] = useState('');
  const [newSchemeItems, setNewSchemeItems] = useState<SchemeListItem[]>([]);

  // View Scheme Modal state
  const [viewScheme, setViewScheme] = useState<SchemeList | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Delete Scheme Confirmation state
  const [schemeToDelete, setSchemeToDelete] = useState<SchemeList | null>(null);

  // Initialize new scheme dialog with 0 rows
  const handleOpenAddModal = () => {
    setNewSchemeId(`SL-${Date.now().toString().slice(-4)}`);
    setNewSchemeName('');
    setNewSchemeItems([]); // Start with EMPTY scheme items list
    setIsAddModalOpen(true);
  };

  // Add a new empty row to draft scheme
  const handleAddRow = () => {
    const defaultProduct = products[0];
    const newRow: SchemeListItem = {
      productId: defaultProduct ? defaultProduct.id : `PROD-${Date.now().toString().slice(-3)}`,
      rate: defaultProduct ? defaultProduct.rate : 100,
      uom: defaultProduct ? defaultProduct.baseUom : 'Box',
      boxPcs: 'Box',
      buyQty: 10,
      freeQty: 1,
    };
    setNewSchemeItems((prev) => [...prev, newRow]);
  };

  // Remove a row from draft scheme
  const handleRemoveRow = (index: number) => {
    setNewSchemeItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle value change for a row field in draft scheme
  const handleRowChange = (index: number, field: keyof SchemeListItem, value: any) => {
    setNewSchemeItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          const selectedProd = products.find((p) => p.id === value);
          return {
            ...item,
            productId: value,
            rate: selectedProd ? selectedProd.rate : item.rate,
            uom: selectedProd ? selectedProd.baseUom : item.uom,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleCreateSchemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchemeId.trim()) {
      toast.error('Scheme ID is required.');
      return;
    }
    if (!newSchemeName.trim()) {
      toast.error('Scheme Name is required.');
      return;
    }
    if (newSchemeItems.length === 0) {
      toast.error('Please add at least one promotional product item to the scheme.');
      return;
    }

    const cleanId = newSchemeId.trim().toUpperCase();
    if (schemeLists.some((s) => s.id.toUpperCase() === cleanId)) {
      toast.error(`Scheme ID "${cleanId}" already exists.`);
      return;
    }

    const createdScheme: SchemeList = {
      id: cleanId,
      name: newSchemeName.trim(),
      items: newSchemeItems,
    };

    addSchemeList(createdScheme);
    setIsAddModalOpen(false);
    toast.success(`Promotional scheme "${createdScheme.name}" created successfully!`);
  };

  const handleDeleteScheme = (scheme: SchemeList) => {
    setSchemeToDelete(scheme);
  };

  const confirmDeleteScheme = () => {
    if (schemeToDelete) {
      try {
        deleteSchemeList(schemeToDelete.id);
        toast.success(`Scheme "${schemeToDelete.name}" (${schemeToDelete.id}) deleted.`);
        if (viewScheme?.id === schemeToDelete.id) {
          setViewScheme(null);
          setIsViewModalOpen(false);
        }
        setSchemeToDelete(null);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete scheme.');
      }
    }
  };

  const handleOpenViewModal = (scheme: SchemeList) => {
    setViewScheme(scheme);
    setIsViewModalOpen(true);
  };

  // Filter schemes for vertical list
  const filteredSchemes = schemeLists.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="scheme-list-master-section">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight flex items-center gap-2">
            <TicketPercent className="h-6 w-6 text-brand-600" /> Scheme Master
          </h1>
          <p className="text-slate-500 text-sm">
            Manage volume & promotional scheme definitions, Buy-X-Get-Y deals, and promotional pricing structures.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
          id="btn-add-scheme-master"
        >
          <Plus className="h-4 w-4" /> Create Scheme
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-fiori flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search schemes by ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="scheme-search-input"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-xs transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-emerald-600" /> {schemeLists.length} Registered Schemes
          </span>
        </div>
      </div>

      {/* Main Vertical / Row-Wise Scheme Master Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="scheme-list-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Scheme Code / ID</th>
                <th className="px-6 py-4">Scheme Name</th>
                <th className="px-6 py-4 text-center">Configured Products</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filteredSchemes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    No schemes found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredSchemes.map((scheme) => (
                  <tr key={scheme.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-brand-600">
                      {scheme.id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div>
                        <p className="text-sm text-slate-800">{scheme.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {scheme.items.length} items configured in deal structure
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                        <Package className="h-3 w-3 text-slate-500" /> {scheme.items.length} Products
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenViewModal(scheme)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-all"
                          id={`btn-view-scheme-${scheme.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>

                        <button
                          onClick={() => handleDeleteScheme(scheme)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                          title={`Delete Scheme ${scheme.id}`}
                          id={`btn-delete-scheme-${scheme.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Scheme Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Promotional Scheme"
        size="xl"
      >
        <form onSubmit={handleCreateSchemeSubmit} className="space-y-5" id="create-scheme-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheme ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Scheme ID / Code *
              </label>
              <input
                type="text"
                required
                value={newSchemeId}
                onChange={(e) => setNewSchemeId(e.target.value)}
                placeholder="e.g. SL-FESTIVE-SPECIAL"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-brand-500"
                id="input-new-scheme-id"
              />
            </div>

            {/* Scheme Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Scheme Name / Description *
              </label>
              <input
                type="text"
                required
                value={newSchemeName}
                onChange={(e) => setNewSchemeName(e.target.value)}
                placeholder="e.g. Dussehra Volume Promotion Scheme"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-brand-500"
                id="input-new-scheme-name"
              />
            </div>
          </div>

          {/* Scheme Items Table Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-brand-500" /> Scheme Items Configuration
              </label>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-lg border border-brand-200 transition-all"
                id="btn-add-row-scheme"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-right">Promo Deal Rate (₹)</th>
                    <th className="p-2.5 text-center">Config UOM</th>
                    <th className="p-2.5 text-center">Packaging</th>
                    <th className="p-2.5 text-center">Buy Quantity</th>
                    <th className="p-2.5 text-center">Free Quantity</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {newSchemeItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No items added yet. Click <span className="font-bold text-brand-600">'+ Add Row'</span> to add promotional products to this scheme.
                      </td>
                    </tr>
                  ) : (
                    newSchemeItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        {/* Product selection */}
                        <td className="p-2.5">
                          <select
                            value={item.productId}
                            onChange={(e) => handleRowChange(index, 'productId', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.id} - {p.description}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Rate */}
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleRowChange(index, 'rate', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-right font-bold text-slate-900 focus:outline-none focus:border-brand-500 text-xs"
                          />
                        </td>

                        {/* Config UOM */}
                        <td className="p-2.5 text-center">
                          <select
                            value={item.uom}
                            onChange={(e) => handleRowChange(index, 'uom', e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                          >
                            <option value="Box">Box</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Case">Case</option>
                          </select>
                        </td>

                        {/* Packaging */}
                        <td className="p-2.5 text-center">
                          <select
                            value={item.boxPcs}
                            onChange={(e) => handleRowChange(index, 'boxPcs', e.target.value as 'Box' | 'Pcs')}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                          >
                            <option value="Box">Box</option>
                            <option value="Pcs">Pcs</option>
                          </select>
                        </td>

                        {/* Buy Qty */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.buyQty}
                            onChange={(e) => handleRowChange(index, 'buyQty', Math.max(1, Number(e.target.value)))}
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:border-brand-500 text-xs"
                          />
                        </td>

                        {/* Free Qty */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item.freeQty}
                            onChange={(e) => handleRowChange(index, 'freeQty', Math.max(0, Number(e.target.value)))}
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-emerald-600 focus:outline-none focus:border-brand-500 text-xs"
                          />
                        </td>

                        {/* Action - Delete row */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
              id="btn-save-created-scheme"
            >
              Save Promotional Scheme
            </button>
          </div>
        </form>
      </Modal>

      {/* Scheme Details Modal (View) */}
      {viewScheme && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Scheme Details — ${viewScheme.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Scheme Code / ID:</p>
                <p className="font-mono font-bold text-brand-600 text-sm">{viewScheme.id}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Scheme Name:</p>
                <p className="font-semibold text-slate-800 text-sm">{viewScheme.name}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Product ID</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">Promo Rate (₹)</th>
                    <th className="p-3 text-center">Config UOM</th>
                    <th className="p-3 text-center">Packaging</th>
                    <th className="p-3 text-center font-bold text-brand-600">Buy Qty</th>
                    <th className="p-3 text-center font-bold text-emerald-600">Free Qty</th>
                    <th className="p-3 text-center">Offer Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {viewScheme.items.map((item, idx) => {
                    const productObj = products.find((p) => p.id === item.productId);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-800">{item.productId}</td>
                        <td className="p-3 font-semibold text-slate-800">{productObj?.description || item.productId}</td>
                        <td className="p-3 text-right font-bold text-slate-900">₹{item.rate.toFixed(2)}</td>
                        <td className="p-3 text-center font-medium">{item.uom}</td>
                        <td className="p-3 text-center font-medium">{item.boxPcs}</td>
                        <td className="p-3 text-center font-bold text-slate-800">{item.buyQty}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{item.freeQty}</td>
                        <td className="p-3 text-center">
                          {item.freeQty > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                              Buy {item.buyQty} Get {item.freeQty} Free
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Standard Rate</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Scheme Confirmation Modal */}
      {schemeToDelete && (
        <Modal
          isOpen={!!schemeToDelete}
          onClose={() => setSchemeToDelete(null)}
          title="Confirm Delete Scheme"
          size="sm"
        >
          <div className="space-y-4" id="delete-scheme-confirmation-dialog">
            <p className="text-slate-600 text-xs">
              Are you sure you want to delete promotional scheme <strong className="text-slate-900">{schemeToDelete.name}</strong> (<span className="font-mono font-bold text-brand-600">{schemeToDelete.id}</span>)?
            </p>
            <p className="text-slate-500 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              This action will permanently remove this scheme and all of its {schemeToDelete.items.length} configured product item deal structure(s).
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSchemeToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-scheme"
                onClick={confirmDeleteScheme}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/10 active:scale-[0.98] transition-all"
              >
                Delete Scheme
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SchemeListMaster;

