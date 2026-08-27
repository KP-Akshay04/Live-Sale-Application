import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { productService } from '../services/productService';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  FolderOpen,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ProductMaster: React.FC = () => {
  const { refreshProducts: syncContextProducts } = useApp();

  // Component Data State (Authoritative MySQL source)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [sortField, setSortField] = useState<keyof Product>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form inputs
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [additionalName, setAdditionalName] = useState('');
  const [category, setCategory] = useState('Beverages');
  const [group, setGroup] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [baseUom, setBaseUom] = useState('Box');
  const [alternativeQty, setAlternativeQty] = useState(12);
  const [rate, setRate] = useState(0);

  /**
   * Load products authoritatively from MySQL
   */
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
      if (syncContextProducts) {
        syncContextProducts();
      }
    } catch (err: any) {
      console.error('[ProductMaster] Failed to load products from database:', err);
      const errMsg =
        err.response?.data?.error?.message || err.message || 'Failed to load products from MySQL';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [syncContextProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Get unique categories and groups for filtering dropdowns
  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];
  const groups = ['All', ...new Set(products.map((p) => p.group).filter(Boolean))];

  // Sorting handler
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Open modals
  const handleOpenAddModal = () => {
    setModalMode('Add');
    setSelectedProduct(null);
    // Pre-fill / reset form
    setId(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setDescription('');
    setAdditionalName('');
    setCategory('Beverages');
    setGroup('');
    setHsnCode('09023020');
    setBarcode('');
    setGstRate(18);
    setBaseUom('Box');
    setAlternativeQty(24);
    setRate(100);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setModalMode('Edit');
    setSelectedProduct(product);
    setId(product.materialCode || product.id);
    setDescription(product.description);
    setAdditionalName(product.additionalName || '');
    setCategory(product.category || 'Beverages');
    setGroup(product.group || '');
    setHsnCode(product.hsnCode || '');
    setBarcode(product.barcode || '');
    setGstRate(product.gstRate ?? product.taxRate ?? 18);
    setBaseUom(product.baseUom || 'Box');
    setAlternativeQty(product.alternativeQty || 1);
    setRate(product.rate ?? product.baseRate ?? 0);
    setIsModalOpen(true);
  };

  // Submit Modal Form to MySQL
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Product Description is required.');
      return;
    }
    if (!id.trim()) {
      toast.error('Product Material Code (ID) is required.');
      return;
    }
    if (isNaN(Number(rate)) || Number(rate) < 0) {
      toast.error('Base Rate must be a valid positive number.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (modalMode === 'Add') {
        await productService.createProduct({
          materialCode: id.trim(),
          description: description.trim(),
          additionalName: additionalName.trim(),
          category: category.trim(),
          group: group.trim(),
          hsnCode: hsnCode.trim(),
          barcode: barcode.trim(),
          gstRate: Number(gstRate),
          taxRate: Number(gstRate),
          baseUom: baseUom.trim(),
          alternativeQty: Number(alternativeQty) || 1,
          baseRate: Number(rate),
          rate: Number(rate),
          isActive: true,
        });
        toast.success(`Product ${description} registered in MySQL successfully!`);
      } else if (selectedProduct) {
        const updateTargetId = selectedProduct.productId || selectedProduct.id;
        await productService.updateProduct(updateTargetId, {
          materialCode: id.trim(),
          description: description.trim(),
          additionalName: additionalName.trim(),
          category: category.trim(),
          group: group.trim(),
          hsnCode: hsnCode.trim(),
          barcode: barcode.trim(),
          gstRate: Number(gstRate),
          taxRate: Number(gstRate),
          baseUom: baseUom.trim(),
          alternativeQty: Number(alternativeQty) || 1,
          baseRate: Number(rate),
          rate: Number(rate),
        });
        toast.success(`Product ${description} updated in MySQL successfully!`);
      }

      setIsModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      console.error('[ProductMaster] Form submission error:', err);
      const errMsg =
        err.response?.data?.error?.message || err.message || 'Failed to save product to database';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Deactivation / Soft Delete in MySQL
  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsSubmitting(true);
      const targetId = productToDelete.productId || productToDelete.id;
      await productService.updateProductStatus(targetId, false);
      toast.success(`Product ${productToDelete.description} (${productToDelete.id}) deactivated.`);
      setProductToDelete(null);
      await loadProducts();
    } catch (err: any) {
      console.error('[ProductMaster] Status deactivation error:', err);
      const errMsg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to deactivate product in database';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and Sort calculation
  const filteredProducts = products
    .filter((product) => {
      const prodCode = (product.materialCode || product.id || '').toLowerCase();
      const prodDesc = (product.description || '').toLowerCase();
      const prodBc = (product.barcode || '').toLowerCase();
      const s = searchTerm.toLowerCase();

      const matchesSearch = prodDesc.includes(s) || prodCode.includes(s) || prodBc.includes(s);
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
      const matchesGroup = groupFilter === 'All' || product.group === groupFilter;

      return matchesSearch && matchesCategory && matchesGroup;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

  // Paginated layout calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (effectivePage - 1) * itemsPerPage,
    effectivePage * itemsPerPage
  );

  return (
    <div className="space-y-6" id="product-master-section">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Product Master Catalog
          </h1>
          <p className="text-slate-500 text-sm">
            Database-backed enterprise catalog items, HSN parameters, barcode mappings, and GST
            structures in MySQL.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-product"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" /> Add Product Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex flex-col lg:flex-row gap-4 justify-between items-stretch">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by ID, product name, or barcode..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            id="product-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl min-w-[150px]">
            <FolderOpen className="h-4 w-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              id="filter-category"
              className="bg-transparent border-none text-xs font-semibold text-slate-600 focus:outline-none cursor-pointer w-full"
            >
              <option disabled>Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Group Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl min-w-[150px]">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setCurrentPage(1);
              }}
              id="filter-group"
              className="bg-transparent border-none text-xs font-semibold text-slate-600 focus:outline-none cursor-pointer w-full"
            >
              <option disabled>Group</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === 'All' ? 'All Groups' : g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Fetching authoritative catalog from MySQL...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="product-master-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center gap-1">
                        Product ID{' '}
                        {sortField === 'id' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center gap-1">
                        Description & Barcode{' '}
                        {sortField === 'description' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ))}
                      </div>
                    </th>
                    <th className="px-6 py-4">Alt / Additional Name</th>
                    <th className="px-6 py-4">Category / Group</th>
                    <th className="px-6 py-4">HSN Code</th>
                    <th className="px-6 py-4">GST Rate</th>
                    <th className="px-6 py-4 text-right">Base Price</th>
                    <th className="px-6 py-4 text-center">UOM / Box Qty</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        No products matched your parameters. Create a new one or clear search filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {product.materialCode || product.id}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{product.description}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              BC: {product.barcode || 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 italic text-slate-500">
                          {product.additionalName || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-semibold text-[10px] w-fit">
                              {product.category}
                            </span>
                            {product.group && (
                              <span className="text-[10px] text-slate-400">
                                Group: {product.group}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono">{product.hsnCode || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {product.gstRate ?? product.taxRate ?? 0}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                          ₹{(product.rate ?? product.baseRate ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="font-semibold">{product.baseUom || 'Box'}</p>
                          <p className="text-[10px] text-slate-400">
                            1 Box = {product.alternativeQty || 1} Pcs
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {product.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(product)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Edit Product"
                              id={`btn-edit-${product.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title="Deactivate Product"
                              id={`btn-delete-${product.id}`}
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

            {/* Mobile Card Grid View */}
            <div
              className="block md:hidden divide-y divide-slate-100 p-4 space-y-4"
              id="product-mobile-cards"
            >
              {paginatedProducts.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-xs">
                  No products matched your parameters. Create a new one or clear search filters.
                </p>
              ) : (
                paginatedProducts.map((product) => (
                  <div key={product.id} className="pt-4 first:pt-0 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-brand-600 block">
                          {product.materialCode || product.id}
                        </span>
                        <h4 className="font-semibold text-slate-900 text-sm mt-0.5">
                          {product.description}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          BC: {product.barcode || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          ₹{(product.rate ?? product.baseRate ?? 0).toFixed(2)}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          {product.baseUom}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          ({product.alternativeQty} Pcs)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">
                          Category
                        </span>
                        <span className="font-medium text-slate-700">{product.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">
                          Group
                        </span>
                        <span className="font-medium text-slate-700">{product.group || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">
                          HSN Code
                        </span>
                        <span className="font-mono font-medium text-slate-700">
                          {product.hsnCode || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">
                          GST Rate
                        </span>
                        <span className="font-semibold text-slate-700">
                          {product.gstRate ?? product.taxRate ?? 0}%
                        </span>
                      </div>
                    </div>

                    {product.additionalName && (
                      <p className="text-[10px] italic text-slate-400">
                        Alt Short Name: {product.additionalName}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/40">
                      <div>
                        {product.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                          id={`btn-edit-mobile-${product.id}`}
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-100 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                          id={`btn-delete-mobile-${product.id}`}
                        >
                          <Trash2 className="h-3 w-3" /> Deactivate
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of{' '}
                  {filteredProducts.length} entries
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                        currentPage === idx + 1
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={modalMode === 'Add' ? 'Add New Product Master Entry' : `Edit Product: ${id}`}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5" id="product-modal-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ID / Material Code */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Product Material Code *
              </label>
              <input
                type="text"
                required
                disabled={modalMode === 'Edit' || isSubmitting}
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 font-mono"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Full Description / Name *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Premium Mango Pulp Juice 1L"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Additional Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Alternate/Short Name
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={additionalName}
                onChange={(e) => setAdditionalName(e.target.value)}
                placeholder="e.g. Mango 1L"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Product Category
              </label>
              <select
                disabled={isSubmitting}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="Beverages">Beverages</option>
                <option value="Packaged Water">Packaged Water</option>
                <option value="Snacks & Foods">Snacks & Foods</option>
                <option value="Confectionery">Confectionery</option>
              </select>
            </div>

            {/* Group */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Product Group
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="e.g. Fruit Juice"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* HSN Code */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                HSN Code
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 22029920"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* Barcode */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                EAN/UPC Barcode
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="890105800..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* GST Rate */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Applicable GST Rate (%)
              </label>
              <select
                disabled={isSubmitting}
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value={0}>0% (Tax Exempted)</option>
                <option value={5}>5% (Essential Goods)</option>
                <option value={12}>12% (Standard rate 1)</option>
                <option value={18}>18% (Standard rate 2)</option>
                <option value={40}>40% (Luxury rate)</option>
              </select>
            </div>

            {/* Base UOM */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Base UOM
              </label>
              <select
                disabled={isSubmitting}
                value={baseUom}
                onChange={(e) => setBaseUom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="Box">Box</option>
                <option value="Crate">Crate</option>
                <option value="Case">Case</option>
                <option value="Pcs">Pcs</option>
              </select>
            </div>

            {/* Alternative Qty */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pieces per Box (Alternative Quantity)
              </label>
              <input
                type="number"
                min={1}
                required
                disabled={isSubmitting}
                value={alternativeQty}
                onChange={(e) => setAlternativeQty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Rate */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Default Base Rate (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                required
                disabled={isSubmitting}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {modalMode === 'Add' ? 'Save Product to MySQL' : 'Update Product in MySQL'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => !isSubmitting && setProductToDelete(null)}
        title="Confirm Deactivate Product"
        size="sm"
      >
        <div className="space-y-4" id="delete-confirmation-dialog">
          <p className="text-slate-600 text-xs">
            Are you sure you want to deactivate product{' '}
            <strong className="text-slate-900">{productToDelete?.description}</strong> (
            {productToDelete?.id})? In accordance with database safety constraints, the product will
            be marked inactive in MySQL to preserve historical transaction audit logs.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setProductToDelete(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-delete"
              disabled={isSubmitting}
              onClick={confirmDeleteProduct}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Deactivate Product
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductMaster;
