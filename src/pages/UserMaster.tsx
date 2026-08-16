import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { User, Role } from '../types';
import { userService } from '../services/userService';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const UserMaster: React.FC = () => {
  const { currentUser } = useApp();

  // Master Users State from MySQL Backend
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State managers
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form inputs
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Sales Officer');
  const [isActive, setIsActive] = useState(true);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Fetch users from database
  const loadUsersFromDatabase = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await userService.getUsers();
      setUsersList(data);
    } catch (error: any) {
      console.error('[UserMaster] Failed to load users from backend:', error);
      const errMsg = error.response?.data?.error?.message || 'Failed to load users from server.';
      toast.error(errMsg);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsersFromDatabase();
  }, [loadUsersFromDatabase]);

  // Open forms
  const handleOpenAddModal = () => {
    setModalMode('Add');
    setSelectedUser(null);
    setEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setEmployeeName('');
    setUsername('');
    setPassword('salespassword');
    setRole('Sales Officer');
    setIsActive(true);
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setModalMode('Edit');
    setSelectedUser(user);
    setEmployeeId(user.employeeId);
    setEmployeeName(user.employeeName);
    setUsername(user.username || user.loginId);
    setPassword('••••••••');
    setRole(user.role);
    setIsActive(user.isActive);
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  // Submit form to backend
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !username.trim() || !password.trim()) {
      toast.error('All fields marked * are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'Add') {
        await userService.createUser({
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          loginId: username.toLowerCase().trim(),
          password: password.trim(),
          role,
          isActive,
        });
        toast.success('New employee credentials registered in MySQL!');
      } else {
        const targetId = selectedUser?.userId || selectedUser?.employeeId;
        if (!targetId) {
          toast.error('User identifier not found.');
          return;
        }

        const updatePayload: any = {
          employeeName: employeeName.trim(),
          loginId: username.toLowerCase().trim(),
          role,
          isActive,
        };

        // Only send password if user changed it from placeholder
        if (password && password !== '••••••••' && password.trim().length > 0) {
          updatePayload.password = password.trim();
        }

        await userService.updateUser(targetId, updatePayload);
        toast.success('Employee credentials updated in MySQL.');
      }

      setIsModalOpen(false);
      await loadUsersFromDatabase();
    } catch (error: any) {
      console.error('[UserMaster] Mutation failed:', error);
      const errMsg =
        error.response?.data?.error?.message ||
        error.message ||
        'Failed to save user credentials.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate user in database
  const handleDelete = async (user: User) => {
    const isSelf =
      user.employeeId === currentUser?.employeeId ||
      (user.userId && currentUser?.userId && user.userId === currentUser.userId);

    if (isSelf) {
      toast.error('Cannot deactivate your own active logged-in account.');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to deactivate ${user.employeeName} (${user.employeeId})? They will lose ERP credentials.`
      )
    ) {
      try {
        const targetId = user.userId || user.employeeId;
        await userService.updateUserStatus(targetId, false);
        toast.success('User credentials deactivated.');
        await loadUsersFromDatabase();
      } catch (error: any) {
        console.error('[UserMaster] Deactivation failed:', error);
        const errMsg =
          error.response?.data?.error?.message ||
          error.message ||
          'Failed to deactivate user.';
        toast.error(errMsg);
      }
    }
  };

  // Client-side instant filter on the database-loaded dataset
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.loginId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6" id="user-master-section">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
              User Credentials & Employee Master
            </h1>
            <button
              onClick={loadUsersFromDatabase}
              title="Refresh from Database"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              id="btn-refresh-users"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-slate-500 text-sm">
            Manage corporate identities, assign roles (Super Admin, Depot Person, Sales Officer), and configure security levels in MySQL.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-user"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" /> Register Employee
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search employees by ID, name, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="user-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm transition-all"
          />
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Super Admin', 'Depot Person', 'Sales Officer'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                roleFilter === r
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Tables */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse" id="user-master-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Secure Username</th>
                <th className="px-6 py-4">System Role / Permissions</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                      <span>Loading authenticated employee records from MySQL...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No personnel found matching parameters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent =
                    user.employeeId === currentUser?.employeeId ||
                    (user.userId && currentUser?.userId && user.userId === currentUser.userId);

                  return (
                    <tr key={user.employeeId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {user.employeeId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {user.employeeName}
                        {isCurrent && (
                          <span className="ml-2 inline-block text-[9px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-100 font-bold uppercase">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-brand-600 font-mono">
                        @{user.username || user.loginId}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                            user.role === 'Super Admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-100'
                              : user.role === 'Depot Person'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block h-2 w-2 rounded-full mr-2 ${
                            user.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-semibold">{user.isActive ? 'Active' : 'Suspended'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Edit Credentials"
                            id={`btn-edit-user-${user.employeeId}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={isCurrent}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-30"
                            title={isCurrent ? 'Cannot deactivate self' : 'Deactivate Account'}
                            id={`btn-delete-user-${user.employeeId}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
        <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4" id="user-mobile-cards">
          {isLoadingUsers ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              <span>Loading employees...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs">
              No personnel found matching parameters.
            </p>
          ) : (
            filteredUsers.map((user) => {
              const isCurrent =
                user.employeeId === currentUser?.employeeId ||
                (user.userId && currentUser?.userId && user.userId === currentUser.userId);

              return (
                <div key={user.employeeId} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{user.employeeId}</span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-100 font-bold uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-950 text-sm mt-0.5">{user.employeeName}</h4>
                      <p className="text-xs font-mono text-brand-600 font-medium">@{user.username || user.loginId}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                        user.role === 'Super Admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : user.role === 'Depot Person'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {user.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <span className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {user.isActive ? 'Active Credentials' : 'Suspended'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                        id={`btn-edit-mobile-user-${user.employeeId}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={isCurrent}
                        className="px-2.5 py-1 rounded-lg border border-red-100 text-red-600 font-semibold text-xs hover:bg-red-50 disabled:opacity-30"
                        id={`btn-delete-mobile-user-${user.employeeId}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={modalMode === 'Add' ? 'Add New Employee Credentials' : `Edit User Details: ${employeeId}`}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4" id="user-modal-form">
          <div className="space-y-4">
            {/* Employee ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Employee Registry ID *
              </label>
              <input
                type="text"
                required
                disabled={modalMode === 'Edit' || isSubmitting}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 disabled:bg-slate-100 font-bold"
              />
            </div>

            {/* Employee Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Anand Hegde"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              />
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Authorized Username *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">@</span>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ananth"
                  className="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {modalMode === 'Add' ? 'Secure Password *' : 'Change Password (leave blank or placeholder to keep existing)'}
              </label>
              <div className="relative">
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  required={modalMode === 'Add'}
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={modalMode === 'Add' ? 'Enter credential password' : '••••••••'}
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Security Access Role *
              </label>
              <select
                value={role}
                disabled={isSubmitting}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold text-slate-800 disabled:bg-slate-100"
              >
                <option value="Super Admin">Super Admin (Management Level)</option>
                <option value="Depot Person">Depot Person (Logistics Operator)</option>
                <option value="Sales Officer">Sales Officer (Field Representative)</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActiveCheckbox"
                disabled={isSubmitting}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded bg-slate-50 border-slate-200 text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer"
              />
              <label htmlFor="isActiveCheckbox" className="text-xs text-slate-600 font-semibold cursor-pointer">
                Account Active & Authorized (Can log in to ERP)
              </label>
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
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Credentials
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserMaster;
