
import { getBoxes } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import BoxesContent from "./components/boxes-content";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function BoxesPage() {
  const [boxes, error] = await getBoxes().then(res => [res, null]).catch(e => [null, e.message]);
  
  if (error || !boxes) {
      return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل الصناديق."}</AlertDescription>
            </Alert>
        )
  }

  return (
    <div className="space-y-6">
      <CardHeader className="px-0 sm:px-6">
        <CardTitle>إدارة الصناديق</CardTitle>
        <CardDescription>عرض وإدارة جميع الصناديق المالية في النظام.</CardDescription>
      </CardHeader>
      <BoxesContent initialBoxes={boxes} />
    </div>
  );
}
