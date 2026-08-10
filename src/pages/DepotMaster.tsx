import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Depot } from '../types';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Warehouse,
  UserCheck,
  PhoneCall
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const DepotMaster: React.FC = () => {
  const { depots, addDepot, updateDepot, deleteDepot, users } = useApp();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);

  // Form inputs
  const [siteName, setSiteName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pin, setPin] = useState('');
  const [gst, setGst] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [salesTag, setSalesTag] = useState('');
  const [assignedUser, setAssignedUser] = useState('');

  // Filter users with Depot Person role for assignment dropdown
  const depotUsers = users.filter((u) => u.role === 'Depot Person');

  // Open modals
  const handleOpenAddModal = () => {
    setModalMode('Add');
    setSelectedDepot(null);
    setSiteName('');
    setDescription('');
    setAddress('');
    setCity('');
    setDistrict('');
    setState('Karnataka');
    setPin('');
    setGst('');
    setContactNumber('');
    setSalesTag('');
    setAssignedUser(depotUsers[0]?.username || '');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (depot: Depot) => {
    setModalMode('Edit');
    setSelectedDepot(depot);
    setSiteName(depot.siteName);
    setDescription(depot.description);
    setAddress(depot.address);
    setCity(depot.city);
    setDistrict(depot.district);
    setState(depot.state);
    setPin(depot.pin);
    setGst(depot.gst);
    setContactNumber(depot.contactNumber);
    setSalesTag(depot.salesTag);
    setAssignedUser(depot.assignedUser);
    setIsModalOpen(true);
  };

  // Submit Modal Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      toast.error('Site Name is required.');
      return;
    }

    const payload: Depot = {
      siteName,
      description,
      address,
      city,
      district,
      state,
      pin,
      gst,
      contactNumber,
      salesTag,
      assignedUser,
    };

    if (modalMode === 'Add') {
      const exists = depots.some((d) => d.siteName.toLowerCase() === siteName.toLowerCase());
      if (exists) {
        toast.error(`Depot with site name "${siteName}" already exists.`);
        return;
      }
      addDepot(payload);
      toast.success('Warehouse Depot registered.');
    } else {
      updateDepot(payload);
      toast.success('Warehouse Depot updated.');
    }
    setIsModalOpen(false);
  };

  // Delete Depot handler
  const handleDelete = (name: string) => {
    if (window.confirm(`Are you sure you want to delete depot: ${name}?`)) {
      deleteDepot(name);
      toast.success('Depot deleted.');
    }
  };

  // Filter calculation
  const filteredDepots = depots.filter((depot) => {
    return (
      depot.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      depot.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      depot.salesTag.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Paginated layout calculations
  const totalPages = Math.ceil(filteredDepots.length / itemsPerPage);
  const paginatedDepots = filteredDepots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6" id="depot-master-section">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Depot Site Registry
          </h1>
          <p className="text-slate-500 text-sm">
            Configure shipping logistics hubs, warehousing properties, and assign authorized Depot Operators.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-depot"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" /> Add Logistics Depot
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
            placeholder="Search depots by name, city, or sales tag..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            id="depot-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="grid grid-cols-1 gap-6">
        {paginatedDepots.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400">
            No logistics depots located. Register your primary distribution centers.
          </div>
        ) : (
          paginatedDepots.map((depot) => (
            <div
              key={depot.siteName}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori flex flex-col md:flex-row justify-between gap-6 interactive-card"
            >
              <div className="space-y-4 flex-1">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-brand-50 text-brand-600 shrink-0">
                    <Warehouse className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-base">
                      {depot.siteName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{depot.description}</p>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider mt-2">
                      TAG: {depot.salesTag || 'UNASSIGNED'}
                    </span>
                  </div>
                </div>

                {/* Sub Metadata info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-50">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Location Address</p>
                      <p className="text-slate-500 mt-0.5">
                        {depot.address}, {depot.city}, {depot.district}, {depot.state} - {depot.pin}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <PhoneCall className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Contact Details</p>
                      <p className="text-slate-500 mt-0.5">{depot.contactNumber || 'N/A'}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">GST: {depot.gst}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <UserCheck className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Assigned Depot Officer</p>
                      <p className="text-brand-600 font-bold mt-0.5">@{depot.assignedUser}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Authorized to issue stock</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons side */}
              <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  ERP Log Verified
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(depot)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    id={`btn-edit-depot-${depot.siteName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Configuration
                  </button>
                  <button
                    onClick={() => handleDelete(depot.siteName)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove Depot"
                    id={`btn-delete-depot-${depot.siteName.toLowerCase().replace(/\s+/g, '-')}`}
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
            {Math.min(currentPage * itemsPerPage, filteredDepots.length)} of{' '}
            {filteredDepots.length} depots
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
        title={modalMode === 'Add' ? 'Register New Logistics Depot Site' : `Edit Depot Config: ${siteName}`}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5" id="depot-modal-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Site Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Site Location Name *
              </label>
              <input
                type="text"
                required
                disabled={modalMode === 'Edit'}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. South Bangalore Depot"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 font-semibold"
              />
            </div>

            {/* Sales Tag */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sales Tag Code
              </label>
              <input
                type="text"
                value={salesTag}
                onChange={(e) => setSalesTag(e.target.value)}
                placeholder="e.g. KA-SOUTH"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono font-bold"
              />
            </div>

            {/* Description */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Description / Purpose
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Main southern route top-up hub"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Plot Number, Industrial Phase"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bangalore"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* District */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Bangalore Urban"
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

            {/* PIN */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Postal PIN Code *
              </label>
              <input
                type="text"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="560058"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* GST */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                GSTIN Number *
              </label>
              <input
                type="text"
                required
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="29AAAAA1111A1Z1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Landline/Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Assigned User */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Assigned Authorized Operator (Depot Person Role) *
              </label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                {depotUsers.length === 0 ? (
                  <option disabled>No Depot Person users registered in system. Create one first!</option>
                ) : (
                  depotUsers.map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.employeeName} (@{u.username})
                    </option>
                  ))
                )}
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
              Register Depot Site
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepotMaster;
