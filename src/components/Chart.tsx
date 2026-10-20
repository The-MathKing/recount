import { useEffect, useMemo, useRef, useState } from 'react'
import type { Analysis } from '../lib/analyze'
import { fmtDate } from './format'

const W = 760
const H = 320
const M = { top: 16, right: 132, bottom: 32, left: 44 }

const SERIES = [
  { key: 'reported', label: 'Race-adjusted (on your reports)', short: 'Reported', cls: 's-reported' },
  { key: 'raceFree', label: 'CKD-EPI 2021, race-free', short: 'Race-free', cls: 's-racefree' },
  { key: 'legacyNoRace', label: 'Same equation, race term removed', short: 'No race term', cls: 's-norace' },
] as const

export function Chart({ analysis }: { analysis: Analysis }) {
  const { points, waitlist } = analysis
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [points])

  const geo = useMemo(() => {
    const t = points.map((p) => new Date(p.date).getTime())
    const t0 = Math.min(...t)
    const t1 = Math.max(...t, t0 + 86_400_000)
    const yMax = Math.ceil(Math.max(...points.map((p) => p.reported), 30) / 10) * 10
    const x = (ms: number) => M.left + ((ms - t0) / (t1 - t0)) * (W - M.left - M.right)
    const y = (v: number) => M.top + (1 - v / yMax) * (H - M.top - M.bottom)
    const yTicks = Array.from({ length: yMax / 10 + 1 }, (_, i) => i * 10).filter((v) => yMax <= 60 || v % 20 === 0)
    const y0 = new Date(t0).getFullYear()
    const y1 = new Date(t1).getFullYear()
    const step = Math.max(1, Math.ceil((y1 - y0) / 8))
    const xTicks: number[] = []
    for (let yr = y0 + 1; yr <= y1; yr += step) xTicks.push(new Date(`${yr}-01-01`).getTime())
    return { t, x, y, yTicks, xTicks }
  }, [points])

  if (points.length < 2) return <p className="muted">Add at least two dated results to see the timeline.</p>

  const path = (key: (typeof SERIES)[number]['key']) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${geo.x(geo.t[i]).toFixed(1)},${geo.y(p[key]).toFixed(1)}`).join('')

  const onMove = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const box = svg.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    let best = 0
    geo.t.forEach((ms, i) => {
      if (Math.abs(geo.x(ms) - px) < Math.abs(geo.x(geo.t[best]) - px)) best = i
    })
    setHover(best)
  }

  // Spread the end-of-line labels so they never collide.
  const last = points.at(-1)!
  const ends = SERIES.map((s) => ({ ...s, y: geo.y(last[s.key]) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14)

  const gap =
    waitlist && waitlist.owedDays > 0
      ? {
          x0: geo.x(new Date(waitlist.qualifiedOn).getTime()),
          x1: geo.x(Math.min(new Date(waitlist.countedFrom ?? last.date).getTime(), geo.t.at(-1)!)),
        }
      : null

  const hp = hover != null ? points[hover] : null
  const hx = hover != null ? geo.x(geo.t[hover]) : 0

  return (
    <figure className="chart">
      <ul className="legend" aria-hidden>
        {SERIES.map((s) => (
          <li key={s.key}>
            <span className={`swatch ${s.cls}`} />
            {s.label}
          </li>
        ))}
      </ul>
      {/* On phones the chart scrolls sideways; start at the most recent results. */}
      <div className="chart-scroll" ref={scrollRef}>
        <div className="chart-inner">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="eGFR over time, race-adjusted compared with race-free"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {gap && gap.x1 > gap.x0 && (
              <g>
                <rect className="gap" x={gap.x0} y={M.top} width={gap.x1 - gap.x0} height={H - M.top - M.bottom} />
                <text className="gap-label" x={(gap.x0 + gap.x1) / 2} y={M.top + 14} textAnchor="middle">
                  wait time not counted
                </text>
              </g>
            )}
            {geo.yTicks.map((v) => (
              <g key={v}>
                <line className="grid" x1={M.left} x2={W - M.right} y1={geo.y(v)} y2={geo.y(v)} />
                <text className="tick" x={M.left - 8} y={geo.y(v) + 4} textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {geo.xTicks.map((ms) => (
              <text key={ms} className="tick" x={geo.x(ms)} y={H - 10} textAnchor="middle">
                {new Date(ms).getUTCFullYear()}
              </text>
            ))}
            <line className="threshold" x1={M.left} x2={W - M.right} y1={geo.y(20)} y2={geo.y(20)} />
            <text className="threshold-label" x={W - M.right + 6} y={geo.y(20) + 4}>
              20 · wait list
            </text>

            {SERIES.map((s) => (
              <path key={s.key} className={`line ${s.cls}`} d={path(s.key)} />
            ))}
            {SERIES.map((s) =>
              points.map((p, i) => (
                <circle
                  key={s.key + i}
                  className={`dot ${s.cls}`}
                  cx={geo.x(geo.t[i])}
                  cy={geo.y(p[s.key])}
                  r={hover === i ? 5 : 3}
                />
              )),
            )}
            {ends.map((s) => (
              <text key={s.key} className="end-label" x={W - M.right + 6} y={s.y + 4}>
                {s.short} {last[s.key].toFixed(0)}
              </text>
            ))}
            {hp && <line className="crosshair" x1={hx} x2={hx} y1={M.top} y2={H - M.bottom} />}
          </svg>
          {hp && (
            <div className="tooltip" style={{ left: `${(hx / W) * 100}%` }}>
              <strong>{fmtDate(hp.date)}</strong>
              <span>
                Creatinine {hp.scr.toFixed(2)} mg/dL{hp.inferred ? ' (estimated)' : ''}
              </span>
              {SERIES.map((s) => (
                <span key={s.key}>
                  <i className={`swatch ${s.cls}`} />
                  {s.short}: <b>{hp[s.key].toFixed(1)}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </figure>
  )
}
