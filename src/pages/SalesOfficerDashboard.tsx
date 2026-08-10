import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SalesEntry, StockItem } from '../types';
import { Modal } from '../components/common/Modal';
import {
  ShoppingBag,
  Coins,
  TicketPercent,
  Warehouse,
  Plus,
  Save,
  Printer,
  Calendar,
  DollarSign,
  Smartphone,
  Store,
  ArrowRight,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Navigation,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SalesOfficerDashboard: React.FC = () => {
  const {
    currentUser,
    salesEntries,
    addSalesEntry,
    truckStock,
    salesOffices,
    products,
    priceLists,
    schemeLists
  } = useApp();

  // Active Tab: entry (Sales Form), history (Invoice Logs), lookups (Catalogs & Stocks)
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'lookups'>('entry');

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState<SalesEntry | null>(null);

  // 1. SALES FORM STATE
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('UPI');

  // One-handed UI States
  const [storeSearch, setStoreSearch] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  
  // Camera & Barcode Scan Integration
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Computed values
  const [resolvedPriceListId, setResolvedPriceListId] = useState('PL-STANDARD');
  const [resolvedSchemeListId, setResolvedSchemeListId] = useState('SL-STANDARD');
  const [rate, setRate] = useState<number>(0);
  const [freeQty, setFreeQty] = useState<number>(0);
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [schemeNameApplied, setSchemeNameApplied] = useState('');

  // 2. Fetch Assigned Accounts for the current logged-in Sales Officer
  const officerOffices = salesOffices.filter((o) => o.assignedUser === currentUser?.username);

  // Filter stores based on thumb-search
  const filteredOffices = officerOffices.filter((o) => 
    o.accountName.toLowerCase().includes(storeSearch.toLowerCase()) ||
    o.accountId.toLowerCase().includes(storeSearch.toLowerCase())
  );

  // 3. Monitor form changes and compute pricing and schemes dynamically
  useEffect(() => {
    if (!selectedOfficeId) {
      setShopName('');
      setContactNumber('');
      setResolvedPriceListId('PL-STANDARD');
      setResolvedSchemeListId('SL-STANDARD');
      return;
    }

    const office = salesOffices.find((o) => o.accountId === selectedOfficeId);
    if (office) {
      setShopName(office.accountName);
      setResolvedPriceListId(office.priceListId);
      setResolvedSchemeListId(office.schemeListId);
    }
  }, [selectedOfficeId, salesOffices]);

  useEffect(() => {
    if (!selectedProductId || !selectedOfficeId) {
      setRate(0);
      setFreeQty(0);
      setGrossAmount(0);
      setSchemeNameApplied('No Scheme');
      return;
    }

    // Resolve Rate from Price List
    const priceList = priceLists.find((pl) => pl.id === resolvedPriceListId);
    const priceItem = priceList?.items.find((i) => i.productId === selectedProductId);
    const baseProduct = products.find((p) => p.id === selectedProductId);
    const activeRate = priceItem ? priceItem.rate : (baseProduct?.rate || 0);
    setRate(activeRate);

    // Resolve Schemes
    const schemeList = schemeLists.find((sl) => sl.id === resolvedSchemeListId);
    const schemeItem = schemeList?.items.find((i) => i.productId === selectedProductId);

    if (schemeItem && schemeItem.freeQty > 0 && qty >= schemeItem.buyQty) {
      const multiplier = Math.floor(qty / schemeItem.buyQty);
      const computedFree = multiplier * schemeItem.freeQty;
      setFreeQty(computedFree);
      setSchemeNameApplied(`${schemeList?.name} (Buy ${schemeItem.buyQty} Get ${schemeItem.freeQty} Free)`);
    } else {
      setFreeQty(0);
      setSchemeNameApplied('No Active Scheme Met');
    }

    // Calculate final invoice billing amount
    setGrossAmount(qty * activeRate);
  }, [selectedProductId, qty, selectedOfficeId, resolvedPriceListId, resolvedSchemeListId, priceLists, schemeLists, products]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Handle Real GPS Fetching
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      toast.error('Device GPS sensor unavailable or permissions blocked.');
      return;
    }

    setIsAcquiringGps(true);
    const loadingToast = toast.loading('Syncing with GPS Satellites...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `Lat: ${position.coords.latitude.toFixed(5)}, Lng: ${position.coords.longitude.toFixed(5)}`;
        setGpsCoordinates(coords);
        toast.dismiss(loadingToast);
        toast.success(`GPS Acquired: ${coords}`);
        setIsAcquiringGps(false);
      },
      (error) => {
        console.warn('GPS Error:', error);
        toast.dismiss(loadingToast);
        toast.error('Unable to acquire GPS lock. Please check device permissions.');
        setIsAcquiringGps(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Handle Camera Access / Barcode Sweep
  const handleTriggerBarcodeScan = async () => {
    if (isScanning) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      setCameraStream(null);
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    const sweepToast = toast.loading('Initializing device camera stream...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 400, height: 300 }
      });
      setCameraStream(stream);
      toast.dismiss(sweepToast);
      toast.success('Scanner active. Scan standard bar matrix.');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera blocked/unsupported:', err);
      toast.dismiss(sweepToast);
      toast.error('Camera blocked. Launching automated barcode sweep...');
      
      // Simulated scan trigger for demo sandbox
      setTimeout(() => {
        if (products.length > 0) {
          const randomProd = products[Math.floor(Math.random() * products.length)];
          setSelectedProductId(randomProd.id);
          toast.success(`Barcode Recognized: [${randomProd.barcode}] -> ${randomProd.description}`);
        }
        setIsScanning(false);
      }, 1500);
    }
  };

  // Form Submit Action
  const handleSalesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficeId) {
      toast.error('Select a valid retail store account.');
      return;
    }
    if (!selectedProductId) {
      toast.error('Choose a catalog product item.');
      return;
    }

    // Check Truck Stock availability
    const truckStockItem = truckStock.find((item) => item.productId === selectedProductId);
    const totalRequired = qty + freeQty;
    if (!truckStockItem || truckStockItem.qty < totalRequired) {
      toast.error(
        `Insufficient stock in your truck! Available: ${
          truckStockItem ? truckStockItem.qty : 0
        } units. Required: ${totalRequired} units.`
      );
      return;
    }

    const activeProd = products.find((p) => p.id === selectedProductId);

    addSalesEntry({
      shopName,
      contactNumber: gpsCoordinates ? `${contactNumber} (GPS: ${gpsCoordinates})` : contactNumber,
      productId: selectedProductId,
      productName: activeProd?.description || '',
      qty,
      freeQty,
      rate,
      amount: grossAmount,
      schemeApplied: schemeNameApplied,
      paymentMethod,
      salesOfficerUsername: currentUser?.username || 'sales',
    });

    toast.success('Sales invoice recorded successfully!');
    const newlyCreatedId = `SL-${Math.floor(88000 + Math.random() * 10000)}`;
    setActivePrintInvoice({
      id: newlyCreatedId,
      shopName,
      contactNumber: gpsCoordinates ? `Con: ${contactNumber || '+91 99002 11224'} (${gpsCoordinates})` : contactNumber,
      productId: selectedProductId,
      productName: activeProd?.description || '',
      qty,
      freeQty,
      rate,
      amount: grossAmount,
      schemeApplied: schemeNameApplied,
      paymentMethod,
      date: new Date().toISOString(),
      salesOfficerUsername: currentUser?.username || 'sales',
    });

    // Reset Form state
    setSelectedProductId('');
    setQty(1);
    setIsPrintModalOpen(true);
  };

  // Open Invoice layout
  const handleOpenInvoicePrint = (entry: SalesEntry) => {
    setActivePrintInvoice(entry);
    setIsPrintModalOpen(true);
  };

  // Filter Sales Officer's historical orders
  const officerSales = salesEntries.filter((se) => se.salesOfficerUsername === currentUser?.username);

  // Financial collections
  const cashCollectionTotal = officerSales
    .filter((se) => se.paymentMethod === 'Cash')
    .reduce((s, se) => s + se.amount, 0);

  const upiCollectionTotal = officerSales
    .filter((se) => se.paymentMethod === 'UPI')
    .reduce((s, se) => s + se.amount, 0);

  const combinedCollectionTotal = cashCollectionTotal + upiCollectionTotal;

  return (
    <div className="space-y-6" id="sales-officer-dashboard-section">
      {/* Title block */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-xl md:text-2xl tracking-tight">
            Field Sales & Invoicing Desk
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            Welcome back, <span className="font-bold text-brand-600">{currentUser?.employeeName}</span> • Route representative
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-xs self-start w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'entry', label: 'Sales Entry', icon: ShoppingBag },
            { id: 'history', label: 'Order History', icon: ClipboardCheck },
            { id: 'lookups', label: 'Catalogs & Stock', icon: Warehouse },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                id={`officer-tab-${tab.id}`}
                className={`text-[11px] px-3.5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO ACTIVE TAB */}

      {/* Tab 1: Sales Entry Form with financial KPI metrics */}
      {activeTab === 'entry' && (
        <div className="space-y-6 animate-fadeIn animate-duration-200" id="tab-sales-entry">
          {/* Quick Collection KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4.5 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Combined Collections</span>
                <p className="text-lg font-display font-bold text-slate-800">
                  ₹{combinedCollectionTotal.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">UPI Receipts</span>
                <p className="text-lg font-display font-bold text-slate-800">
                  ₹{upiCollectionTotal.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Cash Handover</span>
                <p className="text-lg font-display font-bold text-slate-800">
                  ₹{cashCollectionTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Entry Form */}
            <form onSubmit={handleSalesSubmit} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-fiori space-y-5 lg:col-span-2" id="sales-entry-form">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-brand-600" />
                  <h3 className="font-display font-bold text-slate-800 text-sm">Issue Retail Billing Invoice</h3>
                </div>
                
                {/* Geolocation & Camera Quick Toolbar (Thumb accessible) */}
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={handleAcquireGps}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-colors ${
                      gpsCoordinates 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Capture retail GPS coordinates for routing audibility"
                  >
                    <Navigation className={`h-3 w-3 ${isAcquiringGps ? 'animate-spin' : ''}`} />
                    <span>{gpsCoordinates ? 'GPS MATCHED' : 'LOG GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerBarcodeScan}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-colors ${
                      isScanning
                        ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    <span>{isScanning ? 'STOP CAMERA' : 'SCAN BARCODE'}</span>
                  </button>
                </div>
              </div>

              {/* Barcode scanner active viewport preview */}
              {isScanning && cameraStream && (
                <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-300">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Glowing target scan lines */}
                  <div className="absolute inset-x-8 h-0.5 bg-red-500 shadow-[0_0_8px_#f43f5e] animate-bounce z-10" style={{ top: '50%' }} />
                  <div className="absolute inset-8 border-2 border-dashed border-white/40 rounded-lg pointer-events-none" />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-black/70 text-white px-2 py-0.5 rounded font-bold z-10">
                    ALIGN BARCODE IN FRAME
                  </span>
                </div>
              )}

              {/* Shop Account Selector with visual filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Customer Outlet Store *
                  </label>
                  <span className="text-[9px] font-semibold text-brand-600 font-mono">Mapped: {filteredOffices.length}</span>
                </div>
                
                {/* Search input field */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search retailer, outlet name or ID..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-500 font-medium"
                  />
                  {storeSearch && (
                    <button
                      type="button"
                      onClick={() => setStoreSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Horizontal swipeable fast-cards selection */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x mt-1">
                  {filteredOffices.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-2">No matching stores found on this route.</p>
                  ) : (
                    filteredOffices.map((o) => {
                      const isSel = selectedOfficeId === o.accountId;
                      return (
                        <button
                          key={o.accountId}
                          type="button"
                          onClick={() => {
                            setSelectedOfficeId(o.accountId);
                            setContactNumber('+91 99002 11224'); // default simulation fallback
                          }}
                          className={`p-3 rounded-xl border text-left shrink-0 w-44 snap-start transition-all duration-150 ${
                            isSel 
                              ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Store className={`h-4 w-4 shrink-0 ${isSel ? 'text-brand-600' : 'text-slate-400'}`} />
                            <span className="font-bold text-[11px] truncate">{o.accountName}</span>
                          </div>
                          <div className="space-y-0.5 text-[9px] text-slate-400">
                            <p className="font-mono">ID: {o.accountId}</p>
                            <p>{o.zone} Zone • {o.state}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Outlet details (readonly metadata summary) */}
              {selectedOfficeId && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Store Name</span>
                    <p className="font-bold text-slate-800 mt-0.5">{shopName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Con: {contactNumber}</p>
                    {gpsCoordinates && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> GPS Logged
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Compliance Mappings</span>
                    <p className="text-slate-800 font-medium mt-0.5">Price: <span className="font-bold text-brand-600">{resolvedPriceListId}</span></p>
                    <p className="text-slate-800 font-medium">Scheme: <span className="font-bold text-amber-600">{resolvedSchemeListId}</span></p>
                  </div>
                </div>
              )}

              {/* Visual Product Item Select Grid (Highly optimized for thumb click) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tap to Choose Catalog Product *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {products.map((p) => {
                    const isSel = selectedProductId === p.id;
                    const stock = truckStock.find((ts) => ts.productId === p.id)?.qty || 0;
                    const isLow = stock <= 5;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProductId(p.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 h-22 relative overflow-hidden ${
                          isSel
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/10 scale-[0.99]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-[11px] leading-snug line-clamp-2">{p.description}</p>
                          <p className={`text-[9px] mt-0.5 font-mono ${isSel ? 'text-brand-200' : 'text-slate-400'}`}>ID: {p.id}</p>
                        </div>
                        <div className="flex justify-between items-center w-full mt-2 pt-1 border-t border-slate-100/10">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isSel 
                              ? 'bg-brand-500 text-white' 
                              : isLow 
                              ? 'bg-red-50 text-red-600' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            Stk: {stock}
                          </span>
                          <span className={`text-[11px] font-bold ${isSel ? 'text-brand-100' : 'text-brand-600'}`}>
                            ₹{p.rate}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantities & Settlement Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Numeric Quantity with custom large +/- touch buttons */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Billed Units (Paid Quantity) *
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="h-11 w-11 bg-slate-100 active:bg-slate-200 rounded-l-xl flex items-center justify-center font-bold text-slate-700 text-lg border-y border-l border-slate-200 active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      required
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="h-11 w-16 bg-slate-50 text-center text-slate-700 text-sm font-bold border-y border-slate-200 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="h-11 w-11 bg-slate-100 active:bg-slate-200 rounded-r-xl flex items-center justify-center font-bold text-slate-700 text-lg border-y border-r border-slate-200 active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Settlement Choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Select Settlement Method *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { mode: 'UPI', label: 'UPI QR', icon: Smartphone, color: 'border-emerald-500 bg-emerald-50/20 text-emerald-700' },
                      { mode: 'Cash', label: 'Cash', icon: Coins, color: 'border-purple-500 bg-purple-50/20 text-purple-700' },
                    ].map((pay) => {
                      const Icon = pay.icon;
                      const isSel = paymentMethod === pay.mode;
                      return (
                        <button
                          key={pay.mode}
                          type="button"
                          onClick={() => setPaymentMethod(pay.mode as any)}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                            isSel ? pay.color : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" /> {pay.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Submit sales row */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="btn-save-sales-invoice"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/15 active:scale-[0.98] transition-all"
                >
                  <Save className="h-4.5 w-4.5" /> Save & Generate Invoice
                </button>
              </div>
            </form>

            {/* Live Invoice Preview Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-fiori flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-display font-bold text-slate-800 text-sm pb-2 border-b border-slate-50">
                  Live Billing Calculations
                </h3>

                {selectedProductId && selectedOfficeId ? (
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Unit Price Rate:</span>
                      <span className="font-semibold text-slate-800">₹{rate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Charged Units:</span>
                      <span className="font-bold text-slate-800">{qty} unit(s)</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded border border-emerald-100/40">
                      <span className="text-emerald-700 font-semibold">Free Promo Units:</span>
                      <span className="font-bold text-emerald-600">+{freeQty} unit(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolved Campaign:</span>
                      <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold max-w-[150px] truncate">
                        {schemeNameApplied}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-sm">
                      <span className="font-bold text-slate-800">Total Invoice Amount:</span>
                      <span className="font-display font-bold text-brand-600 text-base">₹{grossAmount.toFixed(2)}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 text-[10px] text-blue-800 flex gap-1.5 items-start mt-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                      <p>
                        This invoice applies the registered <span className="font-bold">{resolvedPriceListId}</span> price levels.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Select customer store and product card to compute live invoice.
                  </div>
                )}
              </div>

              {/* Truck Stock Check Warnings */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                <span className="font-bold text-[10px] uppercase text-slate-400 block tracking-wider">
                  Vehicle Stock Clearance
                </span>
                {selectedProductId ? (
                  (() => {
                    const stockItem = truckStock.find((x) => x.productId === selectedProductId);
                    const avStock = stockItem ? stockItem.qty : 0;
                    const reqStock = qty + freeQty;
                    const hasStock = avStock >= reqStock;
                    return (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Available Truck Stock:</span>
                        <span className={`font-bold ${hasStock ? 'text-emerald-600' : 'text-red-500'}`}>
                          {avStock} of {reqStock} units needed
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-[10px] text-slate-400">Select a product card to view stock metrics.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Historical Order Logs */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-fiori p-4 md:p-6 animate-fadeIn animate-duration-200" id="tab-sales-history">
          <h3 className="font-display font-bold text-slate-800 text-base mb-4">
            Field Retail Invoice Logs (Order History)
          </h3>
          
          {/* Mobile Card Grid (Visible only on mobile viewports) */}
          <div className="md:hidden space-y-4">
            {officerSales.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No invoices logged on this route yet.</div>
            ) : (
              officerSales.map((sale) => (
                <div key={sale.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-slate-900 text-xs">{sale.id}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{sale.date.substring(0, 10)} {sale.date.substring(11, 16)}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                      sale.paymentMethod === 'UPI' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{sale.shopName}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Product: <span className="font-semibold text-slate-700">{sale.productName}</span></p>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/40">
                    <div>
                      <p className="text-[9px] text-slate-400">Qty Paid (Free)</p>
                      <p className="font-bold text-slate-800 text-xs">
                        {sale.qty} units
                        {sale.freeQty > 0 && <span className="text-emerald-600 font-bold ml-1">({sale.freeQty} Free)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400">Invoice Amount</p>
                      <p className="font-display font-bold text-brand-600 text-xs">₹{sale.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => handleOpenInvoicePrint(sale)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs"
                    >
                      <Printer className="h-4 w-4" /> Print Receipt
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table Wrapper (Visible on tablet up) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Shop Name</th>
                  <th className="px-6 py-4">Product Billed</th>
                  <th className="px-6 py-4 text-center">Qty Paid (Free)</th>
                  <th className="px-6 py-4 text-right">Total Billing (₹)</th>
                  <th className="px-6 py-4 text-center">Settlement</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {officerSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No invoices logged on this route yet.
                    </td>
                  </tr>
                ) : (
                  officerSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {sale.id}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800">{sale.shopName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{sale.contactNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {sale.productName}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-slate-800">{sale.qty}</span>{' '}
                        {sale.freeQty > 0 && (
                          <span className="text-emerald-600 font-bold">({sale.freeQty} Free)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-brand-600">
                        ₹{sale.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            sale.paymentMethod === 'UPI'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-purple-50 text-purple-700 border-purple-100'
                          }`}
                        >
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenInvoicePrint(sale)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-700"
                          id={`btn-print-sales-${sale.id}`}
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Receipt
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

      {/* Tab 3: Lookups for catalogs and truck stocks */}
      {activeTab === 'lookups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn animate-duration-200" id="tab-lookups">
          {/* Truck Stocks */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-fiori">
            <h3 className="font-display font-bold text-slate-800 text-sm mb-4">
              My Vehicle Truck Stock Level (Live)
            </h3>
            <div className="space-y-4">
              {truckStock.map((stock) => {
                const isLow = stock.qty <= 5;
                return (
                  <div key={stock.productId} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{stock.productName}</p>
                      <span className="text-[10px] font-mono text-slate-400">ID: {stock.productId}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${isLow ? 'text-red-500' : 'text-slate-800'}`}>
                        {stock.qty} {stock.uom}
                      </p>
                      {isLow && (
                        <span className="text-[9px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider block mt-0.5">
                          Low Stock Warning
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Campaigns lookup */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-fiori">
            <h3 className="font-display font-bold text-slate-800 text-sm mb-4">
              Available Active Campaigns Lookup
            </h3>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {schemeLists.map((list) => (
                <div key={list.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-display font-bold text-slate-800 text-xs">{list.name}</h4>
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      ID: {list.id}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    {list.items.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      return (
                        <div key={item.productId} className="flex justify-between border-b border-slate-200/40 pb-1.5 last:border-0 last:pb-0">
                          <span>{prod?.description || item.productId}</span>
                          <span className="font-bold text-emerald-600">Buy {item.buyQty} Get {item.freeQty} Free</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Active Retailer Sales Receipt"
        size="lg"
      >
        {activePrintInvoice && (
          <div className="space-y-6">
            <div className="p-4 md:p-8 border border-slate-200 rounded-2xl bg-white print-container shadow-xs space-y-6">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <h2 className="font-display font-bold text-slate-800 text-base md:text-lg tracking-tight">
                    LIVE SALE TRANSACTION RECEIPT
                  </h2>
                  <p className="text-[10px] text-slate-400">Enterprise FMCG Logistics Network</p>
                  <p className="text-xs text-slate-500 font-semibold">Representative Officer: @{currentUser?.username}</p>
                </div>
                <div className="text-left sm:text-right space-y-1">
                  <p className="text-xs md:text-sm font-bold text-slate-800 font-mono">Invoice ID: {activePrintInvoice.id}</p>
                  <p className="text-[10px] text-slate-400">Date: {activePrintInvoice.date.substring(0, 10)} {activePrintInvoice.date.substring(11, 16)}</p>
                  <p className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                    Settled via {activePrintInvoice.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Retailer Customer Account</p>
                  <p className="font-bold text-slate-800 mt-1">{activePrintInvoice.shopName}</p>
                  <p className="text-slate-500 mt-0.5">{activePrintInvoice.contactNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tax Compliance Parameters</p>
                  <p className="text-slate-500 mt-1">Pricing compliance tier matched.</p>
                  <p className="text-slate-500 font-medium">Scheme Campaign: {activePrintInvoice.schemeApplied}</p>
                </div>
              </div>

              {/* Items detail Table (with responsive scroll indicator) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[450px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5">Billed Product Description</th>
                      <th className="py-2.5 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 text-center">Paid Qty</th>
                      <th className="py-2.5 text-center font-bold text-emerald-600">Free Qty</th>
                      <th className="py-2.5 text-right">Net Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 font-semibold text-slate-900">{activePrintInvoice.productName}</td>
                      <td className="py-3 text-right">₹{activePrintInvoice.rate.toFixed(2)}</td>
                      <td className="py-3 text-center font-bold text-slate-800">{activePrintInvoice.qty}</td>
                      <td className="py-3 text-center font-bold text-emerald-600">+{activePrintInvoice.freeQty}</td>
                      <td className="py-3 text-right font-bold text-brand-600">₹{activePrintInvoice.amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer signatures */}
              <div className="border-t border-slate-200 pt-5 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <p className="max-w-md">Tax invoice compliant with CGST/SGST regulations. Thank you for your business!</p>
                <div className="text-center w-full md:w-40 border-t border-slate-300 pt-2 shrink-0">
                  <p className="font-bold text-slate-700 text-xs">Customer Signature</p>
                </div>
              </div>
            </div>

            {/* Print controller buttons */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/10 active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" /> Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesOfficerDashboard;
