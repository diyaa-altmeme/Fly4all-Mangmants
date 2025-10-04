"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Calendar, CheckCircle, Clock, DollarSign, Edit, Frown, Coffee, Coins, FileText, Ticket, CreditCard, ShieldCheck, Bell, ArrowLeft, Mail, Phone, MapPin, CircleUserRound } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { User, AttendanceLog, Notification, Box, Role } from "@/lib/types";
import { getCurrentUserFromSession } from "@/app/auth/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getUserProfileStats, type UserProfileStats } from "./actions";
import { getNotificationsForUser } from "../notifications/actions";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import UserFormDialog from "@/app/users/components/user-form-dialog";
import { getBoxes } from "../boxes/actions";
import { getRoles } from "../users/actions";


const StatCard = ({ icon: Icon, label, value, currency, colorClass }: { icon: React.ElementType, label: string, value: string | number, currency?: string, colorClass: string }) => (
    <div className="flex items-center p-4 bg-background rounded-2xl border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
        <div className={cn("p-3 rounded-full mr-4", colorClass)}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <div className="text-sm text-muted-foreground font-bold">{label}</div>
            <div className="text-2xl font-bold">{value} <span className="text-sm">{currency}</span></div>
        </div>
    </div>
);

const ProfileHeader = ({ user, boxes, roles, onUserUpdated }: { user: User, boxes: Box[], roles: Role[], onUserUpdated: () => void }) => (
    <Card className="overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-primary to-accent">
            <Avatar className="w-28 h-28 border-4 border-background absolute -bottom-14 right-6 shadow-md">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-4xl"><CircleUserRound className="h-20 w-20 text-muted-foreground"/></AvatarFallback>
            </Avatar>
        </div>
        <CardHeader className="pt-20">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                 <div className="text-center sm:text-right w-full sm:w-auto">
                    <CardTitle className="text-2xl sm:text-3xl font-bold">{user.name}</CardTitle>
                    <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1">@{user.username} | {user.position || 'موظف'}</CardDescription>
                     <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2"><Mail className="h-4 w-4"/> {user.email}</span>
                        <span className="flex items-center gap-2"><Phone className="h-4 w-4"/> {user.phone}</span>
                        <span className="flex items-center gap-2"><MapPin className="h-4 w-4"/> {user.department || 'القسم العام'}</span>
                     </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <UserFormDialog isEditing user={user} boxes={boxes} roles={roles} onUserUpdated={onUserUpdated}>
                        <Button variant="outline" className="w-full sm:w-auto">تعديل الملف الشخصي</Button>
                    </UserFormDialog>
                     <Button className="w-full sm:w-auto">تغيير كلمة المرور</Button>
                </div>
            </div>
        </CardHeader>
    </Card>
);


