import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const SuperAdminDashboard: React.FC = () => {
  const {
    products,
    depots,
    salesOffices,
    salesEntries,
    goodsIssues,
    goodsReturns
  } = useApp();

  // 1. Calculate Real Statistics based on AppContext
  const totalSalesCount = salesEntries.length;
  const totalRevenue = salesEntries.reduce((acc, entry) => acc + entry.amount, 0);
  const activeProductsCount = products.length;
  const totalDepotsCount = depots.length;
  const pendingReturnsCount = goodsReturns.filter((r) => r.status === 'Pending').length;

  // 2. Prepare Recharts Chart Data
  // Dynamic Area Chart: Group sales by date
  const salesByDate: { [date: string]: number } = {};
  salesEntries.forEach((entry) => {
    // extract date only (YYYY-MM-DD)
    const dateStr = entry.date.substring(0, 10);
    salesByDate[dateStr] = (salesByDate[dateStr] || 0) + entry.amount;
  });

  const areaChartData = Object.keys(salesByDate).map((date) => ({
    date,
    revenue: salesByDate[date],
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Fallback if no entries
  const finalAreaChartData = areaChartData.length > 0 ? areaChartData : [
    { date: '2026-07-06', revenue: 4200 },
    { date: '2026-07-07', revenue: 5800 },
    { date: '2026-07-08', revenue: 7100 },
    { date: '2026-07-09', revenue: 6400 },
    { date: '2026-07-10', revenue: 7600 },
  ];

  // Dynamic Pie Chart: Category Sales Distribution
  const categorySalesMap: { [cat: string]: number } = {};
  salesEntries.forEach((se) => {
    const prod = products.find((p) => p.id === se.productId);
    const cat = prod?.category || 'General';
    categorySalesMap[cat] = (categorySalesMap[cat] || 0) + se.amount;
  });

  const pieChartData = Object.keys(categorySalesMap).map((cat) => ({
    name: cat,
    value: categorySalesMap[cat],
  }));

  const finalPieChartData = pieChartData.length > 0 ? pieChartData : [
    { name: 'Beverages', value: 5800 },
    { name: 'Packaged Water', value: 1800 },
  ];

  // Dynamic Bar Chart: Sales Officer Performance Comparison
  const officerSalesMap: { [username: string]: number } = {};
  salesEntries.forEach((se) => {
    officerSalesMap[se.salesOfficerUsername] = (officerSalesMap[se.salesOfficerUsername] || 0) + se.amount;
  });

  const barChartData = Object.keys(officerSalesMap).map((uname) => ({
    name: uname.charAt(0).toUpperCase() + uname.slice(1),
    Revenue: officerSalesMap[uname],
  }));

  const finalBarChartData = barChartData.length > 0 ? barChartData : [
    { name: 'Ananth (sales)', Revenue: 4800 },
    { name: 'Nisha (sales_two)', Revenue: 2800 },
  ];

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  // Top Selling Products Calculation
  const productQtyMap: { [prodId: string]: { name: string; qty: number; amt: number } } = {};
  salesEntries.forEach((se) => {
    if (!productQtyMap[se.productId]) {
      productQtyMap[se.productId] = { name: se.productName, qty: 0, amt: 0 };
    }
    productQtyMap[se.productId].qty += se.qty;
    productQtyMap[se.productId].amt += se.amount;
  });

  const topSellingList = Object.keys(productQtyMap)
    .map((id) => ({
      id,
      name: productQtyMap[id].name,
      qty: productQtyMap[id].qty,
      amount: productQtyMap[id].amt,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  return (
    <div className="space-y-8" id="super-admin-dashboard">
      {/* Title & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Enterprise Sales Operations Center
          </h1>
          <p className="text-slate-500 text-sm">
            Super Admin Portal • Live consolidated ERP dispatch metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Feed Active
          </span>
          <span className="text-xs text-slate-400">Refreshed just now</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-brand-50 text-brand-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Cumulative Revenue
            </span>
            <p className="text-2xl font-display font-bold text-slate-800">
              ₹{totalRevenue.toLocaleString()}
            </p>
            <span className="text-xs text-emerald-500 font-medium">
              +14.2% from last week
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Sales Invoices
            </span>
            <p className="text-2xl font-display font-bold text-slate-800">
              {totalSalesCount}
            </p>
            <span className="text-xs text-emerald-500 font-medium">
              +8.5% volume growth
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Products Cataloged
            </span>
            <p className="text-2xl font-display font-bold text-slate-800">
              {activeProductsCount} Items
            </p>
            <span className="text-xs text-slate-500 font-medium">
              Across {totalDepotsCount} active depots
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-6 rounded-2xl shadow-fiori border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Pending Depot Returns
            </span>
            <p className="text-2xl font-display font-bold text-slate-800">
              {pendingReturnsCount}
            </p>
            <span className="text-xs text-amber-600 font-medium">
              Awaiting inspection
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (Area Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori lg:col-span-2">
          <h3 className="font-display font-bold text-slate-800 text-base mb-4">
            Sales & Revenue Trend
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finalAreaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Category Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">
          <h3 className="font-display font-bold text-slate-800 text-base mb-4">
            Category Share
          </h3>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalPieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {finalPieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Share</span>
              <span className="text-xl font-bold text-slate-800">100%</span>
            </div>
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-3 text-xs">
            {finalPieChartData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-500 font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Dashboard Section: Bar Chart & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Officer Performance (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">
          <h3 className="font-display font-bold text-slate-800 text-base mb-4">
            Sales Officer Rankings
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalBarChartData} margin={{ left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-800 text-base">
              Top Selling Products
            </h3>
            <span className="text-[10px] uppercase font-bold text-brand-600 px-2 py-0.5 rounded bg-brand-50">
              Volume Rank
            </span>
          </div>

          <div className="space-y-4">
            {topSellingList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No transaction data available yet.</p>
            ) : (
              topSellingList.map((prod, index) => (
                <div key={prod.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                        {prod.name}
                      </p>
                      <span className="text-[10px] text-slate-400">ID: {prod.id}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">₹{prod.amount.toLocaleString()}</p>
                    <span className="text-[10px] text-emerald-500 font-medium">{prod.qty} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-800 text-base">
              Live Auditing Feed
            </h3>
            <span className="text-xs text-slate-400">Dynamic log</span>
          </div>

          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
            {salesEntries.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800">
                    {entry.salesOfficerUsername} sold to {entry.shopName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {entry.qty} x {entry.productName}
                  </p>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mt-1 inline-block">
                    Invoice: {entry.id} • {entry.paymentMethod}
                  </span>
                </div>
              </div>
            ))}

            {goodsIssues.slice(0, 2).map((gi) => (
              <div key={gi.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800">
                    Depot issued stock {gi.id}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    Assigned to route: {gi.salesOfficerUsername}
                  </p>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 mt-1 inline-block">
                    Status: {gi.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
