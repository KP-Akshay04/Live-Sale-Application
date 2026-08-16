export interface CreateSchemeListItemDTO {
  productId: number | string;
  minQty?: number;
  buyQty?: number;
  freeQty?: number;
  discountPercent?: number;
  discountAmount?: number;
  rate?: number; // Promo rate / discount amount
  uom?: string;
  boxPcs?: 'Box' | 'Pcs';
}

export interface UpdateSchemeListItemDTO {
  id?: number;
  productId: number | string;
  minQty?: number;
  buyQty?: number;
  freeQty?: number;
  discountPercent?: number;
  discountAmount?: number;
  rate?: number;
  uom?: string;
  boxPcs?: 'Box' | 'Pcs';
}

export interface CreateSchemeListDTO {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  schemeType?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  isActive?: boolean;
  items?: CreateSchemeListItemDTO[];
}

export interface UpdateSchemeListDTO {
  code?: string;
  name?: string;
  description?: string;
  schemeType?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  isActive?: boolean;
  items?: UpdateSchemeListItemDTO[];
}

export interface SchemeListFilterQuery {
  search?: string;
  isActive?: boolean;
  schemeType?: string;
  code?: string;
}

export interface SchemeListItemResponseDTO {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SchemeListResponseDTO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  schemeType: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  itemCount: number;
  items: SchemeListItemResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
}
