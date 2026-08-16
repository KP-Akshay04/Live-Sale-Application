export interface CreatePriceListItemDTO {
  productId: number | string;
  rate: number;
  uom?: string;
  boxPcs?: 'Box' | 'Pcs';
}

export interface UpdatePriceListItemDTO {
  id?: number;
  productId: number | string;
  rate: number;
  uom?: string;
  boxPcs?: 'Box' | 'Pcs';
}

export interface CreatePriceListDTO {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  currency?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  isActive?: boolean;
  items?: CreatePriceListItemDTO[];
}

export interface UpdatePriceListDTO {
  code?: string;
  name?: string;
  description?: string;
  currency?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  isActive?: boolean;
  items?: UpdatePriceListItemDTO[];
}

export interface PriceListFilterQuery {
  search?: string;
  isActive?: boolean;
  currency?: string;
  code?: string;
}

export interface PriceListItemResponseDTO {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PriceListResponseDTO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  currency: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  itemCount: number;
  items: PriceListItemResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
}
