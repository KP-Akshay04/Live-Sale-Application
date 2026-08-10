import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Ban
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Reports: React.FC = () => {
  const { salesEntries, goodsReturns, goodsIssues, products } = useApp();

  // Filters
  const [dateRange, setDateRange] = useState('This Month');
  const [reportType, setReportType] = useState('Sales Volume');

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    const loadingToast = toast.loading(`Generating unified system ${format} audit log...`);
    setTimeout(() => {
      toast.dismiss(loadingToast);
      toast.success(`Reports downloaded successfully as LiveSale_Report_${format}.zip`);
    }, 1200);
  };

  // 1. Compute Sales Charts Data
  // Aggregated sales by product
  const productSalesMap: Record<string, { name: string; value: number }> = {};
  salesEntries.forEach((se) => {
    if (!productSalesMap[se.productId]) {
      productSalesMap[se.productId] = { name: se.productName, value: 0 };
    }
    productSalesMap[se.productId].value += se.amount;
  });
  const productSalesData = Object.values(productSalesMap);

  // 2. Settlement distribution
  const upiTotal = salesEntries.filter((s) => s.paymentMethod === 'UPI').reduce((sum, s) => sum + s.amount, 0);
  const cashTotal = salesEntries.filter((s) => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.amount, 0);

  const settlementData = [
    { name: 'UPI Receipts', value: upiTotal },
    { name: 'Cash Collections', value: cashTotal },
  ];

  const PIE_COLORS = ['#0f766e', '#7c3aed'];

  // 3. Simulated historical months
  const monthlyRevenueData = [
    { month: 'Jan', Sales: 185000, Returns: 4200 },
    { month: 'Feb', Sales: 220000, Returns: 5100 },
    { month: 'Mar', Sales: 310000, Returns: 3800 },
    { month: 'Apr', Sales: 290000, Returns: 7200 },
    { month: 'May', Sales: 415000, Returns: 6100 },
    { month: 'Jun', Sales: 520000, Returns: 8900 },
  ];

  return (
    <div className="space-y-6" id="reports-view-section">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Financial & Logistics Analytics
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor real-time compliance matrices, dealer invoice records, and vehicle dispatch history.
          </p>
        </div>

        {/* Quick export triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-md active:scale-[0.98] transition-all"
          >
            <FileText className="h-4 w-4" /> Save PDF
          </button>
        </div>
      </div>

      {/* Filters block */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
          <Filter className="h-4.5 w-4.5 text-brand-600" /> Filter Criteria:
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Last Quarter">Last Quarter</option>
          </select>

          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="Sales Volume">Product Sales Volume</option>
            <option value="Payment Modes">Settlement Distribution</option>
            <option value="Audits">Dispatches & Damaged Goods</option>
          </select>
        </div>
      </div>

      {/* Main interactive charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Line graphs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-slate-800 text-sm">Revenue Progress Map</h3>
            <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-bold uppercase">
              Route Tracker
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Sales"
                  stroke="#0f766e"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                />
                <Line type="monotone" dataKey="Returns" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Settlement Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-sm pb-2 border-b border-slate-50">
            UPI vs Cash Collections
          </h3>

          {salesEntries.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">No transactions recorded.</div>
          ) : (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={settlementData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {settlementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {settlementData.map((data, idx) => (
                  <div key={data.name} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                      {data.name}
                    </div>
                    <p className="text-sm font-display font-bold text-slate-900 mt-1">
                      ₹{data.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product volume mapping bento bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">
        <h3 className="font-display font-bold text-slate-800 text-sm mb-4">Product Category Revenue Distribution</h3>
        {productSalesData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No active sales logged.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} name="Revenues" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
