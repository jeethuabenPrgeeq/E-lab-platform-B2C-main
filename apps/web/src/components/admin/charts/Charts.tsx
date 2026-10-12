'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatValue } from '@/features/admin/format';
import type { ValueFormat } from '@/features/admin/types';
import styles from './charts.module.css';

export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'] as const;
export const ACCENT = '#2d4cc8';

const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatAxis(value: number, format: ValueFormat) {
  if (format === 'currency') return compactCurrency.format(value);
  if (format === 'percent') return `${value}%`;
  return compactNumber.format(value);
}

function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(value);
  return ticks;
}

const FILL_MIN_HEIGHT = 220;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

function chartBoxProps(fixedHeight?: number) {
  return fixedHeight
    ? { className: styles.chart, style: { height: fixedHeight } }
    : { className: `${styles.chart} ${styles.chartFill}`, style: { minHeight: FILL_MIN_HEIGHT } };
}

function showTick(index: number, last: number, every: number) {
  if (index === last) return true;
  return index % every === 0 && last - index >= every;
}

function topRoundedBar(x: number, y: number, w: number, h: number, r = 4) {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

interface TooltipRow {
  key: string;
  label: string;
  value: string;
  color: string;
}

function Tooltip({ x, title, rows, width }: { x: number; title: string; rows: TooltipRow[]; width: number }) {
  const left = Math.min(Math.max(x, 80), Math.max(width - 80, 80));
  return (
    <div className={styles.tooltip} style={{ left }} role="presentation">
      <p className={styles.tooltipTitle}>{title}</p>
      {rows.map((row) => (
        <p key={row.key} className={styles.tooltipRow}>
          <span className={styles.tooltipKey} style={{ background: row.color }} aria-hidden="true" />
          <strong>{row.value}</strong>
          {rows.length > 1 && <span className={styles.tooltipLabel}>{row.label}</span>}
        </p>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { key: string; label: string; color: string; shape?: 'rect' | 'line' }[] }) {
  return (
    <ul className={styles.legend}>
      {items.map((item) => (
        <li key={item.key}>
          <span
            className={item.shape === 'line' ? styles.legendLine : styles.legendRect}
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function DataTable({
  caption,
  labels,
  series,
  format,
}: {
  caption: string;
  labels: string[];
  series: { key: string; label: string; values: number[] }[];
  format: ValueFormat;
}) {
  return (
    <div className={styles.visuallyHidden}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((item) => (
              <th key={item.key} scope="col">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {series.map((item) => (
                <td key={item.key}>{formatValue(item.values[index], format)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PAD = { top: 20, right: 56, bottom: 28, left: 52 };

function useActiveIndex(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') setActive((index) => Math.min((index ?? -1) + 1, count - 1));
    else if (event.key === 'ArrowLeft') setActive((index) => Math.max((index ?? count) - 1, 0));
    else if (event.key === 'Escape') setActive(null);
    else return;
    event.preventDefault();
  };
  return { active, setActive, onKeyDown };
}

interface Threshold {
  value: number;
  label: string;
}

interface TrendChartProps {
  title: string;
  labels: string[];
  values: number[];
  format?: ValueFormat;
  height?: number;
  color?: string;
  threshold?: Threshold;
}

export function TrendChart({
  title,
  labels,
  values,
  format = 'number',
  height: fixedHeight,
  color = ACCENT,
  threshold,
}: TrendChartProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  const width = size.width;
  const height = fixedHeight ?? Math.max(size.height, FILL_MIN_HEIGHT);
  const gradientId = useId();
  const { active, setActive, onKeyDown } = useActiveIndex(values.length);

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = height - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(...values, threshold?.value ?? 0));
  const top = ticks[ticks.length - 1];
  const x = (index: number) => PAD.left + (values.length === 1 ? plotW / 2 : (index / (values.length - 1)) * plotW);
  const y = (value: number) => PAD.top + plotH - (value / top) * plotH;

  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(value)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;
  const labelEvery = Math.max(1, Math.ceil((labels.length * 44) / plotW));
  const last = values.length - 1;

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setActive(Math.round(ratio * last));
  };

  return (
    <div ref={ref} {...chartBoxProps(fixedHeight)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className={styles.svg}
          role="img"
          aria-label={`${title}. Use left and right arrow keys to read values.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.14} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} className={styles.grid} />
              <text x={PAD.left - 8} y={y(tick)} className={styles.axisY}>
                {formatAxis(tick, format)}
              </text>
            </g>
          ))}
          {labels.map((label, index) =>
            showTick(index, last, labelEvery) ? (
              <text key={label} x={x(index)} y={height - 8} className={styles.axisX}>
                {label}
              </text>
            ) : null,
          )}
          {threshold && (
            <g>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(threshold.value)}
                y2={y(threshold.value)}
                className={styles.threshold}
              />
              <text x={PAD.left + 4} y={y(threshold.value) - 6} className={styles.thresholdLabel}>
                {threshold.label}
              </text>
            </g>
          )}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(last)} cy={y(values[last])} r={5} fill={color} className={styles.dot} />
          <text x={x(last) + 10} y={y(values[last])} className={styles.endLabel}>
            {formatAxis(values[last], format)}
          </text>
          {active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} className={styles.crosshair} />
              <circle cx={x(active)} cy={y(values[active])} r={5} fill={color} className={styles.dot} />
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {active !== null && (
        <Tooltip
          x={x(active)}
          width={width}
          title={labels[active]}
          rows={[{ key: 'value', label: title, value: formatValue(values[active], format), color }]}
        />
      )}
      <DataTable caption={title} labels={labels} series={[{ key: 'value', label: title, values }]} format={format} />
    </div>
  );
}

export interface ColumnSeries {
  key: string;
  label: string;
  values: number[];
  color?: string;
}

interface ColumnChartProps {
  title: string;
  labels: string[];
  series: ColumnSeries[];
  format?: ValueFormat;
  height?: number;
}

export function ColumnChart({ title, labels, series, format = 'number', height: fixedHeight }: ColumnChartProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  const width = size.width;
  const height = fixedHeight ?? Math.max(size.height, FILL_MIN_HEIGHT);
  const { active, setActive, onKeyDown } = useActiveIndex(labels.length);
  const colored = series.map((item, index) => ({
    ...item,
    color: item.color ?? (series.length === 1 ? ACCENT : SERIES_COLORS[index % SERIES_COLORS.length]),
  }));

  const pad = { ...PAD, right: 16 };
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...colored.flatMap((item) => item.values)));
  const top = ticks[ticks.length - 1];
  const band = plotW / labels.length;
  const gap = 2;
  const barW = Math.max(4, Math.min(24, (band * 0.64 - gap * (colored.length - 1)) / colored.length));
  const groupW = barW * colored.length + gap * (colored.length - 1);
  const y = (value: number) => pad.top + plotH - (value / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(44 / band));
  const last = labels.length - 1;

  return (
    <div className={`${styles.chartWrap} ${fixedHeight ? '' : styles.chartWrapFill}`}>
      {colored.length > 1 && <Legend items={colored.map(({ key, label, color }) => ({ key, label, color }))} />}
      <div ref={ref} {...chartBoxProps(fixedHeight)}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className={styles.svg}
            role="img"
            aria-label={`${title}. Use left and right arrow keys to read values.`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={pad.left} x2={pad.left + plotW} y1={y(tick)} y2={y(tick)} className={styles.grid} />
                <text x={pad.left - 8} y={y(tick)} className={styles.axisY}>
                  {formatAxis(tick, format)}
                </text>
              </g>
            ))}
            {labels.map((label, index) => {
              const start = pad.left + band * index + (band - groupW) / 2;
              return (
                <g key={label}>
                  {active === index && (
                    <rect
                      x={pad.left + band * index}
                      y={pad.top}
                      width={band}
                      height={plotH}
                      className={styles.bandHover}
                    />
                  )}
                  {colored.map((item, seriesIndex) => {
                    const value = item.values[index];
                    const barH = Math.max((value / top) * plotH, value > 0 ? 2 : 0);
                    return (
                      <path
                        key={item.key}
                        d={topRoundedBar(start + seriesIndex * (barW + gap), pad.top + plotH - barH, barW, barH)}
                        fill={item.color}
                        opacity={active === null || active === index ? 1 : 0.55}
                      />
                    );
                  })}
                  {colored.length === 1 && index === last && (
                    <text x={start + barW / 2} y={y(colored[0].values[index]) - 8} className={styles.capLabel}>
                      {formatAxis(colored[0].values[index], format)}
                    </text>
                  )}
                  {showTick(index, last, labelEvery) && (
                    <text x={pad.left + band * index + band / 2} y={height - 8} className={styles.axisX}>
                      {label}
                    </text>
                  )}
                  <rect
                    x={pad.left + band * index}
                    y={pad.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                  />
                </g>
              );
            })}
          </svg>
        )}
        {active !== null && (
          <Tooltip
            x={pad.left + band * active + band / 2}
            width={width}
            title={labels[active]}
            rows={colored.map((item) => ({
              key: item.key,
              label: item.label,
              value: formatValue(item.values[active], format),
              color: item.color,
            }))}
          />
        )}
        <DataTable caption={title} labels={labels} series={colored} format={format} />
      </div>
    </div>
  );
}

export interface ShareItem {
  key: string;
  label: string;
  value: number;
}

export function ShareBar({
  title,
  items,
  format = 'number',
}: {
  title: string;
  items: ShareItem[];
  format?: ValueFormat;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colored = items.map((item, index) => ({ ...item, color: SERIES_COLORS[index % SERIES_COLORS.length] }));

  return (
    <div className={styles.share}>
      <div
        className={styles.shareTrack}
        role="img"
        aria-label={`${title}: ${items.map((item) => `${item.label} ${formatValue(item.value, format)}`).join(', ')}`}
      >
        {colored.map((item) => (
          <span
            key={item.key}
            className={styles.shareSegment}
            style={{
              flexGrow: item.value,
              minWidth: item.value > 0 ? 4 : 0,
              background: item.color,
              opacity: hovered === null || hovered === item.key ? 1 : 0.45,
            }}
            onPointerEnter={() => setHovered(item.key)}
            onPointerLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <ul className={styles.shareList}>
        {colored.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <li
              key={item.key}
              className={styles.shareRow}
              data-active={hovered === item.key}
              onPointerEnter={() => setHovered(item.key)}
              onPointerLeave={() => setHovered(null)}
            >
              <span className={styles.legendRect} style={{ background: item.color }} aria-hidden="true" />
              <span className={styles.shareLabel}>{item.label}</span>
              <span className={styles.shareValue}>{formatValue(item.value, format)}</span>
              <span className={styles.sharePct}>{share.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}