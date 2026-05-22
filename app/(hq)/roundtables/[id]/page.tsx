import { TableCommandCenterPage } from "@/app/_features/table-command-center/components/TableCommandCenterPage";

interface RoundtableDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function RoundtableDetailRoute({ params }: RoundtableDetailRouteProps) {
  const { id } = await params;

  return <TableCommandCenterPage view="detail" tableId={id} />;
}
