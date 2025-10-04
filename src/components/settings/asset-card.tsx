
      
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Copy, Trash2, ImageIcon, Wallpaper, Star, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SiteAsset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import DeleteAssetDialog from './delete-asset-dialog';
import { assignAsset } from '@/app/settings/assets/actions';

interface AssetCardProps {
  asset: SiteAsset;
  onDataChange: () => void;
}

const assignmentOptions = [
    { path: 'theme.assets.sidebar_logo', label: 'شعار الشريط الجانبي' },
    { path: 'theme.assets.invoice_logo', label: 'شعار الفواتير' },
];

export default function AssetCard({ asset, onDataChange }: AssetCardProps) {
    const { toast } = useToast();

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(asset.url);
        toast({ title: "تم نسخ الرابط" });
    };
    
    const handleAssign = async (path: string | null) => {
        const result = await assignAsset(asset.id, asset.fullPath, path);
        if (result.success) {
            toast({ title: "تم تعيين الأصل بنجاح" });
            onDataChange();
        } else {
             toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <Card className="group overflow-hidden">
            <CardContent className="p-0">
                <div className="aspect-video w-full relative">
                    <Image
                        src={asset.url}
                        alt={asset.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <ImageIcon className="me-2 h-4 w-4"/>
                                    تعيين إلى...
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {assignmentOptions.map(opt => (
                                        <DropdownMenuItem key={opt.path} onClick={() => handleAssign(opt.path)}>
                                            {asset.assignment === opt.path && <Check className="me-2 h-4 w-4" />}
                                            {opt.label}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                     <DropdownMenuItem onClick={() => handleAssign(null)} className="text-destructive focus:text-destructive">
                                        إلغاء التعيين
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem onSelect={handleCopyUrl}>
                                <Copy className="me-2 h-4 w-4" /> نسخ الرابط
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DeleteAssetDialog asset={asset} onAssetDeleted={onDataChange}>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="me-2 h-4 w-4" /> حذف
                                </DropdownMenuItem>
                            </DeleteAssetDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {asset.assignment && (
                         <Badge className="absolute bottom-2 right-2">{assignmentOptions.find(o => o.path === asset.assignment)?.label || asset.assignment}</Badge>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-3 flex flex-col items-start text-xs">
                <p className="font-semibold text-sm truncate w-full">{asset.name}</p>
                <div className="text-muted-foreground w-full flex justify-between">
                    <span>{((asset.size || 0) / 1024).toFixed(1)} KB</span>
                    <span>{format(new Date(asset.uploadedAt), 'yyyy-MM-dd')}</span>
                </div>
            </CardFooter>
        </Card>
    );
}
    