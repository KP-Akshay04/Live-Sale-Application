import apiClient from './api';
import { GoodsReturn, GoodsReturnItem } from '../types';

export interface ApiGoodsReturnItem {
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

export interface ApiGoodsReturn {
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
  items: ApiGoodsReturnItem[];
}

export interface GoodsReturnFilterParams {
  search?: string;
  goodsIssueId?: number | string;
  depotId?: number | string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface ApiGoodsIssueItemReference {
  id: number;
  productId: number;
  materialCode: string;
  productName: string;
  additionalName: string;
  quantity: number;
  uom: string;
  rate: number;
}

interface ApiGoodsIssueReference {
  id: number;
  goodsIssueId: number;
  documentId: string;
  items: ApiGoodsIssueItemReference[];
}

function normalizeStatus(
  status: string | undefined
): GoodsReturn['status'] {
  const value = (status || '').toUpperCase();

  switch (value) {
    case 'COMPLETED':
      return 'Completed';

    case 'INPROCESS':
    case 'IN PROCESS':
      return 'Inprocess';

    case 'NOT STARTED':
    case 'NOT_STARTED':
      return 'Not Started';

    case 'PENDING':
    default:
      return 'Pending';
  }
}

function mapApiGoodsReturnItemToGoodsReturnItem(
  item: ApiGoodsReturnItem
): GoodsReturnItem {
  return {
    productId: item.materialCode || String(item.productId),
    productName: item.productName || `Product ${item.productId}`,
    additionalName: item.additionalName || '',
    issuedQty: item.issuedQty,
    soldQty: item.soldQty,
    diffQty: Math.max(0, item.issuedQty - item.soldQty),
    qty: item.returnQty,
    uom: item.uom,
    rate: item.rate,
    amount: item.amount,
    confirmed: true,
  };
}

export function mapApiGoodsReturnToGoodsReturn(
  api: ApiGoodsReturn
): GoodsReturn {
  return {
    id: api.returnDocumentId || `GR-${api.id}`,

    depotSite: api.depotName || api.depotCode || '',

    issueEntryRefId:
      api.goodsIssueDocumentId || String(api.goodsIssueId),

    partyCode: api.partyCode || '',
    partyName: api.partyName || '',

    vehicleNum: api.vehicleNumber || '',

    endingReading:
      api.closingMeterReading ?? undefined,

    salesOfficerUsername:
      api.salesOfficerUsername ||
      api.salesOfficerName ||
      'sales',

    returnDate: api.reconciliationDate
      ? api.reconciliationDate.substring(0, 10)
      : api.createdAt
        ? api.createdAt.substring(0, 10)
        : new Date().toISOString().substring(0, 10),

    items: (api.items || []).map(
      mapApiGoodsReturnItemToGoodsReturnItem
    ),

    reason: api.remarks || '',
    notes: api.remarks || '',

    status: normalizeStatus(api.status),
  };
}

async function getSourceGoodsIssue(
  issueReference: string | number
): Promise<ApiGoodsIssueReference> {
  const response = await apiClient.get<{
    success: boolean;
    data: ApiGoodsIssueReference;
  }>(`/goods-issues/${issueReference}`);

  if (!response.data.success || !response.data.data) {
    throw new Error('Unable to retrieve the source Goods Issue.');
  }

  return response.data.data;
}

async function buildCreatePayload(
  ret: Omit<GoodsReturn, 'id' | 'status'>
) {
  if (!ret.issueEntryRefId) {
    throw new Error(
      'Goods Issue reference is required to create a Goods Return.'
    );
  }

  /*
   * The existing frontend GoodsReturn model stores the Goods Issue
   * document reference and material code.
   *
   * The backend requires:
   *   - numeric goodsIssueId
   *   - numeric goodsIssueItemId
   *   - numeric productId
   *
   * Therefore we resolve those IDs from the real Goods Issue API
   * instead of hardcoding or duplicating them in the frontend.
   */
  const goodsIssue = await getSourceGoodsIssue(
    ret.issueEntryRefId
  );

  const issueItems = goodsIssue.items || [];

  const normalizedItems = ret.items
    .filter(
      (item) =>
        item.confirmed !== false &&
        Number(item.qty) > 0
    )
    .map((item) => {
      const sourceItem = issueItems.find(
        (issueItem) =>
          issueItem.materialCode === item.productId ||
          String(issueItem.productId) === String(item.productId)
      );

      if (!sourceItem) {
        throw new Error(
          `Product '${item.productId}' was not found in Goods Issue '${ret.issueEntryRefId}'.`
        );
      }

      return {
        goodsIssueItemId: sourceItem.id,
        productId: sourceItem.productId,

        issuedQty: Number(
          item.issuedQty ?? sourceItem.quantity ?? 0
        ),

        soldQty: Number(item.soldQty ?? 0),

        returnQty: Number(item.qty ?? 0),

        damagedQty: 0,

        uom:
          item.uom ||
          sourceItem.uom ||
          'Pcs',

        rate: Number(
          item.rate ??
          sourceItem.rate ??
          0
        ),
      };
    });

  if (normalizedItems.length === 0) {
    throw new Error(
      'At least one Goods Return item is required.'
    );
  }

  const remarksParts = [
    ret.reason?.trim(),
    ret.notes?.trim(),
  ].filter(Boolean);

  return {
    goodsIssueId: goodsIssue.goodsIssueId || goodsIssue.id,

    closingMeterReading:
      ret.endingReading !== undefined
        ? Number(ret.endingReading)
        : undefined,

    remarks:
      remarksParts.length > 0
        ? remarksParts.join(' | ')
        : undefined,

    items: normalizedItems,
  };
}

export const goodsReturnService = {
  /**
   * Fetch all Goods Returns from the backend.
   */
  async getGoodsReturns(
    filters?: GoodsReturnFilterParams
  ): Promise<GoodsReturn[]> {
    const response = await apiClient.get<{
      success: boolean;
      count: number;
      data: ApiGoodsReturn[];
    }>('/goods-returns', {
      params: filters,
    });

    return (response.data.data || []).map(
      mapApiGoodsReturnToGoodsReturn
    );
  },

  /**
   * Fetch a single Goods Return by numeric ID
   * or return document ID.
   */
  async getGoodsReturnById(
    id: string | number
  ): Promise<GoodsReturn> {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiGoodsReturn;
    }>(`/goods-returns/${id}`);

    return mapApiGoodsReturnToGoodsReturn(
      response.data.data
    );
  },

