export interface CreateLineSaleDTO {
  partyCode: string;
  accountName?: string;
  partyName?: string;
  salesOfficerId?: number | string;
  assignedUser?: string;
  priceListId?: number | string | null;
  vehicleNumber?: string | null;
  routeName?: string | null;
  sapCustomerCode?: string | null;
  isActive?: boolean;
  depotIds?: Array<number | string>;
  nearestDepot?: string;
  schemeListIds?: Array<number | string>;
  schemeListId?: string;
  // UI metadata compatibility
  state?: string;
  gstn?: string;
  contactNo?: string;
  geographicalLocation?: string;
  upiQr?: string;
}

export interface UpdateLineSaleDTO {
  partyCode?: string;
  accountName?: string;
  partyName?: string;
  salesOfficerId?: number | string;
  assignedUser?: string;
  priceListId?: number | string | null;
  vehicleNumber?: string | null;
  routeName?: string | null;
  sapCustomerCode?: string | null;
  isActive?: boolean;
  depotIds?: Array<number | string>;
  nearestDepot?: string;
  schemeListIds?: Array<number | string>;
  schemeListId?: string;
  // UI metadata compatibility
  state?: string;
  gstn?: string;
  contactNo?: string;
  geographicalLocation?: string;
  upiQr?: string;
}

export interface LineSaleFilterQuery {
  search?: string;
  partyCode?: string;
  accountName?: string;
  salesOfficerId?: number | string;
  depotId?: number | string;
  isActive?: boolean;
  routeName?: string;
}

export interface LineSaleDepotMappingResponseDTO {
  id: number;
  depotId: number;
  depotCode: string;
  depotName: string;
  siteName: string;
  isActive: boolean;
}

export interface LineSaleSchemeMappingResponseDTO {
  id: number;
  schemeListId: number;
  schemeCode: string;
  schemeName: string;
  isActive: boolean;
}

export interface LineSaleResponseDTO {
  id: number;
  lineSaleId: number;
  partyCode: string;
  accountName: string;
  partyName: string;
  salesOfficerId: number;
  salesOfficer: {
    id: number;
    employeeId: string;
    employeeName: string;
    loginId: string;
    role: string;
  } | null;
  assignedUser: string;
  priceListId: number | null;
  priceList: {
    id: number;
    code: string;
    name: string;
  } | null;
  vehicleNumber: string | null;
  routeName: string | null;
  sapCustomerCode: string | null;
  isActive: boolean;
  depotIds: number[];
  depots: Array<{
    id: number;
    code: string;
    name: string;
    siteName: string;
  }>;
  depotLineSales: LineSaleDepotMappingResponseDTO[];
  nearestDepot: string;
  schemeListIds: number[];
  schemes: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  lineSaleSchemes: LineSaleSchemeMappingResponseDTO[];
  schemeListId: string;
  // UI metadata
  state: string;
  gstn: string;
  contactNo: string;
  geographicalLocation: string;
  upiQr: string;
  createdAt: Date;
  updatedAt: Date;
}
