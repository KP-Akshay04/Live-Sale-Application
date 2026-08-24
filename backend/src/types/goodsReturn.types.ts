export interface CreateGoodsReturnItemDTO {
  goodsIssueItemId: number;
  productId: number;
  issuedQty: number;
  soldQty: number;
  returnQty: number;
  damagedQty?: number;
  uom: string;
  rate: number;
}

export interface CreateGoodsReturnDTO {
  goodsIssueId: number;
  closingMeterReading?: number;
  totalSoldAmount?: number;
  totalCollectionCash?: number;
  totalCollectionUpi?: number;
  shortageAmount?: number;
  remarks?: string;
  items: CreateGoodsReturnItemDTO[];
}

export interface UpdateGoodsReturnDTO {
  closingMeterReading?: number;
  totalSoldAmount?: number;
  totalCollectionCash?: number;
  totalCollectionUpi?: number;
  shortageAmount?: number;
  remarks?: string;
  items?: CreateGoodsReturnItemDTO[];
}

export interface GoodsReturnFilterQuery {
  search?: string;
  goodsIssueId?: string;
  depotId?: string;
  lineSaleId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface GoodsReturnItemResponseDTO {
  id: number;
  goodsReturnItemId: number;
  goodsReturnId: number;
  goodsIssueItemId: number;
  productId: number;
  productCode: string;
  materialCode: string;
  productName: string;
  additionalName: string;
  issuedQty: number;
  soldQty: number;
  returnQty: number;
  damagedQty: number;
  uom: string;
  rate: number;
  amount: number;
}

export interface GoodsReturnResponseDTO {
  id: number;
  goodsReturnId: number;
  returnDocumentId: string;

  goodsIssueId: number;
  goodsIssueDocumentId: string;

  depotId: number;
  depotCode: string;
  depotName: string;

  lineSaleId: number;
  partyCode: string;
  partyName: string;
  vehicleNumber: string;

  salesOfficerId: number;
  salesOfficerUsername: string;
  salesOfficerName: string;

  closingMeterReading: number | null;

  totalSoldAmount: number;
  totalCollectionCash: number;
  totalCollectionUpi: number;
  shortageAmount: number;

  status: string;
  remarks: string | null;
  reconciliationDate: string;
  createdAt: string;
  updatedAt: string;

  itemCount: number;
  items: GoodsReturnItemResponseDTO[];
}