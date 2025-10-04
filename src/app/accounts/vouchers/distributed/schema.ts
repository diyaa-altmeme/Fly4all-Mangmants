

import { z } from "zod";
import type { DistributedVoucherSettings } from "../settings/components/distributed-settings-form";

// This function creates a Zod schema dynamically based on the channels from settings.
export const createDistributedReceiptSchema = (
  channels: DistributedVoucherSettings['distributionChannels'] = []
) => {
  const dynamicFields = channels.reduce((acc, channel) => {
    acc[channel.id] = z.object({
        enabled: z.boolean().default(true),
        amount: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val >= 0).optional(),
    });
    return acc;
  }, {} as Record<string, z.ZodTypeAny>);

  return z.object({
    date: z.date(),
    userId: z.string().min(1, "المستخدم مطلوب"),
    reference: z.string().optional(),
    accountId: z.string().min(1, "الحساب مطلوب"),
    boxId: z.string().min(1, "الصندوق مطلوب"),
    currency: z.enum(["USD", "IQD"]),
    exchangeRate: z.coerce.number().optional(),
    totalAmount: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val > 0, { message: "المبلغ الإجمالي يجب أن يكون أكبر من صفر" }),
    details: z.string().optional(),
    companyAmount: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val >= 0, { message: "مبلغ الشركة لا يمكن أن يكون سالبًا."}).optional(),
    distributions: z.object(dynamicFields),
  }).refine((data) => {
    // This validation only applies if there is any distribution.
    const totalDistributedFromList = Object.values(data.distributions).reduce((sum, item: any) => {
        return sum + (item.enabled ? (Number(item.amount) || 0) : 0);
    }, 0);
    const companyAmount = data.companyAmount || 0;
    
    // If no distribution is made, the check is not necessary.
    if (totalDistributedFromList === 0 && companyAmount === 0 && data.totalAmount > 0) {
        return true;
    }
    
    const totalDistributed = totalDistributedFromList + companyAmount;

    // Use a small tolerance for floating point comparisons
    return Math.abs(totalDistributed - data.totalAmount) < 0.01;
  }, {
    message: "مجموع مبالغ التوزيع وحصة الشركة لا يساوي المبلغ المستلم.",
    path: ["companyAmount"], // Point error to the most relevant field
  });
};

// We export the type based on the function for consistency, though it's dynamic.
export type DistributedReceiptInput = z.infer<ReturnType<typeof createDistributedReceiptSchema>>;