  /**
   * Create a Goods Return.
   *
   * Resolves the source Goods Issue first so that
   * numeric Prisma IDs are taken from the database.
   */
  async createGoodsReturn(
    ret: Omit<GoodsReturn, 'id' | 'status'>
  ): Promise<GoodsReturn> {
    const payload =
      await buildCreatePayload(ret);

    const response = await apiClient.post<{
      success: boolean;
      data: ApiGoodsReturn;
    }>('/goods-returns', payload);

    return mapApiGoodsReturnToGoodsReturn(
      response.data.data
    );
  },

  /**
   * Update an existing Goods Return.
   */
  async updateGoodsReturn(
    id: string | number,
    ret: Partial<GoodsReturn>
  ): Promise<GoodsReturn> {
    let payload: Record<string, unknown> = {};

    if (ret.endingReading !== undefined) {
      payload.closingMeterReading =
        Number(ret.endingReading);
    }

    const remarksParts = [
      ret.reason?.trim(),
      ret.notes?.trim(),
    ].filter(Boolean);

    if (remarksParts.length > 0) {
      payload.remarks =
        remarksParts.join(' | ');
    }

    if (ret.items) {
      if (!ret.issueEntryRefId) {
        throw new Error(
          'Goods Issue reference is required when updating Goods Return items.'
        );
      }

      const goodsIssue =
        await getSourceGoodsIssue(
          ret.issueEntryRefId
        );

      const issueItems =
        goodsIssue.items || [];

      payload.items = ret.items
        .filter(
          (item) =>
            item.confirmed !== false &&
            Number(item.qty) > 0
        )
        .map((item) => {
          const sourceItem =
            issueItems.find(
              (issueItem) =>
                issueItem.materialCode ===
                  item.productId ||
                String(issueItem.productId) ===
                  String(item.productId)
            );

          if (!sourceItem) {
            throw new Error(
              `Product '${item.productId}' was not found in Goods Issue '${ret.issueEntryRefId}'.`
            );
          }

          return {
            goodsIssueItemId:
              sourceItem.id,

            productId:
              sourceItem.productId,

            issuedQty: Number(
              item.issuedQty ??
                sourceItem.quantity ??
                0
            ),

            soldQty: Number(
              item.soldQty ?? 0
            ),

            returnQty: Number(
              item.qty ?? 0
            ),

            damagedQty: 0,

            uom:
              item.uom ||
              sourceItem.uom ||
              'Pcs',

            rate: Number(
              item.rate ??
                sourceItem.rate ??
                0
            ),
          };
        });
    }

    const response =
      await apiClient.put<{
        success: boolean;
        data: ApiGoodsReturn;
      }>(
        `/goods-returns/${id}`,
        payload
      );

    return mapApiGoodsReturnToGoodsReturn(
      response.data.data
    );
  },

  /**
   * Update Goods Return status.
   */
  async updateGoodsReturnStatus(
    id: string | number,
    status: string
  ): Promise<GoodsReturn> {
    const response =
      await apiClient.patch<{
        success: boolean;
        data: ApiGoodsReturn;
      }>(
        `/goods-returns/${id}/status`,
        { status }
      );

    return mapApiGoodsReturnToGoodsReturn(
      response.data.data
    );
  },
};

export default goodsReturnService;