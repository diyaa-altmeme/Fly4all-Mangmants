import { getBoxes } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import BoxesContent from "./components/boxes-content";

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
    <BoxesContent initialBoxes={boxes} />
  );
}
