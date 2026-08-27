import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SalesOffice } from '../types';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Building,
  MapPin,
  FileCheck,
  User,
  Tags
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SalesOfficeMaster: React.FC = () => {
  const {
    salesOffices,
    addSalesOffice,
    updateSalesOffice,
    deleteSalesOffice,
    users,
    priceLists,
    schemeLists
  } = useApp();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [selectedOffice, setSelectedOffice] = useState<SalesOffice | null>(null);

  // Form inputs
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pin, setPin] = useState('');
  const [gst, setGst] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [zone, setZone] = useState('');
  const [priceListId, setPriceListId] = useState('PL-STANDARD');
  const [schemeListId, setSchemeListId] = useState('SL-STANDARD');

  // Filter Sales Officer accounts
  const salesOfficers = users.filter((u) => u.role === 'Sales Officer');

  // Open modals
  const handleOpenAddModal = () => {
    setModalMode('Add');
    setSelectedOffice(null);
    setAccountId(`ACC-${Math.floor(100 + Math.random() * 900)}`);
    setAccountName('');
    setAddress('');
    setDistrict('');
    setState('Karnataka');
    setPin('');
    setGst('');
    setAssignedUser(salesOfficers[0]?.username || '');
    setZone('South Bangalore');
    setPriceListId('PL-STANDARD');
    setSchemeListId('SL-SUMMER-SPECIAL');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (office: SalesOffice) => {
    setModalMode('Edit');
    setSelectedOffice(office);
    setAccountId(office.accountId);
    setAccountName(office.accountName);
    setAddress(office.address);
    setDistrict(office.district);
    setState(office.state);
    setPin(office.pin);
    setGst(office.gst);
    setAssignedUser(office.assignedUser);
    setZone(office.zone);
    setPriceListId(office.priceListId);
    setSchemeListId(office.schemeListId);
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast.error('Account Name is required.');
      return;
    }

    const payload: SalesOffice = {
      accountId,
      accountName,
      address,
      district,
      state,
      pin,
      gst,
      assignedUser,
      zone,
      priceListId,
      schemeListId,
    };

    if (modalMode === 'Add') {
      const exists = salesOffices.some((o) => o.accountId === accountId);
      if (exists) {
        toast.error(`Account ID ${accountId} already exists.`);
        return;
      }
      addSalesOffice(payload);
      toast.success('Sales office account linked.');
    } else {
      updateSalesOffice(payload);
      toast.success('Sales office parameters saved.');
    }
    setIsModalOpen(false);
  };

  // Delete office handler
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this agency sales account?')) {
      deleteSalesOffice(id);
      toast.success('Account deleted.');
    }
  };

  // Search filter
  const filteredOffices = salesOffices.filter((o) => {
    return (
      o.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.zone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);
  const paginatedOffices = filteredOffices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6" id="sales-office-master-section">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Sales Account Master (Agencies)
          </h1>
          <p className="text-slate-500 text-sm">
            Coordinate major retail outlets, commercial distributors, and map pricing structures to designated territories.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-office"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" /> Add Retail Account
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex gap-4 items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search accounts by Account ID, name, or sales zone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            id="office-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>
      </div>

      {/* Main Grid Tables */}
      <div className="grid grid-cols-1 gap-6">
        {paginatedOffices.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400">
            No accounts matched your filters. Link some agencies first.
          </div>
        ) : (
          paginatedOffices.map((office) => (
            <div
              key={office.accountId}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori flex flex-col md:flex-row justify-between gap-6 interactive-card"
            >
              <div className="space-y-4 flex-1">
                {/* Header info */}
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-brand-50 text-brand-700 shrink-0">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {office.accountId}
                      </span>
                      <span className="text-xs text-brand-600 font-semibold bg-brand-50 px-2.5 py-0.5 rounded-full">
                        Zone: {office.zone}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-slate-800 text-base mt-1.5">
                      {office.accountName}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {office.address}, {office.district}, {office.state} - {office.pin}
                    </p>
                  </div>
                </div>

                {/* Grid attributes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Assigned Sales Officer</p>
                      <p className="font-semibold text-slate-800">@{office.assignedUser}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4.5 w-4.5 text-emerald-500" />
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pricing Tier</p>
                      <p className="font-semibold text-slate-800">
                        {priceLists.find((p) => p.id === office.priceListId)?.name || office.priceListId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tags className="h-4.5 w-4.5 text-amber-500" />
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Promotional Schemes</p>
                      <p className="font-semibold text-slate-800">
                        {schemeLists.find((s) => s.id === office.schemeListId)?.name || office.schemeListId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action and compliance parameters */}
              <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  GSTIN: {office.gst || 'UNREGISTERED'}
                </span>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <button
                    onClick={() => handleOpenEditModal(office)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    id={`btn-edit-office-${office.accountId}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Parameters
                  </button>
                  <button
                    onClick={() => handleDelete(office.accountId)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove Account"
                    id={`btn-delete-office-${office.accountId}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-fiori">
          <span className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredOffices.length)} of{' '}
            {filteredOffices.length} accounts
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

      {/* Create / Edit Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'Add' ? 'Link New Retail/Agency Account' : `Edit Account Configuration: ${accountId}`}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5" id="sales-office-modal-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Account ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Account ID / Code *
              </label>
              <input
                type="text"
                required
                disabled={modalMode === 'Edit'}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 font-bold"
              />
            </div>

            {/* Account Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Account Name (Retail / Agency) *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Manjunatha Agencies"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              />
            </div>

            {/* District */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                District / Territory
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Bangalore Urban"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Sales Zone */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sales Zone Region *
              </label>
              <input
                type="text"
                required
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. South Bangalore"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Delivery / Billing Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Shopping Complex Street, Main Cross"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* State */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Postal PIN */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Postal PIN Code *
              </label>
              <input
                type="text"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="560004"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* GST Number */}
            <div className="space-y-1 col-span-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                GSTIN Reg. Number
              </label>
              <input
                type="text"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="29ACDPA5461J1ZP"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* Assigned User (Sales Officer) */}
            <div className="space-y-1 col-span-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Assigned Sales Officer *
              </label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                {salesOfficers.length === 0 ? (
                  <option disabled>No Sales Officers registered. Create one in User Master!</option>
                ) : (
                  salesOfficers.map((so) => (
                    <option key={so.username} value={so.username}>
                      {so.employeeName} (@{so.username})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Price List Link */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Linked Price List Template *
              </label>
              <select
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                {priceLists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Scheme List Link */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Linked Promotional Scheme List *
              </label>
              <select
                value={schemeListId}
                onChange={(e) => setSchemeListId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                {schemeLists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
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
              Link Account Setup
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SalesOfficeMaster;
