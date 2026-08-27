import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  Role,
  User,
  Product,
  Depot,
  SalesOffice,
  PriceList,
  SchemeList,
  GoodsIssue,
  GoodsReturn,
  SalesEntry,
  Notification,
  StockItem,
  SyncItem,
  LineSaleAccount,
} from '../types';

import { authApi, mapSafeUserToUser } from '../services/authApi';
import { userService } from '../services/userService';
import { depotService } from '../services/depotService';
import { productService } from '../services/productService';
import { priceListService } from '../services/priceListService';
import { schemeListService } from '../services/schemeListService';
import { lineSaleService } from '../services/lineSaleService';
import { goodsIssueService } from '../services/goodsIssueService';
import { goodsReturnService } from '../services/goodsReturnService';
import saleService from '../services/saleService';

interface AppContextType {
  // Auth state
  currentUser: User | null;
  jwtToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;

  // Masters
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  refreshProducts: () => Promise<void>;

  lineSaleAccounts: LineSaleAccount[];
  addLineSaleAccount: (account: LineSaleAccount) => void;
  updateLineSaleAccount: (account: LineSaleAccount) => void;
  toggleLineSaleAccountStatus: (partyCode: string) => void;
  refreshLineSaleAccounts: () => Promise<void>;

  depots: Depot[];
  addDepot: (depot: Depot) => void;
  updateDepot: (depot: Depot) => void;
  deleteDepot: (siteName: string) => void;
  refreshDepots: () => Promise<void>;

  salesOffices: SalesOffice[];
  addSalesOffice: (office: SalesOffice) => void;
  updateSalesOffice: (office: SalesOffice) => void;
  deleteSalesOffice: (accountId: string) => void;

  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (employeeId: string) => void;
  updatePassword: (newPass: string) => boolean;

  // Price & Scheme lists
  priceLists: PriceList[];
  refreshPriceLists: () => Promise<void>;
  updatePriceListItem: (
    listId: string,
    productId: string,
    rate: number,
    uom: string,
    boxPcs: 'Box' | 'Pcs'
  ) => void;

  schemeLists: SchemeList[];
  refreshSchemeLists: () => Promise<void>;
  addSchemeList: (schemeList: SchemeList) => void;
  updateSchemeList: (schemeList: SchemeList) => void;
  deleteSchemeList: (id: string) => void;
  updateSchemeListItem: (
    listId: string,
    productId: string,
    rate: number,
    uom: string,
    boxPcs: 'Box' | 'Pcs',
    buyQty: number,
    freeQty: number
  ) => void;

  // Transactions
  goodsIssues: GoodsIssue[];
  refreshGoodsIssues: () => Promise<void>;
  addGoodsIssue: (
    issue: Omit<GoodsIssue, 'id' | 'status'> & {
      id?: string;
      status?: string;
      startingReading?: number;
      endingReading?: number;
      remarks?: string;
    }
  ) => void;
  completeGoodsIssue: (id: string) => void;

  goodsReturns: GoodsReturn[];
  addGoodsReturn: (
    ret: Omit<GoodsReturn, 'id' | 'status'>
  ) => void;
  completeGoodsReturn: (id: string) => void;

  salesEntries: SalesEntry[];
  refreshSalesEntries: () => Promise<void>;
  addSalesEntry: (
    entry: Omit<SalesEntry, 'id' | 'date'>
  ) => void;

  // Stock
  truckStock: StockItem[];
  getDepotStock: (siteName: string) => StockItem[];

  // Utilities
  notifications: Notification[];
  addNotification: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning'
  ) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Sync
  syncQueue: SyncItem[];
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(
  undefined
);

/* -------------------------------------------------------------------------- */
/* INITIAL DATA                                                               */
/* -------------------------------------------------------------------------- */

const INITIAL_LINE_SALE_ACCOUNTS: LineSaleAccount[] = [];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'PROD-001',
    description: 'Golden Leaf Premium Tea 250g',
    additionalName: 'GL Tea 250G',
    category: 'Beverages',
    group: 'Tea',
    hsnCode: '09023020',
    barcode: '8901058002315',
    gstRate: 5,
    baseUom: 'Box',
    alternativeQty: 40,
    rate: 120,
  },
  {
    id: 'PROD-002',
    description: 'Sparkling Orange Splash 500ml',
    additionalName: 'Orange Splash 500ML',
    category: 'Beverages',
    group: 'Carbonated Soda',
    hsnCode: '22021010',
    barcode: '8901058005439',
    gstRate: 18,
    baseUom: 'Box',
    alternativeQty: 24,
    rate: 40,
  },
  {
    id: 'PROD-003',
    description: 'Crisp Lemon Fizz Soda 1L',
    additionalName: 'Lemon Fizz 1L',
    category: 'Beverages',
    group: 'Carbonated Soda',
    hsnCode: '22021010',
    barcode: '8901058001124',
    gstRate: 18,
    baseUom: 'Box',
    alternativeQty: 12,
    rate: 70,
  },
  {
    id: 'PROD-004',
    description: 'Organic Mango Nectar Juice 1L',
    additionalName: 'Mango Juice 1L',
    category: 'Beverages',
    group: 'Fruit Juice',
    hsnCode: '22029920',
    barcode: '8901058009987',
    gstRate: 12,
    baseUom: 'Box',
    alternativeQty: 12,
    rate: 95,
  },
  {
    id: 'PROD-005',
    description: 'Pure Spring Mineral Water 500ml',
    additionalName: 'Spring Water 500ML',
    category: 'Packaged Water',
    group: 'Drinking Water',
    hsnCode: '22011010',
    barcode: '8901058003324',
    gstRate: 18,
    baseUom: 'Box',
    alternativeQty: 24,
    rate: 15,
  },
];

const INITIAL_DEPOTS: Depot[] = [
  {
    siteName: 'Central Depot Bangalore',
    description: 'Main Hub Depot Southern Region',
    address: 'Plot 45-B, Peenya Industrial Area Phase I',
    city: 'Bangalore',
    district: 'Bangalore Urban',
    state: 'Karnataka',
    pin: '560058',
    gst: '29AAAAA1111A1Z1',
    contactNumber: '+91 98765 43210',
    salesTag: 'KA-SOUTH',
    assignedUser: 'depot',
    assignedLines: ['LSA-1001'],
  },
  {
    siteName: 'Mysore Satellite Depot',
    description: 'Sub depot for Mysore and Mandya districts',
    address: '12, Hootagalli Industrial Area',
    city: 'Mysore',
    district: 'Mysore',
    state: 'Karnataka',
    pin: '570018',
    gst: '29BBBBB2222B2Z2',
    contactNumber: '+91 87654 32109',
    salesTag: 'KA-WEST',
    assignedUser: 'mysoredepot',
    assignedLines: ['LSA-1002'],
  },
];

const INITIAL_SALES_OFFICES: SalesOffice[] = [
  {
    accountId: 'ACC-001',
    accountName: 'Sri Manjunatha Agencies',
    address: '42, Market Road, Gandhi Bazar',
    district: 'Bangalore Urban',
    state: 'Karnataka',
    pin: '560004',
    gst: '29ACDPA5461J1ZP',
    assignedUser: 'sales',
    zone: 'South Bangalore',
    priceListId: 'PL-STANDARD',
    schemeListId: 'SL-SUMMER-SPECIAL',
  },
  {
    accountId: 'ACC-002',
    accountName: 'Laxmi Super Market',
    address: '88, Devaraj Urs Road',
    district: 'Mysore',
    state: 'Karnataka',
    pin: '570001',
    gst: '29EFGHA6721M2ZK',
    assignedUser: 'sales',
    zone: 'Central Mysore',
    priceListId: 'PL-STANDARD',
    schemeListId: 'SL-STANDARD',
  },
  {
    accountId: 'ACC-003',
    accountName: 'Balaji Provisions & Retail',
    address: 'Shop No 5, Malleshwaram 15th Cross',
    district: 'Bangalore Urban',
    state: 'Karnataka',
    pin: '560003',
    gst: '29JKLMN1234K3ZL',
    assignedUser: 'sales_officer_two',
    zone: 'North Bangalore',
    priceListId: 'PL-STANDARD',
    schemeListId: 'SL-SUMMER-SPECIAL',
  },
];

