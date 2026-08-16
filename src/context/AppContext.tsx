import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { depotService } from '../services/depotService';
import { productService } from '../services/productService';
import { priceListService } from '../services/priceListService';

interface AppContextType {
  // Auth state
  currentUser: User | null;
  jwtToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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
  updatePriceListItem: (listId: string, productId: string, rate: number, uom: string, boxPcs: 'Box' | 'Pcs') => void;
  schemeLists: SchemeList[];
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
  addGoodsIssue: (issue: Omit<GoodsIssue, 'id' | 'status'>) => void;
  completeGoodsIssue: (id: string) => void;

  goodsReturns: GoodsReturn[];
  addGoodsReturn: (ret: Omit<GoodsReturn, 'id' | 'status'>) => void;
  completeGoodsReturn: (id: string) => void;

  salesEntries: SalesEntry[];
  addSalesEntry: (entry: Omit<SalesEntry, 'id' | 'date'>) => void;

  // Stock
  truckStock: StockItem[];
  getDepotStock: (siteName: string) => StockItem[];

  // Utilities
  notifications: Notification[];
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Sync
  syncQueue: SyncItem[];
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Mock Data
const INITIAL_LINE_SALE_ACCOUNTS: LineSaleAccount[] = [
  {
    partyCode: 'LSA-1001',
    partyName: 'Sri Laxmi Line Sales Agency',
    state: 'Karnataka',
    nearestDepot: 'Central Depot Bangalore',
    gstn: '29ABCDE1234F1Z5',
    contactNo: '+91 98450 12345',
    geographicalLocation: '12.9716, 77.5946',
    isActive: true,
    schemeListId: 'SL-SUMMER-SPECIAL',
    priceListId: 'PL-STANDARD',
    assignedUser: 'sales',
  },
  {
    partyCode: 'LSA-1002',
    partyName: 'Chamundeshwari Line Traders',
    state: 'Karnataka',
    nearestDepot: 'Mysore Satellite Depot',
    gstn: '29FGHIJ5678K1Z9',
    contactNo: '+91 98801 67890',
    geographicalLocation: '12.2958, 76.6394',
    isActive: true,
    schemeListId: 'SL-STANDARD',
    priceListId: 'PL-STANDARD',
    assignedUser: 'sales_officer_two',
  },
];

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
    alternativeQty: 40, // 40 packets per box
    rate: 120, // Individual rate
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
    alternativeQty: 24, // 24 bottles per box
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
    alternativeQty: 12, // 12 bottles per box
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
  }
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
  }
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
  }
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
  }
];

const INITIAL_PRICE_LISTS: PriceList[] = [
  {
    id: 'PL-STANDARD',
    name: 'Standard Trade Price List',
    items: [
      { productId: 'PROD-001', rate: 110, uom: 'Box', boxPcs: 'Box' },
      { productId: 'PROD-002', rate: 36, uom: 'Pcs', boxPcs: 'Pcs' },
      { productId: 'PROD-003', rate: 64, uom: 'Pcs', boxPcs: 'Pcs' },
      { productId: 'PROD-004', rate: 88, uom: 'Box', boxPcs: 'Box' },
      { productId: 'PROD-005', rate: 12, uom: 'Pcs', boxPcs: 'Pcs' },
    ],
  },
  {
    id: 'PL-WHOLESALE',
    name: 'Wholesale/Distributor Price List',
    items: [
      { productId: 'PROD-001', rate: 100, uom: 'Box', boxPcs: 'Box' },
      { productId: 'PROD-002', rate: 32, uom: 'Pcs', boxPcs: 'Pcs' },
      { productId: 'PROD-003', rate: 58, uom: 'Pcs', boxPcs: 'Pcs' },
      { productId: 'PROD-004', rate: 80, uom: 'Box', boxPcs: 'Box' },
      { productId: 'PROD-005', rate: 10, uom: 'Pcs', boxPcs: 'Pcs' },
    ],
  }
];

