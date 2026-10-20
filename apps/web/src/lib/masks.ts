/**
 * Máscaras e formatadores padrão BR (escrita + visualização).
 * Valores persistidos preferencialmente sem máscara (digits/raw); a UI formata na borda.
 */

export type MaskKind =
  | 'cpf'
  | 'cnpj'
  | 'document'
  | 'phone'
  | 'cep'
  | 'rg'
  | 'placa'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'time'
  | 'integer'
  | 'decimal'
  | 'mm';

export function onlyDigits(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

export function unmask(value: string | null | undefined): string {
  return onlyDigits(value);
}

export function maskCPF(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskDocument(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 11) return maskCPF(digits);
  return maskCNPJ(digits.slice(0, 14));
}

export function maskRG(value: string): string {
  return onlyDigits(value)
    .slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
}

export function maskCEP(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/** Placa antiga (ABC-1234) ou Mercosul (ABC1D23). */
export function maskPlaca(value: string): string {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);

  if (raw.length <= 3) return raw;

  const letters = raw.slice(0, 3).replace(/[^A-Z]/g, '');
  const rest = raw.slice(3);

  // Mercosul: AAA + dígito + letra + 2 dígitos
  if (rest.length >= 2 && /[A-Z]/.test(rest[1] ?? '')) {
    const d1 = (rest[0] ?? '').replace(/\D/g, '');
    const l = (rest[1] ?? '').replace(/[^A-Z]/g, '');
    const d2 = rest.slice(2).replace(/\D/g, '').slice(0, 2);
    return `${letters}${d1}${l}${d2}`;
  }

  // Antiga: AAA-9999
  const nums = rest.replace(/\D/g, '').slice(0, 4);
  if (!nums) return letters;
  return `${letters}-${nums}`;
}

export function maskDate(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function maskTime(value: string): string {
  return onlyDigits(value)
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, '$1:$2');
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';
  const num =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function parseCurrencyToNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const digits = onlyDigits(value);
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function maskCurrency(value: string | number): string {
  if (typeof value === 'number') return formatCurrency(value);
  const clean = onlyDigits(String(value));
  if (!clean) return 'R$ 0,00';
  return formatCurrency(Number(clean) / 100);
}

export function maskPercentage(value: string): string {
  const clean = onlyDigits(value).slice(0, 3);
  if (!clean) return '';
  const num = Number(clean);
  return String(Math.min(num, 100));
}

export function maskInteger(value: string, maxDigits = 12): string {
  return onlyDigits(value).slice(0, maxDigits);
}

/** Decimal pt-BR: 1.234,56 */
export function maskDecimal(value: string, maxDecimals = 2): string {
  let v = String(value || '').replace(/[^\d.,]/g, '');
  const comma = v.indexOf(',');
  if (comma >= 0) {
    const intPart = onlyDigits(v.slice(0, comma));
    const decPart = onlyDigits(v.slice(comma + 1)).slice(0, maxDecimals);
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decPart.length ? `${withThousands},${decPart}` : `${withThousands},`;
  }
  const digits = onlyDigits(v);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseDecimal(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

/** Medidas canônicas em mm (aceita vírgula ou ponto). */
export function maskMm(value: string, maxDecimals = 1): string {
  let v = String(value || '').replace(/[^\d.,]/g, '');
  v = v.replace(/\./g, ',');
  const parts = v.split(',');
  const intPart = onlyDigits(parts[0] ?? '').slice(0, 8);
  const decPart = onlyDigits(parts[1] ?? '').slice(0, maxDecimals);
  if (parts.length > 1) return `${intPart},${decPart}`;
  return intPart;
}

export function parseMm(value: string): number {
  return parseDecimal(value.replace(/\./g, ','));
}

export const MASK_PLACEHOLDERS: Record<MaskKind, string> = {
  cpf: '000.000.000-00',
  cnpj: '00.000.000/0000-00',
  document: '000.000.000-00 ou 00.000.000/0000-00',
  phone: '(00) 00000-0000',
  cep: '00000-000',
  rg: '00.000.000-0',
  placa: 'ABC1D23 ou ABC-1234',
  currency: 'R$ 0,00',
  percentage: '0',
  date: 'dd/mm/aaaa',
  time: 'HH:mm',
  integer: '0',
  decimal: '0,00',
  mm: '0,0',
};

export const MASK_MAX_RAW: Partial<Record<MaskKind, number>> = {
  cpf: 11,
  cnpj: 14,
  document: 14,
  phone: 11,
  cep: 8,
  rg: 9,
  placa: 7,
  date: 8,
  time: 4,
  percentage: 3,
};

/** Aplica máscara de escrita conforme o tipo. */
export function applyMask(kind: MaskKind, value: string | number): string {
  const str = value == null ? '' : String(value);
  switch (kind) {
    case 'cpf':
      return maskCPF(str);
    case 'cnpj':
      return maskCNPJ(str);
    case 'document':
      return maskDocument(str);
    case 'phone':
      return maskPhone(str);
    case 'cep':
      return maskCEP(str);
    case 'rg':
      return maskRG(str);
    case 'placa':
      return maskPlaca(str);
    case 'currency':
      return maskCurrency(str);
    case 'percentage':
      return maskPercentage(str);
    case 'date':
      return maskDate(str);
    case 'time':
      return maskTime(str);
    case 'integer':
      return maskInteger(str);
    case 'decimal':
      return maskDecimal(str);
    case 'mm':
      return maskMm(str);
    default:
      return str;
  }
}

/** Formatação só para exibição (read-only). Aceita valor cru ou já mascarado. */
export function formatDisplay(kind: MaskKind, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (kind === 'currency' && typeof value === 'number') return formatCurrency(value);
  return applyMask(kind, value) || '—';
}

/** Extrai valor "cru" adequado para API (dígitos, placa sem hífen, etc.). */
export function toRawValue(kind: MaskKind, masked: string): string {
  switch (kind) {
    case 'placa':
      return String(masked || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    case 'currency':
      return String(parseCurrencyToNumber(masked));
    case 'decimal':
    case 'mm':
      return String(parseDecimal(masked));
    case 'percentage':
    case 'integer':
    case 'cpf':
    case 'cnpj':
    case 'document':
    case 'phone':
    case 'cep':
    case 'rg':
    case 'date':
    case 'time':
      return onlyDigits(masked);
    default:
      return masked;
  }
}
