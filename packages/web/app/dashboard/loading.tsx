import { KidsLoader } from "@/components/kids-loader";

/**
 * Route-level loading UI for the dashboard. Renders inside the shell (the
 * sidebar stays put) while a page segment streams in, so navigation never
 * shows a blank gap.
 */
export default function DashboardLoading() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <KidsLoader size="lg" />
    </div>
  );
}
