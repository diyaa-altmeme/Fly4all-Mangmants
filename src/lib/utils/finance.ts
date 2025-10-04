// src/lib/utils/finance.ts
export function calcProfit(totalSale?: number, totalCost?: number) {
  const sale = Number(totalSale || 0);
  const cost = Number(totalCost || 0);
  return sale - cost;
}

export function calcRemaining(totalSale?: number, paidAmount?: number) {
  return Number(totalSale || 0) - Number(paidAmount || 0);
}
