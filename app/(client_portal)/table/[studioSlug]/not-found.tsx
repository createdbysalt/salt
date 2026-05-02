import Link from "next/link";
import { Button } from "@repo/ui";
import { ArrowLeftIcon } from "lucide-react";

export default function StudioNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Portal Not Found</h1>
        <p className="text-muted-foreground max-w-sm">
          This portal URL doesn&apos;t exist. Check the URL or contact your
          studio for the correct link.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/table">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Go to Bridge
        </Link>
      </Button>
    </div>
  );
}
