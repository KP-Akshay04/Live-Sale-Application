import apiClient from './api';
import { GoodsIssue, GoodsIssueItem } from '../types';

export interface ApiGoodsIssueItem {
  id: number;
  goodsIssueItemId: number;
  goodsIssueId: number;
  productId: number;
  productCode: string;
  materialCode: string;
  productName: string;
  description: string;
  additionalName: string;
  quantity: number;
  uom: string;
  rate: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiGoodsIssue {
  id: number;
  goodsIssueId: number;
  documentId: string;
  depotId: number;
  depot: {
    id: number;
    code: string;
    name: string;
    siteName: string;
  } | null;
  lineSaleId: number;
  lineSale: {
    id: number;
    partyCode: string;
    accountName: string;
    partyName: string;
    routeName?: string | null;
    vehicleNumber?: string | null;
    salesOfficer?: {
      id: number;
      employeeId: string;
      employeeName: string;
      loginId: string;
      role: string;
    } | null;
  } | null;
  vehicleNumber: string;
  vehicleNum?: string;
  driverName: string;
  salesOfficerUsername?: string;
  startingMeterReading: number | null;
  startingReading?: number;
  closingMeterReading: number | null;
  endingReading?: number;
  status: string;
  remarks: string | null;
  notes?: string;
  createdById: number;
  createdBy: {
    id: number;
    employeeId: string;
    employeeName: string;
    loginId: string;
  } | null;
  issueDate: string;
  sapDocumentId: string | null;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  items: ApiGoodsIssueItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GoodsIssueFilterParams {
  search?: string;
  depotId?: number | string;
  lineSaleId?: number | string;
  partyCode?: string;
  status?: string;
  vehicleNumber?: string;
}

export interface CreateGoodsIssuePayload {
  documentId?: string;
  depotId: number | string;
  lineSaleId: number | string;
  vehicleNumber?: string;
  driverName?: string;
  startingMeterReading?: number | null;
  closingMeterReading?: number | null;
  status?: string;
  remarks?: string;
  notes?: string;
  issueDate?: string;
  sapDocumentId?: string;
  items: Array<{
    productId: number | string;
    quantity: number;
    uom?: string;
    rate?: number;
  }>;
}

export function mapApiGoodsIssueToGoodsIssue(api: ApiGoodsIssue): GoodsIssue {
  // Normalize status to UI titlecase
  let normalizedStatus: 'Draft' | 'Issued' | 'Completed' | 'Inprocess' | 'Not Started' = 'Issued';
  const s = (api.status || '').toUpperCase();
  if (s === 'DRAFT') normalizedStatus = 'Draft';
  else if (s === 'COMPLETED') normalizedStatus = 'Completed';
  else if (s === 'INPROCESS') normalizedStatus = 'Inprocess';
  else if (s === 'NOT STARTED') normalizedStatus = 'Not Started';
  else normalizedStatus = 'Issued';

  const items: GoodsIssueItem[] = (api.items || []).map((item) => ({
    productId: item.materialCode || `PROD-${item.productId}`,
    productName: item.productName || item.description || `Product ${item.productId}`,
    additionalName: item.additionalName || '',
    qty: item.quantity,
    uom: item.uom,
    rate: item.rate,
    amount: item.amount,
  }));

  return {
    id: api.documentId || `GI-${api.id}`,
    depotSite: api.depot?.name || api.depot?.siteName || 'Central Depot Bangalore',
    partyCode: api.lineSale?.partyCode || '',
    partyName: api.lineSale?.partyName || api.lineSale?.accountName || '',
    vehicleNum: api.vehicleNumber || api.vehicleNum || '',
    startingReading: api.startingMeterReading ?? api.startingReading ?? undefined,
    driverName: api.driverName || '',
    salesOfficerUsername: api.salesOfficerUsername || api.lineSale?.salesOfficer?.loginId || 'sales',
    issueDate: api.issueDate ? api.issueDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
    items,
    status: normalizedStatus,
    notes: api.remarks || api.notes || undefined,
  };
}

export const goodsIssueService = {
  /**
   * Fetch all goods issues from backend API.
   */
  async getGoodsIssues(filters?: GoodsIssueFilterParams): Promise<GoodsIssue[]> {
    const response = await apiClient.get<{ success: boolean; data: ApiGoodsIssue[] }>('/goods-issues', {
      params: filters,
    });
    return (response.data.data || []).map(mapApiGoodsIssueToGoodsIssue);
  },

  /**
   * Fetch a single goods issue by id or documentId.
   */
  async getGoodsIssueById(id: string | number): Promise<GoodsIssue> {
    const response = await apiClient.get<{ success: boolean; data: ApiGoodsIssue }>(`/goods-issues/${id}`);
    return mapApiGoodsIssueToGoodsIssue(response.data.data);
  },

  /**
   * Create a new Goods Issue transaction with line items and historical rates.
   */
  async createGoodsIssue(payload: CreateGoodsIssuePayload): Promise<GoodsIssue> {
    const response = await apiClient.post<{ success: boolean; data: ApiGoodsIssue }>('/goods-issues', payload);
    return mapApiGoodsIssueToGoodsIssue(response.data.data);
  },

  /**
   * Update Goods Issue metadata.
   */
  async updateGoodsIssue(id: string | number, payload: Partial<CreateGoodsIssuePayload>): Promise<GoodsIssue> {
    const response = await apiClient.put<{ success: boolean; data: ApiGoodsIssue }>(`/goods-issues/${id}`, payload);
    return mapApiGoodsIssueToGoodsIssue(response.data.data);
  },

  /**
   * Update Goods Issue status.
   */
  async updateGoodsIssueStatus(id: string | number, status: string): Promise<GoodsIssue> {
    const response = await apiClient.patch<{ success: boolean; data: ApiGoodsIssue }>(`/goods-issues/${id}/status`, {
      status,
    });
    return mapApiGoodsIssueToGoodsIssue(response.data.data);
  },
};
