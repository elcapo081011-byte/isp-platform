export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="status-panel status-panel--neutral">
      <SkeletonLine className="w-16 mb-3" />
      <SkeletonLine className="w-10 h-7 mb-2" />
      <SkeletonLine className="w-24" />
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-t border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonLine className="w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}
