import { Card, CardHeader, CardTitle, CardContent } from "@/app/_components/ui/card";
import { ClientForm } from "./ClientForm";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-4xl font-medium tracking-tight">New Client</h1>
        <p className="text-muted-foreground mt-1">
          Add a new client to your studio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}

