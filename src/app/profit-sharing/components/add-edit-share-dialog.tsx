
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type ProfitShare, saveProfitShare, updateProfitShare } from "../actions";
import { Loader2, Save, Percent } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";

const formSchema = z.object({
  partnerId: z.string().min(1, "اسم الشريك مطلوب."),
  percentage: z.coerce.number().min(0, "النسبة يجب أن تكون موجبة.").max(100, "النسبة لا يمكن أن تتجاوز 100."),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditShareDialogProps {
  isEditing?: boolean;
  share?: ProfitShare;
  monthId: string;
  totalProfit: number;
  partners: { id: string; name: string }[];
  onSuccess: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function AddEditShareDialog({
  isEditing = false,
  share,
  monthId,
  totalProfit,
  partners,
  onSuccess,
  children,
  disabled,
}: AddEditShareDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const partnerOptions = partners.map(p => ({ value: p.id, label: p.name }));
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? {
        partnerId: share?.partnerId,
        percentage: share?.percentage,
        notes: share?.notes
    } : {
        partnerId: '',
        percentage: 0,
        notes: ''
    },
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
      if(open) {
          form.reset(isEditing ? {
            partnerId: share?.partnerId,
            percentage: share?.percentage,
            notes: share?.notes
        } : {
            partnerId: '',
            percentage: 0,
            notes: ''
        });
      }
  }, [open, form, isEditing, share]);

  const handleSubmit = async (data: FormValues) => {
    const amount = (totalProfit * data.percentage) / 100;
    const partner = partners.find(p => p.id === data.partnerId);

    if (!partner) {
        toast({ title: "خطأ", description: "الشريك المختار غير صحيح.", variant: "destructive" });
        return;
    }

    const payload = {
      profitMonthId: monthId,
      partnerId: partner.id,
      partnerName: partner.name,
      percentage: data.percentage,
      amount: amount,
      notes: data.notes,
    };

    const result = isEditing && share ? await updateProfitShare(share.id, payload) : await saveProfitShare(payload);

    if (result.success) {
      toast({ title: `تم ${isEditing ? "تحديث" : "إضافة"} الحصة بنجاح` });
      onSuccess();
      setOpen(false);
    } else {
      toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? "تعديل حصة الشريك" : "إضافة توزيع جديد"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid gap-4">
               <FormField
                    control={form.control}
                    name="partnerId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الشريك</FormLabel>
                            <FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر شريكًا..."/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
               <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>النسبة المئوية</FormLabel>
                            <div className="relative">
                                <FormControl><Input type="text" inputMode="decimal" {...field} className="pe-7"/></FormControl>
                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ملاحظات (اختياري)</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'حفظ التعديلات' : 'إضافة الحصة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
