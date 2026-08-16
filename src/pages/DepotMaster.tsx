import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Depot, INDIAN_STATES, User } from '../types';
import { depotService } from '../services/depotService';
import { userService } from '../services/userService';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Warehouse,
  UserCheck,
  PhoneCall,
  Route,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const DepotMaster: React.FC = () => {
  const { lineSaleAccounts, currentUser } = useApp();

  // State from MySQL Backend
  const [depotsList, setDepotsList] = useState<Depot[]>([]);
  const [dbUsersList, setDbUsersList] = useState<User[]>([]);
  const [isLoadingDepots, setIsLoadingDepots] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);

  // Form inputs according to Depot Master field specification
  const [siteName, setSiteName] = useState('');
  const [depotCode, setDepotCode] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pin, setPin] = useState('');
  const [gst, setGst] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [salesTag, setSalesTag] = useState('');
  const [sapPlantCode, setSapPlantCode] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [assignedLines, setAssignedLines] = useState<string[]>([]);
  const [lineSearchTerm, setLineSearchTerm] = useState('');

  // Fetch depots and users from MySQL backend
  const loadDepotsFromDatabase = useCallback(async () => {
    setIsLoadingDepots(true);
    try {
      const [depotsData, usersData] = await Promise.all([
        depotService.getDepots(),
        userService.getUsers().catch(() => []),
      ]);
      setDepotsList(depotsData);
      if (usersData && usersData.length > 0) {
        setDbUsersList(usersData);
      }
    } catch (error: any) {
      console.error('[DepotMaster] Failed to load depots from MySQL:', error);
      const errMsg = error.response?.data?.error?.message || 'Failed to load logistics depots from server.';
      toast.error(errMsg);
    } finally {
      setIsLoadingDepots(false);
    }
  }, []);

  useEffect(() => {
    loadDepotsFromDatabase();
  }, [loadDepotsFromDatabase]);

  // Filter users from User Master with Depot Manager / Depot Person role for User Assignment
  const depotUsers = dbUsersList.filter(
    (u) =>
      u.role === 'Depot Person' ||
      u.roleCode === 'DEPOT_PERSON' ||
      (u.role as string) === 'Depot Manager'
  );

  // Toggle line selection for Line Sales Tag
  const handleToggleLine = (partyCode: string) => {
    setAssignedLines((prev) =>
      prev.includes(partyCode)
        ? prev.filter((code) => code !== partyCode)
        : [...prev, partyCode]
    );
  };

  const handleSelectAllLines = () => {
    setAssignedLines(lineSaleAccounts.map((l) => l.partyCode));
  };

  const handleClearAllLines = () => {
    setAssignedLines([]);
  };

  // Open modals
  const handleOpenAddModal = () => {
    setModalMode('Add');
    setSelectedDepot(null);
    setSiteName('');
    setDepotCode('');
    setDescription('');
    setAddress('');
    setAddressLine2('');
    setCity('Bangalore');
    setDistrict('Bangalore Urban');
    setState('Karnataka');
    setPin('');
    setGst('');
    setContactNumber('');
    setSalesTag('');
    setSapPlantCode('');
    setAssignedUser(depotUsers[0]?.username || depotUsers[0]?.loginId || '');
    setAssignedLines([]);
    setLineSearchTerm('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (depot: Depot) => {
    setModalMode('Edit');
    setSelectedDepot(depot);
    setSiteName(depot.siteName || depot.name || '');
    setDepotCode(depot.depotCode || depot.code || '');
    setDescription(depot.description || '');
    setAddress(depot.address || '');
    setAddressLine2(depot.addressLine2 || '');
    setCity(depot.city || '');
    setDistrict(depot.district || '');
    setState(depot.state || 'Karnataka');
    setPin(depot.pin || '');
    setGst(depot.gst || '');
    setContactNumber(depot.contactNumber || depot.phone || '');
    setSalesTag(depot.salesTag || '');
    setSapPlantCode(depot.sapPlantCode || '');
    setAssignedUser(depot.assignedUser || '');
    setAssignedLines(depot.assignedLines || []);
    setLineSearchTerm('');
    setIsModalOpen(true);
  };

  // Submit Modal Form to MySQL Backend
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      toast.error('Depot Site Name is required.');
      return;
    }
    if (!address.trim()) {
      toast.error('Address Line 1 is required.');
      return;
    }
    if (!city.trim() || !pin.trim() || !gst.trim()) {
      toast.error('City, Pin, and GST Number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'Add') {
        const payload = {
          siteName: siteName.trim(),
          depotCode: depotCode.trim() || siteName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 30),
          description: description.trim(),
          address: address.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          district: district.trim(),
          state,
          pin: pin.trim(),
          gst: gst.trim(),
          contactNumber: contactNumber.trim(),
          salesTag: salesTag.trim(),
          sapPlantCode: sapPlantCode.trim() || null,
          assignedUser: assignedUser.trim(),
          assignedLines,
          isActive: true,
        };

        const created = await depotService.createDepot(payload);
        setDepotsList((prev) => [created, ...prev]);
        toast.success(`Logistics Depot "${created.siteName}" registered in MySQL.`);
      } else if (selectedDepot) {
        const depotIdentifier = selectedDepot.id || selectedDepot.depotId || selectedDepot.code || selectedDepot.siteName;
        const payload = {
          siteName: siteName.trim(),
          depotCode: depotCode.trim() || selectedDepot.depotCode || selectedDepot.code,
          description: description.trim(),
          address: address.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          district: district.trim(),
          state,
          pin: pin.trim(),
          gst: gst.trim(),
          contactNumber: contactNumber.trim(),
          salesTag: salesTag.trim(),
          sapPlantCode: sapPlantCode.trim() || null,
          assignedUser: assignedUser.trim(),
          assignedLines,
        };

        const updated = await depotService.updateDepot(depotIdentifier, payload);
        setDepotsList((prev) =>
          prev.map((d) => (d.id === updated.id || d.siteName === updated.siteName ? updated : d))
        );
        toast.success(`Logistics Depot "${updated.siteName}" updated in MySQL.`);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('[DepotMaster] Submit error:', error);
      const errMsg = error.response?.data?.error?.message || 'Failed to save depot record to MySQL.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/inactive status (Soft delete / Deactivation)
  const handleToggleStatus = async (depot: Depot) => {
    const depotIdentifier = depot.id || depot.depotId || depot.code || depot.siteName;
    const targetStatus = depot.isActive === false ? true : false;
    const actionName = targetStatus ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${actionName} depot: ${depot.siteName}?`)) {
      return;
    }

    try {
      const updated = await depotService.updateDepotStatus(depotIdentifier, targetStatus);
      setDepotsList((prev) =>
        prev.map((d) => (d.id === updated.id || d.siteName === updated.siteName ? updated : d))
      );
      toast.success(`Depot "${depot.siteName}" ${targetStatus ? 'activated' : 'deactivated'}.`);
    } catch (error: any) {
      console.error('[DepotMaster] Status toggle error:', error);
      const errMsg = error.response?.data?.error?.message || `Failed to ${actionName} depot.`;
      toast.error(errMsg);
    }
  };

  // Filter calculation
  const filteredDepots = depotsList.filter((depot) => {
    const matchesSearch =
      (depot.siteName || depot.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (depot.depotCode || depot.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (depot.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (depot.salesTag || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Active'
        ? depot.isActive !== false
        : depot.isActive === false;

    return matchesSearch && matchesStatus;
  });

  // Paginated layout calculations
  const totalPages = Math.ceil(filteredDepots.length / itemsPerPage) || 1;
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
            Depot Master
          </h1>
          <p className="text-slate-500 text-sm">
            Database-backed logistics hubs, warehousing properties, and Line Sales Tag associations in MySQL.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDepotsFromDatabase}
            disabled={isLoadingDepots}
            id="btn-refresh-depots"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50"
            title="Refresh from MySQL"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoadingDepots ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            id="btn-add-depot"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" /> Add Logistics Depot
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search depots by Site Id, Code, City, or Sales Tag..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            id="depot-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>

        {/* Status Filter Pill Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['All', 'Active', 'Inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab
                  ? 'bg-white text-brand-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id={`filter-depot-${tab.toLowerCase()}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Card */}
      {isLoadingDepots ? (
        <div className="bg-white p-16 text-center rounded-2xl border border-slate-100 shadow-fiori flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
          <p className="text-slate-600 font-semibold text-sm">Loading logistics depots from MySQL database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {paginatedDepots.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400">
              No logistics depots located. Register your primary distribution centers in MySQL.
            </div>
          ) : (
            paginatedDepots.map((depot) => {
              const isActive = depot.isActive !== false;
              const cardId = (depot.siteName || depot.name || 'depot').toLowerCase().replace(/[^a-z0-9]/g, '-');

              return (
                <div
                  key={depot.id || depot.siteName}
                  className={`bg-white p-6 rounded-2xl border ${
                    isActive ? 'border-slate-100' : 'border-slate-200 bg-slate-50/60 opacity-85'
                  } shadow-fiori flex flex-col md:flex-row justify-between gap-6 interactive-card`}
                  id={`depot-card-${cardId}`}
                >
                  <div className="space-y-4 flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-3 rounded-xl ${
                          isActive ? 'bg-brand-50 text-brand-600' : 'bg-slate-200 text-slate-500'
                        } shrink-0`}
                      >
                        <Warehouse className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-slate-800 text-base">
                            {depot.siteName || depot.name}
                          </h3>
                          {depot.depotCode && (
                            <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                              {depot.depotCode}
                            </span>
                          )}
                          {depot.sapPlantCode && (
                            <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              SAP: {depot.sapPlantCode}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Inactive
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{depot.description || 'Logistics distribution center'}</p>
                      </div>
                    </div>

                    {/* Sub Metadata info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-50">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">Location Address</p>
                          <p className="text-slate-500 mt-0.5">
                            {depot.address}
                            {depot.addressLine2 ? `, ${depot.addressLine2}` : ''}, {depot.city}
                            {depot.district ? `, ${depot.district}` : ''}, {depot.state} - {depot.pin}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <PhoneCall className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">Contact Details</p>
                          <p className="text-slate-500 mt-0.5">{depot.contactNumber || depot.phone || 'N/A'}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1">GST: {depot.gst}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <UserCheck className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">User Assignment (Depot Manager)</p>
                          <p className="text-brand-600 font-bold mt-0.5">
                            {depot.assignedUser ? `@${depot.assignedUser}` : 'Unassigned'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">Authorized Manager / Operator</p>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Line Sales Tags (Line Sale Master) List */}
                    <div className="pt-3 border-t border-slate-100 flex items-start gap-2">
                      <Route className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800 text-xs">
                            Line Sales Tag ({depot.assignedLines?.length || 0} Accounts Assigned)
                          </p>
                        </div>
                        {!depot.assignedLines || depot.assignedLines.length === 0 ? (
                          <p className="text-slate-400 text-xs mt-0.5 italic">
                            No Line Sale Master records assigned to this depot site.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-1.5" id={`depot-assigned-lines-${cardId}`}>
                            {depot.assignedLines.map((code) => {
                              const lineObj = lineSaleAccounts.find((l) => l.partyCode === code);
                              return (
                                <span
                                  key={code}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-slate-800 text-[11px] font-semibold border border-brand-100 shadow-2xs"
                                >
                                  <span className="font-mono font-bold text-brand-600">{code}</span>
                                  <span>{lineObj ? `- ${lineObj.partyName}` : ''}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons side */}
                  <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      {isActive ? 'Depot Record Active' : 'Depot Inactive'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(depot)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        id={`btn-edit-depot-${cardId}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit Configuration
                      </button>
                      <button
                        onClick={() => handleToggleStatus(depot)}
                        className={`p-2 rounded-lg transition-colors ${
                          isActive
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Deactivate Depot' : 'Activate Depot'}
                        id={`btn-toggle-status-depot-${cardId}`}
                      >
                        {isActive ? <Trash2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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

      {/* Add Logistics Depot / Depot Master Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'Add' ? 'Add Logistics Depot' : `Edit Depot Config: ${siteName}`}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5" id="depot-modal-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Site Id / Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                1. Site Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. South Bangalore Depot"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                id="input-depot-sitename"
              />
            </div>

            {/* 1b. Depot Code */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Depot Code (Unique Identifier) *
              </label>
              <input
                type="text"
                required
                value={depotCode}
                onChange={(e) => setDepotCode(e.target.value.toUpperCase())}
                placeholder="e.g. BLR-SOUTH"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono font-bold"
                id="input-depot-code"
              />
            </div>

            {/* 2. Site Description */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                2. Site Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Main southern route distribution hub"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                id="input-depot-description"
              />
            </div>

            {/* 3. Address Line 1 */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                3. Address Line 1 *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Plot Number, Street Name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                id="input-depot-address1"
              />
            </div>

            {/* 4. Address Line 2 */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                4. Address Line 2
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Industrial Area, Landmark (Optional)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                id="input-depot-address2"
              />
            </div>

            {/* 5. City */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                5. City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bangalore"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                id="input-depot-city"
              />
            </div>

            {/* 6. District */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                6. District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Bangalore Urban"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                id="input-depot-district"
              />
            </div>

            {/* 7. State (Dropdown from INDIAN_STATES) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                7. State *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                id="select-depot-state"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Pin */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                8. Pin *
              </label>
              <input
                type="text"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="560058"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
                id="input-depot-pin"
              />
            </div>

            {/* 9. Contact Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                9. Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                id="input-depot-contact"
              />
            </div>

            {/* 10. GST No */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                10. GST No *
              </label>
              <input
                type="text"
                required
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="29AAAAA1111A1Z1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
                id="input-depot-gst"
              />
            </div>

            {/* SAP Plant Code */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                SAP Plant Code (Optional)
              </label>
              <input
                type="text"
                value={sapPlantCode}
                onChange={(e) => setSapPlantCode(e.target.value)}
                placeholder="e.g. 1001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
                id="input-depot-sapplant"
              />
            </div>

            {/* 11. Line Sales Tag (Multi-Select sourced from Line Sale Master) */}
            <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-100" id="lines-assignment-section">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-brand-500" /> 11. Line Sales Tag (Line Sale Master Records)
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={handleSelectAllLines}
                    className="text-brand-600 font-bold hover:underline"
                    id="btn-select-all-lines"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllLines}
                    className="text-slate-500 hover:text-slate-800"
                    id="btn-clear-all-lines"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Selected Line Badges/Chips */}
              {assignedLines.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200" id="selected-lines-chips">
                  {assignedLines.map((code) => {
                    const lineObj = lineSaleAccounts.find((l) => l.partyCode === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-slate-800 text-xs font-semibold border border-slate-200 shadow-xs"
                      >
                        <span className="font-mono font-bold text-brand-600">{code}</span>
                        <span className="truncate max-w-[160px] text-slate-600">{lineObj?.partyName}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleLine(code)}
                          className="ml-1 text-slate-400 hover:text-red-500 font-bold"
                          title="Remove Line Sales Tag"
                          id={`btn-remove-line-${code}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Line Filter Search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search Line Sale Master records by party name or code..."
                  value={lineSearchTerm}
                  onChange={(e) => setLineSearchTerm(e.target.value)}
                  id="input-line-search"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Checkbox List Container */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100" id="lines-checkbox-list">
                {lineSaleAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">No Line Sale Master records found in system.</p>
                ) : (
                  lineSaleAccounts
                    .filter((l) =>
                      l.partyName.toLowerCase().includes(lineSearchTerm.toLowerCase()) ||
                      l.partyCode.toLowerCase().includes(lineSearchTerm.toLowerCase()) ||
                      l.state.toLowerCase().includes(lineSearchTerm.toLowerCase())
                    )
                    .map((line) => {
                      const isSelected = assignedLines.includes(line.partyCode);
                      return (
                        <label
                          key={line.partyCode}
                          htmlFor={`chk-line-${line.partyCode}`}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                            isSelected ? 'bg-brand-50/70 border border-brand-200/60' : 'hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              id={`chk-line-${line.partyCode}`}
                              checked={isSelected}
                              onChange={() => handleToggleLine(line.partyCode)}
                              className="rounded bg-white border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block">{line.partyName}</span>
                              <span className="font-mono text-[10px] text-slate-400">{line.partyCode} • {line.state}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-brand-600 bg-brand-100/80 px-2 py-0.5 rounded uppercase">
                              Assigned
                            </span>
                          )}
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* 12. User Assignment (Sourced from User Master) */}
            <div className="space-y-1 md:col-span-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                12. User Assignment (Depot Manager / Depot Person)
              </label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                id="select-depot-assigned-user"
              >
                <option value="">-- No Assigned Manager --</option>
                {depotUsers.length === 0 ? (
                  <option disabled>No Depot Person users found. Create one in User Master!</option>
                ) : (
                  depotUsers.map((u) => (
                    <option key={u.userId || u.employeeId} value={u.loginId || u.username}>
                      {u.employeeName} (@{u.loginId || u.username}) - {u.employeeId}
                    </option>
                  ))
                )}
              </select>
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
              id="btn-save-depot"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving to MySQL...
                </>
              ) : (
                'Save Logistics Depot'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepotMaster;
