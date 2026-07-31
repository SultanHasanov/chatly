import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
const PLAYBACK_RATES = [1, 1.5, 2] as const
const RATE_STORAGE_KEY = 'chat-brat:voice-playback-rate'
const rateEvents = new EventTarget()

function savedRate(): number {
  const value = Number(localStorage.getItem(RATE_STORAGE_KEY))
  return PLAYBACK_RATES.includes(value as (typeof PLAYBACK_RATES)[number]) ? value : 1
}

function rateLabel(rate: number) {
  return `${String(rate).replace('.', ',')}×`
}

export function VoiceMessage({ url, durationMs = 0 }: { url: string; durationMs?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationMs / 1000)
  const [playbackRate, setPlaybackRate] = useState(savedRate)
  const bars = [8, 14, 21, 12, 25, 17, 29, 13, 22, 31, 18, 26, 11, 23, 28, 15, 25, 19, 30, 14, 22, 27, 16, 24]
  const progress = duration ? current / duration : 0

  useEffect(() => {
    const audio = audioRef.current
    const syncRate = () => setPlaybackRate(savedRate())
    rateEvents.addEventListener('change', syncRate)
    return () => {
      audio?.pause()
      rateEvents.removeEventListener('change', syncRate)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) await audio.play()
    else audio.pause()
  }

  const cyclePlaybackRate = () => {
    const index = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number])
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]
    localStorage.setItem(RATE_STORAGE_KEY, String(next))
    setPlaybackRate(next)
    rateEvents.dispatchEvent(new Event('change'))
  }

  return (
    <div className="flex min-w-[250px] items-center gap-2 px-1 pt-1">
      <audio ref={audioRef} src={url} preload="metadata" onPlay={(event) => { event.currentTarget.playbackRate = playbackRate; setPlaying(true) }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { event.currentTarget.playbackRate = playbackRate; setDuration(event.currentTarget.duration || duration) }} />
      {(playing || current > 0) && (
        <button type="button" aria-label={`Скорость воспроизведения ${rateLabel(playbackRate)}`} onClick={cyclePlaybackRate} className="tap flex h-9 min-w-[52px] shrink-0 items-center justify-center rounded-full px-2 text-label font-bold" style={{ background: 'rgba(0,0,0,0.16)', color: 'var(--c-text)' }}>
          {rateLabel(playbackRate)}
        </button>
      )}
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
