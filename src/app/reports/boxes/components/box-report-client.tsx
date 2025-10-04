
      

"use client";

import { useState, useEffect } from "react";
import type { Box, Client, Supplier } from '@/lib/types';
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import ReportGenerator from "@/components/reports/report-generator";
import { Card, CardContent } from "@/components/ui/card";

interface BoxReportClientProps {
    boxes: Box[];
    clients: Client[];
    suppliers: Supplier[];
    initialBoxId?: string;
}

export default function BoxReportClient({ boxes, clients, suppliers, initialBoxId }: BoxReportClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedBoxId, setSelectedBoxId] = useState<string | undefined>(initialBoxId || searchParams.get('boxId') || undefined);

    const handleBoxChange = (boxId: string) => {
        setSelectedBoxId(boxId);
        router.push(`/reports/boxes?boxId=${boxId}`);
    };

    return (
        <div className="space-y-6">
            <div className="w-full sm:w-72">
                 <Label>اختر الصندوق</Label>
                 <Select value={selectedBoxId} onValueChange={handleBoxChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر صندوقًا لعرض تقريره..." />
                    </SelectTrigger>
                    <SelectContent>
                        {boxes.map(box => (
                            <SelectItem key={box.id} value={box.id}>{box.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {selectedBoxId && (
                 <ReportGenerator
                    boxes={boxes}
                    clients={clients}
                    suppliers={suppliers}
                    defaultAccountId={selectedBoxId}
                />
            )}
            {!selectedBoxId && (
                <Card className="mt-4">
                    <CardContent className="p-8 text-center text-muted-foreground">
                        الرجاء اختيار صندوق من القائمة أعلاه لعرض كشف الحساب الخاص به.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

    