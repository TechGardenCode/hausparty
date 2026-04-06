import type { Metadata } from "next";
import { ReportsQueue } from "./reports-queue";

export const metadata: Metadata = {
  title: "Reports | hausparty Admin",
};

export default function AdminReportsPage() {
  return <ReportsQueue />;
}
