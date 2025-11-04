
import { getVoucherTypeLabel } from "@/lib/accounting/voucher-types";

export function mapVoucherLabel(type?: string) {
  return getVoucherTypeLabel(type);
}
