import { Card, CardHeader, CardTitle, CardContent } from "@/app/_components/ui/card";
import { ClientForm } from "./ClientForm";
import { PageHeader } from "@repo/patterns";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="New Client"
        description="Add a new client to your studio"
        noBorder
      />

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

