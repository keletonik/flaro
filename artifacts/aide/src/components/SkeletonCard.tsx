export function SkeletonCard() {
  return (
    <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="h-4 bg-[#242433] rounded w-24 skeleton-pulse" />
        <div className="flex gap-2">
          <div className="h-5 bg-[#242433] rounded w-16 skeleton-pulse" />
          <div className="h-5 bg-[#242433] rounded w-20 skeleton-pulse" />
        </div>
      </div>
      <div className="h-4 bg-[#242433] rounded w-3/4 skeleton-pulse" />
      <div className="h-3 bg-[#242433] rounded w-1/2 skeleton-pulse" />
    </div>
  );
}