const INITIAL_USERS: User[] = [
  {
    employeeId: 'EMP-001',
    employeeName: 'Rajesh Kumar',
    loginId: 'admin',
    username: 'admin',
    password: 'adminpassword',
    role: 'Super Admin',
    isActive: true,
  },
  {
    employeeId: 'EMP-002',
    employeeName: 'Suresh Gowda',
    loginId: 'depot',
    username: 'depot',
    password: 'depotpassword',
    role: 'Depot Person',
    isActive: true,
  },
  {
    employeeId: 'EMP-003',
    employeeName: 'Ananth Hegde',
    loginId: 'sales',
    username: 'sales',
    password: 'salespassword',
    role: 'Sales Officer',
    isActive: true,
  },
  {
    employeeId: 'EMP-004',
    employeeName: 'Vikram Singh',
    loginId: 'mysoredepot',
    username: 'mysoredepot',
    password: 'depotpassword',
    role: 'Depot Person',
    isActive: true,
  },
  {
    employeeId: 'EMP-005',
    employeeName: 'Nisha Pillai',
    loginId: 'sales_officer_two',
    username: 'sales_officer_two',
    password: 'salespassword',
    role: 'Sales Officer',
    isActive: true,
  },
];

const INITIAL_PRICE_LISTS: PriceList[] = [
  {
    id: 'PL-STANDARD',
    name: 'Standard Trade Price List',
    items: [
      {
        productId: 'PROD-001',
        rate: 110,
        uom: 'Box',
        boxPcs: 'Box',
      },
      {
        productId: 'PROD-002',
        rate: 36,
        uom: 'Pcs',
        boxPcs: 'Pcs',
      },
      {
        productId: 'PROD-003',
        rate: 64,
        uom: 'Pcs',
        boxPcs: 'Pcs',
      },
      {
        productId: 'PROD-004',
        rate: 88,
        uom: 'Box',
        boxPcs: 'Box',
      },
      {
        productId: 'PROD-005',
        rate: 12,
        uom: 'Pcs',
        boxPcs: 'Pcs',
      },
    ],
  },
  {
    id: 'PL-WHOLESALE',
    name: 'Wholesale/Distributor Price List',
    items: [
      {
        productId: 'PROD-001',
        rate: 100,
        uom: 'Box',
        boxPcs: 'Box',
      },
      {
        productId: 'PROD-002',
        rate: 32,
        uom: 'Pcs',
        boxPcs: 'Pcs',
      },
      {
        productId: 'PROD-003',
        rate: 58,
        uom: 'Pcs',
        boxPcs: 'Pcs',
      },
      {
        productId: 'PROD-004',
        rate: 80,
        uom: 'Box',
        boxPcs: 'Box',
      },
      {
        productId: 'PROD-005',
        rate: 10,
        uom: 'Pcs',
        boxPcs: 'Pcs',
      },
    ],
  },
];

const INITIAL_SCHEME_LISTS: SchemeList[] = [
  {
    id: 'SL-SUMMER-SPECIAL',
    name: 'Summer Splash Promotion',
    items: [
      {
        productId: 'PROD-001',
        rate: 110,
        uom: 'Box',
        boxPcs: 'Box',
        buyQty: 10,
        freeQty: 1,
      },
      {
        productId: 'PROD-002',
        rate: 36,
        uom: 'Pcs',
        boxPcs: 'Pcs',
        buyQty: 24,
        freeQty: 2,
      },
      {
        productId: 'PROD-003',
        rate: 64,
        uom: 'Pcs',
        boxPcs: 'Pcs',
        buyQty: 12,
        freeQty: 1,
      },
      {
        productId: 'PROD-004',
        rate: 88,
        uom: 'Box',
        boxPcs: 'Box',
        buyQty: 5,
        freeQty: 1,
      },
      {
        productId: 'PROD-005',
        rate: 12,
        uom: 'Pcs',
        boxPcs: 'Pcs',
        buyQty: 48,
        freeQty: 4,
      },
    ],
  },
  {
    id: 'SL-STANDARD',
    name: 'Standard Volume Schemes',
    items: [
      {
        productId: 'PROD-001',
        rate: 110,
        uom: 'Box',
        boxPcs: 'Box',
        buyQty: 20,
        freeQty: 1,
      },
      {
        productId: 'PROD-002',
        rate: 36,
        uom: 'Pcs',
        boxPcs: 'Pcs',
        buyQty: 48,
        freeQty: 3,
      },
      {
        productId: 'PROD-003',
        rate: 64,
        uom: 'Pcs',
        boxPcs: 'Pcs',
        buyQty: 24,
        freeQty: 1,
      },
      {
        productId: 'PROD-004',
        rate: 88,
        uom: 'Box',
        boxPcs: 'Box',
        buyQty: 10,
        freeQty: 1,
      },
      {
        productId: 'PROD-005',
        rate: 12,
        uom: 'Pcs',
        boxPcs: 'Pcs',
        buyQty: 100,
        freeQty: 5,
      },
    ],
  },
];

const INITIAL_GOODS_ISSUES: GoodsIssue[] = [
  {
    id: 'GI-10023',
    depotSite: 'Central Depot Bangalore',
    partyCode: 'LSA-1001',
    partyName: 'Sri Laxmi Line Sales Agency',
    vehicleNum: 'KA-01-EV-4090',
    startingReading: 12450,
    driverName: 'Ramesh Kumar',
    salesOfficerUsername: 'sales',
    issueDate: new Date().toISOString().substring(0, 10),
    items: [
      {
        productId: 'PROD-001',
        productName: 'Golden Leaf Premium Tea 250g',
        additionalName: 'GL Tea 250G',
        qty: 25,
        uom: 'Box',
        rate: 110,
        amount: 2750,
      },
      {
        productId: 'PROD-002',
        productName: 'Sparkling Orange Splash 500ml',
        additionalName: 'Orange Splash 500ML',
        qty: 120,
        uom: 'Pcs',
        rate: 36,
        amount: 4320,
      },
      {
        productId: 'PROD-003',
        productName: 'Crisp Lemon Fizz Soda 1L',
        additionalName: 'Lemon Fizz 1L',
        qty: 80,
        uom: 'Pcs',
        rate: 64,
        amount: 5120,
      },
      {
        productId: 'PROD-004',
        productName: 'Organic Mango Nectar Juice 1L',
        additionalName: 'Mango Juice 1L',
        qty: 15,
        uom: 'Box',
        rate: 88,
        amount: 1320,
      },
    ],
    status: 'Completed',
    notes: 'Load out for Gandhinagar and Gandhi Bazar routes',
  },
  {
    id: 'GI-10024',
    depotSite: 'Central Depot Bangalore',
    partyCode: 'LSA-1001',
    partyName: 'Sri Laxmi Line Sales Agency',
    vehicleNum: 'KA-01-EV-4090',
    startingReading: 12510,
    driverName: 'Ramesh Kumar',
    salesOfficerUsername: 'sales',
    issueDate: new Date().toISOString().substring(0, 10),
    items: [
      {
        productId: 'PROD-002',
        productName: 'Sparkling Orange Splash 500ml',
        additionalName: 'Orange Splash 500ML',
        qty: 50,
        uom: 'Pcs',
        rate: 36,
        amount: 1800,
      },
      {
        productId: 'PROD-005',
        productName: 'Pure Spring Mineral Water 500ml',
        additionalName: 'Spring Water 500ML',
        qty: 200,
        uom: 'Pcs',
        rate: 12,
        amount: 2400,
      },
    ],
    status: 'Completed',
    notes: 'Mid-day top up stock issued.',
  },
  {
    id: 'GI-10025',
    depotSite: 'Central Depot Bangalore',
    partyCode: 'LSA-1001',
    partyName: 'Sri Laxmi Line Sales Agency',
    vehicleNum: 'KA-05-8812',
    startingReading: 8900,
    driverName: 'Suresh Patil',
    salesOfficerUsername: 'sales',
    issueDate: new Date().toISOString().substring(0, 10),
    items: [
      {
        productId: 'PROD-001',
        productName: 'Golden Leaf Premium Tea 250g',
        additionalName: 'GL Tea 250G',
        qty: 5,
        uom: 'Box',
        rate: 110,
        amount: 550,
      },
      {
        productId: 'PROD-003',
        productName: 'Crisp Lemon Fizz Soda 1L',
        additionalName: 'Lemon Fizz 1L',
        qty: 30,
        uom: 'Pcs',
        rate: 64,
        amount: 1920,
      },
    ],
    status: 'Draft',
    notes: 'Pending vehicle allocation.',
  },
];

