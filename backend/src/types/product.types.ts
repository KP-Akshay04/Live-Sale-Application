export interface ProductResponseDTO {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDTO {
  materialCode?: string;
  code?: string;
  id?: string | number; // sometimes UI submits id as material code
  description?: string;
  productName?: string;
  name?: string;
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

export interface UpdateProductDTO {
  id?: string | number;
  materialCode?: string;
  code?: string;
  description?: string;
  productName?: string;
  name?: string;
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

export interface ProductFilterQuery {
  search?: string;
  isActive?: boolean;
  category?: string;
  group?: string;
}
