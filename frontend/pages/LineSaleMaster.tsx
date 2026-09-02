import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LineSaleAccount, INDIAN_STATES } from '../types';
import { lineSaleService } from '../services/lineSaleService';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  MapPin,
  FileCheck,
  Phone,
  QrCode,
  Eye,
  CheckCircle2,
  XCircle,
  Warehouse,
  TicketPercent,
  Upload,
  Image,
  Crosshair,
  ShieldAlert,
  Building,
  RefreshCw,
  UserCheck,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const LineSaleMaster: React.FC = () => {
  const {
    currentUser,
    lineSaleAccounts,
    addLineSaleAccount,
    updateLineSaleAccount,
    toggleLineSaleAccountStatus,
    refreshLineSaleAccounts,
    depots,
    schemeLists,
    priceLists,
    users
  } = useApp();

  // Role Protection Check
  if (currentUser?.role !== 'Super Admin') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-fiori space-y-4 max-w-md mx-auto my-12" id="unauthorized-card">
        <div className="p-4 bg-red-50 text-red-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          Line Sale Master access is exclusively reserved for authorized Super Admin credentials.
        </p>
      </div>
    );
  }

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  const [selectedDepotFilter, setSelectedDepotFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Loading and Submitting states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');

  // Form Inputs
  const [partyCode, setPartyCode] = useState('');
  const [partyName, setPartyName] = useState('');
  const [state, setState] = useState('Karnataka');
  const [nearestDepot, setNearestDepot] = useState('');
  const [gstn, setGstn] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [geographicalLocation, setGeographicalLocation] = useState('');
  const [upiQr, setUpiQr] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [schemeListId, setSchemeListId] = useState('');
  const [priceListId, setPriceListId] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [assignedSalesOfficerId, setAssignedSalesOfficerId] = useState<number | ''>('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [routeName, setRouteName] = useState('');
  const [sapCustomerCode, setSapCustomerCode] = useState('');

  // Auxiliary Modal States
  const [previewQrModal, setPreviewQrModal] = useState<{ isOpen: boolean; accountName: string; qrUrl: string }>({
    isOpen: false,
    accountName: '',
    qrUrl: '',
  });

  const [schemeModal, setSchemeModal] = useState<{ isOpen: boolean; account: LineSaleAccount | null }>({
    isOpen: false,
    account: null,
  });

  const [isGettingGps, setIsGettingGps] = useState(false);

  // Load from backend on mount
  useEffect(() => {
    refreshLineSaleAccounts();
  }, [refreshLineSaleAccounts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshLineSaleAccounts();
      toast.success('Line Sale accounts reloaded from database.');
    } catch {
      toast.error('Failed to sync Line Sale accounts.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper: Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode('Add');
    const newCode = `LSA-${Math.floor(1000 + Math.random() * 9000)}`;
    setPartyCode(newCode);
    setPartyName('');
    setState('Karnataka');
    setNearestDepot(depots[0]?.siteName || depots[0]?.name || '');
    setGstn('');
    setContactNo('');
    setGeographicalLocation('');
    setVehicleNumber('');
    setRouteName('');
    setSapCustomerCode('');
    setUpiQr('');
    setIsActive(true);
    setSchemeListId(schemeLists[0]?.id || schemeLists[0]?.code || '');
    setPriceListId(priceLists[0]?.id || priceLists[0]?.code || 'PL-STANDARD');
    const firstSalesOfficer = users.find(
  (u) =>
    u.role === 'Sales Officer' &&
    u.isActive
);

setAssignedUser(
  firstSalesOfficer?.username || ''
);

setAssignedSalesOfficerId(
  firstSalesOfficer?.userId ?? ''
);
    setIsFormModalOpen(true);
  };

  // Helper: Open Edit Modal
  const handleOpenEditModal = (acc: LineSaleAccount) => {
    setModalMode('Edit');
    setPartyCode(acc.partyCode);
    setPartyName(acc.partyName || acc.accountName || '');
    setState(acc.state || 'Karnataka');
    setNearestDepot(acc.nearestDepot || acc.depots?.[0]?.name || '');
    setGstn(acc.gstn || '');
    setContactNo(acc.contactNo || '');
    setGeographicalLocation(acc.geographicalLocation || acc.routeName || '');
    setVehicleNumber(acc.vehicleNumber || '');
    setRouteName(acc.routeName || '');
    setSapCustomerCode(acc.sapCustomerCode || '');
    setUpiQr(acc.upiQr || '');
    setIsActive(acc.isActive);
    setSchemeListId(acc.schemeListId || acc.schemes?.[0]?.code || schemeLists[0]?.id || '');
    setPriceListId(
  acc.priceListId != null
    ? String(acc.priceListId)
    : acc.priceList?.code || String(priceLists[0]?.id || 'PL-STANDARD')
);
    const existingOfficer = users.find(
  (u) =>
    u.userId === acc.salesOfficerId ||
    u.username === acc.assignedUser ||
    u.loginId === acc.assignedUser ||
    u.loginId === acc.salesOfficer?.loginId
);

setAssignedUser(
  existingOfficer?.username ||
  acc.assignedUser ||
  acc.salesOfficer?.loginId ||
  ''
);

setAssignedSalesOfficerId(
  existingOfficer?.userId ??
  acc.salesOfficerId ??
  ''
);
    setIsFormModalOpen(true);
  };

  // Handle Image Upload for UPI QR
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpiQr(reader.result as string);
        toast.success('UPI QR image loaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Acquire Location GPS Coordinates
  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsGettingGps(true);
    toast.loading('Acquiring current GPS coordinates...', { id: 'gps-toast' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude.toFixed(4)}° N, ${position.coords.longitude.toFixed(4)}° E`;
        setGeographicalLocation(coords);
        toast.dismiss('gps-toast');
        toast.success(`GPS Location acquired: ${coords}`);
        setIsGettingGps(false);
      },
      () => {
        toast.dismiss('gps-toast');
        toast.error('Unable to retrieve GPS lock. Please enter location manually.');
        setIsGettingGps(false);
      },
      { timeout: 8000 }
    );
  };

  // Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyCode.trim()) {
      toast.error('Party Code is required.');
      return;
    }
    if (!partyName.trim()) {
      toast.error('Party Name is required.');
      return;
    }
    if (!nearestDepot) {
      toast.error('Nearest Depot selection is required.');
      return;
    }

    if (!assignedSalesOfficerId || !assignedUser) {
  toast.error('Please select a Sales Officer.');
  return;
}

    // Validate GSTN format if entered
    if (gstn.trim() && gstn.trim().length < 10) {
      toast.error('Please enter a valid GSTN number.');
      return;
    }

    // Validate Contact No if entered
    if (contactNo.trim() && contactNo.trim().length < 8) {
      toast.error('Please enter a valid Contact Number.');
      return;
    }

    setIsSubmitting(true);
    const cleanPartyCode = partyCode.trim().toUpperCase();
    const cleanPartyName = partyName.trim();

    try {
      if (modalMode === 'Add') {
        const created = await lineSaleService.createLineSale({
          partyCode: cleanPartyCode,
          accountName: cleanPartyName,
          partyName: cleanPartyName,
          state,
          nearestDepot,
          depotIds: [nearestDepot],
          gstn: gstn.trim().toUpperCase(),
          contactNo: contactNo.trim(),
          geographicalLocation: geographicalLocation.trim(),
          routeName: routeName.trim() || geographicalLocation.trim(),
          vehicleNumber: vehicleNumber.trim() || null,
          sapCustomerCode: sapCustomerCode.trim() || null,
          upiQr,
          isActive,
          schemeListId,
          schemeListIds: schemeListId ? [schemeListId] : [],
          priceListId,
          assignedUser,
          salesOfficerId: assignedSalesOfficerId,
        });

        addLineSaleAccount(created);
        toast.success(`Line Sale Account "${cleanPartyCode}" created in database!`);
      } else {
        const updated = await lineSaleService.updateLineSale(cleanPartyCode, {
          accountName: cleanPartyName,
          partyName: cleanPartyName,
          state,
          nearestDepot,
          depotIds: [nearestDepot],
          gstn: gstn.trim().toUpperCase(),
          contactNo: contactNo.trim(),
          geographicalLocation: geographicalLocation.trim(),
          routeName: routeName.trim() || geographicalLocation.trim(),
          vehicleNumber: vehicleNumber.trim() || null,
          sapCustomerCode: sapCustomerCode.trim() || null,
          upiQr,
          isActive,
          schemeListId,
          schemeListIds: schemeListId ? [schemeListId] : [],
          priceListId,
          assignedUser,
          salesOfficerId: assignedSalesOfficerId,
        });

        updateLineSaleAccount(updated);
        toast.success(`Line Sale Account "${cleanPartyCode}" updated!`);
      }

      await refreshLineSaleAccounts();
      setIsFormModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Operation failed.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active / Deactivate non-destructively
  const handleToggleStatus = async (acc: LineSaleAccount) => {
    const newStatus = !acc.isActive;
    try {
      await lineSaleService.updateLineSaleStatus(acc.partyCode, newStatus);
      toggleLineSaleAccountStatus(acc.partyCode);
      await refreshLineSaleAccounts();
      toast.success(
        `Account ${acc.partyCode} status changed to ${newStatus ? 'Active' : 'Inactive'}.`
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Status update failed.';
      toast.error(msg);
    }
  };

  // Filter Logic
  const filteredAccounts = lineSaleAccounts.filter((acc) => {
    const targetName = acc.partyName || acc.accountName || '';
    const matchesSearch =
      acc.partyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.contactNo && acc.contactNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.gstn && acc.gstn.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesState = !selectedStateFilter || acc.state === selectedStateFilter;
    const matchesDepot =
      !selectedDepotFilter ||
      acc.nearestDepot === selectedDepotFilter ||
      acc.depots?.some((d) => d.siteName === selectedDepotFilter || d.name === selectedDepotFilter);

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Active'
        ? acc.isActive
        : !acc.isActive;

    return matchesSearch && matchesState && matchesDepot && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selected Scheme Object for Scheme View Modal
  const activeSchemeObj = schemeLists.find(
    (s) => s.id === schemeModal.account?.schemeListId || s.code === schemeModal.account?.schemeListId
  );

  return (
    <div className="space-y-6" id="line-sale-master-page">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Line Sale Master
          </h1>
          <p className="text-slate-500 text-sm">
            Maintain Line Sale accounts, regional depot associations, GSTN credentials, assigned Sales Officers & price/scheme links.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs"
            title="Reload from MySQL Database"
            id="btn-refresh-line-sales"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-600' : 'text-slate-500'}`} />
            <span>Sync DB</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            id="btn-add-line-sale-account"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" /> Create New Account
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Party Code, Name, GSTN or Contact..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              id="search-line-sale-input"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={selectedStateFilter}
              onChange={(e) => {
                setSelectedStateFilter(e.target.value);
                setCurrentPage(1);
              }}
              id="filter-state-select"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">All States</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Depot Filter */}
          <div>
            <select
              value={selectedDepotFilter}
              onChange={(e) => {
                setSelectedDepotFilter(e.target.value);
                setCurrentPage(1);
              }}
              id="filter-depot-select"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">All Depots</option>
              {depots.map((d) => (
                <option key={d.siteName || d.name} value={d.siteName || d.name}>
                  {d.siteName || d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status Filter:</span>
            {(['All', 'Active', 'Inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <span className="text-slate-400 font-mono">
            Showing {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main Table Card Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse" id="line-sale-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Party Code / Name</th>
                <th className="py-3.5 px-4">Sales Officer</th>
                <th className="py-3.5 px-4">Depot(s)</th>
                <th className="py-3.5 px-4">GSTN & Contact</th>
                <th className="py-3.5 px-4">Location & QR</th>
                <th className="py-3.5 px-4 text-center">Scheme View</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No Line Sale Accounts match the specified filter criteria. Click "Create New Account" to add one.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const displayName = acc.partyName || acc.accountName || '';
                  const officerName = acc.salesOfficer?.employeeName || acc.assignedUser || 'Unassigned';
                  const primaryDepot = acc.nearestDepot || acc.depots?.[0]?.name || 'Central Depot';

                  return (
                    <tr key={acc.partyCode} className="hover:bg-slate-50/60 transition-colors">
                      {/* Party Code & Name */}
                      <td className="py-4 px-5">
                        <span className="font-mono text-xs font-bold text-brand-600 block">
                          {acc.partyCode}
                        </span>
                        <span className="font-semibold text-slate-900 block text-sm mt-0.5">
                          {displayName}
                        </span>
                        {acc.vehicleNumber && (
                          <span className="inline-block font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1">
                            {acc.vehicleNumber}
                          </span>
                        )}
                      </td>

                      {/* Sales Officer */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <UserCheck className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                          <span>{officerName}</span>
                        </div>
                        {acc.salesOfficer?.loginId && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            @{acc.salesOfficer.loginId}
                          </span>
                        )}
                      </td>

                      {/* Nearest / Assigned Depots */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            <Warehouse className="h-3 w-3 text-slate-500 shrink-0" />
                            {primaryDepot}
                          </span>
                          {acc.depots && acc.depots.length > 1 && (
                            <span className="text-[10px] text-slate-400 block pl-1">
                              +{acc.depots.length - 1} more depot(s)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* GSTN & Contact */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="font-mono text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                          <FileCheck className="h-3 w-3 text-slate-400 shrink-0" />
                          {acc.gstn || 'N/A'}
                        </div>
                        <div className="text-slate-500 font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          {acc.contactNo || 'N/A'}
                        </div>
                      </td>

                      {/* Location & UPI QR */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="text-slate-600 font-medium text-[11px] truncate max-w-[150px] flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-brand-500 shrink-0" />
                          {acc.geographicalLocation || acc.routeName || acc.state || 'N/A'}
                        </div>
                        {acc.upiQr && (
                          <button
                            onClick={() =>
                              setPreviewQrModal({
                                isOpen: true,
                                accountName: displayName,
                                qrUrl: acc.upiQr!,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            <QrCode className="h-3 w-3" /> View QR Code
                          </button>
                        )}
                      </td>

                      {/* Scheme View */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setSchemeModal({ isOpen: true, account: acc })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 transition-colors"
                          id={`btn-scheme-view-${acc.partyCode}`}
                        >
                          <TicketPercent className="h-3.5 w-3.5" />
                          <span>Schemes</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            acc.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {acc.isActive ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-slate-400" />
                          )}
                          {acc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(acc)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit Account"
                            id={`btn-edit-${acc.partyCode}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(acc)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border ${
                              acc.isActive
                                ? 'border-red-100 text-red-600 bg-red-50/50 hover:bg-red-100'
                                : 'border-emerald-100 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100'
                            }`}
                            id={`btn-toggle-status-${acc.partyCode}`}
                          >
                            {acc.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card Grid */}
        <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4" id="line-sale-mobile-cards">
          {paginatedAccounts.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs">
              No Line Sale Accounts found. Click "Create New Account" to add one.
            </p>
          ) : (
            paginatedAccounts.map((acc) => {
              const displayName = acc.partyName || acc.accountName || '';
              const primaryDepot = acc.nearestDepot || acc.depots?.[0]?.name || 'Central Depot';

              return (
                <div key={acc.partyCode} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-brand-600 block">{acc.partyCode}</span>
                      <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{displayName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-brand-500" /> {acc.state}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        acc.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {acc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Depot</span>
                      <span className="font-semibold text-slate-700 truncate block">{primaryDepot}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Sales Officer</span>
                      <span className="font-medium text-slate-700 truncate block">
                        {acc.salesOfficer?.employeeName || acc.assignedUser || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">GSTN No</span>
                      <span className="font-mono font-medium text-slate-700">{acc.gstn || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Contact</span>
                      <span className="font-medium text-slate-700">{acc.contactNo || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSchemeModal({ isOpen: true, account: acc })}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200"
                      >
                        Scheme View
                      </button>
                      {acc.upiQr && (
                        <button
                          onClick={() =>
                            setPreviewQrModal({
                              isOpen: true,
                              accountName: displayName,
                              qrUrl: acc.upiQr!,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]"
                        >
                          UPI QR
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(acc)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                          acc.isActive ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                        }`}
                      >
                        {acc.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ACCOUNT MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={modalMode === 'Add' ? 'Create Line Sale Account' : `Edit Account (${partyCode})`}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Party Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Party Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={modalMode === 'Edit'}
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value)}
                placeholder="e.g. LSA-1001"
                id="input-party-code"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-500 uppercase"
              />
            </div>

            {/* Party Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. Sri Laxmi Line Traders"
                id="input-party-name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Assigned Sales Officer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Sales Officer <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={assignedSalesOfficerId}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  const selectedOfficer = users.find(
                    (u) => u.userId === selectedId
                );

                setAssignedSalesOfficerId(selectedId);
                setAssignedUser(selectedOfficer?.username || '');
            }}
            id="select-assigned-officer"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            <option value="">Select Sales Officer</option>

          {users
              .filter(
                  (u) =>
                    u.role === 'Sales Officer' &&
                    u.isActive &&
                    u.userId != null
              )
              .map((u) => (
                <option key={u.userId} value={u.userId}>
                {u.employeeName} ({u.username})
                </option>
            ))}
        </select>
            </div>

            {/* Nearest / Regional Depot */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Regional Depot <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={nearestDepot}
                onChange={(e) => setNearestDepot(e.target.value)}
                id="select-nearest-depot"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500"
              >
                {depots.map((d) => (
                  <option key={d.siteName || d.name} value={d.siteName || d.name}>
                    {d.siteName || d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                id="select-state"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Price List Association */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Price List</label>
              <select
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value)}
                id="select-price-list"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500"
              >
                {priceLists.map((p) => (
                  <option key={p.id || p.code} value={p.id || p.code}>
                    {p.name} ({p.id || p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* GSTN No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTN Number</label>
              <input
                type="text"
                value={gstn}
                onChange={(e) => setGstn(e.target.value)}
                placeholder="e.g. 29ABCDE1234F1Z5"
                id="input-gstn"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500 uppercase"
              />
            </div>

            {/* Contact No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
              <input
                type="text"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="e.g. +91 98450 12345"
                id="input-contact-no"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KA-01-EA-1234"
                id="input-vehicle-number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500 uppercase"
              />
            </div>

            {/* Route Name / Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Route / Area Name</label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g. Bangalore South - Electronic City Route"
                id="input-route-name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Geographical Location with GPS helper */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Geographical Location</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={geographicalLocation}
                onChange={(e) => setGeographicalLocation(e.target.value)}
                placeholder="e.g. 12.9716° N, 77.5946° E or Peenya Industrial Area"
                id="input-geo-location"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleAcquireLocation}
                disabled={isGettingGps}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0"
                id="btn-acquire-gps"
              >
                <Crosshair className={`h-3.5 w-3.5 ${isGettingGps ? 'animate-spin' : 'text-brand-600'}`} />
                GPS
              </button>
            </div>
          </div>

          {/* Scheme List Association */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Associated Promotional Scheme</label>
            <select
              value={schemeListId}
              onChange={(e) => setSchemeListId(e.target.value)}
              id="select-scheme-list"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500"
            >
              <option value="">No Promotional Scheme</option>
              {schemeLists.map((s) => (
                <option key={s.id || s.code} value={s.id || s.code}>
                  {s.name} ({s.id || s.code})
                </option>
              ))}
            </select>
          </div>

          {/* UPI QR Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">UPI QR Code</label>
            {upiQr ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <img src={upiQr} alt="UPI QR Preview" className="h-12 w-12 object-contain rounded border border-slate-200 bg-white" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">UPI QR Attached</span>
                    <span className="text-[10px] text-slate-400">Stored Image</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUpiQr('')}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                <Upload className="h-6 w-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-600">Click to upload UPI QR image</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG up to 2MB</span>
                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" id="file-upi-qr" />
              </label>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="checkbox-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-brand-600 rounded focus:ring-brand-500 border-slate-300"
            />
            <label htmlFor="checkbox-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">
              Account Active
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-save-line-sale-account"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{modalMode === 'Add' ? 'Create Account' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW UPI QR MODAL */}
      <Modal
        isOpen={previewQrModal.isOpen}
        onClose={() => setPreviewQrModal({ isOpen: false, accountName: '', qrUrl: '' })}
        title={`UPI Payment QR - ${previewQrModal.accountName}`}
      >
        <div className="text-center p-4 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block shadow-sm">
            <img src={previewQrModal.qrUrl} alt="UPI QR Large Preview" className="h-56 w-56 object-contain mx-auto" />
          </div>
          <p className="text-xs text-slate-500">
            Scan this QR using PhonePe, Google Pay, or Paytm to initiate direct account settlement.
          </p>
        </div>
      </Modal>

      {/* SCHEME VIEW MODAL */}
      <Modal
        isOpen={schemeModal.isOpen}
        onClose={() => setSchemeModal({ isOpen: false, account: null })}
        title={`Scheme Deals - ${schemeModal.account?.partyName || schemeModal.account?.accountName || ''}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Active Campaign</span>
              <h4 className="font-bold text-slate-900 text-sm">{activeSchemeObj?.name || 'Default Scheme List'}</h4>
            </div>
            <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded">
              {activeSchemeObj?.id || activeSchemeObj?.code || 'N/A'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="py-2 px-3">Product ID</th>
                  <th className="py-2 px-3">Special Rate</th>
                  <th className="py-2 px-3">Buy Qty</th>
                  <th className="py-2 px-3">Free Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!activeSchemeObj || activeSchemeObj.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No special promotional deals currently mapped to this account.
                    </td>
                  </tr>
                ) : (
                  activeSchemeObj.items.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-600">{item.productId}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">₹{item.rate} / {item.uom}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{item.buyQty} {item.boxPcs}</td>
                      <td className="py-2.5 px-3 text-emerald-700 font-bold bg-emerald-50/50">+ {item.freeQty} Free</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
