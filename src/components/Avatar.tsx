import { useEffect, useState } from 'react'

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
  // Подписанные ссылки живут час: протухшую подменяем инициалами, а не битой картинкой.
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

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
      {src && !failed ? (
        <img
          src={src}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}
