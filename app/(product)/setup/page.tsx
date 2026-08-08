import { SetupChecklist } from "@/app/_features/setup/components/SetupChecklist";

export default function SetupRoute() {
  return (
    <div className="relative min-h-full">
      <div className="mx-auto w-full max-w-3xl py-8">
        <SetupChecklist />
      </div>
    </div>
  );
}
