import type { Metadata } from "next";
import { HealingPanel } from "./healing-panel";

export const metadata: Metadata = {
  title: "Healing | hausparty Admin",
};

export default function AdminHealingPage() {
  return <HealingPanel />;
}
