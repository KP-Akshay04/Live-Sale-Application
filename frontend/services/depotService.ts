import apiClient from './api';
import { Depot } from '../types';

export interface DepotApiResponse {
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
  userCount?: number;
  lineSaleCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepotFilterParams {
  search?: string;
  isActive?: boolean;
  city?: string;
}

export interface CreateDepotPayload {
  code?: string;
  depotCode?: string;
  name?: string;
  siteName: string;
  description?: string;
  location?: string;
  address: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state?: string;
  pin: string;
  phone?: string;
  contactNumber?: string;
  gst: string;
  salesTag?: string;
  sapPlantCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadius?: number | null;
  isActive?: boolean;
  assignedUser?: string;
  assignedLines?: string[];
}

export interface UpdateDepotPayload {
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
  sapPlantCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadius?: number | null;
  isActive?: boolean;
  assignedUser?: string;
  assignedLines?: string[];
}

function mapApiDepotToFrontendDepot(apiDepot: DepotApiResponse): Depot {
  return {
    id: apiDepot.id,
    depotId: apiDepot.id,
    code: apiDepot.code,
    depotCode: apiDepot.depotCode || apiDepot.code,
    siteName: apiDepot.siteName || apiDepot.name,
    name: apiDepot.name || apiDepot.siteName,
    description: apiDepot.description || '',
    location: apiDepot.location || '',
    address: apiDepot.address || '',
    addressLine2: apiDepot.addressLine2 || '',
    city: apiDepot.city || '',
    district: apiDepot.district || '',
    state: apiDepot.state || 'Karnataka',
    pin: apiDepot.pin || '',
    gst: apiDepot.gst || '',
    contactNumber: apiDepot.contactNumber || apiDepot.phone || '',
    phone: apiDepot.phone || apiDepot.contactNumber || '',
    salesTag: apiDepot.salesTag || '',
    sapPlantCode: apiDepot.sapPlantCode || null,
    latitude: apiDepot.latitude ?? null,
    longitude: apiDepot.longitude ?? null,
    allowedRadius: apiDepot.allowedRadius ?? null,
    isActive: apiDepot.isActive,
    assignedUser: apiDepot.assignedUser || '',
    assignedLines: apiDepot.assignedLines || [],
    userCount: apiDepot.userCount || 0,
    lineSaleCount: apiDepot.lineSaleCount || 0,
  };
}

export const depotService = {
  /**
   * Fetch all logistics depots with optional filtering
   */
  async getDepots(params?: DepotFilterParams): Promise<Depot[]> {
    const response = await apiClient.get<{ success: boolean; data: DepotApiResponse[] }>('/depots', {
      params,
    });
    return (response.data.data || []).map(mapApiDepotToFrontendDepot);
  },

  /**
   * Fetch single depot by ID or code
   */
  async getDepot(id: number | string): Promise<Depot> {
    const response = await apiClient.get<{ success: boolean; data: DepotApiResponse }>(`/depots/${id}`);
    return mapApiDepotToFrontendDepot(response.data.data);
  },

  /**
   * Register a new depot in MySQL
   */
  async createDepot(payload: CreateDepotPayload): Promise<Depot> {
    const body = {
      ...payload,
      code: payload.depotCode || payload.code || payload.siteName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 30),
      name: payload.siteName || payload.name,
      phone: payload.contactNumber || payload.phone,
    };
    const response = await apiClient.post<{ success: boolean; message: string; data: DepotApiResponse }>(
      '/depots',
      body
    );
    return mapApiDepotToFrontendDepot(response.data.data);
  },

  /**
   * Update an existing depot in MySQL
   */
  async updateDepot(id: number | string, payload: UpdateDepotPayload): Promise<Depot> {
    const body = {
      ...payload,
      code: payload.depotCode || payload.code,
      name: payload.siteName || payload.name,
      phone: payload.contactNumber || payload.phone,
    };
    const response = await apiClient.put<{ success: boolean; message: string; data: DepotApiResponse }>(
      `/depots/${id}`,
      body
    );
    return mapApiDepotToFrontendDepot(response.data.data);
  },

  /**
   * Activate or deactivate a depot in MySQL
   */
  async updateDepotStatus(id: number | string, isActive: boolean): Promise<Depot> {
    const response = await apiClient.patch<{ success: boolean; message: string; data: DepotApiResponse }>(
      `/depots/${id}/status`,
      { isActive }
    );
    return mapApiDepotToFrontendDepot(response.data.data);
  },
};
