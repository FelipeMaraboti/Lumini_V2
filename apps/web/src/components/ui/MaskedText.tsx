import { cn } from '@/lib/utils';
import { formatDisplay, type MaskKind } from '@/lib/masks';

export interface MaskedTextProps {
  mask: MaskKind;
  value: string | number | null | undefined;
  className?: string;
  empty?: string;
  as?: 'span' | 'p' | 'div';
}

/** Exibição formatada (somente leitura) — telefone, CNPJ, placa, moeda, etc. */
export function MaskedText({
  mask,
  value,
  className,
  empty = '—',
  as: Tag = 'span',
}: MaskedTextProps) {
  const text =
    value === null || value === undefined || value === ''
      ? empty
      : formatDisplay(mask, value);

  return (
    <Tag className={cn('tabular-nums tracking-tight', className)}>
      {text}
    </Tag>
  );
}
