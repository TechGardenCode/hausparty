import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Icon className="h-12 w-12 text-text-tertiary" />
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
