export interface CreateGoodsIssueItemDTO {
  productId: number | string;
  quantity: number | string;
  uom?: string;
  rate?: number | string;
}

export interface CreateGoodsIssueDTO {
  documentId?: string;
  depotId: number | string;
  lineSaleId: number | string;
  vehicleNumber?: string;
  driverName?: string;
  startingMeterReading?: number | string | null;
  closingMeterReading?: number | string | null;
  status?: string;
  remarks?: string;
  notes?: string;
  issueDate?: string | Date;
  sapDocumentId?: string;
  items: CreateGoodsIssueItemDTO[];
}

export interface UpdateGoodsIssueDTO {
  depotId?: number | string;
  lineSaleId?: number | string;
  vehicleNumber?: string;
  driverName?: string;
  startingMeterReading?: number | string | null;
  closingMeterReading?: number | string | null;
  status?: string;
  remarks?: string;
  notes?: string;
  issueDate?: string | Date;
  sapDocumentId?: string;
  items?: CreateGoodsIssueItemDTO[];
}

export interface GoodsIssueFilterQuery {
  search?: string;
  depotId?: number | string;
  lineSaleId?: number | string;
  partyCode?: string;
  status?: string;
  vehicleNumber?: string;
  startDate?: string;
  endDate?: string;
}

export interface GoodsIssueItemResponseDTO {
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

export interface GoodsIssueResponseDTO {
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
  vehicleNum?: string; // UI alias
  driverName: string;
  salesOfficerUsername?: string; // UI alias
  startingMeterReading: number | null;
  startingReading?: number; // UI alias
  closingMeterReading: number | null;
  endingReading?: number; // UI alias
  status: string;
  remarks: string | null;
  notes?: string; // UI alias
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
  items: GoodsIssueItemResponseDTO[];
  createdAt: string;
  updatedAt: string;
}
