
"use client";

import React from 'react';
import type { Client, CardThemeSettings, RelationSection, CustomRelationField } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Mail, Store, MoreHorizontal, Users, FileText, Building, User as UserIcon, Info, Edit, CircleUserRound, MapPin, Briefcase, KeyRound, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useThemeCustomization } from '@/context/theme-customization-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteClient } from '@/app/clients/actions';
import CredentialsDialog from '@/app/clients/components/credentials-dialog';

const getFieldIcon = (fieldId: string) => {
    if (fieldId.includes('phone')) return <Phone className="h-4 w-4 text-primary" />;
    if (fieldId.includes('email')) return <Mail className="h-4 w-4 text-primary" />;
    return <Info className="h-4 w-4 text-primary" />;
};


export default function ClientCard({ client, relationSections, onClientUpdated }: { 
    client: Client, 
    relationSections: RelationSection[],
    onClientUpdated: (updatedClient?: Client, deletedId?: string) => void;
}) {
  const { cardSettings } = useThemeCustomization();
  const router = useRouter();
  const { toast } = useToast();


  const handleDelete = async (id: string) => {
    if (client.useCount && client.useCount > 0) {
        toast({
            title: "لا يمكن الحذف",
            description: "لا يمكن حذف هذه العلاقة لوجود معاملات مالية مرتبطة بها.",
            variant: "destructive",
        });
        return;
    }
    
    onClientUpdated(undefined, id);

    const result = await deleteClient(id);
    if (!result.success) {
        toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        router.refresh();
    }
  };

  const { relationTypeLabel, Icon, entityTypeLabel, gradientStyle } = React.useMemo(() => {
    let Icon;
    let label;
    let gradientCss = {};

    const cs = cardSettings || {};

    switch (client.relationType) {
      case 'supplier':
        Icon = Store;
        label = 'مورد';
        gradientCss = { background: `linear-gradient(to right, ${cs.headerSupplierColorFrom || 'hsl(var(--accent))'}, ${cs.headerSupplierColorTo || 'hsl(var(--accent))'})` };
        break;
      case 'both':
        Icon = Users;
        label = 'عميل ومورد';
        gradientCss = { background: `linear-gradient(to right, ${cs.headerBothColorFrom || 'hsl(var(--primary))'}, ${cs.headerBothColorTo || 'hsl(var(--accent))'})` };
        break;
      case 'client':
      default:
        Icon = Users;
        label = 'عميل';
        gradientCss = { background: `linear-gradient(to right, ${cs.headerClientColorFrom || 'hsl(var(--primary))'}, ${cs.headerClientColorTo || 'hsl(var(--primary))'})` };
        break;
    }
    
    return { 
      relationTypeLabel: label, 
      Icon, 
      entityTypeLabel: client.type === 'company' ? 'شركة' : 'فرد', 
      gradientStyle: gradientCss,
    };
  }, [client.relationType, client.type, cardSettings]);
  
  const paymentTypeField = React.useMemo(() => 
      relationSections.flatMap(s => s.fields).find(f => f.id === 'paymentType'),
  [relationSections]);

  const paymentTypeOption = React.useMemo(() => 
      paymentTypeField?.options?.find(opt => opt.value === client.paymentType),
  [paymentTypeField, client.paymentType]);

  const paymentTypeLabel = paymentTypeOption?.label || client.paymentType;
  const paymentTypeClass = client.paymentType === 'credit' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600';
  
  const EntityIcon = client.type === 'company' ? Building : UserIcon;
  const address = [client.country, client.province, client.streetAddress].filter(Boolean).join('، ');

  const customFields = React.useMemo(() => {
      if (!relationSections || !Array.isArray(relationSections)) return [];
      const allFields = relationSections.flatMap(s => s.fields);
      const customData: { label: string, value: any, id: string }[] = [];
      const hardcodedFields = ['name', 'type', 'relationType', 'status', 'paymentType', 'country', 'province', 'streetAddress', 'avatarUrl', 'password', 'createdAt', 'createdBy', 'balance', 'lastTransaction', 'useCount', 'id', 'loginIdentifier'];

      allFields.forEach(field => {
          if (!hardcodedFields.includes(field.id) && client[field.id]) {
              customData.push({ id: field.id, label: field.label, value: client[field.id] });
          }
      });
      return customData;
  }, [client, relationSections]);

  return (
    <Card 
        className="flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-xl"
    >
      <CardHeader 
        className="relative p-4 flex flex-row items-center gap-4 text-primary-foreground rounded-t-xl"
        style={gradientStyle}
      >
        <Avatar className="h-16 w-16 border-4 border-background/50 shrink-0 shadow-sm">
            <AvatarImage src={client.avatarUrl} alt={client.name} />
            <AvatarFallback className="text-xl text-foreground"><CircleUserRound className="h-10 w-10 text-muted-foreground"/></AvatarFallback>
        </Avatar>
        <div className="flex-grow min-w-0">
          <CardTitle className="font-bold text-lg truncate" title={client.name}>
             <Link href={`/clients/${client.id}`} className="hover:underline flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {client.name}
                 {client.password && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CheckCircle className="h-5 w-5 text-lime-300" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>هذه العلاقة لديها حساب فعال لتسجيل الدخول.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 )}
             </Link>
          </CardTitle>
          <CardDescription className="text-xs flex items-center gap-2 mt-2 text-white/80">
             <Badge variant="outline" className="bg-white/10 border-white/20 text-white"><Icon className="me-1.5 h-3 w-3" />{relationTypeLabel}</Badge>
             <Badge variant="outline" className="bg-white/10 border-white/20 text-white"><EntityIcon className="me-1.5 h-3 w-3" />{entityTypeLabel}</Badge>
          </CardDescription>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-background/20 text-white">
                    <MoreHorizontal className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                 <DropdownMenuItem asChild>
                    <Link href={`/clients/${client.id}`} className="justify-end w-full flex items-center gap-2"><span>عرض البروفايل</span><FileText className="h-4 w-4"/></Link>
                </DropdownMenuItem>
                 <AddClientDialog isEditing initialData={client} onClientUpdated={onClientUpdated}>
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="w-full flex justify-between">
                          <span>تعديل</span><Edit className="h-4 w-4"/>
                       </DropdownMenuItem>
                </AddClientDialog>
                <CredentialsDialog client={client} onCredentialsUpdated={onClientUpdated}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-end w-full flex items-center gap-2">
                        <span>إدارة الدخول</span><KeyRound className="h-4 w-4"/>
                    </DropdownMenuItem>
                </CredentialsDialog>
                <DropdownMenuItem asChild>
                     <Link href={`/reports/account-statement?accountId=${client.id}`} className="justify-end w-full flex items-center gap-2">
                       <span>كشف الحساب</span>
                       <FileText className="h-4 w-4"/>
                    </Link>
                </DropdownMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-600 justify-between w-full"><span>حذف</span><Trash2 className="h-4 w-4"/></DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                هذا الإجراء سيحذف السجل بشكل دائم. لا يمكن حذف علاقة مرتبطة بحسابات مالية.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(client.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="px-4 py-3 flex-grow text-sm text-muted-foreground space-y-2">
          {address && (
            <div className="flex items-center justify-end gap-2">
                <span className="font-semibold text-foreground">{address}</span>
                <MapPin className="h-4 w-4 text-primary" />
            </div>
          )}
          {customFields.length > 0 && address && <Separator className="my-2" />}
          {customFields.map(field => (
             <div key={field.id} className="flex items-center justify-end gap-2">
                <span className="font-semibold text-foreground truncate">{field.value}</span>
                 {getFieldIcon(field.id)}
            </div>
          ))}
      </CardContent>
      
      <CardFooter 
        className="p-2 bg-muted/30 flex justify-between items-center text-xs border-t"
      >
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground cursor-default">
                        <Info className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="whitespace-nowrap">
                    <p>أضيف بواسطة: {client.createdBy}</p>
                    <p>في: {client.createdAt ? format(parseISO(client.createdAt), 'yyyy-MM-dd') : 'N/A'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-1">
             {client.paymentType && (
                 <Badge className={cn('px-2 py-0.5 text-white', paymentTypeClass)}>
                  {paymentTypeLabel}
                </Badge>
             )}
            <Badge variant={client.status === 'active' ? 'default' : 'destructive'} className={cn(client.status === 'active' ? 'bg-green-500' : 'bg-red-500', 'px-2 py-0.5 text-white')}>
              {client.status === 'active' ? 'نشط' : 'غير نشط'}
            </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}
