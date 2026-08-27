import apiClient from './api';
import { LineSaleAccount } from '../types';

export interface LineSaleApiResponse {
  id: number;
  lineSaleId: number;
  partyCode: string;
  accountName: string;
  partyName: string;
  salesOfficerId: number;
  salesOfficer: {
    id: number;
    employeeId: string;
    employeeName: string;
    loginId: string;
    role: string;
  } | null;
  assignedUser: string;
  priceListId: number | null;
  priceList: {
    id: number;
    code: string;
    name: string;
  } | null;
  vehicleNumber: string | null;
  routeName: string | null;
  sapCustomerCode: string | null;
  isActive: boolean;
  depotIds: number[];
  depots: Array<{
    id: number;
    code: string;
    name: string;
    siteName: string;
  }>;
  nearestDepot: string;
  schemeListIds: number[];
  schemes: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  schemeListId: string;
  state: string;
  gstn: string;
  contactNo: string;
  geographicalLocation: string;
  upiQr: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineSaleFilterParams {
  search?: string;
  partyCode?: string;
  accountName?: string;
  salesOfficerId?: number | string;
  depotId?: number | string;
  isActive?: boolean;
  routeName?: string;
}

export interface CreateLineSalePayload {
  partyCode: string;
  accountName?: string;
  partyName?: string;
  salesOfficerId?: number | string;
  assignedUser?: string;
  priceListId?: number | string | null;
  vehicleNumber?: string | null;
  routeName?: string | null;
  sapCustomerCode?: string | null;
  isActive?: boolean;
  depotIds?: Array<number | string>;
  nearestDepot?: string;
  schemeListIds?: Array<number | string>;
  schemeListId?: string;
  state?: string;
  gstn?: string;
  contactNo?: string;
  geographicalLocation?: string;
  upiQr?: string;
}

export interface UpdateLineSalePayload {
  partyCode?: string;
  accountName?: string;
  partyName?: string;
  salesOfficerId?: number | string;
  assignedUser?: string;
  priceListId?: number | string | null;
  vehicleNumber?: string | null;
  routeName?: string | null;
  sapCustomerCode?: string | null;
  isActive?: boolean;
  depotIds?: Array<number | string>;
  nearestDepot?: string;
  schemeListIds?: Array<number | string>;
  schemeListId?: string;
  state?: string;
  gstn?: string;
  contactNo?: string;
  geographicalLocation?: string;
  upiQr?: string;
}

export const mapLineSaleApiToModel = (api: LineSaleApiResponse): LineSaleAccount => {
  return {
    id: api.id,
    lineSaleId: api.lineSaleId || api.id,
    partyCode: api.partyCode,
    accountName: api.accountName || api.partyName,
    partyName: api.partyName || api.accountName,
    salesOfficerId: api.salesOfficerId,
    salesOfficer: api.salesOfficer,
    assignedUser: api.assignedUser || api.salesOfficer?.loginId || 'sales',
    priceListId: api.priceList?.code || (api.priceListId ? String(api.priceListId) : 'PL-STANDARD'),
    priceList: api.priceList,
    vehicleNumber: api.vehicleNumber || null,
    routeName: api.routeName || null,
    sapCustomerCode: api.sapCustomerCode || null,
    depotIds: api.depotIds || [],
    depots: api.depots || [],
    nearestDepot: api.nearestDepot || api.depots?.[0]?.name || '',
    schemeListIds: api.schemeListIds || [],
    schemes: api.schemes || [],
    schemeListId: api.schemeListId || api.schemes?.[0]?.code || (api.schemes?.[0]?.id ? String(api.schemes[0].id) : ''),
    state: api.state || 'Karnataka',
    gstn: api.gstn || '',
    contactNo: api.contactNo || '',
    geographicalLocation: api.geographicalLocation || api.routeName || '',
    upiQr: api.upiQr || '',
    isActive: api.isActive,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
};

export const lineSaleService = {
  /**
   * Fetch all Line Sale Accounts with optional filter parameters.
   */
  async getLineSales(params?: LineSaleFilterParams): Promise<LineSaleAccount[]> {
    const response = await apiClient.get<{ success: boolean; data: LineSaleApiResponse[]; count: number }>(
      '/line-sales',
      { params }
    );
    return (response.data.data || []).map(mapLineSaleApiToModel);
  },

  /**
   * Retrieve a single Line Sale Account by numeric ID or partyCode.
   */
  async getLineSale(idOrPartyCode: string | number): Promise<LineSaleAccount> {
    const response = await apiClient.get<{ success: boolean; data: LineSaleApiResponse }>(
      `/line-sales/${encodeURIComponent(String(idOrPartyCode))}`
    );
    return mapLineSaleApiToModel(response.data.data);
  },

  /**
   * Create a new Line Sale Account transactionally in MySQL.
   */
  async createLineSale(payload: CreateLineSalePayload): Promise<LineSaleAccount> {
    const response = await apiClient.post<{ success: boolean; data: LineSaleApiResponse; message: string }>(
      '/line-sales',
      payload
    );
    return mapLineSaleApiToModel(response.data.data);
  },

  /**
   * Update an existing Line Sale Account transactionally.
   */
  async updateLineSale(idOrPartyCode: string | number, payload: UpdateLineSalePayload): Promise<LineSaleAccount> {
    const response = await apiClient.put<{ success: boolean; data: LineSaleApiResponse; message: string }>(
      `/line-sales/${encodeURIComponent(String(idOrPartyCode))}`,
      payload
    );
    return mapLineSaleApiToModel(response.data.data);
  },

  /**
   * Toggle or set status (active / inactive) non-destructively.
   */
  async updateLineSaleStatus(idOrPartyCode: string | number, isActive: boolean): Promise<LineSaleAccount> {
    const response = await apiClient.patch<{ success: boolean; data: LineSaleApiResponse; message: string }>(
      `/line-sales/${encodeURIComponent(String(idOrPartyCode))}/status`,
      { isActive }
    );
    return mapLineSaleApiToModel(response.data.data);
  },

  /**
   * Reconcile assigned Depots for a Line Sale Account.
   */
  async updateLineSaleDepots(
    idOrPartyCode: string | number,
    depotIds: Array<number | string>
  ): Promise<LineSaleAccount> {
    const response = await apiClient.put<{ success: boolean; data: LineSaleApiResponse; message: string }>(
      `/line-sales/${encodeURIComponent(String(idOrPartyCode))}/depots`,
      { depotIds }
    );
    return mapLineSaleApiToModel(response.data.data);
  },

  /**
   * Reconcile assigned Schemes for a Line Sale Account.
   */
  async updateLineSaleSchemes(
    idOrPartyCode: string | number,
    schemeListIds: Array<number | string>
  ): Promise<LineSaleAccount> {
    const response = await apiClient.put<{ success: boolean; data: LineSaleApiResponse; message: string }>(
      `/line-sales/${encodeURIComponent(String(idOrPartyCode))}/schemes`,
      { schemeListIds }
    );
    return mapLineSaleApiToModel(response.data.data);
  },
};

export default lineSaleService;
