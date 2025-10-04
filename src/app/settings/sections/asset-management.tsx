
      
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, ImageIcon, Link as LinkIcon, Wallpaper } from 'lucide-react';
import type { AppSettings, SiteAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getSiteAssets, assignAsset } from '@/app/settings/assets/actions';
import AssetCard from '@/components/settings/asset-card';
import UploadAssetDialog from '@/components/settings/upload-asset-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


const AssetSlot = ({ label, description, assetUrl, onAssign, assignmentPath, allAssets, onUnassign }: {
    label: string;
    description: string;
    assetUrl?: string | null;
    onAssign: (asset: SiteAsset, path: string) => void;
    assignmentPath: string;
    allAssets: SiteAsset[];
    onUnassign: (path: string) => void;
}) => {
    
    return (
        <Card className="overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-start gap-4">
                <div className="p-3 bg-muted rounded-md">
                     <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CardDescription className="text-xs">{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full relative rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
                    {assetUrl ? (
                         <Image src={assetUrl} alt={label} fill className="object-contain" />
                    ) : (
                        <p className="text-xs text-muted-foreground">غير محدد</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-3 bg-muted/30 border-t flex justify-end gap-2">
                 <Button variant="ghost" size="sm" onClick={() => onUnassign(assignmentPath)} disabled={!assetUrl}>إلغاء التعيين</Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="secondary" size="sm">تغيير الصورة</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {allAssets.map(asset => (
                            <DropdownMenuItem key={asset.id} onClick={() => onAssign(asset, assignmentPath)}>
                                {asset.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                 </DropdownMenu>
            </CardFooter>
        </Card>
    );
};

interface AssetManagementProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function AssetManagementSettings({ settings, onSettingsChanged }: AssetManagementProps) {
    const [assets, setAssets] = useState<SiteAsset[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(true);
    const { toast } = useToast();

    const fetchAssets = useCallback(async () => {
        setLoadingAssets(true);
        getSiteAssets().then(setAssets).finally(() => setLoadingAssets(false));
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleAssign = async (asset: SiteAsset, assignmentPath: string) => {
        const result = await assignAsset(asset.id, asset.fullPath, assignmentPath);
        if (result.success) {
            toast({ title: "تم تعيين الأصل بنجاح" });
            onSettingsChanged(); // This will re-fetch settings and assets via the parent
        } else {
             toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    }
    
     const handleUnassign = async (assignmentPath: string) => {
        const result = await assignAsset('', '', null); // Asset ID and path are not needed for unassign
         if (result.success) {
            toast({ title: "تم إلغاء تعيين الأصل" });
            onSettingsChanged();
         } else {
             toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
         }
    };
    
    const assetSlots = [
        { id: 'theme.assets.sidebar_logo', label: 'شعار الشريط الجانبي', description: 'يظهر في أعلى الشريط الجانبي' },
        { id: 'theme.assets.invoice_logo', label: 'شعار الفواتير والتقارير', description: 'يظهر في ترويسة التقارير المطبوعة' },
    ];

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                 <div>
                    <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5"/>إدارة أصول الموقع</CardTitle>
                    <CardDescription>ارفع وأدر الشعارات والأصول الأخرى المستخدمة في النظام.</CardDescription>
                </div>
                 <UploadAssetDialog onUploadSuccess={fetchAssets}>
                    <Button variant="outline"><Upload className="me-2 h-4 w-4"/>رفع أصل جديد</Button>
                 </UploadAssetDialog>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {assetSlots.map(slot => {
                        const pathParts = slot.id.split('.');
                        let currentVal: any = settings;
                        // Safely traverse the nested object
                        for (const part of pathParts) {
                            currentVal = currentVal?.[part];
                            if (currentVal === undefined) break;
                        }
                        const assetUrl = typeof currentVal === 'string' ? currentVal : null;

                        return (
                            <AssetSlot 
                                key={slot.id} 
                                label={slot.label} 
                                description={slot.description}
                                assetUrl={assetUrl}
                                onAssign={handleAssign}
                                onUnassign={() => handleUnassign(slot.id)}
                                assignmentPath={slot.id}
                                allAssets={assets}
                            />
                        )
                    })}
                </div>
                 <div>
                     <h3 className="font-bold text-lg mb-2">مكتبة الوسائط</h3>
                     <p className="text-sm text-muted-foreground mb-4">جميع الأصول التي تم رفعها. يمكنك تعيين أي منها لأحد الأقسام المخصصة أعلاه.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {loadingAssets 
                            ? [...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-lg" />)
                            : assets.map(asset => (
                                <AssetCard key={asset.id} asset={asset} onDataChange={fetchAssets} />
                            ))
                        }
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
    