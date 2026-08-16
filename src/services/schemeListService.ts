import apiClient from './api';
import { SchemeList, SchemeListItem } from '../types';

export interface SchemeListItemApiResponse {
  id: number;
  schemeListId: number;
  productId: number;
  productCode: string;
  materialCode: string;
  productName: string;
  description: string;
  category: string;
  baseUom: string;
  uom: string;
  boxPcs: 'Box' | 'Pcs';
  minQty: number;
  buyQty: number;
  freeQty: number;
  discountPercent: number;
  discountAmount: number;
  rate: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchemeListApiResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  schemeType: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  itemCount: number;
  items: SchemeListItemApiResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface SchemeListFilterParams {
  search?: string;
  isActive?: boolean;
  schemeType?: string;
  code?: string;
}

export interface CreateSchemeListPayload {
  code?: string;
  name: string;
  description?: string;
  schemeType?: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  items?: Array<{
    productId: string | number;
    minQty?: number;
    buyQty?: number;
    freeQty?: number;
    discountPercent?: number;
    discountAmount?: number;
    rate?: number;
    uom?: string;
    boxPcs?: 'Box' | 'Pcs';
  }>;
}

export interface UpdateSchemeListPayload {
  code?: string;
  name?: string;
  description?: string;
  schemeType?: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  items?: Array<{
    id?: number;
    productId: string | number;
    minQty?: number;
    buyQty?: number;
    freeQty?: number;
    discountPercent?: number;
    discountAmount?: number;
    rate?: number;
    uom?: string;
    boxPcs?: 'Box' | 'Pcs';
  }>;
}

export function mapApiSchemeListToFrontendSchemeList(apiSl: SchemeListApiResponse): SchemeList {
  const items: SchemeListItem[] = (apiSl.items || []).map((it) => ({
    id: it.id,
    productId: it.materialCode || String(it.productId),
    materialCode: it.materialCode,
    productName: it.description || it.productName,
    rate: Number(it.rate ?? it.discountAmount ?? 0),
    uom: it.uom || it.baseUom || 'Box',
    boxPcs: it.boxPcs || (it.uom && (it.uom.toLowerCase().includes('box') || it.uom.toLowerCase().includes('case')) ? 'Box' : 'Pcs'),
    buyQty: Number(it.buyQty ?? it.minQty ?? 0),
    freeQty: Number(it.freeQty ?? 0),
    discountPercent: Number(it.discountPercent ?? 0),
    discountAmount: Number(it.discountAmount ?? it.rate ?? 0),
  }));

  return {
    id: apiSl.code || String(apiSl.id),
    numericId: apiSl.id,
    code: apiSl.code,
    name: apiSl.name,
    description: apiSl.description || '',
    schemeType: apiSl.schemeType || 'QTY_FREE',
    validFrom: apiSl.validFrom,
    validTo: apiSl.validTo,
    isActive: apiSl.isActive,
    itemCount: apiSl.itemCount,
    items,
  };
}

export const schemeListService = {
  /**
   * Fetch all scheme lists from MySQL with optional filters
   */
  async getSchemeLists(params?: SchemeListFilterParams): Promise<SchemeList[]> {
    const response = await apiClient.get<{ success: boolean; data: SchemeListApiResponse[] }>('/scheme-lists', {
      params,
    });
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map(mapApiSchemeListToFrontendSchemeList);
    }
    return [];
  },

  /**
   * Fetch single scheme list by ID or code
   */
  async getSchemeListById(idOrCode: string | number): Promise<SchemeList> {
    const response = await apiClient.get<{ success: boolean; data: SchemeListApiResponse }>(
      `/scheme-lists/${encodeURIComponent(idOrCode)}`
    );
    return mapApiSchemeListToFrontendSchemeList(response.data.data);
  },

  /**
   * Create new scheme list with items in MySQL
   */
  async createSchemeList(payload: CreateSchemeListPayload): Promise<SchemeList> {
    const response = await apiClient.post<{ success: boolean; data: SchemeListApiResponse; message: string }>(
      '/scheme-lists',
      payload
    );
    return mapApiSchemeListToFrontendSchemeList(response.data.data);
  },

  /**
   * Update scheme list header and optionally reconcile items
   */
  async updateSchemeList(idOrCode: string | number, payload: UpdateSchemeListPayload): Promise<SchemeList> {
    const response = await apiClient.put<{ success: boolean; data: SchemeListApiResponse; message: string }>(
      `/scheme-lists/${encodeURIComponent(idOrCode)}`,
      payload
    );
    return mapApiSchemeListToFrontendSchemeList(response.data.data);
  },

  /**
   * Toggle active/inactive status
   */
  async updateStatus(idOrCode: string | number, isActive: boolean): Promise<SchemeList> {
    const response = await apiClient.patch<{ success: boolean; data: SchemeListApiResponse; message: string }>(
      `/scheme-lists/${encodeURIComponent(idOrCode)}/status`,
      { isActive }
    );
    return mapApiSchemeListToFrontendSchemeList(response.data.data);
  },

  /**
   * Update single item deal parameters within scheme list
   */
  async updateSchemeListItem(
    idOrCode: string | number,
    itemPayload: {
      productId: string | number;
      minQty?: number;
      buyQty?: number;
      freeQty?: number;
      discountPercent?: number;
      discountAmount?: number;
      rate?: number;
      uom?: string;
      boxPcs?: 'Box' | 'Pcs';
    }
  ): Promise<SchemeList> {
    const response = await apiClient.put<{ success: boolean; data: SchemeListApiResponse; message: string }>(
      `/scheme-lists/${encodeURIComponent(idOrCode)}/items`,
      itemPayload
    );
    return mapApiSchemeListToFrontendSchemeList(response.data.data);
  },

  /**
   * Delete scheme list from MySQL (cascades to items)
   */
  async deleteSchemeList(idOrCode: string | number): Promise<{ success: boolean; message: string; data: { deletedId: number | string } }> {
    const response = await apiClient.delete<{ success: boolean; message: string; data: { deletedId: number | string } }>(
      `/scheme-lists/${encodeURIComponent(idOrCode)}`
    );
    return response.data;
  },
};
