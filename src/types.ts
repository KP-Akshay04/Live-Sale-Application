export type Role = 'Super Admin' | 'Depot Person' | 'Sales Officer';

export interface User {
  userId?: number;
  employeeId: string;
  employeeName: string;
  loginId: string;
  username: string; // mapped to loginId for backward compatibility
  role: Role;
  roleCode?: string;
  depotId?: number | null;
  depotName?: string | null;
  phone?: string | null;
  password?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  description: string;
  additionalName: string;
  category: string;
  group: string;
  hsnCode: string;
  barcode: string;
  gstRate: number; // e.g., 18 for 18%
  baseUom: string; // e.g., "Box", "Pcs"
  alternativeQty: number; // Qty per box
  rate: number;
}

export interface Depot {
  siteName: string;
  description: string;
  address: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  gst: string;
  contactNumber: string;
  salesTag: string;
  assignedUser: string; // Username of Depot Person / Depot Manager
  assignedLines?: string[]; // Array of assigned Line Sale Master partyCodes
}

export interface SalesOffice {
  accountId: string;
  accountName: string;
  address: string;
  district: string;
  state: string;
  pin: string;
  gst: string;
  assignedUser: string; // Username of Sales Officer
  zone: string; // e.g. North, South, East, West
  priceListId: string; // Linked Price List ID
  schemeListId: string; // Linked Scheme List ID
}

export interface PriceListItem {
  productId: string;
  rate: number;
  uom: string;
  boxPcs: 'Box' | 'Pcs';
}

export interface PriceList {
  id: string;
  name: string;
  items: PriceListItem[];
}

export interface SchemeListItem {
  productId: string;
  rate: number; // special rate or flat discount rate
  uom: string;
  boxPcs: 'Box' | 'Pcs';
  buyQty: number;
  freeQty: number;
}

export interface SchemeList {
  id: string;
  name: string;
  items: SchemeListItem[];
}

export interface GoodsIssueItem {
  productId: string;
  productName: string;
  additionalName?: string;
  qty: number;
  uom: string;
  rate?: number;
  amount?: number;
}

export interface GoodsIssue {
  id: string; // Issued DOC ID
  depotSite: string;
  partyCode?: string;
  partyName?: string;
  vehicleNum?: string;
  startingReading?: number;
  driverName?: string;
  salesOfficerUsername: string;
  issueDate: string;
  items: GoodsIssueItem[];
  status: 'Draft' | 'Issued' | 'Completed' | 'Inprocess' | 'Not Started';
  notes?: string;
}

export interface GoodsReturnItem {
  productId: string;
  productName: string;
  additionalName?: string;
  issuedQty?: number;
  soldQty?: number;
  diffQty?: number;
  qty: number; // Return qty
  uom: string;
  rate?: number;
  amount?: number;
  confirmed?: boolean;
}

export interface GoodsReturn {
  id: string;
  depotSite: string;
  issueEntryRefId?: string;
  partyCode?: string;
  partyName?: string;
  vehicleNum?: string;
  startingReading?: number;
  endingReading?: number;
  totalRunningRange?: number;
  salesOfficerUsername: string;
  returnDate: string;
  items: GoodsReturnItem[];
  status: 'Pending' | 'Completed' | 'Inprocess' | 'Not Started';
  reason: string;
  notes?: string;
}

export interface SalesOrderItem {
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

export interface SalesEntry {
  id: string;
  shopName: string;
  partyCode?: string;
  contactNumber: string;
  productId: string;
  productName: string;
  qty: number;
  freeQty: number;
  uom?: string;
  rate: number;
  amount: number;
  schemeApplied: string;
  paymentMethod: 'Cash' | 'UPI';
  date: string;
  salesOfficerUsername: string;
  items?: SalesOrderItem[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export interface StockItem {
  productId: string;
  productName: string;
  qty: number; // current available stock in truck or depot
  uom: string;
}

export interface SyncItem {
  id: string;
  type: 'sale' | 'goods_issue' | 'goods_return';
  timestamp: string;
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export interface LineSaleAccount {
  partyCode: string;
  partyName: string;
  state: string;
  nearestDepot: string;
  gstn: string;
  contactNo: string;
  geographicalLocation: string;
  upiQr?: string; // Base64 data URL or image path
  isActive: boolean;
  schemeListId?: string; // Linked scheme list ID for Scheme View
  priceListId?: string; // Linked price list ID for Price View
  assignedUser?: string; // Username of Sales Officer assigned to this Line Sale
}

export const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Andhra Pradesh',
  'Telangana',
  'Kerala',
  'Goa',
  'Gujarat',
  'Rajasthan',
  'Delhi',
  'Uttar Pradesh',
  'West Bengal',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Odisha',
  'Assam',
  'Bihar'
];

