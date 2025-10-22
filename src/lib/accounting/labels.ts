
export function mapVoucherLabel(type?: string) {
  const labels: Record<string, string> = {
    segment: "سكمنت",
    subscription: "اشتراك",
    booking: "تذكرة طيران",
    visa: "فيزا",
    "profit-sharing": "توزيع أرباح",
    standard_receipt: "سند قبض",
    payment: "سند دفع",
    expense: "سند مصروف",
    manual_journal: "قيد يدوي",
  };
  return type && labels[type] ? labels[type] : "عملية مالية";
}
