

"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { addMultipleClients } from "@/app/clients/actions";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";

interface SaveImportProps {
    data: any[];
    onSaveComplete: () => Promise<void>;
}

export default function SaveImport({ data, onSaveComplete }: SaveImportProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await addMultipleClients(data);
      if (result.success) {
          toast({ title: `تم حفظ ${result.count} سجل بنجاح!`, description: 'سيتم تحديث قائمة العلاقات.' });
          await onSaveComplete();
          router.refresh();
      } else {
          throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message || "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                جاهز للحفظ
            </CardTitle>
            <CardDescription>
                تمت معالجة البيانات وهي جاهزة للحفظ في النظام.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-4xl font-bold">{data.length}</p>
            <p className="text-muted-foreground">سجلًا سيتم استيراده.</p>
        </CardContent>
        <CardFooter>
             <Button className="w-full" size="lg" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                    <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin"/>
                        جاري الحفظ...
                    </>
                ) : (
                    "تأكيد وحفظ البيانات"
                )}
            </Button>
        </CardFooter>
    </Card>
  );
}
