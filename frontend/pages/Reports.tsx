import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Ban,
  Table as TableIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Reports: React.FC = () => {
  const { salesEntries, goodsReturns, goodsIssues, products } = useApp();

  // Filters
  const [dateRange, setDateRange] = useState('This Month');
  const [reportType, setReportType] = useState('Sales Volume');

  // Filter helper
  const filterByDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    const recDate = new Date(dateStr);
    const now = new Date();

    if (dateRange === 'Today') {
      return recDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    }
    if (dateRange === 'This Week') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recDate >= past;
    }
    if (dateRange === 'This Month') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return recDate >= past;
    }
    // Last Quarter / All
    return true;
  };

  // Helper to construct structured report dataset
  const getReportExportData = () => {
    if (reportType === 'Sales Volume') {
      const filtered = salesEntries.filter((se) => filterByDateRange(se.date));
      const headers = [
        'Sales Entry ID',
        'Date',
        'Shop Name',
        'Sales Officer',
        'Product ID',
        'Product Name',
        'Buy Quantity',
        'Free Quantity',
        'Rate (₹)',
        'Total Amount (₹)',
        'Payment Method',
        'Scheme Applied'
      ];
      const rows = filtered.map((se) => ({
        'Sales Entry ID': se.id,
        'Date': se.date,
        'Shop Name': se.shopName,
        'Sales Officer': se.salesOfficerUsername,
        'Product ID': se.productId,
        'Product Name': se.productName,
        'Buy Quantity': se.qty,
        'Free Quantity': se.freeQty,
        'Rate (₹)': se.rate,
        'Total Amount (₹)': se.amount,
        'Payment Method': se.paymentMethod,
        'Scheme Applied': se.schemeApplied || 'N/A'
      }));
      const tableRows = rows.map((r) => Object.values(r));
      return { rows, headers, tableRows, title: 'Product Sales Volume Audit Report' };
    }

    if (reportType === 'Payment Modes') {
      const filtered = salesEntries.filter((se) => filterByDateRange(se.date));
      const headers = [
        'Sales Entry ID',
        'Date',
        'Shop Name',
        'Contact Number',
        'Payment Method',
        'Settled Amount (₹)',
        'Sales Officer'
      ];
      const rows = filtered.map((se) => ({
        'Sales Entry ID': se.id,
        'Date': se.date,
        'Shop Name': se.shopName,
        'Contact Number': se.contactNumber || 'N/A',
        'Payment Method': se.paymentMethod,
        'Settled Amount (₹)': se.amount,
        'Sales Officer': se.salesOfficerUsername
      }));
      const tableRows = rows.map((r) => Object.values(r));
      return { rows, headers, tableRows, title: 'Settlement Distribution & Payment Modes Audit Report' };
    }

    // Audits - Goods Issues & Goods Returns
    const filteredIssues = goodsIssues.filter((gi) => filterByDateRange(gi.issueDate));
    const filteredReturns = goodsReturns.filter((gr) => filterByDateRange(gr.returnDate));

    const headers = [
      'Voucher Type',
      'Voucher ID',
      'Date',
      'Depot Site',
      'Sales Officer',
      'Status',
      'Item Details',
      'Notes / Reason'
    ];

    const issueRows = filteredIssues.map((gi) => ({
      'Voucher Type': 'Dispatch (Goods Issue)',
      'Voucher ID': gi.id,
      'Date': gi.issueDate,
      'Depot Site': gi.depotSite,
      'Sales Officer': gi.salesOfficerUsername,
      'Status': gi.status,
      'Item Details': gi.items.map((i) => `${i.productName} (${i.qty} ${i.uom})`).join(', '),
      'Notes / Reason': gi.notes || 'N/A'
    }));

    const returnRows = filteredReturns.map((gr) => ({
      'Voucher Type': 'Return (Goods Return)',
      'Voucher ID': gr.id,
      'Date': gr.returnDate,
      'Depot Site': gr.depotSite,
      'Sales Officer': gr.salesOfficerUsername,
      'Status': gr.status,
      'Item Details': gr.items.map((i) => `${i.productName} (${i.qty} ${i.uom})`).join(', '),
      'Notes / Reason': gr.reason || gr.notes || 'N/A'
    }));

    const rows = [...issueRows, ...returnRows];
    const tableRows = rows.map((r) => Object.values(r));
    return { rows, headers, tableRows, title: 'Dispatches & Damaged Goods Audit Log' };
  };

  const handleExportExcel = () => {
    try {
      const { rows, headers, title } = getReportExportData();
      const exportRows =
        rows.length > 0
          ? rows
          : [headers.reduce((acc, h) => ({ ...acc, [h]: 'No records found' }), {})];

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 5, 15) }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report_Data');

      const cleanFileName = `LiveSale_${reportType.replace(/\s+/g, '_')}_${dateRange.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, cleanFileName);
      toast.success(`Excel report exported as ${cleanFileName}!`);
    } catch (err: any) {
      console.error('Excel Export error:', err);
      toast.error('Failed to export Excel report. Please try again.');
    }
  };

  const handleSavePDF = () => {
    try {
      const { headers, tableRows, title } = getReportExportData();
      const pdfRows =
        tableRows.length > 0
          ? tableRows
          : [headers.map(() => 'No records found for selected filter criteria')];

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      // Branded Top Banner
      doc.setFillColor(15, 118, 110); // Brand Teal
      doc.rect(0, 0, doc.internal.pageSize.width, 50, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('BINDU LIVE SALE APPLICATION', 30, 32);

      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFontSize(12);
      doc.text(`Audit Report: ${title}`, 30, 72);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Filter Criteria: ${dateRange}  |  Generated On: ${new Date().toLocaleString('en-IN')}`, 30, 87);

      autoTable(doc, {
        startY: 100,
        head: [headers],
        body: pdfRows,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
          cellPadding: 5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 30, right: 30, bottom: 40 },
        didDrawPage: (data) => {
          const str = `Page ${doc.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 15);
          doc.text('BINDU Live Sale Application — Confidential Audit Trail', 30, doc.internal.pageSize.height - 15);
        },
      });

      const cleanFileName = `LiveSale_${reportType.replace(/\s+/g, '_')}_${dateRange.replace(/\s+/g, '_')}.pdf`;
      doc.save(cleanFileName);
      toast.success(`PDF report downloaded as ${cleanFileName}!`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF report. Please try again.');
    }
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
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors"
            id="btn-export-excel-reports"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-md active:scale-[0.98] transition-all"
            id="btn-save-pdf-reports"
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

      {/* Live Filtered Report Data Table Preview */}
      {(() => {
        const { headers, tableRows, title } = getReportExportData();
        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-4" id="report-data-preview-table">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-brand-600" /> {title}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Filtered by <span className="font-semibold text-slate-600">{dateRange}</span> • {tableRows.length} total records ready for export
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" /> Excel
                </button>
                <button
                  onClick={handleSavePDF}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5 text-brand-400" /> PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length} className="text-center py-8 text-slate-400">
                        No transactions found for the selected filter criteria ({dateRange}).
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50">
                        {row.map((cell: any, cIdx: number) => (
                          <td key={cIdx} className="px-4 py-3 whitespace-nowrap font-medium">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Reports;
