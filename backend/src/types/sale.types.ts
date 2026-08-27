export interface CreateSaleItemDTO {
  productId: number | string;
  quantity: number | string;
  freeQuantity?: number | string;
  uom?: string;
  rate?: number | string;
  discountAmount?: number | string;
  applicableScheme?: string | null;
}

export interface CreatePaymentDTO {
  paymentReference?: string;
  paymentMethod: string;
  amount: number | string;
  upiReference?: string | null;
  status?: string;
  paymentDate?: string | Date;
}

export interface CreateSaleDTO {
  invoiceNumber?: string;
  lineSaleId: number | string;
  salesOfficerId?: number | string;

  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;

  discountAmount?: number | string;
  taxAmount?: number | string;

  status?: string;
  saleDate?: string | Date;
  sapInvoiceId?: string | null;

  items: CreateSaleItemDTO[];
  payments?: CreatePaymentDTO[];
}

export interface UpdateSaleItemDTO {
  id?: number | string;
  productId?: number | string;
  quantity?: number | string;
  freeQuantity?: number | string;
  uom?: string;
  rate?: number | string;
  discountAmount?: number | string;
  applicableScheme?: string | null;
}

export interface UpdateSaleDTO {
  customerName?: string;
  customerPhone?: string | null;
  customerAddress?: string | null;

  discountAmount?: number | string;
  taxAmount?: number | string;

  status?: string;
  saleDate?: string | Date;
  sapInvoiceId?: string | null;

  items?: UpdateSaleItemDTO[];
}

export interface CreatePaymentForSaleDTO {
  paymentReference?: string;
  paymentMethod: string;
  amount: number | string;
  upiReference?: string | null;
  status?: string;
  paymentDate?: string | Date;
}

export interface UpdatePaymentDTO {
  paymentMethod?: string;
  amount?: number | string;
  upiReference?: string | null;
  status?: string;
  paymentDate?: string | Date;
}

export interface SaleFilterQuery {
  search?: string;
  invoiceNumber?: string;
  lineSaleId?: number | string;
  salesOfficerId?: number | string;
  paymentStatus?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaymentFilterQuery {
  search?: string;
  saleId?: number | string;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface SaleItemResponseDTO {
  id: number;
  saleItemId: number;
  saleId: number;
  productId: number;

  productCode: string;
  productName: string;
  additionalName: string;

  quantity: number;
  freeQuantity: number;
  uom: string;
  rate: number;

  grossAmount: number;
  discountAmount: number;
  netAmount: number;

  applicableScheme: string | null;
}

export interface PaymentResponseDTO {
  id: number;
  paymentId: number;
  saleId: number;

  paymentReference: string;
  paymentMethod: string;
  amount: number;

  upiReference: string | null;
  status: string;

  paymentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleResponseDTO {
  id: number;
  saleId: number;
  invoiceNumber: string;

  lineSaleId: number;
  partyCode: string;
  partyName: string;

  salesOfficerId: number;
  salesOfficer: {
    id: number;
    employeeId: string;
    employeeName: string;
    loginId: string;
    role: string;
  } | null;

  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;

  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;

  paymentStatus: string;
  status: string;

  saleDate: string;
  sapInvoiceId: string | null;

  payments: PaymentResponseDTO[];
  items: SaleItemResponseDTO[];

  createdAt: string;
  updatedAt: string;
}

export interface SaleSummaryDTO {
  totalSales: number;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  cashAmount: number;
  upiAmount: number;
  pendingAmount: number;
}