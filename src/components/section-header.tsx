import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  href?: string;
}

export function SectionHeader({ title, href }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm text-text-secondary hover:text-accent-primary transition-colors"
        >
          See all
        </Link>
      )}
    </div>
  );
}
