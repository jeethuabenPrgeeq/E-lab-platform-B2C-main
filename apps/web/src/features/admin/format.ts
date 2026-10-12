import type { ValueFormat } from './types';

const numberFormatter = new Intl.NumberFormat('en-IN');

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatValue(value: number, format: ValueFormat = 'number'): string {
  switch (format) {
    case 'currency':
      return currencyFormatter.format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'duration-ms':
      return `${numberFormatter.format(value)} ms`;
    case 'duration-s':
      return `${value.toFixed(1)} s`;
    default:
      return numberFormatter.format(value);
  }
}