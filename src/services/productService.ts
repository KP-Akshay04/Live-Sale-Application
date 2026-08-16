import apiClient from './api';
import { Product } from '../types';

export interface ProductApiResponse {
  id: number;
  productId: number;
  materialCode: string;
  code: string;
  description: string;
  productName: string;
  additionalName: string;
  category: string;
  group: string;
  hsnCode: string;
  barcode: string;
  baseUom: string;
  alternativeQty: number;
  baseRate: number;
  rate: number;
  taxRate: number;
  gstRate: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilterParams {
  search?: string;
  isActive?: boolean;
  category?: string;
  group?: string;
}

export interface CreateProductPayload {
  materialCode?: string;
  code?: string;
  id?: string | number;
  description: string;
  productName?: string;
  additionalName?: string;
  category?: string;
  group?: string;
  hsnCode?: string;
  barcode?: string;
  baseUom?: string;
  alternativeQty?: number;
  baseRate?: number | string;
  rate?: number | string;
  taxRate?: number | string;
  gstRate?: number | string;
  isActive?: boolean;
}

export interface UpdateProductPayload {
  materialCode?: string;
  code?: string;
  description?: string;
  productName?: string;
  additionalName?: string;
  category?: string;
  group?: string;
  hsnCode?: string;
  barcode?: string;
  baseUom?: string;
  alternativeQty?: number;
  baseRate?: number | string;
  rate?: number | string;
  taxRate?: number | string;
  gstRate?: number | string;
  isActive?: boolean;
}

export function mapApiProductToFrontendProduct(apiProd: ProductApiResponse): Product {
  return {
    id: apiProd.materialCode || String(apiProd.id),
    productId: apiProd.id,
    materialCode: apiProd.materialCode,
    description: apiProd.description || apiProd.productName || '',
    additionalName: apiProd.additionalName || '',
    category: apiProd.category || 'General',
    group: apiProd.group || '',
    hsnCode: apiProd.hsnCode || '',
    barcode: apiProd.barcode || '',
    gstRate: Number(apiProd.taxRate ?? apiProd.gstRate ?? 0),
    taxRate: Number(apiProd.taxRate ?? apiProd.gstRate ?? 0),
    baseUom: apiProd.baseUom || 'Box',
    alternativeQty: Number(apiProd.alternativeQty ?? 1),
    rate: Number(apiProd.baseRate ?? apiProd.rate ?? 0),
    baseRate: Number(apiProd.baseRate ?? apiProd.rate ?? 0),
    isActive: apiProd.isActive,
  };
}

export const productService = {
  /**
   * Fetch all products from MySQL with optional query filters
   */
  async getProducts(params?: ProductFilterParams): Promise<Product[]> {
    const response = await apiClient.get<{ success: boolean; data: ProductApiResponse[] }>('/products', {
      params,
    });
    return (response.data.data || []).map(mapApiProductToFrontendProduct);
  },

  /**
   * Fetch a single product by numeric ID or materialCode
   */
  async getProduct(id: number | string): Promise<Product> {
    const response = await apiClient.get<{ success: boolean; data: ProductApiResponse }>(`/products/${id}`);
    return mapApiProductToFrontendProduct(response.data.data);
  },

  /**
   * Create a new product in MySQL
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const body = {
      ...payload,
      materialCode: payload.materialCode || payload.code || (payload.id ? String(payload.id) : undefined),
      description: payload.description || payload.productName,
      baseRate: payload.baseRate !== undefined ? payload.baseRate : payload.rate,
      taxRate: payload.taxRate !== undefined ? payload.taxRate : payload.gstRate,
    };
    const response = await apiClient.post<{ success: boolean; message: string; data: ProductApiResponse }>(
      '/products',
      body
    );
    return mapApiProductToFrontendProduct(response.data.data);
  },

  /**
   * Update an existing product in MySQL
   */
  async updateProduct(id: number | string, payload: UpdateProductPayload): Promise<Product> {
    const body = {
      ...payload,
      materialCode: payload.materialCode || payload.code,
      description: payload.description || payload.productName,
      baseRate: payload.baseRate !== undefined ? payload.baseRate : payload.rate,
      taxRate: payload.taxRate !== undefined ? payload.taxRate : payload.gstRate,
    };
    const response = await apiClient.put<{ success: boolean; message: string; data: ProductApiResponse }>(
      `/products/${id}`,
      body
    );
    return mapApiProductToFrontendProduct(response.data.data);
  },

  /**
   * Activate or deactivate a product in MySQL
   */
  async updateProductStatus(id: number | string, isActive: boolean): Promise<Product> {
    const response = await apiClient.patch<{ success: boolean; message: string; data: ProductApiResponse }>(
      `/products/${id}/status`,
      { isActive }
    );
    return mapApiProductToFrontendProduct(response.data.data);
  },
};
