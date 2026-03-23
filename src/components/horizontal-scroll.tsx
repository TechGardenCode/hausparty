export function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle [-ms-overflow-style:none] [scrollbar-width:thin] snap-x snap-mandatory">
      {children}
    </div>
  );
}
