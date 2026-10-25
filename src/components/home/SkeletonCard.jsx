export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#eceae4] overflow-hidden animate-pulse flex flex-col w-full h-[360px] justify-between shadow-2xs p-3 sm:p-3.5">
      <div className="bg-[#eceae4]/70 aspect-video w-full rounded-xl sm:rounded-2xl" />
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1">
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-[#eceae4] rounded w-3/4" />
          <div className="h-3 bg-[#eceae4]/60 rounded w-full" />
        </div>
        <div className="pt-3 border-t border-[#eceae4]/40 flex justify-between items-center">
          <div className="h-3 bg-[#eceae4]/60 rounded w-16" />
          <div className="h-7 bg-[#eceae4] rounded-full w-24" />
        </div>
      </div>
    </div>
  )
}
