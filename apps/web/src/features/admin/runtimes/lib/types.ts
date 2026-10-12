export type RuntimeKind = 'languages' | 'frameworks' | 'images' | 'versions';

export type FieldValue = string | number | boolean;

export interface RuntimeRecord {
  id: string;
  status: string;
  updatedAt: string;
  [key: string]: FieldValue;
}

export type RuntimeStore = Record<RuntimeKind, RuntimeRecord[]>;

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  required?: boolean;
  mono?: boolean;
  wide?: boolean;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  pattern?: { regex: RegExp; message: string };
  options?: (store: RuntimeStore) => SelectOption[];
}

export interface StatusDef {
  value: string;
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
}