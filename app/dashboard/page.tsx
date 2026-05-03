import { auth } from "@/lib/auth";
import { dashboardRedirect } from "@/app/actions/auth";

export default async function DashboardRouter() {
  await auth();
  await dashboardRedirect();
}
