export default function NavBadge({ count, children }) {
  return (
    <span className="relative inline-flex items-center">
      {children}
      {count > 0 && (
        <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none shadow-sm">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  )
}