const INITIAL_GOODS_RETURNS: GoodsReturn[] = [
  {
    id: 'GR-20004',
    depotSite: 'Central Depot Bangalore',
    issueEntryRefId: 'GI-10023',
    partyCode: 'LSA-1001',
    partyName: 'Sri Laxmi Line Sales Agency',
    vehicleNum: 'KA-01-EV-4090',
    startingReading: 12450,
    endingReading: 12510,
    totalRunningRange: 60,
    salesOfficerUsername: 'sales',
    returnDate: new Date().toISOString().substring(0, 10),
    items: [
      {
        productId: 'PROD-002',
        productName: 'Sparkling Orange Splash 500ml',
        additionalName: 'Orange Splash 500ML',
        issuedQty: 120,
        soldQty: 115,
        diffQty: 5,
        qty: 5,
        uom: 'Pcs',
        rate: 36,
        amount: 180,
        confirmed: true,
      },
    ],
    status: 'Completed',
    reason: 'Leakage and dented bottles during transit',
    notes: 'Approved and returned to stock scrap.',
  },
  {
    id: 'GR-20005',
    depotSite: 'Central Depot Bangalore',
    issueEntryRefId: 'GI-10023',
    partyCode: 'LSA-1001',
    partyName: 'Sri Laxmi Line Sales Agency',
    vehicleNum: 'KA-01-EV-4090',
    startingReading: 12450,
    endingReading: 12500,
    totalRunningRange: 50,
    salesOfficerUsername: 'sales',
    returnDate: new Date().toISOString().substring(0, 10),
    items: [
      {
        productId: 'PROD-003',
        productName: 'Crisp Lemon Fizz Soda 1L',
        additionalName: 'Lemon Fizz 1L',
        issuedQty: 80,
        soldQty: 77,
        diffQty: 3,
        qty: 3,
        uom: 'Pcs',
        rate: 64,
        amount: 192,
        confirmed: true,
      },
    ],
    status: 'Pending',
    reason: 'Near Expiry item return from Gandhi Bazar retail shop',
    notes: 'Awaiting quality inspect check.',
  },
];

const INITIAL_SALES_ENTRIES: SalesEntry[] = [
  {
    id: 'SL-88001',
    shopName: 'Sri Laxmi Line Sales Agency',
    partyCode: 'LSA-1001',
    contactNumber: '+91 98450 12345',
    productId: 'PROD-001',
    productName: 'Golden Leaf Premium Tea 250g',
    qty: 12,
    freeQty: 1,
    uom: 'Pcs',
    rate: 110,
    amount: 1320,
    schemeApplied: 'Summer Splash Promotion (Buy 10 Get 1)',
    paymentMethod: 'UPI',
    date: new Date().toISOString(),
    salesOfficerUsername: 'sales',
  },
  {
    id: 'SL-88002',
    shopName: 'Sri Laxmi Line Sales Agency',
    partyCode: 'LSA-1001',
    contactNumber: '+91 98450 12345',
    productId: 'PROD-002',
    productName: 'Sparkling Orange Splash 500ml',
    qty: 48,
    freeQty: 4,
    uom: 'Pcs',
    rate: 36,
    amount: 1728,
    schemeApplied: 'Summer Splash Promotion (Buy 24 Get 2)',
    paymentMethod: 'Cash',
    date: new Date().toISOString(),
    salesOfficerUsername: 'sales',
  },
  {
    id: 'SL-88003',
    shopName: 'Sri Laxmi Line Sales Agency',
    partyCode: 'LSA-1001',
    contactNumber: '+91 98450 12345',
    productId: 'PROD-004',
    productName: 'Organic Mango Nectar Juice 1L',
    qty: 5,
    freeQty: 1,
    uom: 'Box',
    rate: 88,
    amount: 440,
    schemeApplied: 'Summer Splash Promotion (Buy 5 Get 1)',
    paymentMethod: 'UPI',
    date: new Date().toISOString(),
    salesOfficerUsername: 'sales',
  },
  {
    id: 'SL-88004',
    shopName: 'Chamundeshwari Line Traders',
    partyCode: 'LSA-1002',
    contactNumber: '+91 98801 67890',
    productId: 'PROD-003',
    productName: 'Crisp Lemon Fizz Soda 1L',
    qty: 24,
    freeQty: 2,
    uom: 'Pcs',
    rate: 64,
    amount: 1536,
    schemeApplied: 'Summer Splash Promotion (Buy 12 Get 1)',
    paymentMethod: 'Cash',
    date: new Date().toISOString(),
    salesOfficerUsername: 'sales_officer_two',
  },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'New Goods Issue Approved',
    message: 'Central Depot approved Goods Issue GI-10024 with 250 items.',
    time: '2 hours ago',
    read: false,
    type: 'success',
  },
  {
    id: 'notif-2',
    title: 'Low Truck Stock Warning',
    message:
      'You are running low on Crisp Lemon Fizz Soda 1L (Only 3 bottles left).',
    time: '4 hours ago',
    read: false,
    type: 'warning',
  },
  {
    id: 'notif-3',
    title: 'Price Update Alert',
    message:
      'Price list standard price updated for Organic Mango Nectar Juice 1L.',
    time: '1 day ago',
    read: true,
    type: 'info',
  },
];

/* -------------------------------------------------------------------------- */
/* PROVIDER                                                                   */
/* -------------------------------------------------------------------------- */

