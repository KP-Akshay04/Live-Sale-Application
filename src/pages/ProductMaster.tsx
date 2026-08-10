import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ProductMaster: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();

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

  // Form inputs
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [additionalName, setAdditionalName] = useState('');
  const [category, setCategory] = useState('Beverages');
  const [group, setGroup] = useState('Soda');
  const [hsnCode, setHsnCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [baseUom, setBaseUom] = useState('Box');
  const [alternativeQty, setAlternativeQty] = useState(12);
  const [rate, setRate] = useState(0);

  // Get unique categories and groups for filtering dropdowns
  const categories = ['All', ...new Set(products.map((p) => p.category))];
  const groups = ['All', ...new Set(products.map((p) => p.group))];

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
    setGroup('Tea');
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
    setId(product.id);
    setDescription(product.description);
    setAdditionalName(product.additionalName);
    setCategory(product.category);
    setGroup(product.group);
    setHsnCode(product.hsnCode);
    setBarcode(product.barcode);
    setGstRate(product.gstRate);
    setBaseUom(product.baseUom);
    setAlternativeQty(product.alternativeQty);
    setRate(product.rate);
    setIsModalOpen(true);
  };

  // Submit Modal Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Description is required.');
      return;
    }

    const payload: Product = {
      id,
      description,
      additionalName,
      category,
      group,
      hsnCode,
      barcode,
      gstRate: Number(gstRate),
      baseUom,
      alternativeQty: Number(alternativeQty),
      rate: Number(rate),
    };

    if (modalMode === 'Add') {
      const exists = products.some((p) => p.id === id);
      if (exists) {
        toast.error(`Product ID ${id} already exists.`);
        return;
      }
      addProduct(payload);
      toast.success('Product added successfully!');
    } else {
      updateProduct(payload);
      toast.success('Product updated successfully!');
    }
    setIsModalOpen(false);
  };

  // Delete product action
  const handleDelete = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product? It will be removed from all price catalogs.')) {
      deleteProduct(productId);
      toast.success('Product removed.');
    }
  };

  // Filter and Sort calculation
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm);
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
      const matchesGroup = groupFilter === 'All' || product.group === groupFilter;

      return matchesSearch && matchesCategory && matchesGroup;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

  // Paginated layout calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
            Configure enterprise catalog items, HSN parameters, barcode mappings, and GST structures.
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
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse" id="product-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">
                    Product ID {sortField === 'id' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('description')}>
                  <div className="flex items-center gap-1">
                    Description & Barcode {sortField === 'description' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th className="px-6 py-4">Alt / Additional Name</th>
                <th className="px-6 py-4">Category / Group</th>
                <th className="px-6 py-4">HSN Code</th>
                <th className="px-6 py-4">GST Rate</th>
                <th className="px-6 py-4 text-right">Base Price</th>
                <th className="px-6 py-4 text-center">UOM / Box Qty</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No products matched your parameters. Create a new one or clear search filters.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {product.id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{product.description}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">BC: {product.barcode || 'N/A'}</p>
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
                        <span className="text-[10px] text-slate-400">
                          Group: {product.group}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {product.hsnCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {product.gstRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      ₹{product.rate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-semibold">{product.baseUom}</p>
                      <p className="text-[10px] text-slate-400">1 Box = {product.alternativeQty} Pcs</p>
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
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Delete Product"
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
        <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4" id="product-mobile-cards">
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
                      {product.id}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-sm mt-0.5">
                      {product.description}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">BC: {product.barcode || 'N/A'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">₹{product.rate.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-500 font-medium block">{product.baseUom}</span>
                    <span className="text-[9px] text-slate-400 block">({product.alternativeQty} Pcs)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8px]">Category</span>
                    <span className="font-medium text-slate-700">{product.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8px]">Group</span>
                    <span className="font-medium text-slate-700">{product.group}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8px]">HSN Code</span>
                    <span className="font-mono font-medium text-slate-700">{product.hsnCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8px]">GST Rate</span>
                    <span className="font-semibold text-slate-700">{product.gstRate}%</span>
                  </div>
                </div>

                {product.additionalName && (
                  <p className="text-[10px] italic text-slate-400">Alt Short Name: {product.additionalName}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100/40">
                  <button
                    onClick={() => handleOpenEditModal(product)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    id={`btn-edit-mobile-${product.id}`}
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-100 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    id={`btn-delete-mobile-${product.id}`}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
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
      </div>

      {/* Create / Edit Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'Add' ? 'Add New Product Master Entry' : `Edit Product: ${id}`}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5" id="product-modal-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Product ID (Code)
              </label>
              <input
                type="text"
                required
                disabled={modalMode === 'Edit'}
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Full Description *
              </label>
              <input
                type="text"
                required
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
                required
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
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value={0}>0% (Tax Exempted)</option>
                <option value={5}>5% (Essential Goods)</option>
                <option value={12}>12% (Standard rate 1)</option>
                <option value={18}>18% (Standard rate 2)</option>
                <option value={28}>28% (Luxury rate)</option>
              </select>
            </div>

            {/* Base UOM */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Base UOM
              </label>
              <select
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
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
            >
              Save Product Catalog Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductMaster;
