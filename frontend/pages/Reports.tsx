import React, { useMemo, useState } from 'react';
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
  Line,
} from 'recharts';

import {
  FileText,
  Download,
  Filter,
  Table as TableIcon,
} from 'lucide-react';

import { toast } from 'react-hot-toast';

type DateRange =
  | 'Today'
  | 'Yesterday'
  | 'This Week'
  | 'This Month'
  | 'Last Month'
  | 'Last Quarter'
  | 'All Time'
  | 'Custom Range';

export const Reports: React.FC = () => {
  const {
    salesEntries,
    goodsReturns,
    goodsIssues,
  } = useApp();

  /* ---------------------------------------------------------------------- */
  /* FILTER STATE                                                           */
  /* ---------------------------------------------------------------------- */

  const [dateRange, setDateRange] =
    useState<DateRange>('This Month');

  const [reportType, setReportType] =
    useState('Sales Volume');

  const [customFromDate, setCustomFromDate] =
    useState('');

  const [customToDate, setCustomToDate] =
    useState('');

  /* ---------------------------------------------------------------------- */
  /* DATE HELPERS                                                           */
  /* ---------------------------------------------------------------------- */

  const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const endOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  };

  const startOfWeek = (date: Date) => {
    const result = startOfDay(date);

    const day = result.getDay();

    /*
     * Monday = first day of week.
     * Sunday = last day.
     */
    const difference =
      day === 0 ? -6 : 1 - day;

    result.setDate(
      result.getDate() + difference
    );

    return result;
  };

  const endOfWeek = (date: Date) => {
    const result = startOfWeek(date);

    result.setDate(
      result.getDate() + 6
    );

    return endOfDay(result);
  };

  const startOfMonth = (date: Date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
  };

  const endOfMonth = (date: Date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
  };

  const getDateBounds = (): {
    from: Date | null;
    to: Date | null;
  } => {
    const now = new Date();

    switch (dateRange) {
      case 'Today':
        return {
          from: startOfDay(now),
          to: endOfDay(now),
        };

      case 'Yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(
          yesterday.getDate() - 1
        );

        return {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday),
        };
      }

      case 'This Week':
        return {
          from: startOfWeek(now),
          to: endOfWeek(now),
        };

      case 'This Month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };

      case 'Last Month': {
        const lastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );

        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      }

      case 'Last Quarter': {
        const currentQuarter =
          Math.floor(
            now.getMonth() / 3
          );

        const lastQuarter =
          currentQuarter - 1;

        const year =
          lastQuarter < 0
            ? now.getFullYear() - 1
            : now.getFullYear();

        const quarter =
          lastQuarter < 0
            ? 3
            : lastQuarter;

        const from = new Date(
          year,
          quarter * 3,
          1
        );

        const to = new Date(
          year,
          quarter * 3 + 3,
          0,
          23,
          59,
          59,
          999
        );

        return {
          from,
          to,
        };
      }

      case 'Custom Range': {
        if (
          !customFromDate ||
          !customToDate
        ) {
          return {
            from: null,
            to: null,
          };
        }

        const from = new Date(
          `${customFromDate}T00:00:00`
        );

        const to = new Date(
          `${customToDate}T23:59:59.999`
        );

        return {
          from,
          to,
        };
      }

      case 'All Time':
      default:
        return {
          from: null,
          to: null,
        };
    }
  };

  const isDateInRange = (
    dateString: string
  ) => {
    if (!dateString) {
      return false;
    }

    const recordDate =
      new Date(dateString);

    if (
      Number.isNaN(
        recordDate.getTime()
      )
    ) {
      return false;
    }

    const { from, to } =
      getDateBounds();

    if (!from || !to) {
      return true;
    }

    return (
      recordDate >= from &&
      recordDate <= to
    );
  };

  /* ---------------------------------------------------------------------- */
  /* FILTERED TRANSACTIONS                                                  */
  /* ---------------------------------------------------------------------- */

  const filteredSales = useMemo(
    () =>
      salesEntries.filter((sale) =>
        isDateInRange(sale.date)
      ),
    [
      salesEntries,
      dateRange,
      customFromDate,
      customToDate,
    ]
  );

  const filteredGoodsIssues = useMemo(
    () =>
      goodsIssues.filter((issue) =>
        isDateInRange(issue.issueDate)
      ),
    [
      goodsIssues,
      dateRange,
      customFromDate,
      customToDate,
    ]
  );

  const filteredGoodsReturns = useMemo(
    () =>
      goodsReturns.filter((ret) =>
        isDateInRange(ret.returnDate)
      ),
    [
      goodsReturns,
      dateRange,
      customFromDate,
      customToDate,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* SALES SUMMARY                                                          */
  /* ---------------------------------------------------------------------- */

  const totalSalesAmount =
    filteredSales.reduce(
      (sum, sale) =>
        sum + Number(sale.amount || 0),
      0
    );

  const totalSalesQuantity =
    filteredSales.reduce(
      (sum, sale) =>
        sum + Number(sale.qty || 0),
      0
    );

  const upiTotal =
    filteredSales
      .filter(
        (sale) =>
          sale.paymentMethod === 'UPI'
      )
      .reduce(
        (sum, sale) =>
          sum + Number(sale.amount || 0),
        0
      );

  const cashTotal =
    filteredSales
      .filter(
        (sale) =>
          sale.paymentMethod === 'Cash'
      )
      .reduce(
        (sum, sale) =>
          sum + Number(sale.amount || 0),
        0
      );

  /* ---------------------------------------------------------------------- */
  /* PRODUCT REVENUE                                                        */
  /* ---------------------------------------------------------------------- */

  const productSalesData = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        value: number;
      }
    > = {};

    filteredSales.forEach((sale) => {
      const key =
        sale.productId ||
        sale.productName;

      if (!map[key]) {
        map[key] = {
          name:
            sale.productName ||
            sale.productId,
          value: 0,
        };
      }

      map[key].value += Number(
        sale.amount || 0
      );
    });

    return Object.values(map);
  }, [filteredSales]);

  /* ---------------------------------------------------------------------- */
  /* PAYMENT DATA                                                           */
  /* ---------------------------------------------------------------------- */

  const settlementData = [
    {
      name: 'UPI Receipts',
      value: upiTotal,
    },
    {
      name: 'Cash Collections',
      value: cashTotal,
    },
  ];

  const PIE_COLORS = [
    '#0f766e',
    '#7c3aed',
  ];

  /* ---------------------------------------------------------------------- */
  /* MONTHLY REVENUE                                                        */
  /* ---------------------------------------------------------------------- */

    /* ---------------------------------------------------------------------- */
  /* ADAPTIVE REVENUE PROGRESS                                             */
  /* ---------------------------------------------------------------------- */

  const monthlyRevenueData = useMemo(() => {
  type RevenuePoint = {
    month: string;
    Sales: number;
    Returns: number;
    sortDate: number;
  };

  let granularity: 'hour' | 'day' | 'month';

  if (
    dateRange === 'Today' ||
    dateRange === 'Yesterday'
  ) {
    granularity = 'hour';
  } else if (
    dateRange === 'This Week' ||
    dateRange === 'This Month' ||
    dateRange === 'Last Month'
  ) {
    granularity = 'day';
  } else if (
    dateRange === 'Last Quarter' ||
    dateRange === 'All Time'
  ) {
    granularity = 'month';
  } else {
    if (customFromDate && customToDate) {
      const from = new Date(
        `${customFromDate}T00:00:00`
      );
      const to = new Date(
        `${customToDate}T23:59:59.999`
      );

      const difference =
        to.getTime() - from.getTime();

      const days =
        difference /
        (1000 * 60 * 60 * 24);

      granularity =
        days <= 31
          ? 'day'
          : 'month';
    } else {
      granularity = 'day';
    }
  }

  const map: Record<string, RevenuePoint> = {};

  const getBucket = (date: Date) => {
    if (granularity === 'hour') {
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
        String(date.getHours()).padStart(2, '0'),
      ].join('-');
    }

    if (granularity === 'day') {
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
    ].join('-');
  };

  const getLabel = (date: Date) => {
    if (granularity === 'hour') {
      return date.toLocaleTimeString(
        'en-IN',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      );
    }

    if (granularity === 'day') {
      return date.toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
        }
      );
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        month: 'short',
        year: 'numeric',
      }
    );
  };

  /*
   * Determine the visible calendar range.
   * Empty periods are intentionally included as
   * zero-value points so the chart always has
   * a proper timeline.
   */
  const now = new Date();

  let rangeStart: Date;
  let rangeEnd: Date;

  if (dateRange === 'Today') {
    rangeStart = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);

    rangeEnd = new Date(now);
    rangeEnd.setMinutes(0, 0, 0);
  } else if (dateRange === 'Yesterday') {
    rangeStart = new Date(now);
    rangeStart.setDate(
      rangeStart.getDate() - 1
    );
    rangeStart.setHours(0, 0, 0, 0);

    rangeEnd = new Date(rangeStart);
    rangeEnd.setHours(23, 0, 0, 0);
  } else if (dateRange === 'This Week') {
    rangeStart = new Date(now);

    const day =
      rangeStart.getDay();

    const daysFromMonday =
      day === 0 ? 6 : day - 1;

    rangeStart.setDate(
      rangeStart.getDate() -
        daysFromMonday
    );
    rangeStart.setHours(0, 0, 0, 0);

    rangeEnd = new Date(now);
    rangeEnd.setHours(0, 0, 0, 0);
  } else if (dateRange === 'This Month') {
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    rangeEnd = new Date(now);
    rangeEnd.setHours(0, 0, 0, 0);
  } else if (dateRange === 'Last Month') {
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    rangeEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );
    rangeEnd.setHours(0, 0, 0, 0);
  } else if (dateRange === 'Last Quarter') {
    const currentQuarter =
      Math.floor(now.getMonth() / 3);

    const lastQuarterStartMonth =
      currentQuarter * 3 - 3;

    rangeStart = new Date(
      now.getFullYear(),
      lastQuarterStartMonth,
      1
    );

    rangeEnd = new Date(
      now.getFullYear(),
      currentQuarter * 3,
      0
    );
    rangeEnd.setHours(0, 0, 0, 0);
  } else if (dateRange === 'All Time') {
    const allDates = [
      ...filteredSales.map(
        (sale) =>
          new Date(sale.date)
      ),
      ...filteredGoodsReturns.map(
        (ret) =>
          new Date(ret.returnDate)
      ),
    ].filter(
      (date) =>
        !Number.isNaN(
          date.getTime()
        )
    );

    if (allDates.length > 0) {
      const earliest =
        new Date(
          Math.min(
            ...allDates.map(
              (date) =>
                date.getTime()
            )
          )
        );

      rangeStart =
        new Date(
          earliest.getFullYear(),
          earliest.getMonth(),
          1
        );
    } else {
      rangeStart =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );
    }

    rangeEnd =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
  } else if (
    customFromDate &&
    customToDate
  ) {
    rangeStart = new Date(
      `${customFromDate}T00:00:00`
    );

    rangeEnd = new Date(
      `${customToDate}T00:00:00`
    );
  } else {
    rangeStart = new Date(now);
    rangeStart.setDate(
      rangeStart.getDate() - 6
    );
    rangeStart.setHours(0, 0, 0, 0);

    rangeEnd = new Date(now);
    rangeEnd.setHours(0, 0, 0, 0);
  }

  /*
   * Create all timeline buckets first.
   * Every empty bucket starts at zero.
   */
  const addBucket = (date: Date) => {
    const key = getBucket(date);

    if (!map[key]) {
      map[key] = {
        month: getLabel(date),
        Sales: 0,
        Returns: 0,
        sortDate: date.getTime(),
      };
    }
  };

  if (granularity === 'hour') {
    const cursor = new Date(rangeStart);

    while (
      cursor.getTime() <=
      rangeEnd.getTime()
    ) {
      addBucket(cursor);

      cursor.setHours(
        cursor.getHours() + 1
      );
    }
  } else if (
    granularity === 'day'
  ) {
    const cursor = new Date(
      rangeStart
    );
    cursor.setHours(0, 0, 0, 0);

    while (
      cursor.getTime() <=
      rangeEnd.getTime()
    ) {
      addBucket(cursor);

      cursor.setDate(
        cursor.getDate() + 1
      );
    }
  } else {
    const cursor = new Date(
      rangeStart.getFullYear(),
      rangeStart.getMonth(),
      1
    );

    const finalMonth = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      1
    );

    while (
      cursor.getTime() <=
      finalMonth.getTime()
    ) {
      addBucket(cursor);

      cursor.setMonth(
        cursor.getMonth() + 1
      );
    }
  }

  /*
   * Overlay actual sales on top of the
   * zero-filled timeline.
   */
  filteredSales.forEach(
    (sale) => {
      const date = new Date(
        sale.date
      );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return;
      }

      const key =
        getBucket(date);

      if (!map[key]) {
        addBucket(date);
      }

      map[key].Sales +=
        Number(
          sale.amount || 0
        );

      map[key].sortDate =
        Math.min(
          map[key].sortDate,
          date.getTime()
        );
    }
  );

  /*
   * Overlay actual goods returns.
   *
   * Return amount =
   * quantity × rate
   */
  filteredGoodsReturns.forEach(
    (ret) => {
      const date = new Date(
        ret.returnDate
      );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return;
      }

      const key =
        getBucket(date);

      if (!map[key]) {
        addBucket(date);
      }

      const returnAmount =
        ret.items.reduce(
          (
            sum: number,
            item: any
          ) =>
            sum +
            Number(
              item.qty || 0
            ) *
              Number(
                item.rate || 0
              ),
          0
        );

      map[key].Returns +=
        returnAmount;

      map[key].sortDate =
        Math.min(
          map[key].sortDate,
          date.getTime()
        );
    }
  );

  return Object.values(
    map
  ).sort(
    (a, b) =>
      a.sortDate -
      b.sortDate
  );
}, [
  filteredSales,
  filteredGoodsReturns,
  dateRange,
  customFromDate,
  customToDate,
]);

  /* ---------------------------------------------------------------------- */
  /* EXPORT DATA                                                            */
  /* ---------------------------------------------------------------------- */

  const getReportExportData = () => {
    if (
      reportType ===
      'Sales Volume'
    ) {
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
        'Scheme Applied',
      ];

      const rows =
        filteredSales.map(
          (sale) => ({
            'Sales Entry ID':
              sale.id,

            Date:
              sale.date,

            'Shop Name':
              sale.shopName,

            'Sales Officer':
              sale.salesOfficerUsername,

            'Product ID':
              sale.productId,

            'Product Name':
              sale.productName,

            'Buy Quantity':
              sale.qty,

            'Free Quantity':
              sale.freeQty,

            'Rate (₹)':
              sale.rate,

            'Total Amount (₹)':
              sale.amount,

            'Payment Method':
              sale.paymentMethod,

            'Scheme Applied':
              sale.schemeApplied ||
              'N/A',
          })
        );

      return {
        rows,
        headers,
        tableRows:
          rows.map((row) =>
            Object.values(row)
          ),
        title:
          'Product Sales Volume Audit Report',
      };
    }

    if (
      reportType ===
      'Payment Modes'
    ) {
      const headers = [
        'Sales Entry ID',
        'Date',
        'Shop Name',
        'Contact Number',
        'Payment Method',
        'Settled Amount (₹)',
        'Sales Officer',
      ];

      const rows =
        filteredSales.map(
          (sale) => ({
            'Sales Entry ID':
              sale.id,

            Date:
              sale.date,

            'Shop Name':
              sale.shopName,

            'Contact Number':
              sale.contactNumber ||
              'N/A',

            'Payment Method':
              sale.paymentMethod,

            'Settled Amount (₹)':
              sale.amount,

            'Sales Officer':
              sale.salesOfficerUsername,
          })
        );

      return {
        rows,
        headers,
        tableRows:
          rows.map((row) =>
            Object.values(row)
          ),
        title:
          'Settlement Distribution & Payment Modes Audit Report',
      };
    }

    /* ------------------------------------------------------------------ */
    /* GOODS ISSUE + GOODS RETURN AUDIT                                   */
    /* ------------------------------------------------------------------ */

    const headers = [
      'Voucher Type',
      'Voucher ID',
      'Date',
      'Depot Site',
      'Sales Officer',
      'Status',
      'Item Details',
      'Notes / Reason',
    ];

    const issueRows =
      filteredGoodsIssues.map(
        (issue) => ({
          'Voucher Type':
            'Dispatch (Goods Issue)',

          'Voucher ID':
            issue.id,

          Date:
            issue.issueDate,

          'Depot Site':
            issue.depotSite,

          'Sales Officer':
            issue.salesOfficerUsername,

          Status:
            issue.status,

          'Item Details':
            issue.items
              .map(
                (item) =>
                  `${item.productName} (${item.qty} ${item.uom})`
              )
              .join(', '),

          'Notes / Reason':
            issue.notes ||
            'N/A',
        })
      );

    const returnRows =
      filteredGoodsReturns.map(
        (ret) => ({
          'Voucher Type':
            'Return (Goods Return)',

          'Voucher ID':
            ret.id,

          Date:
            ret.returnDate,

          'Depot Site':
            ret.depotSite,

          'Sales Officer':
            ret.salesOfficerUsername,

          Status:
            ret.status,

          'Item Details':
            ret.items
              .map(
                (item) =>
                  `${item.productName} (${item.qty} ${item.uom})`
              )
              .join(', '),

          'Notes / Reason':
            ret.reason ||
            ret.notes ||
            'N/A',
        })
      );

    const rows = [
      ...issueRows,
      ...returnRows,
    ];

    return {
      rows,
      headers,
      tableRows:
        rows.map((row) =>
          Object.values(row)
        ),
      title:
        'Dispatches & Damaged Goods Audit Log',
    };
  };

  /* ---------------------------------------------------------------------- */
  /* EXCEL EXPORT                                                           */
  /* ---------------------------------------------------------------------- */

  const handleExportExcel = () => {
    try {
      const {
        rows,
        headers,
      } = getReportExportData();

      const exportRows =
        rows.length > 0
          ? rows
          : [
              headers.reduce(
                (
                  acc,
                  header
                ) => ({
                  ...acc,
                  [header]:
                    'No records found',
                }),
                {}
              ),
            ];

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportRows
        );

      worksheet['!cols'] =
        headers.map(
          (header) => ({
            wch: Math.max(
              header.length + 5,
              15
            ),
          })
        );

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Report_Data'
      );

      const cleanFileName =
        `LiveSale_${reportType.replace(
          /\s+/g,
          '_'
        )}_${dateRange.replace(
          /\s+/g,
          '_'
        )}.xlsx`;

      XLSX.writeFile(
        workbook,
        cleanFileName
      );

      toast.success(
        `Excel report exported as ${cleanFileName}!`
      );
    } catch (error) {
      console.error(
        'Excel Export Error:',
        error
      );

      toast.error(
        'Failed to export Excel report.'
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* PDF EXPORT                                                             */
  /* ---------------------------------------------------------------------- */

  const handleSavePDF = () => {
    try {
      const {
        headers,
        tableRows,
        title,
      } = getReportExportData();

      const pdfRows =
        tableRows.length > 0
          ? tableRows
          : [
              headers.map(
                () =>
                  'No records found for selected filter criteria'
              ),
            ];

      const doc =
        new jsPDF({
          orientation:
            'landscape',
          unit: 'pt',
          format: 'a4',
        });

      doc.setFillColor(
        15,
        118,
        110
      );

      doc.rect(
        0,
        0,
        doc.internal.pageSize
          .width,
        50,
        'F'
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFontSize(16);
      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        'BINDU LIVE SALE APPLICATION',
        30,
        32
      );

      doc.setTextColor(
        30,
        41,
        59
      );

      doc.setFontSize(12);

      doc.text(
        `Audit Report: ${title}`,
        30,
        72
      );

      doc.setFontSize(9);

      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.text(
        `Filter Criteria: ${dateRange} | Generated On: ${new Date().toLocaleString(
          'en-IN'
        )}`,
        30,
        87
      );

      autoTable(doc, {
        startY: 100,
        head: [headers],
        body: pdfRows,
        theme: 'striped',

        headStyles: {
          fillColor: [
            15,
            118,
            110,
          ],
          textColor: [
            255,
            255,
            255,
          ],
          fontStyle:
            'bold',
          fontSize: 9,
        },

        bodyStyles: {
          fontSize: 8,
          textColor: [
            30,
            41,
            59,
          ],
          cellPadding: 5,
        },

        alternateRowStyles: {
          fillColor: [
            248,
            250,
            252,
          ],
        },

        margin: {
          left: 30,
          right: 30,
          bottom: 40,
        },

        didDrawPage: () => {
          const page =
            `Page ${doc.getNumberOfPages()}`;

          doc.setFontSize(8);

          doc.setTextColor(
            148,
            163,
            184
          );

          doc.text(
            page,
            doc.internal
              .pageSize
              .width - 60,
            doc.internal
              .pageSize
              .height - 15
          );

          doc.text(
            'BINDU Live Sale Application — Confidential Audit Trail',
            30,
            doc.internal
              .pageSize
              .height - 15
          );
        },
      });

      const cleanFileName =
        `LiveSale_${reportType.replace(
          /\s+/g,
          '_'
        )}_${dateRange.replace(
          /\s+/g,
          '_'
        )}.pdf`;

      doc.save(
        cleanFileName
      );

      toast.success(
        `PDF report generated successfully!`
      );
    } catch (error) {
      console.error(
        'PDF Export Error:',
        error
      );

      toast.error(
        'Failed to generate PDF report.'
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  const {
    headers,
    tableRows,
    title,
  } =
    getReportExportData();

  return (
    <div
      className="space-y-6"
      id="reports-view-section"
    >
      {/* HEADER ----------------------------------------------------------- */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
            Financial & Logistics Analytics
          </h1>

          <p className="text-slate-500 text-sm">
            Monitor real-time compliance matrices,
            dealer invoice records, and vehicle
            dispatch history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={
              handleExportExcel
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>

          <button
            onClick={
              handleSavePDF
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-md"
          >
            <FileText className="h-4 w-4" />
            Save PDF
          </button>
        </div>
      </div>

      {/* FILTER ----------------------------------------------------------- */}

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
            <Filter className="h-4 w-4 text-brand-600" />
            Filter Criteria
          </div>

          <div className="flex flex-wrap gap-3">

            {/* DATE RANGE */}

            <select
              value={dateRange}
              onChange={(event) =>
                setDateRange(
                  event.target
                    .value as DateRange
                )
              }
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="Today">
                Today
              </option>

              <option value="Yesterday">
                Yesterday
              </option>

              <option value="This Week">
                This Week
              </option>

              <option value="This Month">
                This Month
              </option>

              <option value="Last Month">
                Last Month
              </option>

              <option value="Last Quarter">
                Last Quarter
              </option>

              <option value="All Time">
                All Time
              </option>

              <option value="Custom Range">
                Custom Range
              </option>
            </select>

            {/* REPORT TYPE */}

            <select
              value={reportType}
              onChange={(event) =>
                setReportType(
                  event.target.value
                )
              }
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="Sales Volume">
                Product Sales Volume
              </option>

              <option value="Payment Modes">
                Settlement Distribution
              </option>

              <option value="Audits">
                Dispatches & Damaged Goods
              </option>
            </select>
          </div>

          {/* CUSTOM DATE RANGE */}

          {dateRange ===
            'Custom Range' && (
            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  From Date
                </label>

                <input
                  type="date"
                  value={
                    customFromDate
                  }
                  onChange={(event) =>
                    setCustomFromDate(
                      event.target
                        .value
                    )
                  }
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  To Date
                </label>

                <input
                  type="date"
                  value={
                    customToDate
                  }
                  min={
                    customFromDate ||
                    undefined
                  }
                  onChange={(event) =>
                    setCustomToDate(
                      event.target
                        .value
                    )
                  }
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY ---------------------------------------------------------- */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori">
          <p className="text-xs text-slate-500 font-semibold">
            Total Sales
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹
            {totalSalesAmount.toLocaleString(
              'en-IN'
            )}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            {filteredSales.length} transactions
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori">
          <p className="text-xs text-slate-500 font-semibold">
            Quantity Sold
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-1">
            {totalSalesQuantity.toLocaleString(
              'en-IN'
            )}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori">
          <p className="text-xs text-slate-500 font-semibold">
            UPI Collections
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹
            {upiTotal.toLocaleString(
              'en-IN'
            )}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-fiori">
          <p className="text-xs text-slate-500 font-semibold">
            Cash Collections
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹
            {cashTotal.toLocaleString(
              'en-IN'
            )}
          </p>
        </div>
      </div>

      {/* CHARTS ----------------------------------------------------------- */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* REVENUE */}

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori lg:col-span-2">

          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-slate-800 text-sm">
              Revenue Progress
            </h3>

            <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-bold uppercase">
              {dateRange}
            </span>
          </div>

          <div className="h-72">

            {monthlyRevenueData.length ===
            0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No revenue records found for the selected date range.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    monthlyRevenueData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value
                    ) =>
                      `₹${Number(
                        value
                      ).toLocaleString(
                        'en-IN'
                      )}`
                    }
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Sales"
                    stroke="#0f766e"
                    strokeWidth={3}
                    activeDot={{
                      r: 7,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Returns"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PAYMENT */}

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">

          <h3 className="font-display font-bold text-slate-800 text-sm pb-2 border-b border-slate-50">
            UPI vs Cash Collections
          </h3>

          {filteredSales.length ===
          0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              No transactions recorded for this period.
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={
                        settlementData
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {settlementData.map(
                        (
                          entry,
                          index
                        ) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              PIE_COLORS[
                                index %
                                  PIE_COLORS.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(
                        value
                      ) =>
                        `₹${Number(
                          value
                        ).toLocaleString(
                          'en-IN'
                        )}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {settlementData.map(
                  (
                    data,
                    index
                  ) => (
                    <div
                      key={
                        data.name
                      }
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              PIE_COLORS[
                                index
                              ],
                          }}
                        />

                        {data.name}
                      </div>

                      <p className="text-sm font-display font-bold text-slate-900 mt-1">
                        ₹
                        {data.value.toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* PRODUCT REVENUE -------------------------------------------------- */}

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori">

        <h3 className="font-display font-bold text-slate-800 text-sm mb-4">
          Product Revenue Distribution
        </h3>

        {productSalesData.length ===
        0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No sales recorded for the selected date range.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  productSalesData
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  formatter={(
                    value
                  ) =>
                    `₹${Number(
                      value
                    ).toLocaleString(
                      'en-IN'
                    )}`
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#0f766e"
                  radius={[
                    8,
                    8,
                    0,
                    0,
                  ]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* REPORT TABLE ----------------------------------------------------- */}

      <div
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-4"
        id="report-data-preview-table"
      >

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">

          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-brand-600" />
              {title}
            </h3>

            <p className="text-slate-400 text-xs mt-0.5">
              Filtered by{' '}
              <span className="font-semibold text-slate-600">
                {dateRange}
              </span>{' '}
              •{' '}
              {tableRows.length}{' '}
              records
            </p>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={
                handleExportExcel
              }
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Excel
            </button>

            <button
              onClick={
                handleSavePDF
              }
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5 text-brand-400" />
              PDF
            </button>

          </div>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse text-xs">

            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">

                {headers.map(
                  (
                    header,
                    index
                  ) => (
                    <th
                      key={index}
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  )
                )}

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600">

              {tableRows.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      headers.length
                    }
                    className="text-center py-8 text-slate-400"
                  >
                    No transactions found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                tableRows.map(
                  (
                    row,
                    rowIndex
                  ) => (
                    <tr
                      key={
                        rowIndex
                      }
                      className="hover:bg-slate-50/50"
                    >
                      {row.map(
                        (
                          cell: any,
                          cellIndex
                        ) => (
                          <td
                            key={
                              cellIndex
                            }
                            className="px-4 py-3 whitespace-nowrap font-medium"
                          >
                            {cell}
                          </td>
                        )
                      )}
                    </tr>
                  )
                )
              )}

            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
};

export default Reports;