import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export function VoiceMessage({ url, durationMs = 0 }: { url: string; durationMs?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationMs / 1000)
  const bars = [8, 14, 21, 12, 25, 17, 29, 13, 22, 31, 18, 26, 11, 23, 28, 15, 25, 19, 30, 14, 22, 27, 16, 24]
  const progress = duration ? current / duration : 0

  useEffect(() => () => audioRef.current?.pause(), [])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) await audio.play()
    else audio.pause()
  }

  return (
    <div className="flex min-w-[250px] items-center gap-2 px-1 pt-1">
      <audio ref={audioRef} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || duration)} />
      <button type="button" aria-label={playing ? 'Пауза' : 'Воспроизвести'} onClick={() => void toggle()} className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ color: 'var(--c-accent-deep)' }}>
        {playing ? <Pause size={28} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" aria-label="Перемотать голосовое сообщение" className="flex h-8 w-full items-center gap-[2px]" onClick={(event) => {
          const audio = audioRef.current
          if (!audio || !duration) return
          const rect = event.currentTarget.getBoundingClientRect()
          audio.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration
        }}>
          {bars.map((height, index) => <span key={index} className="w-[3px] rounded-full" style={{ height, background: index / bars.length <= progress ? 'var(--c-accent-deep)' : 'var(--c-text-faint)', opacity: index / bars.length <= progress ? 1 : 0.65 }} />)}
        </button>
        <div className="text-[11px] text-faint">{formatDuration(playing || current ? current : duration)}</div>
      </div>
    </div>
  )
}
