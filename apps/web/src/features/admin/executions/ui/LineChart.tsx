'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './LineChart.module.css';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  title: string;
  times: number[];
  series: ChartSeries[];
  format: (value: number) => string;
  timeLabel: (t: number) => string;
  tickLabel: (t: number) => string;
  area?: boolean;
  reference?: { value: number; label: string };
  height?: number;
}

const PAD = { top: 14, right: 16, bottom: 30, left: 52 };

function niceStep(value: number) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) if (step * pow >= value) return step * pow;
  return 10 * pow;
}

export function LineChart({ title, times, series, format, timeLabel, tickLabel, area, reference, height = 240 }: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const count = times.length;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const { max, ticks } = useMemo(() => {
    const top = Math.max(reference?.value ?? 0, ...series.flatMap((item) => item.values)) * 1.08;
    const step = niceStep(top / 4);
    const steps = Math.max(1, Math.ceil(top / step));
    return { max: step * steps, ticks: Array.from({ length: steps + 1 }, (_, index) => index * step) };
  }, [series, reference]);
  const x = (index: number) => PAD.left + (count <= 1 ? innerW / 2 : (index / (count - 1)) * innerW);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const tickCount = width < 480 ? 3 : 5;
  const xTicks = count > 1 ? Array.from(new Set(Array.from({ length: tickCount }, (_, index) => Math.round(((count - 1) * index) / (tickCount - 1))))) : [0];

  const path = (values: number[]) => values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');

  const pick = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  };

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowRight') setHover((current) => Math.min(count - 1, (current ?? -1) + 1));
    else if (event.key === 'ArrowLeft') setHover((current) => Math.max(0, (current ?? count) - 1));
    else if (event.key === 'Escape') setHover(null);
    else return;
    event.preventDefault();
  };

  const tooltipLeft = hover === null ? 0 : x(hover);
  const flip = tooltipLeft > width * 0.6;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.head}>
        <span id={titleId} className={styles.title}>
          {title}
        </span>
        {series.length > 1 && (
          <span className={styles.legend}>
            {series.map((item) => (
              <span key={item.key} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div ref={wrapRef} className={styles.plot} style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-labelledby={titleId}
            tabIndex={0}
            className={styles.svg}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? styles.baseline : styles.grid} />
                <text x={PAD.left - 8} y={y(tick)} className={styles.axisY}>
                  {format(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((index) => (
              <text key={index} x={x(index)} y={height - 8} className={styles.axisX} data-edge={index === 0 ? 'start' : index === count - 1 ? 'end' : undefined}>
                {tickLabel(times[index])}
              </text>
            ))}

            {reference && reference.value <= max && (
              <g>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(reference.value)} y2={y(reference.value)} className={styles.reference} />
                <text x={width - PAD.right} y={y(reference.value) - 6} className={styles.referenceLabel}>
                  {reference.label}
                </text>
              </g>
            )}

            {area && series[0] && (
              <path
                d={`${path(series[0].values)} L${x(count - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={series[0].color}
                className={styles.area}
              />
            )}
            {series.map((item) => (
              <path key={item.key} d={path(item.values)} stroke={item.color} className={styles.line} />
            ))}

            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className={styles.crosshair} />
                {series.map((item) => (
                  <circle key={item.key} cx={x(hover)} cy={y(item.values[hover])} r={5} fill={item.color} className={styles.dot} />
                ))}
              </g>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {hover !== null && width > 0 && (
          <div
            className={styles.tooltip}
            style={{ left: tooltipLeft, top: PAD.top, transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
            role="status"
          >
            <span className={styles.tooltipTime}>{timeLabel(times[hover])}</span>
            {series.map((item) => (
              <span key={item.key} className={styles.tooltipRow}>
                <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
                <span className={styles.tooltipLabel}>{item.label}</span>
                <strong>{format(item.values[hover])}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      <table className={styles.srOnly}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            {series.map((item) => (
              <th key={item.key} scope="col">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t, index) => (
            <tr key={t}>
              <th scope="row">{timeLabel(t)}</th>
              {series.map((item) => (
                <td key={item.key}>{format(item.values[index])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}