export default function UserProfilePage() {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUserFromSession();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    // Type guard to ensure it's a User, not a Client
    if (!('role' in user)) {
       router.push('/'); // Or a dedicated client profile page
       return;
    }

    setUserInfo(user);
    
    const [userStats, userNotifications, boxesData, rolesData] = await Promise.all([
        getUserProfileStats(user.name),
        getNotificationsForUser(user.uid, { limit: 5 }),
        getBoxes(),
        getRoles()
    ]);
    setStats(userStats);
    setNotifications(userNotifications);
    setBoxes(boxesData);
    setRoles(rolesData);
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 w-full lg:col-span-2 rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        </div>
    );
  }
  
  if (!userInfo) {
      // This state should ideally not be reached due to the redirect
      return <div>لم يتم العثور على بيانات المستخدم.</div>;
  }
  
  const attendanceData: AttendanceLog[] = userInfo.attendance || [];
  const salaryData = {
    baseSalary: userInfo.baseSalary || 0,
    bonuses: userInfo.bonuses || 0,
    deductions: userInfo.deductions || 0,
    totalProfitShare: (stats?.totalProfit || 0),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ProfileHeader user={userInfo} boxes={boxes} roles={roles} onUserUpdated={fetchData}/>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="السندات المدخلة" value={stats?.vouchersCount || 0} colorClass="bg-blue-500" />
        <StatCard icon={Ticket} label="التذاكر المدخلة" value={stats?.bookingsCount || 0} colorClass="bg-orange-500" />
        <StatCard icon={CreditCard} label="الفيز المدخلة" value={stats?.visasCount || 0} colorClass="bg-fuchsia-500" />
        <StatCard icon={DollarSign} label="إجمالي الأرباح" value={stats?.totalProfit.toFixed(2) || '0.00'} currency="USD" colorClass="bg-green-500" />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>سجل الحضور والرواتب</CardTitle>
                        <CardDescription>ملخص الحضور والغياب والبيانات المالية المتعلقة بالراتب.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الشهر</TableHead>
                                        <TableHead><Calendar className="h-4 w-4 inline-block me-1"/> أيام الدوام الفعلية</TableHead>
                                        <TableHead><Frown className="h-4 w-4 inline-block me-1"/> الغيابات</TableHead>
                                        <TableHead><Coffee className="h-4 w-4 inline-block me-1"/> الإجازات</TableHead>
                                        <TableHead><Clock className="h-4 w-4 inline-block me-1"/> ساعات إضافية</TableHead>
                                        <TableHead><DollarSign className="h-4 w-4 inline-block me-1"/> الخصومات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceData.map(log => (
                                        <TableRow key={log.month}>
                                            <TableCell className="font-semibold">{log.month}</TableCell>
                                            <TableCell>{log.actualWorkDays} / {log.officialWorkDays}</TableCell>
                                            <TableCell className={log.absences > 0 ? 'text-destructive font-bold' : ''}>{log.absences}</TableCell>
                                            <TableCell>{log.vacations}</TableCell>
                                            <TableCell className={log.overtimeHours > 0 ? 'text-green-600 font-bold' : ''}>{log.overtimeHours}</TableCell>
                                            <TableCell className={log.deductions > 0 ? 'text-destructive font-bold' : ''}>{log.deductions}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <Card className="mt-4 bg-muted/30">
                            <CardHeader><CardTitle className="text-base">ملخص الراتب</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-2">
                                    <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                                    <p className="font-bold text-lg">{salaryData.baseSalary} $</p>
                                </div>
                                <div className="p-2">
                                    <p className="text-sm text-muted-foreground">المكافآت والحوافز</p>
                                    <p className="font-bold text-lg text-green-600">{salaryData.bonuses} $</p>
                                </div>
                                <div className="p-2">
                                    <p className="text-sm text-muted-foreground">إجمالي الخصومات</p>
                                    <p className="font-bold text-lg text-destructive">{salaryData.deductions} $</p>
                                </div>
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <p className="text-sm font-semibold text-primary">الراتب المستحق</p>
                                    <p className="font-bold text-xl text-primary">{salaryData.baseSalary - salaryData.deductions + salaryData.bonuses} $</p>
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>النشاط العام</CardTitle>
                        <CardDescription>عدد العمليات التي قمت بها خلال الأشهر الماضية.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={[]}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>آخر الإشعارات</CardTitle>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <p className="text-muted-foreground text-center p-4">لا توجد إشعارات.</p>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((n, index) => (
                                <React.Fragment key={n.id}>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-muted rounded-full">
                                            <Bell className="h-5 w-5 text-primary"/>
                                        </div>
                                        <div>
                                            <Link href={n.link || '#'} className="font-semibold hover:underline">{n.title}</Link>
                                            <p className="text-sm text-muted-foreground">{n.body}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                                            </p>
                                        </div>
                                    </div>
                                    {index < notifications.length - 1 && <Separator />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href="/notifications">
                            عرض كل الإشعارات
                            <ArrowLeft className="h-4 w-4 mr-2" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>

       </div>
    </div>
  );
}