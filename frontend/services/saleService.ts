import apiClient from './api';

export interface SaleItemRequest {
  productId: number | string;
  quantity: number;
  freeQuantity?: number;
  uom?: string;
  rate?: number;
  discountAmount?: number;
  applicableScheme?: string;
}

export interface SalePaymentRequest {
  paymentMethod: string;
  amount: number;
  upiReference?: string;
}

export interface CreateSaleRequest {
  lineSaleId: number;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: SaleItemRequest[];
  payments?: SalePaymentRequest[];
}

export interface SaleResponse {
  success: boolean;
  message: string;
  data: any;
}

export const saleService = {
  async createSale(
    payload: CreateSaleRequest
  ): Promise<SaleResponse['data']> {
    const response = await apiClient.post<SaleResponse>(
      '/sales',
      payload
    );

    return response.data.data;
  },

  async getSales(): Promise<any[]> {
    const response = await apiClient.get<{
      success: boolean;
      count: number;
      data: any[];
    }>('/sales');

    return response.data.data;
  },

  async getSaleById(id: number): Promise<any> {
    const response = await apiClient.get<SaleResponse>(
      `/sales/${id}`
    );

    return response.data.data;
  },

  async getSalesSummary(): Promise<any> {
    const response = await apiClient.get<{
      success: boolean;
      data: any;
    }>('/sales/summary');

    return response.data.data;
  },

  async addPayment(
    saleId: number,
    payload: SalePaymentRequest
  ): Promise<any> {
    const response = await apiClient.post<SaleResponse>(
      `/sales/${saleId}/payments`,
      payload
    );

    return response.data.data;
  },
};

export default saleService;