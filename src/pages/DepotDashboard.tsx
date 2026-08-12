import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GoodsIssue,
  GoodsReturn,
  GoodsIssueItem,
  GoodsReturnItem,
  LineSaleAccount,
  SalesEntry,
  Product
} from '../types';
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
  DollarSign,
  CreditCard,
  Search,
  Download,
  Eye,
  Building2,
  Tag,
  Layers,
  Package,
  CheckSquare,
  Square,
  RefreshCw,
  MapPin,
  Phone,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const DepotDashboard: React.FC = () => {
  const {
    currentUser,
    goodsIssues,
    addGoodsIssue,
    goodsReturns,
    addGoodsReturn,
    salesEntries,
    lineSaleAccounts,
    products,
    schemeLists,
    priceLists,
    depots,
    users
  } = useApp();

  // 1. DATA ACCESS & ISOLATION: Identify active depot assigned to currently logged in Depo Manager
  const activeDepot = depots.find((d) => d.assignedUser === currentUser?.username) || depots[0];

  // 2. DATA ACCESS & ISOLATION: Filter assigned Line Sales ONLY for this depot
  const assignedLineSales = lineSaleAccounts.filter((l) =>
    (activeDepot?.assignedLines || []).includes(l.partyCode) ||
    l.nearestDepot === activeDepot?.siteName
  );

  const assignedPartyCodes = assignedLineSales.map((l) => l.partyCode);
  const assignedPartyNames = assignedLineSales.map((l) => l.partyName);

  // Filter Goods Issues belonging to this depot / assigned line sales
  const depotGoodsIssues = goodsIssues.filter((gi) =>
    gi.depotSite === activeDepot?.siteName ||
    (gi.partyCode && assignedPartyCodes.includes(gi.partyCode)) ||
    (gi.partyName && assignedPartyNames.includes(gi.partyName))
  );

  // Filter Goods Returns belonging to this depot / assigned line sales
  const depotGoodsReturns = goodsReturns.filter((gr) =>
    gr.depotSite === activeDepot?.siteName ||
    (gr.partyCode && assignedPartyCodes.includes(gr.partyCode)) ||
    (gr.partyName && assignedPartyNames.includes(gr.partyName))
  );

  // Filter Sales Entries belonging ONLY to assigned line sales
  const depotSalesEntries = salesEntries.filter((se) =>
    (se.partyCode && assignedPartyCodes.includes(se.partyCode)) ||
    assignedPartyNames.includes(se.shopName)
  );

  // Top Dashboard Tabs according to Excel specification
  const [activeTab, setActiveTab] = useState<'sales' | 'issue' | 'return' | 'stock' | 'cash' | 'upi' | 'lines'>('sales');

  // Sales View Date Filter - Defaults to TODAY'S DATE
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedSalesDate, setSelectedSalesDate] = useState<string>(todayStr);

  // Search filter inside Sales View
  const [salesSearchQuery, setSalesSearchQuery] = useState('');

  // Selected Line Sale for "View Details" dialog
  const [selectedLineSale, setSelectedLineSale] = useState<LineSaleAccount | null>(null);

  // Print Voucher Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintVoucher, setActivePrintVoucher] = useState<{
    id: string;
    type: 'issue' | 'return';
    date: string;
    partyName?: string;
    vehicleNum?: string;
    startingReading?: number;
    endingReading?: number;
    totalRunningRange?: number;
    driverName?: string;
    officer?: string;
    notes?: string;
    reason?: string;
    items: { productName: string; additionalName?: string; qty: number; uom: string; rate?: number; amount?: number }[];
  } | null>(null);

  // ==========================================
  // GOODS ISSUE FORM STATE
  // ==========================================
  const [issuePartyCode, setIssuePartyCode] = useState<string>(assignedLineSales[0]?.partyCode || '');
  const [issueVehicleNum, setIssueVehicleNum] = useState<string>('KA-01-EV-4090');
  const [issueStartingReading, setIssueStartingReading] = useState<number>(12500);
  const [issueDriverName, setIssueDriverName] = useState<string>('Ramesh Kumar');
  const [issueOfficer, setIssueOfficer] = useState<string>(users.find((u) => u.role === 'Sales Officer')?.username || 'sales');
  const [issueNotes, setIssueNotes] = useState<string>('');
  
  // Selection by product or additional name
  const [issueSelectionMode, setIssueSelectionMode] = useState<'description' | 'additionalName'>('description');

  const [issueItems, setIssueItems] = useState<GoodsIssueItem[]>([
    {
      productId: products[0]?.id || 'PROD-001',
      productName: products[0]?.description || 'Golden Leaf Premium Tea 250g',
      additionalName: products[0]?.additionalName || 'GL Tea 250G',
      qty: 10,
      uom: 'Box',
      rate: products[0]?.rate || 110,
      amount: (products[0]?.rate || 110) * 10
    }
  ]);

  // ==========================================
  // GOODS RETURN FORM STATE
  // ==========================================
  const [selectedIssueRef, setSelectedIssueRef] = useState<string>('');
  const [returnEndingReading, setReturnEndingReading] = useState<number>(12560);
  const [returnReason, setReturnReason] = useState<string>('Transit Damage / Unsold Return');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnItems, setReturnItems] = useState<GoodsReturnItem[]>([]);

  // Calculate Running Range for Goods Return
  const selectedIssueObj = depotGoodsIssues.find((gi) => gi.id === selectedIssueRef);
  const calculatedStartingReading = selectedIssueObj?.startingReading || 0;
  const calculatedRunningRange = Math.max(0, returnEndingReading - calculatedStartingReading);

  // Retrieve field Sales Officers for dropdowns
  const salesOfficers = users.filter((u) => u.role === 'Sales Officer');

  // ==========================================
  // GOODS ISSUE HANDLERS
  // ==========================================
  const handleAddIssueRow = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setIssueItems([
      ...issueItems,
      {
        productId: firstProd.id,
        productName: firstProd.description,
        additionalName: firstProd.additionalName || '',
        qty: 1,
        uom: 'Box',
        rate: firstProd.rate,
        amount: firstProd.rate * 1
      }
    ]);
  };

  const handleRemoveIssueRow = (index: number) => {
    if (issueItems.length === 1) return;
    setIssueItems(issueItems.filter((_, i) => i !== index));
  };

  const handleIssueItemChange = (index: number, field: string, val: any) => {
    setIssueItems(
      issueItems.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          const prod = products.find((p) => p.id === val);
          if (prod) {
            const newQty = item.qty || 1;
            const newRate = prod.rate;
            return {
              ...item,
              productId: prod.id,
              productName: prod.description,
              additionalName: prod.additionalName || '',
              uom: item.uom || 'Box',
              rate: newRate,
              amount: newQty * newRate
            };
          }
        }
        if (field === 'qty') {
          const numQty = Math.max(1, Number(val) || 0);
          const rate = item.rate || 0;
          return {
            ...item,
            qty: numQty,
            amount: numQty * rate
          };
        }
        if (field === 'rate') {
          const numRate = Number(val) || 0;
          return {
            ...item,
            rate: numRate,
            amount: (item.qty || 1) * numRate
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleGoodsIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuePartyCode) {
      toast.error('Please select an assigned Line Sale party.');
      return;
    }
    const selectedParty = assignedLineSales.find((l) => l.partyCode === issuePartyCode);

    addGoodsIssue({
      depotSite: activeDepot.siteName,
      partyCode: issuePartyCode,
      partyName: selectedParty?.partyName || issuePartyCode,
      vehicleNum: issueVehicleNum,
      startingReading: Number(issueStartingReading) || 0,
      driverName: issueDriverName,
      salesOfficerUsername: issueOfficer,
      issueDate: new Date().toISOString().substring(0, 10),
      items: issueItems,
      notes: issueNotes
    });

    toast.success('Goods Issue voucher posted successfully!');
    setIssueNotes('');
    setActiveTab('stock');
  };

  // ==========================================
  // GOODS RETURN HANDLERS
  // ==========================================
  const handleSelectIssueForReturn = (issueId: string) => {
    setSelectedIssueRef(issueId);
    const gi = depotGoodsIssues.find((g) => g.id === issueId);
    if (gi) {
      // Auto-populate items from selected Goods Issue
      const itemsForReturn: GoodsReturnItem[] = gi.items.map((item) => {
        // Calculate sold quantity from sales entries for this party and product
        const soldQty = depotSalesEntries
          .filter(
            (se) =>
              (se.partyCode === gi.partyCode || se.shopName === gi.partyName) &&
              se.productId === item.productId
          )
          .reduce((sum, se) => sum + se.qty + se.freeQty, 0);

        const diff = Math.max(0, item.qty - soldQty);

        return {
          productId: item.productId,
          productName: item.productName,
          additionalName: item.additionalName || '',
          issuedQty: item.qty,
          soldQty: soldQty,
          diffQty: diff,
          qty: diff, // default return qty to calculated diff
          uom: item.uom,
          rate: item.rate || 0,
          amount: (item.rate || 0) * diff,
          confirmed: true
        };
      });

      setReturnItems(itemsForReturn);
      if (gi.startingReading) {
        setReturnEndingReading(gi.startingReading + 50);
      }
    } else {
      setReturnItems([]);
    }
  };

  const handleReturnItemToggle = (index: number) => {
    setReturnItems(
      returnItems.map((item, i) => (i === index ? { ...item, confirmed: !item.confirmed } : item))
    );
  };

  const handleReturnQtyChange = (index: number, newQtyVal: number) => {
    setReturnItems(
      returnItems.map((item, i) => {
        if (i !== index) return item;
        const validQty = Math.max(0, newQtyVal);
        const rate = item.rate || 0;
        return {
          ...item,
          qty: validQty,
          amount: validQty * rate
        };
      })
    );
  };

  const handleGoodsReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueRef) {
      toast.error('Please select an Issued Stock entry reference.');
      return;
    }
    const gi = depotGoodsIssues.find((g) => g.id === selectedIssueRef);

    const confirmedItems = returnItems.filter((item) => item.confirmed && item.qty > 0);
    if (confirmedItems.length === 0) {
      toast.error('Please check at least one return item row.');
      return;
    }

    addGoodsReturn({
      depotSite: activeDepot.siteName,
      issueEntryRefId: selectedIssueRef,
      partyCode: gi?.partyCode,
      partyName: gi?.partyName,
      vehicleNum: gi?.vehicleNum,
      startingReading: gi?.startingReading,
      endingReading: Number(returnEndingReading) || 0,
      totalRunningRange: calculatedRunningRange,
      salesOfficerUsername: gi?.salesOfficerUsername || 'sales',
      returnDate: new Date().toISOString().substring(0, 10),
      items: confirmedItems,
      reason: returnReason,
      notes: returnNotes
    });

    toast.success('Goods Return voucher logged successfully!');
    setSelectedIssueRef('');
    setReturnNotes('');
    setReturnItems([]);
    setActiveTab('stock');
  };

  // ==========================================
  // PRINT VOUCHER HANDLER
  // ==========================================
  const handleOpenPrint = (voucher: any, type: 'issue' | 'return') => {
    setActivePrintVoucher({
      id: voucher.id,
      type,
      date: type === 'issue' ? voucher.issueDate : voucher.returnDate,
      partyName: voucher.partyName || voucher.depotSite,
      vehicleNum: voucher.vehicleNum,
      startingReading: voucher.startingReading,
      endingReading: voucher.endingReading,
      totalRunningRange: voucher.totalRunningRange,
      driverName: voucher.driverName,
      officer: voucher.salesOfficerUsername,
      notes: voucher.notes,
      reason: voucher.reason,
      items: voucher.items
    });
    setIsPrintModalOpen(true);
  };

  // ==========================================
  // CALCULATE SUMMARY KPI METRICS (REAL DATA)
  // ==========================================
  // 1. Sales View Today Total Amount
  const todaySalesEntries = depotSalesEntries.filter((se) => {
    const entryDate = se.date.substring(0, 10);
    return entryDate === selectedSalesDate;
  });

  const totalSalesTodayAmount = todaySalesEntries.reduce((sum, se) => sum + se.amount, 0);

  // 2. Total Cash Amount
  const cashSalesEntries = depotSalesEntries.filter((se) => se.paymentMethod === 'Cash');
  const totalCashAmount = cashSalesEntries.reduce((sum, se) => sum + se.amount, 0);

  // 3. Total UPI Amount
  const upiSalesEntries = depotSalesEntries.filter((se) => se.paymentMethod === 'UPI');
  const totalUpiAmount = upiSalesEntries.reduce((sum, se) => sum + se.amount, 0);

  // 4. Issued Stock Total Units
  const totalIssuedStockUnits = depotGoodsIssues.reduce((sum, gi) => {
    return sum + gi.items.reduce((s, item) => s + item.qty, 0);
  }, 0);

  // 5. Remaining Stock in Truck Calculation (Per product)
  const remainingStockTable = products.map((prod) => {
    // Issued
    const issuedQty = depotGoodsIssues.reduce((sum, gi) => {
      const item = gi.items.find((i) => i.productId === prod.id);
      return sum + (item ? item.qty : 0);
    }, 0);

    // Sold
    const soldQty = depotSalesEntries.reduce((sum, se) => {
      if (se.productId === prod.id) {
        return sum + se.qty + se.freeQty;
      }
      return sum;
    }, 0);

    // Returned
    const returnedQty = depotGoodsReturns.reduce((sum, gr) => {
      const item = gr.items.find((i) => i.productId === prod.id);
      return sum + (item ? item.qty : 0);
    }, 0);

    const remainingInTruck = Math.max(0, issuedQty - soldQty - returnedQty);

    return {
      product: prod,
      issuedQty,
      soldQty,
      returnedQty,
      remainingInTruck
    };
  });

  const totalRemainingStockUnits = remainingStockTable.reduce((sum, r) => sum + r.remainingInTruck, 0);

  // Export Sales Entries to CSV
  const handleExportSalesCSV = () => {
    if (todaySalesEntries.length === 0) {
      toast.error('No sales entries found to export for the selected date.');
      return;
    }
    const headers = ['Invoice ID', 'Date', 'Line Sale / Shop', 'Party Code', 'Product', 'Qty', 'Free Qty', 'Rate', 'Amount', 'Payment Method', 'Sales Officer'];
    const rows = todaySalesEntries.map((se) => [
      se.id,
      se.date,
      `"${se.shopName}"`,
      se.partyCode || '',
      `"${se.productName}"`,
      se.qty,
      se.freeQty,
      se.rate,
      se.amount,
      se.paymentMethod,
      se.salesOfficerUsername
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_${activeDepot.siteName}_${selectedSalesDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales report CSV downloaded.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
            <Warehouse className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full uppercase tracking-wider">
                Depo Manager Portal
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {activeDepot.siteName}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {activeDepot.siteName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Manager: <strong className="text-slate-700">{currentUser?.employeeName || currentUser?.username}</strong> ({assignedLineSales.length} Line Sales Linked)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('issue')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Goods Issue
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" /> Goods Return
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS CARDS (EXCEL SPECIFICATION - 5 CORE SECTIONS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. SALES VIEW */}
        <div
          onClick={() => setActiveTab('sales')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
            activeTab === 'sales' ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales View</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-slate-900">₹{totalSalesTodayAmount.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Date: {selectedSalesDate} ({todaySalesEntries.length} Invoices)
            </p>
          </div>
        </div>

        {/* 2. ISSUED STOCK */}
        <div
          onClick={() => setActiveTab('issue')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
            activeTab === 'issue' ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued Stock</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-slate-900">{totalIssuedStockUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">Units</span></div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total Issued Vouchers: <strong>{depotGoodsIssues.length}</strong>
            </p>
          </div>
        </div>

        {/* 3. REMAINING STOCK IN TRUCK */}
        <div
          onClick={() => setActiveTab('stock')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
            activeTab === 'stock' ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Stock</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-slate-900">{totalRemainingStockUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">Units</span></div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active Truck Inventory Balance
            </p>
          </div>
        </div>

        {/* 4. CASH AMOUNT */}
        <div
          onClick={() => setActiveTab('cash')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
            activeTab === 'cash' ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Amount</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-emerald-600">₹{totalCashAmount.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total Cash Collections ({cashSalesEntries.length} Txns)
            </p>
          </div>
        </div>

        {/* 5. UPI AMOUNT */}
        <div
          onClick={() => setActiveTab('upi')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
            activeTab === 'upi' ? 'border-cyan-500 ring-2 ring-cyan-500/10 shadow-md' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">UPI Amount</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-cyan-600">₹{totalUpiAmount.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total Digital UPI Txns ({upiSalesEntries.length} Txns)
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="border-b border-slate-200 bg-white rounded-2xl p-2 shadow-sm flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'sales' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> 1. Sales View
        </button>
        <button
          onClick={() => setActiveTab('issue')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'issue' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" /> 2. Goods Issue
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'return' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> 3. Goods Return
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'stock' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> 4. Remaining Stock in Truck
        </button>
        <button
          onClick={() => setActiveTab('cash')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'cash' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" /> 5. Cash Amount
        </button>
        <button
          onClick={() => setActiveTab('upi')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'upi' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" /> 6. UPI Amount
        </button>
        <button
          onClick={() => setActiveTab('lines')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'lines' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> Assigned Line Sales ({assignedLineSales.length})
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: SALES VIEW                          */}
      {/* ========================================== */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Sales View — Assigned Line Sales
              </h2>
              <p className="text-xs text-slate-500">
                Displaying sales records for Line Sales assigned to <strong>{activeDepot.siteName}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-600">Select Date:</label>
                <input
                  type="date"
                  value={selectedSalesDate}
                  onChange={(e) => setSelectedSalesDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search sales..."
                  value={salesSearchQuery}
                  onChange={(e) => setSalesSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none focus:border-blue-500 text-slate-800 w-40 sm:w-52"
                />
              </div>

              <button
                onClick={handleExportSalesCSV}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Sales List Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Line Sale / Shop Name</th>
                  <th className="py-3 px-4">Party Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-center">Free Qty</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4">Sales Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {todaySalesEntries
                  .filter((se) => {
                    if (!salesSearchQuery) return true;
                    const q = salesSearchQuery.toLowerCase();
                    return (
                      se.id.toLowerCase().includes(q) ||
                      se.shopName.toLowerCase().includes(q) ||
                      se.productName.toLowerCase().includes(q) ||
                      (se.partyCode && se.partyCode.toLowerCase().includes(q))
                    );
                  })
                  .map((se) => (
                    <tr key={se.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-blue-600">{se.id}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(se.date).toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{se.shopName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{se.partyCode || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{se.productName}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{se.qty}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{se.freeQty || 0}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{se.rate}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">₹{se.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            se.paymentMethod === 'Cash'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          }`}
                        >
                          {se.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{se.salesOfficerUsername}</td>
                    </tr>
                  ))}

                {todaySalesEntries.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400">
                      No sales entries logged for date <strong>{selectedSalesDate}</strong> in this depot's assigned line sales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: GOODS ISSUE                         */}
      {/* ========================================== */}
      {activeTab === 'issue' && (
        <div className="space-y-6">
          {/* GOODS ISSUE FORM */}
          <form onSubmit={handleGoodsIssueSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" /> Create Goods Issue Entry
                </h2>
                <p className="text-xs text-slate-500">
                  Issue product load out to assigned Line Sale trucks
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Auto DOC ID:</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded-lg">
                  GI-{Math.floor(10000 + Math.random() * 90000)}
                </span>
              </div>
            </div>

            {/* HEADER FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* PARTY (RESTRICTED DROPDOWN) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Party / Line Sale <span className="text-red-500">*</span>
                </label>
                <select
                  value={issuePartyCode}
                  onChange={(e) => setIssuePartyCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  {assignedLineSales.map((line) => (
                    <option key={line.partyCode} value={line.partyCode}>
                      {line.partyName} ({line.partyCode})
                    </option>
                  ))}
                  {assignedLineSales.length === 0 && (
                    <option value="">No Line Sales assigned to this depot</option>
                  )}
                </select>
                <p className="text-[10px] text-blue-600 mt-1">
                  ✓ Restricted strictly to assigned Line Sales for {activeDepot.siteName}
                </p>
              </div>

              {/* VEHICLE NUM */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Num</label>
                <input
                  type="text"
                  value={issueVehicleNum}
                  onChange={(e) => setIssueVehicleNum(e.target.value)}
                  placeholder="e.g. KA-01-EV-4090"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* STARTING READING */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Starting Reading (Km)</label>
                <input
                  type="number"
                  value={issueStartingReading}
                  onChange={(e) => setIssueStartingReading(Number(e.target.value))}
                  placeholder="e.g. 12500"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* DRIVER NAME */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={issueDriverName}
                  onChange={(e) => setIssueDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* RECEIVING SALES OFFICER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Sales Officer</label>
                <select
                  value={issueOfficer}
                  onChange={(e) => setIssueOfficer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  {salesOfficers.map((u) => (
                    <option key={u.employeeId} value={u.username}>
                      {u.employeeName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Optional load out remarks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* PRODUCT ENTRY TABLE */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Product Load Items</h3>
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setIssueSelectionMode('description')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        issueSelectionMode === 'description' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      By Product Name
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueSelectionMode('additionalName')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        issueSelectionMode === 'additionalName' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      By Additional Name
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddIssueRow}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Additional Name</th>
                      <th className="py-2.5 px-3 w-28 text-center">QTY</th>
                      <th className="py-2.5 px-3 w-24">UOM</th>
                      <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {issueItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.productId}
                            onChange={(e) => handleIssueItemChange(idx, 'productId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {issueSelectionMode === 'description' ? p.description : `${p.additionalName || p.description} (${p.description})`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">
                          {item.additionalName || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleIssueItemChange(idx, 'qty', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-900 outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.uom || 'Box'}
                            onChange={(e) => handleIssueItemChange(idx, 'uom', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="Box">Box</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Crates">Crates</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            value={item.rate || 0}
                            onChange={(e) => handleIssueItemChange(idx, 'rate', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800 outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                          ₹{(item.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveIssueRow(idx)}
                            disabled={issueItems.length === 1}
                            className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-xs text-slate-900 border-t border-slate-200">
                      <td colSpan={3} className="py-3 px-4">
                        Total Load Items: {issueItems.length}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {issueItems.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)} Units
                      </td>
                      <td></td>
                      <td className="py-3 px-3 text-right">Total Amount:</td>
                      <td className="py-3 px-3 text-right text-blue-600 font-mono text-sm">
                        ₹{issueItems.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Save & Issue Stock Load
              </button>
            </div>
          </form>

          {/* ISSUED STOCK HISTORY LIST */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Issued Stock Vouchers History
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">DOC ID</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Party / Line Sale</th>
                    <th className="py-3 px-4">Vehicle Num</th>
                    <th className="py-3 px-4">Start Reading</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {depotGoodsIssues.map((gi) => (
                    <tr key={gi.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-blue-600 font-mono">{gi.id}</td>
                      <td className="py-3 px-4">{gi.issueDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{gi.partyName || gi.depotSite}</td>
                      <td className="py-3 px-4 font-mono">{gi.vehicleNum || 'KA-01-EV-4090'}</td>
                      <td className="py-3 px-4 font-mono">{gi.startingReading || 12500} Km</td>
                      <td className="py-3 px-4">{gi.driverName || 'Ramesh Kumar'}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        {gi.items.reduce((s, i) => s + i.qty, 0)} Units ({gi.items.length} types)
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] border border-emerald-200">
                          {gi.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenPrint(gi, 'issue')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Preview
                        </button>
                      </td>
                    </tr>
                  ))}

                  {depotGoodsIssues.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No issued stock vouchers logged for this depot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: GOODS RETURN                        */}
      {/* ========================================== */}
      {activeTab === 'return' && (
        <div className="space-y-6">
          <form onSubmit={handleGoodsReturnSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-500" /> Goods Return Entry
                </h2>
                <p className="text-xs text-slate-500">
                  Select an existing Issued Stock voucher to log stock returns and calculate differences
                </p>
              </div>
            </div>

            {/* STEP 1: SELECT ISSUED STOCK */}
            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/60 space-y-3">
              <label className="block text-xs font-bold text-amber-900">
                1. List out Issued Stock (Select Entry Reference) <span className="text-red-500">*</span>
              </label>

              <select
                value={selectedIssueRef}
                onChange={(e) => handleSelectIssueForReturn(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              >
                <option value="">-- Choose Issued Stock Voucher Reference --</option>
                {depotGoodsIssues.map((gi) => (
                  <option key={gi.id} value={gi.id}>
                    {gi.id} - {gi.partyName || gi.depotSite} ({gi.issueDate}) - {gi.items.reduce((s, i) => s + i.qty, 0)} Units Issued
                  </option>
                ))}
              </select>

              {depotGoodsIssues.length === 0 && (
                <p className="text-xs text-amber-700">
                  ⚠️ No Goods Issues available for this depot. Please create a Goods Issue first.
                </p>
              )}
            </div>

            {/* HEADER DETAILS FROM SELECTED ISSUE */}
            {selectedIssueObj && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Party Name:</span>
                  <p className="text-xs font-bold text-slate-800">{selectedIssueObj.partyName || selectedIssueObj.depotSite}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Issue Entry Ref ID:</span>
                  <p className="text-xs font-mono font-bold text-blue-600">{selectedIssueObj.id}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Num:</span>
                  <p className="text-xs font-mono font-semibold text-slate-800">{selectedIssueObj.vehicleNum || 'KA-01-EV-4090'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Starting Reading:</span>
                  <p className="text-xs font-mono font-semibold text-slate-800">{selectedIssueObj.startingReading || 12500} Km</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ending Reading (Km):</label>
                  <input
                    type="number"
                    value={returnEndingReading}
                    onChange={(e) => setReturnEndingReading(Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Running Range:</span>
                  <p className="text-xs font-mono font-extrabold text-emerald-600">{calculatedRunningRange} Km</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Return:</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                  <p className="text-xs font-bold text-emerald-600">Completed</p>
                </div>
              </div>
            )}

            {/* RETURN PRODUCT TABLE */}
            {returnItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Return Product Inspection Matrix
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3 text-center">Confirm</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Additional Name</th>
                        <th className="py-2.5 px-3 text-center">Issued QTY</th>
                        <th className="py-2.5 px-3">UOM</th>
                        <th className="py-2.5 px-3 text-center">Sold QTY</th>
                        <th className="py-2.5 px-3 text-center">Diff (Return Qty)</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {returnItems.map((item, idx) => (
                        <tr key={idx} className={item.confirmed ? 'bg-amber-50/20' : 'bg-slate-50/50 opacity-60'}>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleReturnItemToggle(idx)}
                              className="text-amber-600 hover:text-amber-700 font-bold"
                            >
                              {item.confirmed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                          <td className="py-2.5 px-3 text-slate-500">{item.additionalName || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.issuedQty}</td>
                          <td className="py-2.5 px-3 text-slate-600">{item.uom}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-blue-600">{item.soldQty}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.qty}
                              onChange={(e) => handleReturnQtyChange(idx, Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-white border border-amber-300 rounded text-center font-bold text-amber-900 outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                            ₹{(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Goods Return Voucher
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* GOODS RETURN HISTORY LIST */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Logged Goods Return Vouchers
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Return ID</th>
                    <th className="py-3 px-4">Ref Issue ID</th>
                    <th className="py-3 px-4">Return Date</th>
                    <th className="py-3 px-4">Party Name</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4 text-center">Running Range</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {depotGoodsReturns.map((gr) => (
                    <tr key={gr.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-amber-600 font-mono">{gr.id}</td>
                      <td className="py-3 px-4 font-mono text-blue-600">{gr.issueEntryRefId || 'N/A'}</td>
                      <td className="py-3 px-4">{gr.returnDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{gr.partyName || gr.depotSite}</td>
                      <td className="py-3 px-4 font-mono">{gr.vehicleNum || 'KA-01-EV-4090'}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{gr.totalRunningRange || 60} Km</td>
                      <td className="py-3 px-4 text-slate-600">{gr.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-full text-[10px] border border-amber-200">
                          {gr.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenPrint(gr, 'return')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Preview
                        </button>
                      </td>
                    </tr>
                  ))}

                  {depotGoodsReturns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No goods return entries logged for this depot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: REMAINING STOCK IN TRUCK            */}
      {/* ========================================== */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" /> Remaining Stock in Truck Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Calculated dynamically as: <strong>Issued Quantity - Sold Quantity - Returned Quantity</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Total Truck Balance:</span>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 font-extrabold text-sm rounded-xl border border-purple-200">
                {totalRemainingStockUnits.toLocaleString()} Units
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Product ID</th>
                  <th className="py-3 px-4">Product Description</th>
                  <th className="py-3 px-4">Additional Name</th>
                  <th className="py-3 px-4 text-center">Issued Qty</th>
                  <th className="py-3 px-4 text-center">Sold Qty</th>
                  <th className="py-3 px-4 text-center">Returned Qty</th>
                  <th className="py-3 px-4 text-center bg-purple-50/50 text-purple-900">Remaining in Truck</th>
                  <th className="py-3 px-4 text-center">UOM</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {remainingStockTable.map((row) => (
                  <tr key={row.product.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{row.product.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.product.description}</td>
                    <td className="py-3 px-4 text-slate-500">{row.product.additionalName || 'N/A'}</td>
                    <td className="py-3 px-4 text-center font-semibold text-indigo-600">{row.issuedQty}</td>
                    <td className="py-3 px-4 text-center font-semibold text-blue-600">{row.soldQty}</td>
                    <td className="py-3 px-4 text-center font-semibold text-amber-600">{row.returnedQty}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-purple-700 bg-purple-50/30 text-sm">
                      {row.remainingInTruck}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 font-semibold">{row.product.baseUom}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          row.remainingInTruck > 50
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.remainingInTruck > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.remainingInTruck > 50 ? 'In Stock' : row.remainingInTruck > 0 ? 'Low Stock' : 'Depleted'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: CASH AMOUNT                         */}
      {/* ========================================== */}
      {activeTab === 'cash' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Cash Collections View
              </h2>
              <p className="text-xs text-slate-500">
                Detailed breakdown of all Cash sales entries collected for assigned Line Sales
              </p>
            </div>

            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Total Cash Accumulated</span>
              <div className="text-xl font-extrabold text-emerald-700">₹{totalCashAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Line Sale / Shop</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Sales Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {cashSalesEntries.map((se) => (
                  <tr key={se.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-emerald-600 font-mono">{se.id}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(se.date).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{se.shopName}</td>
                    <td className="py-3 px-4 text-slate-800">{se.productName}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{se.qty}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">₹{se.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-slate-600">{se.salesOfficerUsername}</td>
                  </tr>
                ))}

                {cashSalesEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No Cash sales transactions recorded for this depot's assigned line sales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: UPI AMOUNT                          */}
      {/* ========================================== */}
      {activeTab === 'upi' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-600" /> UPI Digital Collections View
              </h2>
              <p className="text-xs text-slate-500">
                Detailed breakdown of all UPI transactions collected for assigned Line Sales
              </p>
            </div>

            <div className="px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-2xl text-right">
              <span className="text-[10px] uppercase font-bold text-cyan-700">Total UPI Accumulated</span>
              <div className="text-xl font-extrabold text-cyan-700">₹{totalUpiAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Line Sale / Shop</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Sales Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {upiSalesEntries.map((se) => (
                  <tr key={se.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-cyan-600 font-mono">{se.id}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(se.date).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{se.shopName}</td>
                    <td className="py-3 px-4 text-slate-800">{se.productName}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{se.qty}</td>
                    <td className="py-3 px-4 text-right font-bold text-cyan-700 font-mono">₹{se.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-slate-600">{se.salesOfficerUsername}</td>
                  </tr>
                ))}

                {upiSalesEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No UPI sales transactions recorded for this depot's assigned line sales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 7: ASSIGNED LINE SALES / DEPOT VIEW    */}
      {/* ========================================== */}
      {activeTab === 'lines' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Assigned Line Sales Accounts
              </h2>
              <p className="text-xs text-slate-500">
                Showing Line Sales assigned to <strong>{activeDepot.siteName}</strong> via Depot Master tags
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedLineSales.map((line) => (
              <div
                key={line.partyCode}
                className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-mono font-extrabold text-xs rounded-lg">
                      {line.partyCode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${line.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {line.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {line.partyName}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> State: <strong>{line.state}</strong>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Depot: <strong>{line.nearestDepot}</strong>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact: <strong>{line.contactNo}</strong>
                    </p>
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                      <Tag className="w-3.5 h-3.5 text-slate-400" /> GSTIN: {line.gstn}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex justify-end">
                  <button
                    onClick={() => setSelectedLineSale(line)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                </div>
              </div>
            ))}

            {assignedLineSales.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                No Line Sales currently assigned to <strong>{activeDepot.siteName}</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* LINE SALE DETAILS DIALOG (SECTION 4 & 12)  */}
      {/* ========================================== */}
      {selectedLineSale && (
        <Modal
          isOpen={!!selectedLineSale}
          onClose={() => setSelectedLineSale(null)}
          title={`Line Sale Details: ${selectedLineSale.partyName}`}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* ACCOUNT OVERVIEW HEADER */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Account ID (partyCode)</span>
                <p className="text-sm font-mono font-bold text-blue-600">{selectedLineSale.partyCode}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Name (partyName)</span>
                <p className="text-sm font-bold text-slate-900">{selectedLineSale.partyName}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">State</span>
                <p className="text-xs font-semibold text-slate-800">{selectedLineSale.state}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Nearest Depot</span>
                <p className="text-xs font-semibold text-slate-800">{selectedLineSale.nearestDepot}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">GST No (gstn)</span>
                <p className="text-xs font-mono font-semibold text-slate-800">{selectedLineSale.gstn}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Contact No</span>
                <p className="text-xs font-semibold text-slate-800">{selectedLineSale.contactNo}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Geographical Location</span>
                <p className="text-xs font-mono text-slate-700">{selectedLineSale.geographicalLocation || '12.9716, 77.5946'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                <p className="text-xs font-bold text-emerald-600">{selectedLineSale.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>

            {/* SCHEME & PRICING LINK */}
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-2">
              <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-600" /> Linked Promotional Scheme List
              </h4>
              <p className="text-xs font-semibold text-slate-800">
                Scheme List ID: <strong className="text-blue-700">{selectedLineSale.schemeListId || 'SL-SUMMER-SPECIAL'}</strong>
              </p>
              {schemeLists.find((s) => s.id === (selectedLineSale.schemeListId || 'SL-SUMMER-SPECIAL')) && (
                <p className="text-xs text-slate-600">
                  Scheme Name: <strong>{schemeLists.find((s) => s.id === (selectedLineSale.schemeListId || 'SL-SUMMER-SPECIAL'))?.name}</strong>
                </p>
              )}
            </div>

            {/* ASSOCIATED PRODUCTS LIST */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Associated Products & Rates Catalog
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">Product ID</th>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3">Additional Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Base UOM</th>
                      <th className="py-2.5 px-3 text-right">Standard Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">{prod.id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{prod.description}</td>
                        <td className="py-2.5 px-3 text-slate-500">{prod.additionalName || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{prod.category}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{prod.baseUom}</td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">₹{prod.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLineSale(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================== */}
      {/* PRINT PREVIEW MODAL                        */}
      {/* ========================================== */}
      {isPrintModalOpen && activePrintVoucher && (
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`Print Preview: ${activePrintVoucher.id}`}
        >
          <div className="space-y-6">
            {/* PRINTABLE CONTAINER */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 font-sans text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-blue-900">BINDU LIVE SALE ERP</h2>
                  <p className="text-xs text-slate-500">Official Depot Stock Voucher Statement</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">
                    {activePrintVoucher.id}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Date: {activePrintVoucher.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="font-bold text-slate-500">Party / Depot:</span>
                  <p className="font-semibold text-slate-900">{activePrintVoucher.partyName}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Vehicle Num:</span>
                  <p className="font-mono font-semibold text-slate-900">{activePrintVoucher.vehicleNum || 'KA-01-EV-4090'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Start / End Reading:</span>
                  <p className="font-mono text-slate-800">
                    {activePrintVoucher.startingReading || 12500} Km
                    {activePrintVoucher.endingReading ? ` - ${activePrintVoucher.endingReading} Km` : ''}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Driver / Officer:</span>
                  <p className="text-slate-800">{activePrintVoucher.driverName || activePrintVoucher.officer}</p>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-2 border-r border-slate-200">#</th>
                    <th className="p-2 border-r border-slate-200">Product Name</th>
                    <th className="p-2 border-r border-slate-200 text-center">QTY</th>
                    <th className="p-2 border-r border-slate-200 text-center">UOM</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activePrintVoucher.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r border-slate-200">{i + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-medium">{it.productName}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">{it.qty}</td>
                      <td className="p-2 border-r border-slate-200 text-center">{it.uom}</td>
                      <td className="p-2 text-right font-mono">₹{(it.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between text-xs text-slate-500 border-t border-slate-200">
                <div>Prepared By: Depot Operator</div>
                <div>Authorized Signatory</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
