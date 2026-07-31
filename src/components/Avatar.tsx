export function Avatar({
  initials,
  color,
  size = 49,
  fontSize,
  src,
}: {
  initials: string
  color: string
  size?: number
  fontSize?: number
  src?: string
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: fontSize ?? Math.round(size * 0.35),
      }}
    >
      {src ? <img src={src} alt="" decoding="async" className="h-full w-full rounded-full object-cover" /> : initials}
    </div>
  )
}
