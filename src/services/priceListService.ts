import apiClient from './api';
import { PriceList, PriceListItem } from '../types';

export interface PriceListItemApiResponse {
  id: number;
  priceListId: number;
  productId: number;
  productCode: string;
  materialCode: string;
  productName: string;
  description: string;
  category: string;
  baseUom: string;
  uom: string;
  rate: number;
  boxPcs: 'Box' | 'Pcs';
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceListApiResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  currency: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  itemCount: number;
  items: PriceListItemApiResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceListFilterParams {
  search?: string;
  isActive?: boolean;
  currency?: string;
  code?: string;
}

export interface CreatePriceListPayload {
  code?: string;
  name: string;
  description?: string;
  currency?: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  items?: Array<{
    productId: string | number;
    rate: number;
    uom?: string;
    boxPcs?: 'Box' | 'Pcs';
  }>;
}

export interface UpdatePriceListPayload {
  code?: string;
  name?: string;
  description?: string;
  currency?: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  items?: Array<{
    id?: number;
    productId: string | number;
    rate: number;
    uom?: string;
    boxPcs?: 'Box' | 'Pcs';
  }>;
}

export function mapApiPriceListToFrontendPriceList(apiPl: PriceListApiResponse): PriceList {
  const items: PriceListItem[] = (apiPl.items || []).map((it) => ({
    id: it.id,
    productId: it.materialCode || String(it.productId),
    materialCode: it.materialCode,
    productName: it.description || it.productName,
    rate: Number(it.rate ?? 0),
    uom: it.uom || it.baseUom || 'Pcs',
    boxPcs: it.boxPcs || (it.uom && (it.uom.toLowerCase().includes('box') || it.uom.toLowerCase().includes('case')) ? 'Box' : 'Pcs'),
  }));

  return {
    id: apiPl.code || String(apiPl.id),
    numericId: apiPl.id,
    code: apiPl.code,
    name: apiPl.name,
    description: apiPl.description || '',
    currency: apiPl.currency || 'INR',
    validFrom: apiPl.validFrom,
    validTo: apiPl.validTo,
    isActive: apiPl.isActive,
    itemCount: apiPl.itemCount,
    items,
  };
}

export const priceListService = {
  /**
   * Fetch all price lists from MySQL with optional filters
   */
  async getPriceLists(params?: PriceListFilterParams): Promise<PriceList[]> {
    const response = await apiClient.get<{ success: boolean; data: PriceListApiResponse[] }>('/price-lists', {
      params,
    });
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map(mapApiPriceListToFrontendPriceList);
    }
    return [];
  },

  /**
   * Fetch single price list by ID or code
   */
  async getPriceListById(idOrCode: string | number): Promise<PriceList> {
    const response = await apiClient.get<{ success: boolean; data: PriceListApiResponse }>(
      `/price-lists/${encodeURIComponent(idOrCode)}`
    );
    return mapApiPriceListToFrontendPriceList(response.data.data);
  },

  /**
   * Create new price list with items in MySQL
   */
  async createPriceList(payload: CreatePriceListPayload): Promise<PriceList> {
    const response = await apiClient.post<{ success: boolean; data: PriceListApiResponse; message: string }>(
      '/price-lists',
      payload
    );
    return mapApiPriceListToFrontendPriceList(response.data.data);
  },

  /**
   * Update price list header and optionally reconcile items
   */
  async updatePriceList(idOrCode: string | number, payload: UpdatePriceListPayload): Promise<PriceList> {
    const response = await apiClient.put<{ success: boolean; data: PriceListApiResponse; message: string }>(
      `/price-lists/${encodeURIComponent(idOrCode)}`,
      payload
    );
    return mapApiPriceListToFrontendPriceList(response.data.data);
  },

  /**
   * Toggle active/inactive status
   */
  async updateStatus(idOrCode: string | number, isActive: boolean): Promise<PriceList> {
    const response = await apiClient.patch<{ success: boolean; data: PriceListApiResponse; message: string }>(
      `/price-lists/${encodeURIComponent(idOrCode)}/status`,
      { isActive }
    );
    return mapApiPriceListToFrontendPriceList(response.data.data);
  },

  /**
   * Update single item rate within price list
   */
  async updateItemRate(
    priceListIdOrCode: string | number,
    productId: string | number,
    rate: number,
    uom?: string,
    boxPcs?: 'Box' | 'Pcs'
  ): Promise<PriceList> {
    const response = await apiClient.put<{ success: boolean; data: PriceListApiResponse; message: string }>(
      `/price-lists/${encodeURIComponent(priceListIdOrCode)}/items`,
      { productId, rate, uom, boxPcs }
    );
    return mapApiPriceListToFrontendPriceList(response.data.data);
  },
};
