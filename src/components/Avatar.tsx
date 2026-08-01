import { useEffect, useRef, useState } from 'react'

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
  // Если новая подписанная ссылка не открылась, продолжаем
  // показывать последнюю удачную картинку: инициалы вместо аватара мигать не должны.
  const [shown, setShown] = useState<string | undefined>(src)
  const loaded = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (src) setShown(src)
    else {
      loaded.current = undefined
      setShown(undefined)
    }
  }, [src])

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
      {shown ? (
        <img
          src={shown}
          alt=""
          decoding="async"
          onLoad={() => { loaded.current = shown }}
          onError={() => {
            // Отвалилась и запасная копия — только тогда показываем инициалы.
            if (shown === loaded.current) loaded.current = undefined
            setShown(loaded.current)
          }}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}
