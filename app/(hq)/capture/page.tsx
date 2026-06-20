import { redirect } from "next/navigation";

type CaptureRouteProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function CaptureRoute({ searchParams }: CaptureRouteProps) {
  const params = await searchParams;

  if (params.tab === "queue") {
    redirect("/plays");
  }

  redirect("/plays?tab=activity&view=captures");
}
