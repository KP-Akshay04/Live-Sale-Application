import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SalesEntry, LineSaleAccount, SalesOrderItem } from '../types';
import { Modal } from '../components/common/Modal';
import {
  ShoppingBag,
  Coins,
  TicketPercent,
  Warehouse,
  Save,
  Printer,
  Calendar,
  Smartphone,
  Search,
  FileText,
  AlertTriangle,
  QrCode,
  Plus,
  Trash2,
  Package,
  CheckCircle,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface OrderItem {
  productId: string;
  productName: string;
  additionalName?: string;
  qty: number;
  freeQty: number;
  uom: string;
  rate: number;
  amount: number;
  schemeApplied: string;
}

export const SalesOfficerDashboard: React.FC = () => {
  const {
    currentUser,
    salesEntries,
    addSalesEntry,
    lineSaleAccounts,
    products,
    priceLists,
    schemeLists,
    goodsIssues,
    goodsReturns
  } = useApp();

  // Active Tab: entry (Sales Section / Form), history (Sales View), stock (Stock Breakdown)
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'stock'>('entry');

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState<SalesEntry | null>(null);

  // Modal States for Scheme View & Price List View
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);

  // Modal State for Product Selection Dialog
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSelectionMode, setProductSelectionMode] = useState<'description' | 'additionalName'>('description');

  // 1. DATA ACCESS & ISOLATION: Derive authenticated Sales Officer's assigned Line Sale
  const assignedLine: LineSaleAccount | undefined =
    lineSaleAccounts.find((l) => l.assignedUser === currentUser?.username) ||
    lineSaleAccounts.find((l) =>
      goodsIssues.some(
        (gi) => gi.salesOfficerUsername === currentUser?.username && gi.partyCode === l.partyCode
      )
    ) ||
    lineSaleAccounts[0];

  // 2. FORM STATE
  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');

  // Auto-populate Customer / Shop details from Assigned Line Sale when loaded
  useEffect(() => {
    if (assignedLine) {
      setShopName(assignedLine.partyName);
      setContactNumber(assignedLine.contactNo);
    }
  }, [assignedLine]);

  // PRICE LIST & SCHEME COMPUTATION FOR ASSIGNED LINE
  const resolvedPriceListId = assignedLine?.priceListId || 'PL-STANDARD';
  const resolvedSchemeListId = assignedLine?.schemeListId || 'SL-STANDARD';

  const currentPriceList = priceLists.find((pl) => pl.id === resolvedPriceListId);
  const currentSchemeList = schemeLists.find((sl) => sl.id === resolvedSchemeListId);

  // Helper to calculate rate from Price List or Product Master
  const getItemRate = (productId: string): number => {
    const priceItem = currentPriceList?.items.find((i) => i.productId === productId);
    const prod = products.find((p) => p.id === productId);
    return priceItem ? priceItem.rate : (prod?.rate || 0);
  };

  // Helper to calculate scheme free quantity & scheme description
  const getItemScheme = (productId: string, quantity: number) => {
    const schemeItem = currentSchemeList?.items.find((i) => i.productId === productId);
    let freeQty = 0;
    let schemeName = 'No Active Scheme';

    if (schemeItem && schemeItem.freeQty > 0 && quantity >= schemeItem.buyQty) {
      const multiplier = Math.floor(quantity / schemeItem.buyQty);
      freeQty = multiplier * schemeItem.freeQty;
      schemeName = `${currentSchemeList?.name || 'Scheme'} (Buy ${schemeItem.buyQty} Get ${schemeItem.freeQty} Free)`;
    } else if (schemeItem) {
      schemeName = `${currentSchemeList?.name || 'Scheme'} (Requires Min ${schemeItem.buyQty} Qty)`;
    }

    return { freeQty, schemeName };
  };

  // AVAILABLE STOCK CALCULATION FOR ASSIGNED LINE
  const getProductStock = (productId: string) => {
    if (!assignedLine) return 0;

    // Total Issued Qty to this assigned Line Sale from completed Goods Issues
    const issuedQty = goodsIssues
      .filter((gi) => gi.status === 'Completed' && (gi.partyCode === assignedLine.partyCode || gi.partyName === assignedLine.partyName))
      .reduce((sum, gi) => {
        const item = gi.items.find((i) => i.productId === productId);
        return sum + (item ? item.qty : 0);
      }, 0);

    // Total Returned Qty from Goods Returns
    const returnedQty = goodsReturns
      .filter((gr) => gr.partyCode === assignedLine.partyCode || gr.partyName === assignedLine.partyName)
      .reduce((sum, gr) => {
        const item = gr.items.find((i) => i.productId === productId);
        return sum + (item ? item.qty : 0);
      }, 0);

    // Total Sold Qty (including freeQty) from Sales Entries for this assigned Line
    const soldQty = salesEntries
      .filter((se) => se.partyCode === assignedLine.partyCode || se.shopName === assignedLine.partyName)
      .reduce((sum, se) => {
        if (se.productId === productId) {
          return sum + se.qty + (se.freeQty || 0);
        }
        if (se.items) {
          const item = se.items.find((i) => i.productId === productId);
          if (item) return sum + item.qty + (item.freeQty || 0);
        }
        return sum;
      }, 0);

    return Math.max(0, issuedQty - returnedQty - soldQty);
  };

  // Total Available Stock across all products for this assigned line
  const totalAvailableStockUnits = products.reduce((sum, p) => sum + getProductStock(p.id), 0);

  // Order Items Totals
  const totalPaidQty = orderItems.reduce((sum, i) => sum + i.qty, 0);
  const totalFreeQty = orderItems.reduce((sum, i) => sum + i.freeQty, 0);
  const grossAmount = orderItems.reduce((sum, i) => sum + i.amount, 0);

  // Handlers for Order Items
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    const currentItem = { ...updated[index] };

    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        // Prevent accidental duplicates
        const isDuplicate = orderItems.some((item, i) => i !== index && item.productId === value);
        if (isDuplicate) {
          toast.error(`Product "${prod.description}" is already in this order.`);
          return;
        }
        currentItem.productId = prod.id;
        currentItem.productName = prod.description;
        currentItem.additionalName = prod.additionalName;
        currentItem.uom = prod.baseUom || 'Pcs';
        currentItem.rate = getItemRate(prod.id);
        const { freeQty: fQty, schemeName } = getItemScheme(prod.id, currentItem.qty);
        currentItem.freeQty = fQty;
        currentItem.schemeApplied = schemeName;
        currentItem.amount = currentItem.qty * currentItem.rate;
      }
    } else if (field === 'qty') {
      const newQty = Math.max(1, parseInt(value) || 1);
      currentItem.qty = newQty;
      const { freeQty: fQty, schemeName } = getItemScheme(currentItem.productId, newQty);
      currentItem.freeQty = fQty;
      currentItem.schemeApplied = schemeName;
      currentItem.amount = newQty * currentItem.rate;
    } else if (field === 'uom') {
      currentItem.uom = value;
    } else if (field === 'rate') {
      const newRate = Math.max(0, parseFloat(value) || 0);
      currentItem.rate = newRate;
      currentItem.amount = currentItem.qty * newRate;
    }

    updated[index] = currentItem;
    setOrderItems(updated);
  };

  const handleAddProductFromModal = (prod: any) => {
    const existingIndex = orderItems.findIndex((item) => item.productId === prod.id);

    if (existingIndex !== -1) {
      // Duplicate handling: inform user & increment existing item quantity
      toast.error(`Product "${prod.description}" already added. Quantity increased by 1.`);
      const updated = [...orderItems];
      const existing = { ...updated[existingIndex] };
      existing.qty += 1;
      const { freeQty: fQty, schemeName } = getItemScheme(prod.id, existing.qty);
      existing.freeQty = fQty;
      existing.schemeApplied = schemeName;
      existing.amount = existing.qty * existing.rate;
      updated[existingIndex] = existing;
      setOrderItems(updated);
    } else {
      const rateVal = getItemRate(prod.id);
      const { freeQty: fQty, schemeName } = getItemScheme(prod.id, 1);
      const newItem: OrderItem = {
        productId: prod.id,
        productName: prod.description,
        additionalName: prod.additionalName,
        qty: 1,
        freeQty: fQty,
        uom: prod.uom || 'Pcs',
        rate: rateVal,
        amount: rateVal,
        schemeApplied: schemeName
      };
      setOrderItems((prev) => [...prev, newItem]);
      toast.success(`Added "${prod.description}" to order.`);
    }
    setIsProductModalOpen(false);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  // SALES ENTRIES & CASH / UPI KPI TOTALS (ASSIGNED LINE ONLY)
  const officerSales = salesEntries.filter(
    (se) =>
      (assignedLine && se.partyCode === assignedLine.partyCode) ||
      se.salesOfficerUsername === currentUser?.username
  );

  const totalCashAmount = officerSales
    .filter((se) => se.paymentMethod === 'Cash')
    .reduce((sum, se) => sum + se.amount, 0);

  const totalUpiAmount = officerSales
    .filter((se) => se.paymentMethod === 'UPI')
    .reduce((sum, se) => sum + se.amount, 0);

  // Date Filter for Sales View
  const [selectedSalesDate, setSelectedSalesDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [salesSearchTerm, setSalesSearchTerm] = useState('');

  const filteredSalesEntries = officerSales.filter((se) => {
    const matchesDate = !selectedSalesDate || se.date.substring(0, 10) === selectedSalesDate;
    const matchesSearch =
      !salesSearchTerm ||
      se.shopName.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
      se.productName.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
      se.id.toLowerCase().includes(salesSearchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // SAVE SALE TRANSACTION
  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignedLine) {
      toast.error('No assigned Line Sale found for your account.');
      return;
    }

    if (!shopName.trim()) {
      toast.error('Please enter a valid Shop / Outlet Name.');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one product to the order.');
      return;
    }

    // Validate Qty & Stock for each item
    for (const item of orderItems) {
      if (item.qty <= 0) {
        toast.error(`Quantity for ${item.productName} must be greater than 0.`);
        return;
      }

      const availableStock = getProductStock(item.productId);
      const totalRequired = item.qty + item.freeQty;
      if (totalRequired > availableStock) {
        toast.error(
          `Insufficient stock for ${item.productName}! Available Stock: ${availableStock} units. Required: ${totalRequired} units.`
        );
        return;
      }
    }

    const generatedId = `SL-${Math.floor(88000 + Math.random() * 10000)}`;
    const currentDate = new Date().toISOString();

    // Save each product line as a SalesEntry
    orderItems.forEach((item) => {
      addSalesEntry({
        shopName: shopName.trim(),
        partyCode: assignedLine.partyCode,
        contactNumber: contactNumber.trim(),
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        freeQty: item.freeQty,
        uom: item.uom,
        rate: item.rate,
        amount: item.amount,
        schemeApplied: item.schemeApplied,
        paymentMethod,
        salesOfficerUsername: currentUser?.username || 'sales'
      });
    });

    // Create receipt invoice entry with all items
    const createdInvoice: SalesEntry = {
      id: generatedId,
      shopName: shopName.trim(),
      partyCode: assignedLine.partyCode,
      contactNumber: contactNumber.trim(),
      productId: orderItems[0].productId,
      productName: orderItems.length === 1 ? orderItems[0].productName : `${orderItems[0].productName} (+${orderItems.length - 1} items)`,
      qty: totalPaidQty,
      freeQty: totalFreeQty,
      uom: orderItems[0].uom,
      rate: orderItems[0].rate,
      amount: grossAmount,
      schemeApplied: orderItems[0].schemeApplied,
      paymentMethod,
      date: currentDate,
      salesOfficerUsername: currentUser?.username || 'sales',
      items: orderItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        additionalName: i.additionalName,
        qty: i.qty,
        freeQty: i.freeQty,
        uom: i.uom,
        rate: i.rate,
        amount: i.amount,
        schemeApplied: i.schemeApplied
      }))
    };

    setActivePrintInvoice(createdInvoice);
    toast.success('Sale transaction recorded successfully!');

    // Reset order items after saving
    setOrderItems([]);

    setIsPrintModalOpen(true);
  };

  const handleOpenPrintReceipt = (entry: SalesEntry) => {
    setActivePrintInvoice(entry);
    setIsPrintModalOpen(true);
  };

  if (!assignedLine) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto my-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">No Line Sale Assigned</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your account is currently not assigned to any active Line Sale. Please contact the Depot Manager or Super Admin to assign a Line Sale account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER & ASSIGNED LINE KPI BAR */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Officer Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Live Billing
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Line Sale:</span>
            <span className="text-xs font-bold text-brand-600 bg-brand-50/80 px-2 py-0.5 rounded-md border border-brand-100 font-mono">
              {assignedLine.partyCode}
            </span>
            <span className="text-xs font-bold text-slate-800">({assignedLine.partyName})</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Site/Depot: {assignedLine.nearestDepot}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pl-1">
            <span>Contact: {assignedLine.contactNo}</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-600">
              Price List: <span className="font-bold text-slate-800">{resolvedPriceListId}</span>
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-600">
              Scheme: <span className="font-bold text-slate-800">{resolvedSchemeListId}</span>
            </span>
          </div>
        </div>

        {/* Quick Modal View Buttons */}
        <div className="flex items-center gap-3 flex-wrap self-start xl:self-center">
          <button
            type="button"
            onClick={() => setIsSchemeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <TicketPercent className="w-4 h-4 text-amber-600" />
            <span>View Line Schemes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPriceListModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Coins className="w-4 h-4 text-blue-600" />
            <span>View Price List</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Available Line Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Available Stock</span>
            <div className="text-2xl font-bold font-display text-slate-900 font-mono">
              {totalAvailableStockUnits} <span className="text-xs font-sans text-slate-500 font-normal">Units</span>
            </div>
            <p className="text-[11px] text-slate-500">Issued Load minus Returns & Sales</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        {/* Total Cash Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Collected</span>
            <div className="text-2xl font-bold font-display text-purple-700 font-mono">
              ₹{totalCashAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500">Total cash transactions today</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 border border-purple-100">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total UPI Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UPI / QR Collected</span>
            <div className="text-2xl font-bold font-display text-emerald-700 font-mono">
              ₹{totalUpiAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500">Direct online payment received</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('entry')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'entry'
              ? 'border-brand-600 text-brand-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>New Order Entry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sales History ({officerSales.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'stock'
              ? 'border-brand-600 text-brand-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Line Stock Breakdown</span>
        </button>
      </div>

      {/* TAB 1: SALES ENTRY SECTION */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Sales Product Entry Form */}
          <form onSubmit={handleSaveSale} className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6" id="sales-entry-form">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-600" />
                Issue Retail Sale Invoice
              </h2>
              <span className="text-xs text-slate-400 font-mono">Assigned Line: {assignedLine.partyCode}</span>
            </div>

            {/* Customer/Header Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Enter Shop / Retailer Name"
                  id="input-shop-name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Enter Contact Number"
                  id="input-contact-number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* PRODUCT SELECTION SECTION */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Product Selection</span>
                  <span className="text-[11px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md font-bold border border-brand-100 font-mono">
                    {orderItems.length} {orderItems.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {/* ADD NEW PRODUCT BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setProductSearchTerm('');
                    setIsProductModalOpen(true);
                  }}
                  id="btn-add-new-product"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Product</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Additional Name</th>
                      <th className="py-2.5 px-3 text-center">Avail Stock</th>
                      <th className="py-2.5 px-3 w-24 text-center">QTY</th>
                      <th className="py-2.5 px-3 w-20 text-center text-emerald-600">Free QTY</th>
                      <th className="py-2.5 px-3 w-24">UOM</th>
                      <th className="py-2.5 px-3 w-24 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600 text-xs">No products added yet.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Click <span className="font-bold text-brand-600">+ Add New Product</span> above to select products from Product Master.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((item, idx) => {
                        const availStock = getProductStock(item.productId);
                        return (
                          <tr key={item.productId} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">
                              {item.additionalName || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${availStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                {availStock} units
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-900 outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                              +{item.freeQty}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.uom || 'Pcs'}
                                onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
                              >
                                <option value="Box">Box</option>
                                <option value="Pcs">Pcs</option>
                                <option value="Crates">Crates</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              ₹{item.rate.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                              ₹{item.amount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove Product"
                                className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {orderItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 font-bold text-xs text-slate-900 border-t border-slate-200">
                        <td colSpan={4} className="py-3 px-4">
                          Total Items: {orderItems.length}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {totalPaidQty} Paid
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-600">
                          +{totalFreeQty} Free
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-right">Order Total:</td>
                        <td className="py-3 px-3 text-right text-brand-700 font-mono text-sm">
                          ₹{grossAmount.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">Payment Method <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  id="btn-payment-cash"
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'Cash'
                      ? 'bg-purple-50 text-purple-700 border-purple-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>Cash Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  id="btn-payment-upi"
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI / QR Payment</span>
                </button>
              </div>
            </div>

            {/* Save Sale Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-save-sale"
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>Save Sale Transaction</span>
              </button>
            </div>
          </form>

          {/* Right Column: Live Payment QR Preview & Calculation Summary */}
          <div className="space-y-6">
            {/* UPI QR Code Preview Box (Shows when UPI is selected) */}
            {paymentMethod === 'UPI' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-center">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    UPI / QR Collection Preview
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                    Live Payment
                  </span>
                </div>

                {assignedLine.upiQr ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block">
                    <img
                      src={assignedLine.upiQr}
                      alt="UPI Payment QR Code"
                      className="w-44 h-44 object-contain mx-auto rounded-lg shadow-xs"
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No QR image configured for {assignedLine.partyName}.
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">Scan & Pay ₹{grossAmount.toFixed(2)}</p>
                  <p className="text-[11px] font-mono text-slate-500">VPA: {assignedLine.partyCode.toLowerCase()}@upi</p>
                </div>
              </div>
            )}

            {/* Summary Information Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Order Summary</h3>
              <div className="flex justify-between text-slate-600">
                <span>Product Items</span>
                <span className="font-bold text-slate-900">{orderItems.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Paid Quantity</span>
                <span className="font-bold text-slate-900">{totalPaidQty} Units</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Free Quantity</span>
                <span className="font-bold text-emerald-600">+{totalFreeQty} Units</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                <span>Payment Method</span>
                <span className="font-bold text-slate-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-100 text-sm">
                <span>Total Payable</span>
                <span className="text-brand-700 font-mono">₹{grossAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES HISTORY SECTION */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Sales Transactions Log</h2>
              <p className="text-xs text-slate-500">Historical billing entries for {assignedLine.partyName}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedSalesDate}
                  onChange={(e) => setSelectedSalesDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
                />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice or shop..."
                  value={salesSearchTerm}
                  onChange={(e) => setSalesSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Shop Outlet</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-3 text-center">Paid Qty</th>
                  <th className="py-3 px-3 text-center text-emerald-600">Free Qty</th>
                  <th className="py-3 px-3">UOM</th>
                  <th className="py-3 px-3 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-center">Payment</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSalesEntries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No sales transactions found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSalesEntries.map((se) => (
                    <tr key={se.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-brand-700">{se.id}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{se.date.substring(0, 10)}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {se.shopName}
                        <span className="text-[10px] text-slate-400 block font-normal">{se.contactNumber}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{se.productName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">{se.qty}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">+{se.freeQty}</td>
                      <td className="py-3 px-3 font-medium text-slate-600">{se.uom || 'Pcs'}</td>
                      <td className="py-3 px-3 text-right font-mono">₹{se.rate.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-brand-700 font-mono">₹{se.amount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            se.paymentMethod === 'UPI'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {se.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintReceipt(se)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK BREAKDOWN SECTION */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Line Stock Inventory</h2>
            <p className="text-xs text-slate-500">Live stock balance breakdown for {assignedLine.partyName}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const availStock = getProductStock(prod.id);
              const priceRate = getItemRate(prod.id);
              return (
                <div key={prod.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-brand-600 font-bold block">{prod.id}</span>
                      <h3 className="font-bold text-slate-800 text-xs">{prod.description}</h3>
                      {prod.additionalName && (
                        <p className="text-[11px] text-slate-500">{prod.additionalName}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-700 font-mono">₹{priceRate.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                    <span className="text-xs text-slate-500">Available Stock:</span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                        availStock > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {availStock} units
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: SCHEME LIST VIEW MODAL */}
      <Modal
        isOpen={isSchemeModalOpen}
        onClose={() => setIsSchemeModalOpen(false)}
        title={`Applicable Promotional Schemes — ${assignedLine.partyName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-900 space-y-1">
            <span className="font-bold block">Assigned Scheme List: {currentSchemeList?.name || 'Standard Promotion Scheme'} ({resolvedSchemeListId})</span>
            <p className="text-amber-800">Free quantity offers are automatically calculated when entering order quantity.</p>
          </div>

          {currentSchemeList ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Product Description</th>
                    <th className="p-3 text-center">Buy Qty</th>
                    <th className="p-3 text-center text-emerald-600">Free Qty</th>
                    <th className="p-3">Offer Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentSchemeList.items.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    return (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{prod?.description || item.productId}</td>
                        <td className="p-3 text-center font-bold text-slate-800">{item.buyQty}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">+{item.freeQty}</td>
                        <td className="p-3 text-slate-500">Buy {item.buyQty} units, get {item.freeQty} free</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">No active promotional schemes assigned to this line.</div>
          )}
        </div>
      </Modal>

      {/* MODAL 2: PRICE LIST VIEW MODAL */}
      <Modal
        isOpen={isPriceListModalOpen}
        onClose={() => setIsPriceListModalOpen(false)}
        title={`Applicable Price List — ${assignedLine.partyName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200/60 rounded-xl text-xs text-blue-900 space-y-1">
            <span className="font-bold block">Assigned Price List: {currentPriceList?.name || 'Standard Price List'} ({resolvedPriceListId})</span>
            <p className="text-blue-700">Rates from this price master are automatically populated during billing for Line Sale {assignedLine.partyCode}.</p>
          </div>

          {currentPriceList ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Product Description</th>
                    <th className="p-3 text-center">UOM</th>
                    <th className="p-3 text-right">Rate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentPriceList.items.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    return (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{prod?.description || item.productId}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{prod?.baseUom || 'Box'}</td>
                        <td className="p-3 text-right font-bold text-brand-600 font-mono">₹{item.rate.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">No specific price list assigned to this line.</div>
          )}
        </div>
      </Modal>

      {/* MODAL 3: PRODUCT SELECTION DIALOG MODAL */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Select Product from Product Master"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="Search product by name, ID, or additional name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-brand-500 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Product ID</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3">Additional Name</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-center">Avail. Stock</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {products
                  .filter((p) => {
                    const term = productSearchTerm.toLowerCase();
                    return (
                      p.description.toLowerCase().includes(term) ||
                      p.id.toLowerCase().includes(term) ||
                      (p.additionalName && p.additionalName.toLowerCase().includes(term))
                    );
                  })
                  .map((prod) => {
                    const availStock = getProductStock(prod.id);
                    const priceRate = getItemRate(prod.id);
                    const isAdded = orderItems.some((item) => item.productId === prod.id);

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-700">{prod.id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{prod.description}</td>
                        <td className="py-2.5 px-3 text-slate-500">{prod.additionalName || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{priceRate.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${availStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {availStock} units
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddProductFromModal(prod)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer ${
                              isAdded
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xs'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {isAdded ? 'Already Added (+1)' : 'Select Product'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: RECEIPT PRINT MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Sales Invoice Receipt"
        size="lg"
      >
        {activePrintInvoice && (
          <div className="space-y-6">
            <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">BINDU LIVE SALE APPLICATION</h3>
                  <p className="text-xs text-slate-500">Official Retail Sale Tax Receipt</p>
                  <p className="text-xs text-slate-700 font-semibold mt-1">Line Sale: {activePrintInvoice.partyCode || assignedLine.partyCode}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-slate-900 block">{activePrintInvoice.id}</span>
                  <span className="text-[10px] text-slate-400 block">{activePrintInvoice.date.substring(0, 10)}</span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Payment: {activePrintInvoice.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Shop Outlet</span>
                  <p className="font-bold text-slate-800 mt-0.5">{activePrintInvoice.shopName}</p>
                  <p className="text-slate-500">{activePrintInvoice.contactNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed By</span>
                  <p className="font-bold text-slate-800 mt-0.5">@{activePrintInvoice.salesOfficerUsername}</p>
                  <p className="text-slate-500 font-mono text-[10px]">Scheme: {activePrintInvoice.schemeApplied}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2">Product</th>
                    <th className="py-2 text-center">Paid Qty</th>
                    <th className="py-2 text-center text-emerald-600">Free Qty</th>
                    <th className="py-2 text-center">UOM</th>
                    <th className="py-2 text-right">Rate (₹)</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activePrintInvoice.items && activePrintInvoice.items.length > 0 ? (
                    activePrintInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-bold text-slate-800">
                          {it.productName}
                          {it.additionalName && <span className="text-[10px] text-slate-400 block">{it.additionalName}</span>}
                        </td>
                        <td className="py-3 text-center font-bold text-slate-900">{it.qty}</td>
                        <td className="py-3 text-center font-bold text-emerald-600">+{it.freeQty}</td>
                        <td className="py-3 text-center font-semibold text-slate-600">{it.uom}</td>
                        <td className="py-3 text-right font-mono">₹{it.rate.toFixed(2)}</td>
                        <td className="py-3 text-right font-bold text-brand-600 font-mono">₹{it.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 font-bold text-slate-800">{activePrintInvoice.productName}</td>
                      <td className="py-3 text-center font-bold text-slate-900">{activePrintInvoice.qty}</td>
                      <td className="py-3 text-center font-bold text-emerald-600">+{activePrintInvoice.freeQty}</td>
                      <td className="py-3 text-center font-semibold text-slate-600">{activePrintInvoice.uom || 'Pcs'}</td>
                      <td className="py-3 text-right font-mono">₹{activePrintInvoice.rate.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-brand-600 font-mono">₹{activePrintInvoice.amount.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-xs font-bold text-slate-800">
                <span>Total Received ({activePrintInvoice.paymentMethod})</span>
                <span className="text-base text-brand-600 font-mono">₹{activePrintInvoice.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesOfficerDashboard;
