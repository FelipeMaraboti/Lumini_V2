import { cn } from '@/lib/utils';
import { formatDisplay, withUnit, type MaskKind } from '@/lib/masks';

export interface MaskedTextProps {
  mask: MaskKind;
  value: string | number | null | undefined;
  className?: string;
  empty?: string;
  as?: 'span' | 'p' | 'div';
  /** Unidade colada ao valor: "100 mm", "1.700 kg". */
  unit?: string;
}

/** Exibição formatada (somente leitura) — telefone, CNPJ, placa, moeda, etc. */
export function MaskedText({
  mask,
  value,
  className,
  empty = '—',
  unit,
  as: Tag = 'span',
}: MaskedTextProps) {
  const formatted =
    value === null || value === undefined || value === ''
      ? ''
      : formatDisplay(mask, value);
  const text = formatted && formatted !== '—' ? withUnit(formatted, unit) : formatted || empty;

  return (
    <Tag className={cn('tabular-nums tracking-tight', className)}>
      {text}
    </Tag>
  );
}
