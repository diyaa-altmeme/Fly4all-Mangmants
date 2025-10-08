
"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { listAllAuthUsers } from "@/app/users/actions"; // Import the new server action
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

interface SimpleUser {
  uid: string;
  email?: string;
  displayName?: string;
  creationTime: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userList, setUserList] = useState<SimpleUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/auth/login");
      else setUser(u);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth/login");
  };

  const handleFetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    const result = await listAllAuthUsers();
    if (result.success && result.users) {
      setUserList(result.users);
    } else {
      setError(result.error || "An unknown error occurred.");
    }
    setIsLoading(false);
  };

  if (!user) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
        <Card className="w-full max-w-4xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-bold mb-2">مرحباً، {user.displayName || "مستخدم"}</CardTitle>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
                <Button onClick={handleLogout} variant="outline">
                    تسجيل الخروج
                </Button>
            </CardHeader>
            <CardContent>
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">إدارة المستخدمين</h2>
                        <Button onClick={handleFetchUsers} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Users className="mr-2 h-4 w-4" />
                            )}
                            تحميل قائمة المستخدمين
                        </Button>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm mb-4">خطأ: {error}</p>}

                    {userList.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>UID</TableHead>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>البريد الإلكتروني</TableHead>
                                    <TableHead>تاريخ الإنشاء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userList.map((u) => (
                                    <TableRow key={u.uid}>
                                        <TableCell className="font-mono text-xs">{u.uid}</TableCell>
                                        <TableCell>{u.displayName || "-"}</TableCell>
                                        <TableCell>{u.email || "-"}</TableCell>
                                        <TableCell>{u.creationTime}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
