export interface DepotResponseDTO {
  id: number;
  depotId: number;
  code: string;
  depotCode: string;
  name: string;
  siteName: string;
  description: string;
  location: string;
  address: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  phone: string;
  contactNumber: string;
  gst: string;
  salesTag: string;
  sapPlantCode: string | null;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadius?: number | null;
  isActive: boolean;
  assignedUser: string;
  assignedLines: string[];
  userCount: number;
  lineSaleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepotDTO {
  code?: string;
  depotCode?: string;
  name?: string;
  siteName?: string;
  description?: string;
  location?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
  phone?: string;
  contactNumber?: string;
  gst?: string;
  salesTag?: string;
  sapPlantCode?: string;
  latitude?: number;
  longitude?: number;
  allowedRadius?: number;
  isActive?: boolean;
  assignedUser?: string;
  assignedLines?: string[];
}

export interface UpdateDepotDTO {
  code?: string;
  depotCode?: string;
  name?: string;
  siteName?: string;
  description?: string;
  location?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
  phone?: string;
  contactNumber?: string;
  gst?: string;
  salesTag?: string;
  sapPlantCode?: string;
  latitude?: number;
  longitude?: number;
  allowedRadius?: number;
  isActive?: boolean;
  assignedUser?: string;
  assignedLines?: string[];
}

export interface DepotFilterQuery {
  search?: string;
  isActive?: boolean;
  state?: string;
  city?: string;
}