const INITIAL_SCHEME_LISTS: SchemeList[] = [
  {
    id: 'SL-SUMMER-SPECIAL',
    name: 'Summer Splash Promotion',
    items: [
      { productId: 'PROD-001', rate: 110, uom: 'Box', boxPcs: 'Box', buyQty: 10, freeQty: 1 },
      { productId: 'PROD-002', rate: 36, uom: 'Pcs', boxPcs: 'Pcs', buyQty: 24, freeQty: 2 },
      { productId: 'PROD-003', rate: 64, uom: 'Pcs', boxPcs: 'Pcs', buyQty: 12, freeQty: 1 },
      { productId: 'PROD-004', rate: 88, uom: 'Box', boxPcs: 'Box', buyQty: 5, freeQty: 1 },
      { productId: 'PROD-005', rate: 12, uom: 'Pcs', boxPcs: 'Pcs', buyQty: 48, freeQty: 4 },
    ],
  },
  {
    id: 'SL-STANDARD',
    name: 'Standard Volume Schemes',
    items: [
      { productId: 'PROD-001', rate: 110, uom: 'Box', boxPcs: 'Box', buyQty: 20, freeQty: 1 },
      { productId: 'PROD-002', rate: 36, uom: 'Pcs', boxPcs: 'Pcs', buyQty: 48, freeQty: 3 },
      { productId: 'PROD-003', rate: 64, uom: 'Pcs', boxPcs: 'Pcs', buyQty: 24, freeQty: 1 },
      { productId: 'PROD-004', rate: 88, uom: 'Box', boxPcs: 'Box', buyQty: 10, freeQty: 1 },
      { productId: 'PROD-005', rate: 12, uom: 'Pcs', boxPcs: 'Pcs', buyQty: 100, freeQty: 5 },
    ],
  }
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
      { productId: 'PROD-001', productName: 'Golden Leaf Premium Tea 250g', additionalName: 'GL Tea 250G', qty: 25, uom: 'Box', rate: 110, amount: 2750 },
      { productId: 'PROD-002', productName: 'Sparkling Orange Splash 500ml', additionalName: 'Orange Splash 500ML', qty: 120, uom: 'Pcs', rate: 36, amount: 4320 },
      { productId: 'PROD-003', productName: 'Crisp Lemon Fizz Soda 1L', additionalName: 'Lemon Fizz 1L', qty: 80, uom: 'Pcs', rate: 64, amount: 5120 },
      { productId: 'PROD-004', productName: 'Organic Mango Nectar Juice 1L', additionalName: 'Mango Juice 1L', qty: 15, uom: 'Box', rate: 88, amount: 1320 },
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
      { productId: 'PROD-002', productName: 'Sparkling Orange Splash 500ml', additionalName: 'Orange Splash 500ML', qty: 50, uom: 'Pcs', rate: 36, amount: 1800 },
      { productId: 'PROD-005', productName: 'Pure Spring Mineral Water 500ml', additionalName: 'Spring Water 500ML', qty: 200, uom: 'Pcs', rate: 12, amount: 2400 },
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
      { productId: 'PROD-001', productName: 'Golden Leaf Premium Tea 250g', additionalName: 'GL Tea 250G', qty: 5, uom: 'Box', rate: 110, amount: 550 },
      { productId: 'PROD-003', productName: 'Crisp Lemon Fizz Soda 1L', additionalName: 'Lemon Fizz 1L', qty: 30, uom: 'Pcs', rate: 64, amount: 1920 },
    ],
    status: 'Draft',
    notes: 'Pending vehicle allocation.',
  }
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
      { productId: 'PROD-002', productName: 'Sparkling Orange Splash 500ml', additionalName: 'Orange Splash 500ML', issuedQty: 120, soldQty: 115, diffQty: 5, qty: 5, uom: 'Pcs', rate: 36, amount: 180, confirmed: true },
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
      { productId: 'PROD-003', productName: 'Crisp Lemon Fizz Soda 1L', additionalName: 'Lemon Fizz 1L', issuedQty: 80, soldQty: 77, diffQty: 3, qty: 3, uom: 'Pcs', rate: 64, amount: 192, confirmed: true },
    ],
    status: 'Pending',
    reason: 'Near Expiry item return from Gandhi Bazar retail shop',
    notes: 'Awaiting quality inspect check.',
  }
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
  }
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
    message: 'You are running low on Crisp Lemon Fizz Soda 1L (Only 3 bottles left).',
    time: '4 hours ago',
    read: false,
    type: 'warning',
  },
  {
    id: 'notif-3',
    title: 'Price Update Alert',
    message: 'Price list standard price updated for Organic Mango Nectar Juice 1L.',
    time: '1 day ago',
    read: true,
    type: 'info',
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Masters
  const [products, setProducts] = useState<Product[]>([]);
  const [lineSaleAccounts, setLineSaleAccounts] = useState<LineSaleAccount[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [salesOffices, setSalesOffices] = useState<SalesOffice[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Prices & Schemes
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [schemeLists, setSchemeLists] = useState<SchemeList[]>([]);

  // Transactions
  const [goodsIssues, setGoodsIssues] = useState<GoodsIssue[]>([]);
  const [goodsReturns, setGoodsReturns] = useState<GoodsReturn[]>([]);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);

  // Stock
  const [truckStock, setTruckStock] = useState<StockItem[]>([]);

  // Utilities
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Sync state
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load state and restore backend session on init
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem('live_sale_jwt_token');
      if (storedToken) {
        try {
          // Authoritative verification with backend GET /api/auth/me
          const safeUser = await authApi.getMe();
          if (isMounted && safeUser) {
            const restoredUser = mapSafeUserToUser(safeUser);
            setCurrentUser(restoredUser);
            setJwtToken(storedToken);
            localStorage.setItem('live_sale_user', JSON.stringify(restoredUser));
          }
        } catch (error) {
          console.warn('[Auth] Stored session invalid or expired:', error);
          if (isMounted) {
            setCurrentUser(null);
            setJwtToken(null);
            localStorage.removeItem('live_sale_jwt_token');
            localStorage.removeItem('live_sale_user');
            localStorage.removeItem('live_sale_refresh_token');
          }
        }
      } else {
        setCurrentUser(null);
        setJwtToken(null);
        localStorage.removeItem('live_sale_user');
      }

      const loadState = <T,>(key: string, initial: T, setter: React.Dispatch<React.SetStateAction<T>>) => {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            setter(JSON.parse(stored));
          } catch {
            setter(initial);
          }
        } else {
          setter(initial);
          localStorage.setItem(key, JSON.stringify(initial));
        }
      };

      loadState('live_sale_products', INITIAL_PRODUCTS, setProducts);
      loadState('live_sale_line_sale_accounts', INITIAL_LINE_SALE_ACCOUNTS, setLineSaleAccounts);
      loadState('live_sale_depots', INITIAL_DEPOTS, setDepots);
      loadState('live_sale_sales_offices', INITIAL_SALES_OFFICES, setSalesOffices);
      loadState('live_sale_users', INITIAL_USERS, setUsers);
      loadState('live_sale_price_lists', INITIAL_PRICE_LISTS, setPriceLists);
      loadState('live_sale_scheme_lists', INITIAL_SCHEME_LISTS, setSchemeLists);
      loadState('live_sale_goods_issues', INITIAL_GOODS_ISSUES, setGoodsIssues);
      loadState('live_sale_goods_returns', INITIAL_GOODS_RETURNS, setGoodsReturns);
      loadState('live_sale_sales_entries', INITIAL_SALES_ENTRIES, setSalesEntries);
      loadState('live_sale_notifications', INITIAL_NOTIFICATIONS, setNotifications);
      loadState('live_sale_sync_queue', [], setSyncQueue);

      if (isMounted) {
        setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync back to localStorage on change
  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_products', JSON.stringify(products));
  }, [products, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_line_sale_accounts', JSON.stringify(lineSaleAccounts));
  }, [lineSaleAccounts, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_depots', JSON.stringify(depots));
  }, [depots, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_sales_offices', JSON.stringify(salesOffices));
  }, [salesOffices, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_users', JSON.stringify(users));
  }, [users, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_price_lists', JSON.stringify(priceLists));
  }, [priceLists, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_scheme_lists', JSON.stringify(schemeLists));
  }, [schemeLists, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_goods_issues', JSON.stringify(goodsIssues));
  }, [goodsIssues, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_goods_returns', JSON.stringify(goodsReturns));
  }, [goodsReturns, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_sales_entries', JSON.stringify(salesEntries));
  }, [salesEntries, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_notifications', JSON.stringify(notifications));
  }, [notifications, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('live_sale_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue, isLoading]);

  // Dynamically calculate Truck Stock for the current logged-in Sales Officer
  // Truck Stock = Sum(Completed Goods Issues items) - Sum(Completed Goods Returns items) - Sum(Sales entries)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Sales Officer') {
      setTruckStock([]);
      return;
    }

    const officer = currentUser.username;
    const stockMap: { [productId: string]: { qty: number; uom: string; name: string } } = {};

    // Initial default layout of products
    products.forEach((p) => {
      stockMap[p.id] = { qty: 0, uom: p.baseUom, name: p.description };
    });

    // 1. Add Completed Goods Issues
    goodsIssues
      .filter((gi) => gi.salesOfficerUsername === officer && gi.status === 'Completed')
      .forEach((gi) => {
        gi.items.forEach((item) => {
          if (!stockMap[item.productId]) {
            stockMap[item.productId] = { qty: 0, uom: item.uom, name: item.productName };
          }
          stockMap[item.productId].qty += item.qty;
        });
      });

    // 2. Subtract Pending/Completed Goods Returns
    goodsReturns
      .filter((gr) => gr.salesOfficerUsername === officer)
      .forEach((gr) => {
        gr.items.forEach((item) => {
          if (stockMap[item.productId]) {
            stockMap[item.productId].qty -= item.qty;
          }
        });
      });

    // 3. Subtract Completed Sales
    salesEntries
      .filter((se) => se.salesOfficerUsername === officer)
      .forEach((se) => {
        if (stockMap[se.productId]) {
          stockMap[se.productId].qty -= (se.qty + se.freeQty);
        }
      });

    // Convert map back to list
    const computedStock: StockItem[] = Object.keys(stockMap).map((id) => ({
      productId: id,
      productName: stockMap[id].name,
      qty: Math.max(0, stockMap[id].qty), // No negative truck stock allowed in visual
      uom: stockMap[id].uom,
    }));

    setTruckStock(computedStock);
  }, [currentUser, products, goodsIssues, goodsReturns, salesEntries]);

  // Auth Action Creators
  const login = async (loginId: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(loginId.trim(), password);
      if (response && response.token && response.user) {
        const authenticatedUser = mapSafeUserToUser(response.user);
        setCurrentUser(authenticatedUser);
        setJwtToken(response.token);
        localStorage.setItem('live_sale_jwt_token', response.token);
        localStorage.setItem('live_sale_user', JSON.stringify(authenticatedUser));
        addNotification(
          'Login Successful',
          `Welcome back ${authenticatedUser.employeeName}. Logged in as ${authenticatedUser.role}.`,
          'success'
        );
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[Auth Error] Backend login failed:', error?.response?.data || error.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[Auth] Remote logout notification failed:', err);
    } finally {
      setCurrentUser(null);
      setJwtToken(null);
      localStorage.removeItem('live_sale_user');
      localStorage.removeItem('live_sale_jwt_token');
      localStorage.removeItem('live_sale_refresh_token');
      addNotification('Logged Out', 'Successfully logged out of the system.', 'info');
    }
  };

  // CRUD Line Sale Master
  const addLineSaleAccount = (account: LineSaleAccount) => {
    setLineSaleAccounts((prev) => [account, ...prev]);
  };

  const updateLineSaleAccount = (account: LineSaleAccount) => {
    setLineSaleAccounts((prev) => prev.map((a) => (a.partyCode === account.partyCode ? account : a)));
  };

  const toggleLineSaleAccountStatus = (partyCode: string) => {
    setLineSaleAccounts((prev) =>
      prev.map((a) => (a.partyCode === partyCode ? { ...a, isActive: !a.isActive } : a))
    );
  };

  // CRUD Product Master
  const refreshProducts = useCallback(async () => {
    try {
      const data = await productService.getProducts();
      if (data && data.length > 0) {
        setProducts(data);
      }
    } catch {
      // Retain existing state if unauthenticated or offline
    }
  }, []);

  const addProduct = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
    // Create in default Price List and Scheme Lists as well
    setPriceLists((prev) =>
      prev.map((pl) => ({
        ...pl,
        items: [...pl.items, { productId: product.id, rate: product.rate, uom: product.baseUom, boxPcs: 'Box' }],
      }))
    );
    setSchemeLists((prev) =>
      prev.map((sl) => ({
        ...sl,
        items: [
          ...sl.items,
          { productId: product.id, rate: product.rate, uom: product.baseUom, boxPcs: 'Box', buyQty: 10, freeQty: 0 },
        ],
      }))
    );
    addNotification('Product Added', `Product ${product.description} created successfully.`, 'success');
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    addNotification('Product Updated', `Product ${updatedProduct.description} updated.`, 'info');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setPriceLists((prev) =>
      prev.map((pl) => ({
        ...pl,
        items: pl.items.filter((item) => item.productId !== id),
      }))
    );
    setSchemeLists((prev) =>
      prev.map((sl) => ({
        ...sl,
        items: sl.items.filter((item) => item.productId !== id),
      }))
    );
    addNotification('Product Deleted', `Product ${prod?.description || id} removed from catalogs.`, 'warning');
  };

  // CRUD Depot Master
  const refreshDepots = useCallback(async () => {
    try {
      const data = await depotService.getDepots();
      if (data && data.length > 0) {
        setDepots(data);
      }
    } catch {
      // Retain existing state if unauthenticated or offline
    }
  }, []);

  const addDepot = (depot: Depot) => {
    setDepots((prev) => [...prev, depot]);
    addNotification('Depot Registered', `Depot ${depot.siteName} created in system.`, 'success');
  };

  const updateDepot = (updatedDepot: Depot) => {
    setDepots((prev) => prev.map((d) => (d.siteName === updatedDepot.siteName ? updatedDepot : d)));
    addNotification('Depot Updated', `Depot ${updatedDepot.siteName} settings updated.`, 'info');
  };

  const deleteDepot = (siteName: string) => {
    setDepots((prev) => prev.filter((d) => d.siteName !== siteName));
    addNotification('Depot Deleted', `Depot ${siteName} removed.`, 'warning');
  };

  // CRUD Sales Office Master
  const addSalesOffice = (office: SalesOffice) => {
    setSalesOffices((prev) => [...prev, office]);
    addNotification('Sales Account Linked', `Sales account ${office.accountName} created.`, 'success');
  };

  const updateSalesOffice = (updatedOffice: SalesOffice) => {
    setSalesOffices((prev) => prev.map((o) => (o.accountId === updatedOffice.accountId ? updatedOffice : o)));
    addNotification('Sales Account Updated', `Account ${updatedOffice.accountName} parameters updated.`, 'info');
  };

  const deleteSalesOffice = (accountId: string) => {
    const o = salesOffices.find((x) => x.accountId === accountId);
    setSalesOffices((prev) => prev.filter((o) => o.accountId !== accountId));
    addNotification('Account Unlinked', `Sales account ${o?.accountName || accountId} deleted.`, 'warning');
  };

  // CRUD User Master
  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
    addNotification('User Created', `Employee ${user.employeeName} added with role ${user.role}.`, 'success');
  };

  const updateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.employeeId === updatedUser.employeeId ? updatedUser : u)));
    if (currentUser?.employeeId === updatedUser.employeeId) {
      setCurrentUser(updatedUser);
      localStorage.setItem('live_sale_user', JSON.stringify(updatedUser));
    }
    addNotification('User Profile Updated', `${updatedUser.employeeName}'s profile saved.`, 'info');
  };

  const deleteUser = (employeeId: string) => {
    const u = users.find((x) => x.employeeId === employeeId);
    setUsers((prev) => prev.filter((u) => u.employeeId !== employeeId));
    addNotification('User Deactivated', `Credential for ${u?.employeeName || employeeId} deleted.`, 'warning');
  };

  const updatePassword = (newPass: string): boolean => {
    if (!currentUser) return false;
    const updated = { ...currentUser, password: newPass };
    updateUser(updated);
    return true;
  };

  // Prices and Schemes updating
  const refreshPriceLists = useCallback(async () => {
    try {
      const data = await priceListService.getPriceLists();
      if (data && data.length > 0) {
        setPriceLists(data);
      }
    } catch {
      // Retain existing state if unauthenticated or offline
    }
  }, []);

  const updatePriceListItem = (listId: string, productId: string, rate: number, uom: string, boxPcs: 'Box' | 'Pcs') => {
    setPriceLists((prev) =>
      prev.map((pl) => {
        if (pl.id !== listId) return pl;
        const exists = pl.items.some((i) => i.productId === productId);
        let updatedItems;
        if (exists) {
          updatedItems = pl.items.map((i) =>
            i.productId === productId ? { ...i, rate, uom, boxPcs } : i
          );
        } else {
          updatedItems = [...pl.items, { productId, rate, uom, boxPcs }];
        }
        return { ...pl, items: updatedItems };
      })
    );
  };

  const addSchemeList = (schemeList: SchemeList) => {
    setSchemeLists((prev) => [...prev, schemeList]);
    addNotification('Scheme Created', `Promotional scheme "${schemeList.name}" (${schemeList.id}) registered successfully.`, 'success');
  };

  const updateSchemeList = (updatedList: SchemeList) => {
    setSchemeLists((prev) => prev.map((sl) => (sl.id === updatedList.id ? updatedList : sl)));
    addNotification('Scheme Updated', `Promotional scheme "${updatedList.name}" updated.`, 'info');
  };

  const deleteSchemeList = (id: string) => {
    const sl = schemeLists.find((x) => x.id === id);
    setSchemeLists((prev) => prev.filter((x) => x.id !== id));
    setSalesOffices((prev) =>
      prev.map((o) => (o.schemeListId === id ? { ...o, schemeListId: '' } : o))
    );
    setLineSaleAccounts((prev) =>
      prev.map((a) => (a.schemeListId === id ? { ...a, schemeListId: '' } : a))
    );
    addNotification('Scheme Removed', `Promotional scheme ${sl?.name || id} deleted.`, 'warning');
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
      prev.map((sl) => {
        if (sl.id !== listId) return sl;
        const exists = sl.items.some((i) => i.productId === productId);
        let updatedItems;
        if (exists) {
          updatedItems = sl.items.map((i) =>
            i.productId === productId ? { ...i, rate, uom, boxPcs, buyQty, freeQty } : i
          );
        } else {
          updatedItems = [...sl.items, { productId, rate, uom, boxPcs, buyQty, freeQty }];
        }
        return { ...sl, items: updatedItems };
      })
    );
  };

  // Transactions: Goods Issue
  const addGoodsIssue = (issue: Omit<GoodsIssue, 'id' | 'status'>) => {
    const newId = `GI-${Math.floor(10000 + Math.random() * 90000)}`;
    const newIssue: GoodsIssue = {
      ...issue,
      id: newId,
      status: 'Issued', // auto mark issued when submitted
    };
    setGoodsIssues((prev) => [newIssue, ...prev]);

    // Add to sync queue
    const syncItem: SyncItem = {
      id: `sync-gi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'goods_issue',
      timestamp: new Date().toISOString(),
      payload: newIssue,
      status: 'pending',
    };
    setSyncQueue((prev) => [...prev, syncItem]);

    addNotification('Goods Issued', `Inventory issue transaction ${newId} posted.`, 'success');

    if (navigator.onLine) {
      setTimeout(() => triggerSync(), 500);
    }
  };

  const completeGoodsIssue = (id: string) => {
    setGoodsIssues((prev) => prev.map((gi) => (gi.id === id ? { ...gi, status: 'Completed' } : gi)));
    const gi = goodsIssues.find((g) => g.id === id);
    addNotification('Goods Completed', `Issue voucher ${id} received and added to truck stock.`, 'success');
  };

  // Transactions: Goods Return
  const addGoodsReturn = (ret: Omit<GoodsReturn, 'id' | 'status'>) => {
    const newId = `GR-${Math.floor(20000 + Math.random() * 90000)}`;
    const newReturn: GoodsReturn = {
      ...ret,
      id: newId,
      status: 'Pending',
    };
    setGoodsReturns((prev) => [newReturn, ...prev]);

    // Add to sync queue
    const syncItem: SyncItem = {
      id: `sync-gr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'goods_return',
      timestamp: new Date().toISOString(),
      payload: newReturn,
      status: 'pending',
    };
    setSyncQueue((prev) => [...prev, syncItem]);

    addNotification('Goods Return Logged', `Return voucher ${newId} logged as Pending.`, 'info');

    if (navigator.onLine) {
      setTimeout(() => triggerSync(), 500);
    }
  };

  const completeGoodsReturn = (id: string) => {
    setGoodsReturns((prev) => prev.map((gr) => (gr.id === id ? { ...gr, status: 'Completed' } : gr)));
    addNotification('Goods Return Completed', `Return invoice ${id} approved & restocked.`, 'success');
  };

  // Transactions: Sales Entry
  const addSalesEntry = (entry: Omit<SalesEntry, 'id' | 'date'>) => {
    const newId = `SL-${Math.floor(88000 + Math.random() * 10000)}`;
    const newSalesEntry: SalesEntry = {
      ...entry,
      id: newId,
      date: new Date().toISOString(),
    };
    setSalesEntries((prev) => [newSalesEntry, ...prev]);

    // Add to sync queue
    const syncItem: SyncItem = {
      id: `sync-sl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'sale',
      timestamp: new Date().toISOString(),
      payload: newSalesEntry,
      status: 'pending',
    };
    setSyncQueue((prev) => [...prev, syncItem]);

    addNotification('Sale Recorded', `Invoice ${newId} created for ${entry.shopName}.`, 'success');

    if (navigator.onLine) {
      setTimeout(() => triggerSync(), 500);
    }
  };

  // Centralized background synchronization function
  const triggerSync = async () => {
    const pendingItems = localStorage.getItem('live_sale_sync_queue');
    const queue = pendingItems ? JSON.parse(pendingItems) : [];
    if (queue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    addNotification(
      'Cloud Synchronization',
      `Synchronizing ${queue.length} offline transaction(s) with Central Cloud Hub...`,
      'info'
    );

    try {
      // Simulate enterprise secure cloud connection and record auditing (2.5s latency)
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      setSyncQueue([]);
      localStorage.setItem('live_sale_sync_queue', JSON.stringify([]));
      addNotification(
        'Sync Successful',
        'Offline transactions successfully audited and posted to Central ERP.',
        'success'
      );
    } catch (err) {
      addNotification('Sync Interrupted', 'Could not reach Central ERP server. Retrying in background...', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger sync automatically when transitioning online
  useEffect(() => {
    const handleOnline = () => {
      triggerSync();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncQueue, isSyncing]);

  // Helper Stock levels
  const getDepotStock = (siteName: string): StockItem[] => {
    // Simulated depot stock database
    // For this mock, depot stock contains large numbers of all active products
    const factor = siteName.includes('Central') ? 5000 : 1500;
    return products.map((p, index) => ({
      productId: p.id,
      productName: p.description,
      qty: factor - (index * 200), // static mock calculation
      uom: p.baseUom,
    }));
  };

  // Utilities: Notifications
  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      time: 'Just now',
      read: false,
      type,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

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

        depots,
        addDepot,
        updateDepot,
        deleteDepot,
        refreshDepots,

        salesOffices,
        addSalesOffice,
        updateSalesOffice,
        deleteSalesOffice,

        lineSaleAccounts,
        addLineSaleAccount,
        updateLineSaleAccount,
        toggleLineSaleAccountStatus,

        users,
        addUser,
        updateUser,
        deleteUser,
        updatePassword,

        priceLists,
        refreshPriceLists,
        updatePriceListItem,
        schemeLists,
        addSchemeList,
        updateSchemeList,
        deleteSchemeList,
        updateSchemeListItem,

        goodsIssues,
        addGoodsIssue,
        completeGoodsIssue,

        goodsReturns,
        addGoodsReturn,
        completeGoodsReturn,

        salesEntries,
        addSalesEntry,

        truckStock,
        getDepotStock,

        notifications,
        addNotification,
        markNotificationRead,
        clearNotifications,

        // Sync
        syncQueue,
        triggerSync,
        isSyncing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
