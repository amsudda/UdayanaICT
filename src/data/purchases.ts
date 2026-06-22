/**
 * Pack purchase requests (mock persistence until the backend exists).
 *
 * Flow: student submits a bank-transfer slip for a pack -> a `pending`
 * request is stored. The tutor's admin panel later flips it to `approved`
 * (unlocks the pack into My Classes) or `rejected`. This localStorage shape
 * mirrors what the backend `purchase_requests` table would hold.
 */

export type PurchaseStatus = 'pending' | 'approved' | 'rejected';

export interface PurchaseRequest {
  id: string;
  packId: string;
  packTitle: string;
  packType: string;
  thumbnailUrl: string;
  amount: number;
  reference: string;
  slipImage?: string;
  status: PurchaseStatus;
  submittedAt: string;
}

const KEY = 'ict-purchase-requests';

export function getPurchaseRequests(): PurchaseRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PurchaseRequest[];
  } catch {
    return [];
  }
}

export function addPurchaseRequest(
  req: Omit<PurchaseRequest, 'id' | 'status' | 'submittedAt'>
): PurchaseRequest[] {
  const entry: PurchaseRequest = {
    ...req,
    id: `pur_${Date.now()}`,
    status: 'pending',
    submittedAt: new Date().toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
  };
  const next = [entry, ...getPurchaseRequests()];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** Latest request for a pack, if any (used to show Buy / Pending / Owned). */
export function requestForPack(list: PurchaseRequest[], packId: string) {
  return list.find((r) => r.packId === packId);
}