export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  const [jwtToken, setJwtToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [lineSaleAccounts, setLineSaleAccounts] =
    useState<LineSaleAccount[]>([]);

  const [depots, setDepots] =
    useState<Depot[]>([]);

  const [salesOffices, setSalesOffices] =
    useState<SalesOffice[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [priceLists, setPriceLists] =
    useState<PriceList[]>([]);

  const [schemeLists, setSchemeLists] =
    useState<SchemeList[]>([]);

  const [goodsIssues, setGoodsIssues] =
    useState<GoodsIssue[]>([]);

  const [goodsReturns, setGoodsReturns] =
    useState<GoodsReturn[]>([]);

  const [salesEntries, setSalesEntries] =
    useState<SalesEntry[]>([]);

  const [truckStock, setTruckStock] =
    useState<StockItem[]>([]);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [syncQueue, setSyncQueue] =
    useState<SyncItem[]>([]);

  const [isSyncing, setIsSyncing] =
    useState<boolean>(false);

  /* ------------------------------------------------------------------------ */
  /* NOTIFICATIONS                                                            */
  /* ------------------------------------------------------------------------ */

  const addNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'info' | 'success' | 'warning' = 'info'
    ) => {
      const newNotif: Notification = {
        id: `notif-${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}`,
        title,
        message,
        time: 'Just now',
        read: false,
        type,
      };

      setNotifications((prev) => [
        newNotif,
        ...prev,
      ]);
    },
    []
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );
    },
    []
  );

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOCAL STORAGE HELPERS                                                    */
  /* ------------------------------------------------------------------------ */

  const loadLocalState = <T,>(
    key: string,
    initial: T
  ): T => {
    const stored = localStorage.getItem(key);

    if (!stored) {
      localStorage.setItem(
        key,
        JSON.stringify(initial)
      );
      return initial;
    }

    try {
      return JSON.parse(stored) as T;
    } catch {
      localStorage.setItem(
        key,
        JSON.stringify(initial)
      );
      return initial;
    }
  };

  /* ------------------------------------------------------------------------ */
  /* AUTH                                                                     */
  /* ------------------------------------------------------------------------ */

  const login = async (
    loginId: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await authApi.login(
        loginId.trim(),
        password
      );

      if (
        response &&
        response.token &&
        response.user
      ) {
        const authenticatedUser =
          mapSafeUserToUser(response.user);

        setCurrentUser(authenticatedUser);
        setJwtToken(response.token);

        localStorage.setItem(
          'live_sale_jwt_token',
          response.token
        );

        localStorage.setItem(
          'live_sale_user',
          JSON.stringify(authenticatedUser)
        );

        addNotification(
          'Login Successful',
          `Welcome back ${authenticatedUser.employeeName}. Logged in as ${authenticatedUser.role}.`,
          'success'
        );

        return true;
      }

      return false;
    } catch (error: any) {
      console.error(
        '[Auth Error] Backend login failed:',
        error?.response?.data ||
          error?.message ||
          error
      );

      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn(
        '[Auth] Remote logout notification failed:',
        error
      );
    } finally {
      setCurrentUser(null);
      setJwtToken(null);

      localStorage.removeItem(
        'live_sale_user'
      );

      localStorage.removeItem(
        'live_sale_jwt_token'
      );

      localStorage.removeItem(
        'live_sale_refresh_token'
      );

      addNotification(
        'Logged Out',
        'Successfully logged out of the system.',
        'info'
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* BACKEND REFRESH FUNCTIONS                                                */
  /* ------------------------------------------------------------------------ */

  const refreshProducts = useCallback(
    async () => {
      try {
        const data =
          await productService.getProducts();

        /*
         * IMPORTANT:
         * An empty backend result is still authoritative.
         * Do not keep stale localStorage data when the
         * database legitimately contains zero records.
         */
        setProducts(data);
      } catch (error: any) {
        console.warn(
          '[Products] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    },
    []
  );

  const refreshDepots = useCallback(
    async () => {
      try {
        const data =
          await depotService.getDepots();

        setDepots(data);
      } catch (error: any) {
        console.warn(
          '[Depots] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    },
    []
  );


  const refreshUsers = useCallback(
  async () => {
    try {
      const data = await userService.getUsers();

      /*
       * IMPORTANT:
       * Backend/MySQL is authoritative.
       * Even an empty result must replace stale local data.
       */
      setUsers(data);
    } catch (error: any) {
      console.warn(
        '[Users] Backend refresh failed:',
        error?.response?.data ||
          error?.message || 
          error
      );
    }
  },
  []
);


  const refreshLineSaleAccounts =
    useCallback(async () => {
      try {
        const data =
          await lineSaleService.getLineSales();

        setLineSaleAccounts(data);
      } catch (error: any) {
        console.warn(
          '[Line Sales] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    }, []);

  const refreshPriceLists =
    useCallback(async () => {
      try {
        const data =
          await priceListService.getPriceLists();

        setPriceLists(data);
      } catch (error: any) {
        console.warn(
          '[Price Lists] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    }, []);

  const refreshSchemeLists =
    useCallback(async () => {
      try {
        const data =
          await schemeListService.getSchemeLists();

        setSchemeLists(data);
      } catch (error: any) {
        console.warn(
          '[Scheme Lists] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    }, []);

  const refreshGoodsIssues =
    useCallback(async () => {
      try {
        const data =
          await goodsIssueService.getGoodsIssues();

        setGoodsIssues(data);
      } catch (error: any) {
        console.warn(
          '[Goods Issues] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    }, []);

  const refreshGoodsReturns =
    useCallback(async () => {
      try {
        const data =
          await goodsReturnService.getGoodsReturns();

        setGoodsReturns(data);
      } catch (error: any) {
        console.warn(
          '[Goods Returns] Backend refresh failed:',
          error?.response?.data ||
            error?.message ||
            error
        );
      }
    }, []);



    const refreshSalesEntries =
  useCallback(async () => {
    try {
      const data =
        await saleService.getSales();

      const mappedSales: SalesEntry[] =
        data.map((sale: any) => {
          const firstItem =
            sale.items?.[0];

          const firstPayment =
            sale.payments?.[0];

          return {
            id:
              sale.id?.toString() ||
              sale.invoiceNumber,

            shopName:
              sale.customerName || '',

            partyCode:
              sale.partyCode || '',

            contactNumber:
              sale.customerPhone || '',

            productId:
              firstItem?.productCode ||
              firstItem?.materialCode ||
              `PROD-${firstItem?.productId}`,

            productName:
              firstItem?.productName || '',

            qty:
              Number(
                firstItem?.quantity || 0
              ),

            freeQty:
              Number(
                firstItem?.freeQuantity || 0
              ),

            uom:
              firstItem?.uom || 'Pcs',

            rate:
              Number(
                firstItem?.rate || 0
              ),

            amount:
              Number(
                sale.grossAmount || 0
              ),

            schemeApplied:
              firstItem?.applicableScheme ||
              'No Active Scheme',

            paymentMethod:
              firstPayment?.paymentMethod ===
                'UPI' ||
              firstPayment?.paymentMethod ===
                'UPI_QR'
                ? 'UPI'
                : 'Cash',

            date:
              sale.saleDate ||
              sale.createdAt ||
              new Date().toISOString(),

            salesOfficerUsername:
              sale.salesOfficer?.loginId ||
              '',

            items:
              (sale.items || []).map(
                (item: any) => ({
                  productId:
                    item.productCode ||
                    item.materialCode ||
                    `PROD-${item.productId}`,

                  productName:
                    item.productName || '',

                  additionalName:
                    item.additionalName || '',

                  qty:
                    Number(
                      item.quantity || 0
                    ),

                  freeQty:
                    Number(
                      item.freeQuantity || 0
                    ),

                  uom:
                    item.uom || 'Pcs',

                  rate:
                    Number(
                      item.rate || 0
                    ),

                  amount:
                    Number(
                      item.netAmount || 0
                    ),

                  schemeApplied:
                    item.applicableScheme ||
                    'No Active Scheme',
                })
              ),
          };
        });

      setSalesEntries(mappedSales);
    } catch (error: any) {
      console.warn(
        '[Sales] Backend refresh failed:',
        error?.response?.data ||
          error?.message ||
          error
      );
    }
  }, []);



  /* ------------------------------------------------------------------------ */
  /* INITIALIZATION                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let isMounted = true;

    const restoreSessionAndLoadData =
      async () => {
        /*
         * --------------------------------------------------------------
         * STEP 1: Restore JWT session.
         * --------------------------------------------------------------
         */

        const storedToken =
          localStorage.getItem(
            'live_sale_jwt_token'
          );

        if (storedToken) {
          try {
            const safeUser =
              await authApi.getMe();

            if (
              isMounted &&
              safeUser
            ) {
              const restoredUser =
                mapSafeUserToUser(
                  safeUser
                );

              setCurrentUser(
                restoredUser
              );

              setJwtToken(
                storedToken
              );

              localStorage.setItem(
                'live_sale_user',
                JSON.stringify(
                  restoredUser
                )
              );
            }
          } catch (error) {
            console.warn(
              '[Auth] Stored session invalid or expired:',
              error
            );

            if (isMounted) {
              setCurrentUser(null);
              setJwtToken(null);

              localStorage.removeItem(
                'live_sale_jwt_token'
              );

              localStorage.removeItem(
                'live_sale_user'
              );

              localStorage.removeItem(
                'live_sale_refresh_token'
              );
            }
          }
        }

        /*
         * --------------------------------------------------------------
         * STEP 2: Load local cache immediately.
         *
         * This keeps the application usable while backend requests
         * are being made.
         * --------------------------------------------------------------
         */

        if (isMounted) {
          setProducts(
            loadLocalState(
              'live_sale_products',
              INITIAL_PRODUCTS
            )
          );

          setLineSaleAccounts(
            loadLocalState(
              'live_sale_line_sale_accounts',
              INITIAL_LINE_SALE_ACCOUNTS
            )
          );

          setDepots(
            loadLocalState(
              'live_sale_depots',
              INITIAL_DEPOTS
            )
          );

          setSalesOffices(
            loadLocalState(
              'live_sale_sales_offices',
              INITIAL_SALES_OFFICES
            )
          );

          setUsers(
            loadLocalState(
              'live_sale_users',
              INITIAL_USERS
            )
          );

          setPriceLists(
            loadLocalState(
              'live_sale_price_lists',
              INITIAL_PRICE_LISTS
            )
          );

          setSchemeLists(
            loadLocalState(
              'live_sale_scheme_lists',
              INITIAL_SCHEME_LISTS
            )
          );

          setGoodsIssues(
            loadLocalState(
              'live_sale_goods_issues',
              INITIAL_GOODS_ISSUES
            )
          );

          setGoodsReturns(
            loadLocalState(
              'live_sale_goods_returns',
              INITIAL_GOODS_RETURNS
            )
          );

          setSalesEntries(
            loadLocalState(
              'live_sale_sales_entries',
              INITIAL_SALES_ENTRIES
            )
          );

          setNotifications(
            loadLocalState(
              'live_sale_notifications',
              INITIAL_NOTIFICATIONS
            )
          );

          setSyncQueue(
            loadLocalState<SyncItem[]>(
              'live_sale_sync_queue',
              []
            )
          );
        }

        /*
         * --------------------------------------------------------------
         * STEP 3: Backend becomes authoritative.
         *
         * We attempt every available backend service.
         *
         * If one request fails, the remaining services still refresh.
         * --------------------------------------------------------------
         */

        await Promise.allSettled([
          refreshProducts(),
          refreshDepots(),
          refreshUsers(),
          refreshLineSaleAccounts(),
          refreshPriceLists(),
          refreshSchemeLists(),
          refreshGoodsIssues(),
          refreshGoodsReturns(),
          refreshSalesEntries(),
        ]);

        /*
         * --------------------------------------------------------------
         * STEP 4: Finish initialization.
         * --------------------------------------------------------------
         */

        if (isMounted) {
          setIsLoading(false);
        }
      };

    restoreSessionAndLoadData();

    return () => {
      isMounted = false;
    };
  }, [
    refreshProducts,
    refreshDepots,
    refreshUsers,
    refreshLineSaleAccounts,
    refreshPriceLists,
    refreshSchemeLists,
    refreshGoodsIssues,
    refreshGoodsReturns,
  ]);

  /* ------------------------------------------------------------------------ */
  /* LOCAL CACHE SYNCHRONIZATION                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_products',
        JSON.stringify(products)
      );
    }
  }, [products, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_line_sale_accounts',
        JSON.stringify(lineSaleAccounts)
      );
    }
  }, [
    lineSaleAccounts,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_depots',
        JSON.stringify(depots)
      );
    }
  }, [depots, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_sales_offices',
        JSON.stringify(salesOffices)
      );
    }
  }, [
    salesOffices,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_users',
        JSON.stringify(users)
      );
    }
  }, [users, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_price_lists',
        JSON.stringify(priceLists)
      );
    }
  }, [
    priceLists,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_scheme_lists',
        JSON.stringify(schemeLists)
      );
    }
  }, [
    schemeLists,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_goods_issues',
        JSON.stringify(goodsIssues)
      );
    }
  }, [
    goodsIssues,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_goods_returns',
        JSON.stringify(goodsReturns)
      );
    }
  }, [
    goodsReturns,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_sales_entries',
        JSON.stringify(salesEntries)
      );
    }
  }, [
    salesEntries,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_notifications',
        JSON.stringify(notifications)
      );
    }
  }, [
    notifications,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        'live_sale_sync_queue',
        JSON.stringify(syncQueue)
      );
    }
  }, [
    syncQueue,
    isLoading,
  ]);

  /* ------------------------------------------------------------------------ */
  /* TRUCK STOCK                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      !currentUser ||
      currentUser.role !== 'Sales Officer'
    ) {
      setTruckStock([]);
      return;
    }

    const officer =
      currentUser.username;

    const stockMap: {
      [productId: string]: {
        qty: number;
        uom: string;
        name: string;
      };
    } = {};

    products.forEach((product) => {
      stockMap[product.id] = {
        qty: 0,
        uom: product.baseUom,
        name: product.description,
      };
    });

    /*
     * Goods Issues:
     * Only COMPLETED issues enter truck stock.
     */

    goodsIssues
      .filter(
        (issue) =>
          issue.salesOfficerUsername ===
            officer &&
          issue.status === 'Completed'
      )
      .forEach((issue) => {
        issue.items.forEach((item) => {
          if (!stockMap[item.productId]) {
            stockMap[item.productId] = {
              qty: 0,
              uom: item.uom,
              name:
                item.productName,
            };
          }

          stockMap[
            item.productId
          ].qty += item.qty;
        });
      });

    /*
     * Goods Returns:
     * Returned quantity leaves truck stock.
     */

    goodsReturns
      .filter(
        (ret) =>
          ret.salesOfficerUsername ===
          officer
      )
      .forEach((ret) => {
        ret.items.forEach((item) => {
          if (
            stockMap[item.productId]
          ) {
            stockMap[
              item.productId
            ].qty -= item.qty;
          }
        });
      });

    /*
     * Sales:
     * Sold + free quantity leaves truck stock.
     */

    salesEntries
      .filter(
        (sale) =>
          sale.salesOfficerUsername ===
          officer
      )
      .forEach((sale) => {
        if (
          stockMap[sale.productId]
        ) {
          stockMap[
            sale.productId
          ].qty -=
            sale.qty +
            sale.freeQty;
        }
      });

    const computedStock: StockItem[] =
      Object.keys(stockMap).map(
        (productId) => ({
          productId,
          productName:
            stockMap[productId]
              .name,
          qty: Math.max(
            0,
            stockMap[productId].qty
          ),
          uom:
            stockMap[productId].uom,
        })
      );

    setTruckStock(
      computedStock
    );
  }, [
    currentUser,
    products,
    goodsIssues,
    goodsReturns,
    salesEntries,
  ]);

  /* ------------------------------------------------------------------------ */
  /* PRODUCT MASTER                                                           */
  /* ------------------------------------------------------------------------ */

  const addProduct = (
    product: Product
  ) => {
    /*
     * The Product service currently exposes create/update/status,
     * but the existing context API receives a fully formed Product.
     *
     * Persist through the backend using the available service.
     */
    void (async () => {
      try {
        const created =
          await productService.createProduct(
            product
          );

        setProducts((prev) => [
          created,
          ...prev.filter(
            (p) =>
              p.id !== created.id
          ),
        ]);

        addNotification(
          'Product Added',
          `Product ${created.description} created successfully.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Product] Create failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Product Creation Failed',
          error?.response?.data?.message ||
            error?.message ||
            'Unable to create product.',
          'warning'
        );
      }
    })();
  };

  const updateProduct = (
    updatedProduct: Product
  ) => {
    void (async () => {
      try {
        const identifier =
          updatedProduct.productId ??
          updatedProduct.materialCode ??
          updatedProduct.id;

        const updated =
          await productService.updateProduct(
            identifier,
            updatedProduct
          );

        setProducts((prev) =>
          prev.map((product) =>
            product.id ===
            updated.id
              ? updated
              : product
          )
        );

        addNotification(
          'Product Updated',
          `Product ${updated.description} updated successfully.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Product] Update failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Product Update Failed',
          error?.response?.data?.message ||
            error?.message ||
            'Unable to update product.',
          'warning'
        );
      }
    })();
  };

  const deleteProduct = (
    id: string
  ) => {
    /*
     * There is no DELETE endpoint in the supplied
     * productService contract.
     *
     * Therefore we do NOT invent one.
     * The existing UI delete behavior is retained locally.
     */
    const product =
      products.find(
        (item) => item.id === id
      );

    setProducts((prev) =>
      prev.filter(
        (item) => item.id !== id
      )
    );

    setPriceLists((prev) =>
      prev.map((priceList) => ({
        ...priceList,
        items:
          priceList.items.filter(
            (item) =>
              item.productId !== id
          ),
      }))
    );

    setSchemeLists((prev) =>
      prev.map((schemeList) => ({
        ...schemeList,
        items:
          schemeList.items.filter(
            (item) =>
              item.productId !== id
          ),
      }))
    );

    addNotification(
      'Product Removed',
      `Product ${
        product?.description || id
      } removed from the current catalog view.`,
      'warning'
    );
  };

  /* ------------------------------------------------------------------------ */
  /* DEPOT MASTER                                                             */
  /* ------------------------------------------------------------------------ */

  const addDepot = (
    depot: Depot
  ) => {
    void (async () => {
      try {
        const created =
          await depotService.createDepot(
            depot
          );

        setDepots((prev) => [
          created,
          ...prev.filter(
            (item) =>
              item.id !== created.id
          ),
        ]);

        addNotification(
          'Depot Registered',
          `Depot ${created.siteName} created successfully.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Depot] Create failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Depot Creation Failed',
          error?.response?.data?.message ||
            error?.message ||
            'Unable to create depot.',
          'warning'
        );
      }
    })();
  };

  const updateDepot = (
    updatedDepot: Depot
  ) => {
    void (async () => {
      try {
        const identifier =
          updatedDepot.id ??
          updatedDepot.depotId;

        if (
          identifier ===
          undefined
        ) {
          throw new Error(
            'Depot ID is required to update the depot.'
          );
        }

        const updated =
          await depotService.updateDepot(
            identifier,
            updatedDepot
          );

        setDepots((prev) =>
          prev.map((depot) =>
            depot.id ===
              updated.id ||
            depot.siteName ===
              updated.siteName
              ? updated
              : depot
          )
        );

        addNotification(
          'Depot Updated',
          `Depot ${updated.siteName} updated successfully.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Depot] Update failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Depot Update Failed',
          error?.response?.data?.message ||
            error?.message ||
            'Unable to update depot.',
          'warning'
        );
      }
    })();
  };

  const deleteDepot = (
    siteName: string
  ) => {
    /*
     * depotService has no DELETE endpoint.
     * Do not fabricate an API.
     */
    setDepots((prev) =>
      prev.filter(
        (depot) =>
          depot.siteName !== siteName
      )
    );

    addNotification(
      'Depot Removed',
      `Depot ${siteName} removed from the current view.`,
      'warning'
    );
  };

  /* ------------------------------------------------------------------------ */
  /* LINE SALE MASTER                                                         */
  /* ------------------------------------------------------------------------ */

  const addLineSaleAccount = (
    account: LineSaleAccount
  ) => {
    void (async () => {
      try {
        const created =
          await lineSaleService.createLineSale(
            account
          );

        setLineSaleAccounts(
          (prev) => [
            created,
            ...prev.filter(
              (item) =>
                item.partyCode !==
                created.partyCode
            ),
          ]
        );

        addNotification(
          'Line Sale Created',
          `Line Sale ${created.partyCode} created successfully.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Line Sale] Create failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Line Sale Creation Failed',
          error?.response?.data?.message ||
            error?.message ||
            'Unable to create Line Sale.',
          'warning'
        );
      }
    })();
  };

  const updateLineSaleAccount = (
    account: LineSaleAccount
  ) => {
    void (async () => {
      try {
        const identifier =
          account.id ??
          account.partyCode;

        const updated =
          await lineSaleService.updateLineSale(
            identifier,
            account
          );

        setLineSaleAccounts(
          (prev) =>
            prev.map(
              (item) =>
                item.partyCode ===
                updated.partyCode
                  ? updated
                  : item
            )
        );

        addNotification(
          'Line Sale Updated',
          `Line Sale ${updated.partyCode} updated successfully.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Line Sale] Update failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Line Sale Update Failed',
          error?.response?.data?.message ||
            error?.message ||
            'Unable to update Line Sale.',
          'warning'
        );
      }
    })();
  };

  const toggleLineSaleAccountStatus =
    (
      partyCode: string
    ) => {
      const account =
        lineSaleAccounts.find(
          (item) =>
            item.partyCode ===
            partyCode
        );

      if (!account) {
        return;
      }

      void (async () => {
        try {
          const updated =
            await lineSaleService.updateLineSaleStatus(
              account.id ??
                account.partyCode,
              !account.isActive
            );

          setLineSaleAccounts(
            (prev) =>
              prev.map(
                (item) =>
                  item.partyCode ===
                  updated.partyCode
                    ? updated
                    : item
              )
          );

          addNotification(
            'Line Sale Status Updated',
            `${updated.partyCode} is now ${
              updated.isActive
                ? 'Active'
                : 'Inactive'
            }.`,
            'success'
          );
        } catch (error: any) {
          console.error(
            '[Line Sale] Status update failed:',
            error?.response?.data ||
              error?.message ||
              error
          );

          addNotification(
            'Status Update Failed',
            error?.response?.data?.message ||
              error?.message ||
              'Unable to update Line Sale status.',
            'warning'
          );
        }
      })();
    };

  /* ------------------------------------------------------------------------ */
  /* SALES OFFICE MASTER                                                      */
  /* ------------------------------------------------------------------------ */

  const addSalesOffice = (
    office: SalesOffice
  ) => {
    setSalesOffices((prev) => [
      ...prev,
      office,
    ]);

    addNotification(
      'Sales Account Linked',
      `Sales account ${office.accountName} created.`,
      'success'
    );
  };

  const updateSalesOffice = (
    updatedOffice: SalesOffice
  ) => {
    setSalesOffices((prev) =>
      prev.map((office) =>
        office.accountId ===
        updatedOffice.accountId
          ? updatedOffice
          : office
      )
    );

    addNotification(
      'Sales Account Updated',
      `Account ${updatedOffice.accountName} parameters updated.`,
      'info'
    );
  };

  const deleteSalesOffice = (
    accountId: string
  ) => {
    const office =
      salesOffices.find(
        (item) =>
          item.accountId ===
          accountId
      );

    setSalesOffices((prev) =>
      prev.filter(
        (item) =>
          item.accountId !==
          accountId
      )
    );

    addNotification(
      'Account Unlinked',
      `Sales account ${
        office?.accountName ||
        accountId
      } deleted.`,
      'warning'
    );
  };

  /* ------------------------------------------------------------------------ */
  /* USER MASTER                                                              */
  /* ------------------------------------------------------------------------ */

  const addUser = (
    user: User
  ) => {
    setUsers((prev) => [
      ...prev,
      user,
    ]);

    addNotification(
      'User Created',
      `Employee ${user.employeeName} added with role ${user.role}.`,
      'success'
    );
  };

  const updateUser = (
    updatedUser: User
  ) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.employeeId ===
        updatedUser.employeeId
          ? updatedUser
          : user
      )
    );

    if (
      currentUser?.employeeId ===
      updatedUser.employeeId
    ) {
      setCurrentUser(
        updatedUser
      );

      localStorage.setItem(
        'live_sale_user',
        JSON.stringify(
          updatedUser
        )
      );
    }

    addNotification(
      'User Profile Updated',
      `${updatedUser.employeeName}'s profile saved.`,
      'info'
    );
  };

  const deleteUser = (
    employeeId: string
  ) => {
    const user =
      users.find(
        (item) =>
          item.employeeId ===
          employeeId
      );

    setUsers((prev) =>
      prev.filter(
        (item) =>
          item.employeeId !==
          employeeId
      )
    );

    addNotification(
      'User Deactivated',
      `Credential for ${
        user?.employeeName ||
        employeeId
      } deleted.`,
      'warning'
    );
  };

  const updatePassword = (
    newPass: string
  ): boolean => {
    if (!currentUser) {
      return false;
    }

    const updatedUser = {
      ...currentUser,
      password: newPass,
    };

    updateUser(
      updatedUser
    );

    return true;
  };

  /* ------------------------------------------------------------------------ */
  /* PRICE LISTS                                                              */
  /* ------------------------------------------------------------------------ */

  const updatePriceListItem = (
    listId: string,
    productId: string,
    rate: number,
    uom: string,
    boxPcs: 'Box' | 'Pcs'
  ) => {
    setPriceLists((prev) =>
      prev.map((priceList) => {
        if (
          priceList.id !==
          listId
        ) {
          return priceList;
        }

        const exists =
          priceList.items.some(
            (item) =>
              item.productId ===
              productId
          );

        if (exists) {
          return {
            ...priceList,
            items:
              priceList.items.map(
                (item) =>
                  item.productId ===
                  productId
                    ? {
                        ...item,
                        rate,
                        uom,
                        boxPcs,
                      }
                    : item
              ),
          };
        }

        return {
          ...priceList,
          items: [
            ...priceList.items,
            {
              productId,
              rate,
              uom,
              boxPcs,
            },
          ],
        };
      })
    );
  };

  /* ------------------------------------------------------------------------ */
  /* SCHEME LISTS                                                             */
  /* ------------------------------------------------------------------------ */

  const addSchemeList = (
    schemeList: SchemeList
  ) => {
    setSchemeLists((prev) => [
      ...prev,
      schemeList,
    ]);

    addNotification(
      'Scheme Created',
      `Promotional scheme "${schemeList.name}" (${schemeList.id}) registered successfully.`,
      'success'
    );
  };

  const updateSchemeList = (
    updatedList: SchemeList
  ) => {
    setSchemeLists((prev) =>
      prev.map((schemeList) =>
        schemeList.id ===
        updatedList.id
          ? updatedList
          : schemeList
      )
    );

    addNotification(
      'Scheme Updated',
      `Promotional scheme "${updatedList.name}" updated.`,
      'info'
    );
  };

  const deleteSchemeList = (
    id: string
  ) => {
    const scheme =
      schemeLists.find(
        (item) =>
          item.id === id
      );

    setSchemeLists((prev) =>
      prev.filter(
        (item) =>
          item.id !== id
      )
    );

    setSalesOffices((prev) =>
      prev.map((office) =>
        office.schemeListId ===
        id
          ? {
              ...office,
              schemeListId: '',
            }
          : office
      )
    );

    setLineSaleAccounts(
      (prev) =>
        prev.map((account) =>
          account.schemeListId ===
          id
            ? {
                ...account,
                schemeListId: '',
              }
            : account
        )
    );

    addNotification(
      'Scheme Removed',
      `Promotional scheme ${
        scheme?.name || id
      } deleted.`,
      'warning'
    );
  };

  const updateSchemeListItem = (
    listId: string,
    productId: string,
    rate: number,
    uom: string,
    boxPcs: 'Box' | 'Pcs',
    buyQty: number,
    freeQty: number
  ) => {
    setSchemeLists((prev) =>
      prev.map((schemeList) => {
        if (
          schemeList.id !==
          listId
        ) {
          return schemeList;
        }

        const exists =
          schemeList.items.some(
            (item) =>
              item.productId ===
              productId
          );

        if (exists) {
          return {
            ...schemeList,
            items:
              schemeList.items.map(
                (item) =>
                  item.productId ===
                  productId
                    ? {
                        ...item,
                        rate,
                        uom,
                        boxPcs,
                        buyQty,
                        freeQty,
                      }
                    : item
              ),
          };
        }

        return {
          ...schemeList,
          items: [
            ...schemeList.items,
            {
              productId,
              rate,
              uom,
              boxPcs,
              buyQty,
              freeQty,
            },
          ],
        };
      })
    );
  };

  /* ------------------------------------------------------------------------ */
  /* GOODS ISSUE                                                              */
  /* ------------------------------------------------------------------------ */

  const addGoodsIssue = async (
    issue: Omit<
      GoodsIssue,
      'id' | 'status'
    > & {
      id?: string;
      status?: string;
      startingReading?: number;
      endingReading?: number;
      remarks?: string;
    }
  ) => {
    try {
      const matchedDepot =
        depots.find(
          (depot) =>
            depot.siteName ===
              issue.depotSite ||
            depot.name ===
              issue.depotSite
        ) ||
        depots[0];

      const matchedLine =
        lineSaleAccounts.find(
          (line) =>
            line.partyCode ===
              issue.partyCode ||
            line.partyName ===
              issue.partyName
        ) ||
        lineSaleAccounts[0];

      if (!matchedDepot) {
        throw new Error(
          'No depot is available for this Goods Issue.'
        );
      }

      if (!matchedLine) {
        throw new Error(
          'No Line Sale Account is available for this Goods Issue.'
        );
      }

      const depotId =
        matchedDepot.id ??
        matchedDepot.depotId;

      const lineSaleId =
        matchedLine.id ??
        matchedLine.lineSaleId;

      if (
        depotId ===
        undefined
      ) {
        throw new Error(
          'Depot database ID is missing.'
        );
      }

      if (
        lineSaleId ===
        undefined
      ) {
        throw new Error(
          'Line Sale database ID is missing.'
        );
      }

      const payload = {
        depotId,
        lineSaleId,

        vehicleNumber:
          issue.vehicleNum ||
          matchedLine.vehicleNumber ||
          undefined,

        driverName:
          issue.driverName ||
          undefined,

        startingMeterReading:
          issue.startingReading ??
          undefined,

        closingMeterReading:
          issue.endingReading ??
          undefined,

        remarks:
          issue.notes ||
          issue.remarks ||
          undefined,

        status:
          issue.status ||
          'ISSUED',

        items: issue.items.map(
          (item) => {
            const product =
              products.find(
                (productItem) =>
                  productItem.id ===
                    item.productId ||
                  productItem.materialCode ===
                    item.productId
              );

            const productId =
              product?.productId ??
              product?.id ??
              item.productId;

            return {
              productId,
              quantity:
                item.qty,
              uom:
                item.uom ||
                product?.baseUom ||
                'Box',
              rate:
                item.rate,
            };
          }
        ),
      };

      const created =
        await goodsIssueService.createGoodsIssue(
          payload
        );

      setGoodsIssues((prev) => [
        created,
        ...prev.filter(
          (item) =>
            item.id !==
            created.id
        ),
      ]);

      addNotification(
        'Goods Issued',
        `Inventory issue transaction ${created.id} posted.`,
        'success'
      );
    } catch (error: any) {
      console.error(
        '[Goods Issue] Create failed:',
        error?.response?.data ||
          error?.message ||
          error
      );

      addNotification(
        'Goods Issue Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to create Goods Issue.',
        'warning'
      );

      throw error;
    }
  };

  const completeGoodsIssue = async (
    id: string
  ) => {
    try {
      const updated =
        await goodsIssueService.updateGoodsIssueStatus(
          id,
          'COMPLETED'
        );

      setGoodsIssues((prev) =>
        prev.map((issue) =>
          issue.id === id
            ? updated
            : issue
        )
      );

      addNotification(
        'Goods Completed',
        `Issue voucher ${updated.id} was successfully completed and added to truck stock.`,
        'success'
      );
    } catch (error: any) {
      console.error(
        '[Goods Issue] Status update failed:',
        error?.response?.data ||
          error?.message ||
          error
      );

      addNotification(
        'Goods Issue Update Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to complete Goods Issue.',
        'warning'
      );

      throw error;
    }
  };

  /* ------------------------------------------------------------------------ */
  /* GOODS RETURN                                                             */
  /* ------------------------------------------------------------------------ */

  const addGoodsReturn = async (
    ret: Omit<
      GoodsReturn,
      'id' | 'status'
    >
  ) => {
    try {
      const created =
        await goodsReturnService.createGoodsReturn(
          ret
        );

      setGoodsReturns((prev) => [
        created,
        ...prev.filter(
          (item) =>
            item.id !==
            created.id
        ),
      ]);

      addNotification(
        'Goods Return Created',
        `Return voucher ${created.id} was successfully saved to the database.`,
        'success'
      );
    } catch (error: any) {
      console.error(
        '[Goods Return] Create failed:',
        error?.response?.data ||
          error?.message ||
          error
      );

      addNotification(
        'Goods Return Failed',
        error?.response?.data?.error
          ?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to create Goods Return.',
        'warning'
      );

      throw error;
    }
  };

  const completeGoodsReturn =
    async (id: string) => {
      try {
        const updated =
          await goodsReturnService.updateGoodsReturnStatus(
            id,
            'COMPLETED'
          );

        setGoodsReturns((prev) =>
          prev.map((item) =>
            item.id === id
              ? updated
              : item
          )
        );

        addNotification(
          'Goods Return Completed',
          `Return invoice ${updated.id} was successfully completed.`,
          'success'
        );
      } catch (error: any) {
        console.error(
          '[Goods Return] Status update failed:',
          error?.response?.data ||
            error?.message ||
            error
        );

        addNotification(
          'Goods Return Update Failed',
          error?.response?.data
            ?.error?.message ||
            error?.response?.data?.message ||
            error?.message ||
            'Unable to update Goods Return status.',
          'warning'
        );

        throw error;
      }
    };

  /* ------------------------------------------------------------------------ */
  /* SALES ENTRY                                                              */
  /* ------------------------------------------------------------------------ */

  const addSalesEntry = (
    entry: Omit<
      SalesEntry,
      'id' | 'date'
    >
  ) => {
    /*
     * No salesService.ts was supplied and no Sales API contract
     * was provided.
     *
     * Therefore we preserve the existing frontend transaction
     * behavior rather than inventing an endpoint.
     */

    const newId =
      `SL-${Math.floor(
        88000 +
          Math.random() *
            10000
      )}`;

    const newSalesEntry: SalesEntry =
      {
        ...entry,
        id: newId,
        date:
          new Date().toISOString(),
      };

    setSalesEntries((prev) => [
      newSalesEntry,
      ...prev,
    ]);

    const syncItem: SyncItem = {
      id: `sync-sl-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`,
      type: 'sale',
      timestamp:
        new Date().toISOString(),
      payload:
        newSalesEntry,
      status: 'pending',
    };

    setSyncQueue((prev) => [
      ...prev,
      syncItem,
    ]);

    addNotification(
      'Sale Recorded',
      `Invoice ${newId} created for ${entry.shopName}.`,
      'success'
    );

    if (navigator.onLine) {
      setTimeout(() => {
        void triggerSync();
      }, 500);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* BACKGROUND SYNC                                                          */
  /* ------------------------------------------------------------------------ */

  const triggerSync = async () => {
    if (isSyncing) {
      return;
    }

    const storedQueue =
      localStorage.getItem(
        'live_sale_sync_queue'
      );

    const queue: SyncItem[] =
      storedQueue
        ? JSON.parse(storedQueue)
        : syncQueue;

    if (
      !queue ||
      queue.length === 0
    ) {
      return;
    }

    setIsSyncing(true);

    addNotification(
      'Cloud Synchronization',
      `Synchronizing ${queue.length} pending transaction(s)...`,
      'info'
    );

    try {
      /*
       * The supplied project currently has no backend synchronization
       * endpoints for the generic SyncItem queue.
       *
       * Do not falsely claim that records were posted to the ERP.
       *
       * Keep the queue intact until an actual synchronization API
       * is connected.
       */

      console.warn(
        '[Sync] Generic transaction queue requires a backend sync API.'
      );

      addNotification(
        'Synchronization Pending',
        'Pending transactions are retained locally until the backend synchronization API is connected.',
        'warning'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline =
      () => {
        void triggerSync();
      };

    window.addEventListener(
      'online',
      handleOnline
    );

    return () => {
      window.removeEventListener(
        'online',
        handleOnline
      );
    };
  }, [
    syncQueue,
    isSyncing,
  ]);

  /* ------------------------------------------------------------------------ */
  /* DEPOT STOCK                                                              */
  /* ------------------------------------------------------------------------ */

  const getDepotStock = (
    siteName: string
  ): StockItem[] => {
    /*
     * No depot-stock service/API was supplied in the provided services.
     * Preserve the existing UI contract until the actual depot stock
     * endpoint is available.
     */

    const factor =
      siteName.includes(
        'Central'
      )
        ? 5000
        : 1500;

    return products.map(
      (product, index) => ({
        productId:
          product.id,

        productName:
          product.description,

        qty: Math.max(
          0,
          factor -
            index * 200
        ),

        uom:
          product.baseUom,
      })
    );
  };

  /* ------------------------------------------------------------------------ */
  /* PROVIDER                                                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <AppContext.Provider
      value={{
        currentUser,
        jwtToken,
        login,
        logout,
        isLoading,

        products,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshProducts,

        lineSaleAccounts,
        addLineSaleAccount,
        updateLineSaleAccount,
        toggleLineSaleAccountStatus,
        refreshLineSaleAccounts,

        depots,
        addDepot,
        updateDepot,
        deleteDepot,
        refreshDepots,

        salesOffices,
        addSalesOffice,
        updateSalesOffice,
        deleteSalesOffice,

        users,
        addUser,
        updateUser,
        deleteUser,
        updatePassword,

        priceLists,
        refreshPriceLists,
        updatePriceListItem,

        schemeLists,
        refreshSchemeLists,
        addSchemeList,
        updateSchemeList,
        deleteSchemeList,
        updateSchemeListItem,

        goodsIssues,
        refreshGoodsIssues,
        addGoodsIssue,
        completeGoodsIssue,

        goodsReturns,
        addGoodsReturn,
        completeGoodsReturn,

        salesEntries,
        refreshSalesEntries,
        addSalesEntry,

        truckStock,
        getDepotStock,

        notifications,
        addNotification,
        markNotificationRead,
        clearNotifications,

        syncQueue,
        triggerSync,
        isSyncing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

/* -------------------------------------------------------------------------- */
/* HOOK                                                                       */
/* -------------------------------------------------------------------------- */

export const useApp = () => {
  const context =
    useContext(AppContext);

  if (
    context ===
    undefined
  ) {
    throw new Error(
      'useApp must be used within an AppProvider'
    );
  }

  return context;
};