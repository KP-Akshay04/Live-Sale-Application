import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GoodsIssue, GoodsReturn, GoodsIssueItem, GoodsReturnItem, User } from '../types';
import { Modal } from '../components/common/Modal';
import {
  Truck,
  ArrowRightLeft,
  Warehouse,
  CheckCircle,
  Plus,
  Trash2,
  FileText,
  Printer,
  Calendar,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const DepotDashboard: React.FC = () => {
  const {
    currentUser,
    goodsIssues,
    addGoodsIssue,
    completeGoodsIssue,
    goodsReturns,
    addGoodsReturn,
    completeGoodsReturn,
    products,
    getDepotStock,
    users,
    depots
  } = useApp();

  // Find active depot for current logged-in Depot Person
  const activeDepot = depots.find((d) => d.assignedUser === currentUser?.username) || depots[0];
  const depotStock = getDepotStock(activeDepot?.siteName || 'Central Depot Bangalore');

  // UI Tabs inside Depot Operator dashboard
  const [activeTab, setActiveTab] = useState<'kpis' | 'issue' | 'return' | 'history'>('kpis');

  // PRINT PREVIEW MODAL
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintVoucher, setActivePrintVoucher] = useState<{
    id: string;
    type: 'issue' | 'return';
    date: string;
    officer: string;
    notes?: string;
    reason?: string;
    items: { productName: string; qty: number; uom: string }[];
  } | null>(null);

  // GOODS ISSUE FORM STATE
  const [issueOfficer, setIssueOfficer] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueItems, setIssueItems] = useState<GoodsIssueItem[]>([
    { productId: products[0]?.id || '', productName: products[0]?.description || '', qty: 10, uom: 'Box' }
  ]);

  // GOODS RETURN FORM STATE
  const [returnOfficer, setReturnOfficer] = useState('');
  const [returnReason, setReturnReason] = useState('Transit Leakage');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<GoodsReturnItem[]>([
    { productId: products[0]?.id || '', productName: products[0]?.description || '', qty: 5, uom: 'Pcs' }
  ]);

  // Retrieve field Sales Officers for dropdowns
  const salesOfficers = users.filter((u) => u.role === 'Sales Officer');

  // Trigger print overlay
  const handleOpenPrint = (voucher: any, type: 'issue' | 'return') => {
    setActivePrintVoucher({
      id: voucher.id,
      type,
      date: type === 'issue' ? voucher.issueDate : voucher.returnDate,
      officer: voucher.salesOfficerUsername,
      notes: voucher.notes,
      reason: voucher.reason,
      items: voucher.items,
    });
    setIsPrintModalOpen(true);
  };

  const handlePrintTrigger = () => {
    window.print();
  };

  // GOODS ISSUE FORM HANDLERS
  const handleAddIssueRow = () => {
    setIssueItems([
      ...issueItems,
      { productId: products[0]?.id || '', productName: products[0]?.description || '', qty: 1, uom: 'Box' }
    ]);
  };

  const handleRemoveIssueRow = (index: number) => {
    if (issueItems.length === 1) return;
    setIssueItems(issueItems.filter((_, i) => i !== index));
  };

  const handleIssueItemChange = (index: number, field: keyof GoodsIssueItem, val: any) => {
    setIssueItems(
      issueItems.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          const selectedProd = products.find((p) => p.id === val);
          return {
            ...item,
            productId: val,
            productName: selectedProd?.description || '',
            uom: selectedProd?.baseUom || 'Box',
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleGoodsIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueOfficer) {
      toast.error('Please assign a receiver Sales Officer.');
      return;
    }
    // Submit
    addGoodsIssue({
      depotSite: activeDepot.siteName,
      salesOfficerUsername: issueOfficer,
      issueDate: new Date().toISOString().substring(0, 10),
      items: issueItems,
      notes: issueNotes,
    });
    toast.success('Goods load issued successfully!');
    // Reset
    setIssueNotes('');
    setIssueItems([{ productId: products[0]?.id || '', productName: products[0]?.description || '', qty: 10, uom: 'Box' }]);
    setActiveTab('history');
  };

  // GOODS RETURN FORM HANDLERS
  const handleAddReturnRow = () => {
    setReturnItems([
      ...returnItems,
      { productId: products[0]?.id || '', productName: products[0]?.description || '', qty: 1, uom: 'Pcs' }
    ]);
  };

  const handleRemoveReturnRow = (index: number) => {
    if (returnItems.length === 1) return;
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleReturnItemChange = (index: number, field: keyof GoodsReturnItem, val: any) => {
    setReturnItems(
      returnItems.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          const selectedProd = products.find((p) => p.id === val);
          return {
            ...item,
            productId: val,
            productName: selectedProd?.description || '',
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleGoodsReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOfficer) {
      toast.error('Please specify the returning Sales Officer.');
      return;
    }
    addGoodsReturn({
      depotSite: activeDepot.siteName,
      salesOfficerUsername: returnOfficer,
      returnDate: new Date().toISOString().substring(0, 10),
      items: returnItems,
      reason: returnReason,
      notes: returnNotes,
    });
    toast.success('Goods return voucher logged.');
    setReturnNotes('');
    setReturnItems([{ productId: products[0]?.id || '', productName: products[0]?.description || '', qty: 5, uom: 'Pcs' }]);
    setActiveTab('history');
  };

  // Calculate local dashboard aggregates
  const todayDateStr = new Date().toISOString().substring(0, 10);
  const totalIssuedToday = goodsIssues
    .filter((gi) => gi.depotSite === activeDepot?.siteName && gi.issueDate === todayDateStr)
    .reduce((sum, gi) => sum + gi.items.reduce((s, i) => s + i.qty, 0), 0);

  const pendingReturnsCount = goodsReturns
    .filter((gr) => gr.depotSite === activeDepot?.siteName && gr.status === 'Pending').length;

  return (
    <div className="space-y-6" id="depot-dashboard-section">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Logistics Control Dashboard
          </h1>
          <p className="text-slate-500 text-sm font-semibold text-brand-600">
            Active Hub: {activeDepot?.siteName || 'Loading depot site...'}
          </p>
        </div>

        {/* Dashboard sub tabs switcher */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm self-start">
          {[
            { id: 'kpis', label: 'Stock Levels', icon: Warehouse },
            { id: 'issue', label: 'Issue Load-Out', icon: Truck },
            { id: 'return', label: 'Restock Returns', icon: ArrowRightLeft },
            { id: 'history', label: 'Voucher Logs', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                id={`depot-tab-${tab.id}`}
                className={`text-xs px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO TAB */}

      {/* Tab 1: KPIs & Stock levels */}
      {activeTab === 'kpis' && (
        <div className="space-y-6 animate-fadeIn" id="tab-stock-levels">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
              <div className="p-4 rounded-xl bg-brand-50 text-brand-600">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Today's Total Issued Items</span>
                <p className="text-2xl font-display font-bold text-slate-800">{totalIssuedToday} Qty</p>
                <span className="text-[10px] text-slate-400">Routed across active vehicles</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
              <div className="p-4 rounded-xl bg-amber-50 text-amber-600">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Unprocessed Return Slips</span>
                <p className="text-2xl font-display font-bold text-slate-800">{pendingReturnsCount}</p>
                <span className="text-[10px] text-amber-600 font-semibold">Awaiting structural audit</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Warehouse Status</span>
                <p className="text-lg font-display font-bold text-emerald-600">FULLY COMPLIANT</p>
                <span className="text-[10px] text-slate-400">Lock stock integrity: 100%</span>
              </div>
            </div>
          </div>

          {/* Actual Depot Stock Level listings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori p-4 md:p-6">
            <h3 className="font-display font-bold text-slate-800 text-base mb-4">
              Authorized Warehouse Stock Levels (Audited)
            </h3>
            
            {/* Mobile Cards (Visible only on mobile) */}
            <div className="md:hidden space-y-3">
              {depotStock.map((stock) => (
                <div key={stock.productId} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-950 text-xs">{stock.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Product ID: {stock.productId}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
                      <span className="h-1 w-1 rounded-full bg-emerald-500" /> SECURE
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/40 text-xs">
                    <span className="text-slate-500">Warehouse Balance:</span>
                    <span className="font-bold text-slate-900">
                      {stock.qty.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">({stock.uom})</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (Visible on md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Product ID</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4 text-center">In-Stock Balance</th>
                    <th className="px-6 py-4 text-center">Unit of Measure (UOM)</th>
                    <th className="px-6 py-4 text-center">Logistics Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {depotStock.map((stock) => (
                    <tr key={stock.productId} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {stock.productId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {stock.productName}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">
                        {stock.qty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {stock.uom}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> SECURE MATCH
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Goods Issue Form */}
      {activeTab === 'issue' && (
        <form onSubmit={handleGoodsIssueSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-6 animate-fadeIn" id="form-goods-issue">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 text-base">New Cargo Load Out Voucher</h3>
              <p className="text-xs text-slate-400 mt-0.5">Issue inventory load to Sales Officer transport vehicle.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Officer Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Receiver Sales Officer *
              </label>
              <select
                required
                value={issueOfficer}
                onChange={(e) => setIssueOfficer(e.target.value)}
                id="issue-select-officer"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="">-- Choose Field Officer --</option>
                {salesOfficers.map((so) => (
                  <option key={so.username} value={so.username}>
                    {so.employeeName} (@{so.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Dispatch / Gatepass Notes
              </label>
              <input
                type="text"
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="e.g. Loadout on vehicle KA-05-8812 for South market route"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Load out items grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-50">
              <h4 className="font-display font-bold text-slate-800 text-xs">Dispatch Items & Quantities</h4>
              <button
                type="button"
                onClick={handleAddIssueRow}
                id="btn-add-issue-row"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>

            {issueItems.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {/* Select product */}
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">Select Catalog Product *</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleIssueItemChange(index, 'productId', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.description} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty */}
                <div className="w-full sm:w-32 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">Issue Qty *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={item.qty}
                    onChange={(e) => handleIssueItemChange(index, 'qty', Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* UOM */}
                <div className="w-full sm:w-28 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">UOM</label>
                  <input
                    type="text"
                    disabled
                    value={item.uom}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500"
                  />
                </div>

                {/* Actions */}
                <button
                  type="button"
                  disabled={issueItems.length === 1}
                  onClick={() => handleRemoveIssueRow(index)}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-35"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/10 active:scale-[0.98] transition-all"
            >
              <Truck className="h-4.5 w-4.5" /> Dispatch Load-Out Voucher
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Goods Return Form */}
      {activeTab === 'return' && (
        <form onSubmit={handleGoodsReturnSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-6 animate-fadeIn" id="form-goods-return">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 text-base">New Goods Return Slip</h3>
              <p className="text-xs text-slate-400 mt-0.5">Record transit breakage, near-expiry, or dealer excess restock items.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Returning Sales Officer */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Returning Sales Officer *
              </label>
              <select
                required
                value={returnOfficer}
                onChange={(e) => setReturnOfficer(e.target.value)}
                id="return-select-officer"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="">-- Choose Field Officer --</option>
                {salesOfficers.map((so) => (
                  <option key={so.username} value={so.username}>
                    {so.employeeName} (@{so.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Return Category Reason */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Primary Return Reason *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="Transit Damage / Leakage">Transit Damage / Leakage</option>
                <option value="Near Expiry Batch Return">Near Expiry Batch Return</option>
                <option value="Dealer Non-Sales Return">Dealer Non-Sales Return</option>
                <option value="Incorrect Delivery Batch">Incorrect Delivery Batch</option>
              </select>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Additional Comments
              </label>
              <input
                type="text"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Details of batch inspect..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Return items rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-50">
              <h4 className="font-display font-bold text-slate-800 text-xs">Returned Items & Quantities</h4>
              <button
                type="button"
                onClick={handleAddReturnRow}
                id="btn-add-return-row"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>

            {returnItems.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">Select Catalog Product *</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleReturnItemChange(index, 'productId', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.description} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-32 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">Return Qty *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={item.qty}
                    onChange={(e) => handleReturnItemChange(index, 'qty', Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="w-full sm:w-28 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">UOM</label>
                  <select
                    value={item.uom}
                    onChange={(e) => handleReturnItemChange(index, 'uom', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={returnItems.length === 1}
                  onClick={() => handleRemoveReturnRow(index)}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-35"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/10 active:scale-[0.98] transition-all"
            >
              <ArrowRightLeft className="h-4.5 w-4.5" /> Log Return Voucher
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Voucher History with Print option */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-fadeIn" id="tab-voucher-history">
          {/* Goods Issues History Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori p-4 md:p-6">
            <h3 className="font-display font-bold text-slate-800 text-base mb-4">
              Dispatched Load Out History (Goods Issue)
            </h3>

            {/* Mobile View Card Grid */}
            <div className="md:hidden space-y-4">
              {goodsIssues
                .filter((gi) => gi.depotSite === activeDepot?.siteName).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No issue vouchers logged yet.</div>
                ) : (
                  goodsIssues
                    .filter((gi) => gi.depotSite === activeDepot?.siteName)
                    .map((gi) => (
                      <div key={gi.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono font-bold text-slate-900 text-xs">{gi.id}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{gi.issueDate}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                            gi.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-brand-50 text-brand-700 border border-brand-100'
                          }`}>
                            {gi.status}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-slate-500">Receiver: <span className="font-bold text-slate-800">@{gi.salesOfficerUsername}</span></p>
                          <p className="text-slate-500">Loaded Cargo: <span className="font-semibold text-slate-700">{gi.items.length} lines ({gi.items.reduce((s, i) => s + i.qty, 0)} total)</span></p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/40">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(gi, 'issue')}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs"
                          >
                            <Printer className="h-3.5 w-3.5" /> Preview Slip
                          </button>
                        </div>
                      </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Voucher ID</th>
                    <th className="px-6 py-4">Issue Date</th>
                    <th className="px-6 py-4">Field Officer</th>
                    <th className="px-6 py-4">Loaded Items (Qty)</th>
                    <th className="px-6 py-4">Log Status</th>
                    <th className="px-6 py-4 text-center">Print Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {goodsIssues
                    .filter((gi) => gi.depotSite === activeDepot?.siteName)
                    .map((gi) => (
                      <tr key={gi.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {gi.id}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 font-medium text-slate-500">
                            <Calendar className="h-3.5 w-3.5" /> {gi.issueDate}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-brand-600">
                          @{gi.salesOfficerUsername}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {gi.items.length} product lines ({gi.items.reduce((s, i) => s + i.qty, 0)} total)
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              gi.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-brand-50 text-brand-700 border border-brand-100'
                            }`}
                          >
                            {gi.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(gi, 'issue')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-700"
                            id={`btn-print-gi-${gi.id}`}
                          >
                            <Printer className="h-3.5 w-3.5" /> Preview Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Goods Returns History Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-fiori p-4 md:p-6">
            <h3 className="font-display font-bold text-slate-800 text-base mb-4">
              Audited Returns history (Goods Return)
            </h3>

            {/* Mobile View Card Grid */}
            <div className="md:hidden space-y-4">
              {goodsReturns
                .filter((gr) => gr.depotSite === activeDepot?.siteName).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No return vouchers logged yet.</div>
                ) : (
                  goodsReturns
                    .filter((gr) => gr.depotSite === activeDepot?.siteName)
                    .map((gr) => (
                      <div key={gr.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono font-bold text-slate-900 text-xs">{gr.id}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{gr.returnDate}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100 font-bold text-[9px]">
                            {gr.reason}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-slate-500">Field Officer: <span className="font-bold text-slate-800">@{gr.salesOfficerUsername}</span></p>
                          <p className="text-slate-500">Returned Quantity: <span className="font-bold text-brand-600">{gr.items.reduce((s, i) => s + i.qty, 0)} Pcs</span></p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/40">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(gr, 'return')}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs"
                          >
                            <Printer className="h-3.5 w-3.5" /> Preview Voucher
                          </button>
                        </div>
                      </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Return ID</th>
                    <th className="px-6 py-4">Log Date</th>
                    <th className="px-6 py-4">Field Officer</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-800">Returned Vol</th>
                    <th className="px-6 py-4 text-center">Print Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {goodsReturns
                    .filter((gr) => gr.depotSite === activeDepot?.siteName)
                    .map((gr) => (
                      <tr key={gr.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {gr.id}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 font-medium text-slate-500">
                            <Calendar className="h-3.5 w-3.5" /> {gr.returnDate}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          @{gr.salesOfficerUsername}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100 font-bold text-[10px]">
                            {gr.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                          {gr.items.reduce((s, i) => s + i.qty, 0)} Pcs
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(gr, 'return')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-700"
                            id={`btn-print-gr-${gr.id}`}
                          >
                            <Printer className="h-3.5 w-3.5" /> Preview Voucher
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Voucher Print Preview (ERP Standards)"
        size="lg"
      >
        {activePrintVoucher && (
          <div className="space-y-6" id="voucher-print-preview">
            {/* The actual printable area */}
            <div className="p-8 border border-slate-200 rounded-2xl bg-white print-container shadow-sm space-y-6">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-brand-600 tracking-wider uppercase bg-brand-50 px-2 py-1 rounded">
                    Enterprise ERP System
                  </span>
                  <h2 className="font-display font-bold text-slate-800 text-xl tracking-tight mt-1">
                    {activePrintVoucher.type === 'issue' ? 'GOODS ISSUE SLIP' : 'GOODS RETURN CREDIT NOTE'}
                  </h2>
                  <p className="text-xs text-slate-500">Logistics Site: {activeDepot?.siteName}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold text-slate-800 font-mono">ID: {activePrintVoucher.id}</p>
                  <p className="text-xs text-slate-400">Date Logged: {activePrintVoucher.date}</p>
                  <p className="text-xs text-slate-400">Tax compliance: Verified</p>
                </div>
              </div>

              {/* Transit particulars */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Sender Warehouse Hub</p>
                  <p className="font-bold text-slate-800 mt-1">{activeDepot?.siteName}</p>
                  <p className="text-slate-500 mt-0.5">{activeDepot?.address}, {activeDepot?.city}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">GSTIN: {activeDepot?.gst}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Carrier / Field Personnel</p>
                  <p className="font-bold text-slate-800 mt-1">Sales Officer: @{activePrintVoucher.officer}</p>
                  <p className="text-slate-500 mt-0.5">Route dispatch clearance</p>
                  {activePrintVoucher.reason && (
                    <p className="text-xs font-semibold text-amber-700 mt-1.5">
                      Reason code: {activePrintVoucher.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Items details table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5">Line No.</th>
                    <th className="py-2.5">Product Description</th>
                    <th className="py-2.5 text-center">Quantity</th>
                    <th className="py-2.5 text-center">Unit of Measure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activePrintVoucher.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3 font-mono text-slate-400">#{index + 1}</td>
                      <td className="py-3 font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-3 text-center font-bold text-slate-800">{item.qty}</td>
                      <td className="py-3 text-center font-medium">{item.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Remarks block */}
              <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-500 flex justify-between items-end">
                <div>
                  <p className="font-bold text-slate-700">Audit Remarks:</p>
                  <p className="italic mt-0.5">{activePrintVoucher.notes || 'No remarks provided.'}</p>
                </div>
                <div className="text-center w-40 border-t border-slate-300 pt-2 shrink-0">
                  <p className="font-bold text-slate-700 text-xs">Gatekeeper Signature</p>
                </div>
              </div>
            </div>

            {/* Print trigger button */}
            <div className="flex justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handlePrintTrigger}
                id="btn-print-voucher-dialog"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" /> Print Voucher
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepotDashboard;
