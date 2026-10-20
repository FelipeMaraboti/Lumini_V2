import { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  applyMask,
  MASK_PLACEHOLDERS,
  parseCurrencyToNumber,
  toRawValue,
  type MaskKind,
} from '@/lib/masks';

export interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  mask: MaskKind;
  /** Valor controlado (pode ser cru ou já mascarado). Para currency, preferir number. */
  value?: string | number;
  /** Dispara com o valor mascarado (exibição). */
  onChange?: (masked: string) => void;
  /** Dispara com valor cru para API (dígitos / número em string). */
  onRawChange?: (raw: string) => void;
  /** Atalho tipado para currency (number em reais). */
  onCurrencyChange?: (value: number) => void;
}

const INPUT_MODE: Partial<Record<MaskKind, React.HTMLAttributes<HTMLInputElement>['inputMode']>> = {
  cpf: 'numeric',
  cnpj: 'numeric',
  document: 'numeric',
  phone: 'tel',
  cep: 'numeric',
  rg: 'numeric',
  currency: 'numeric',
  percentage: 'numeric',
  date: 'numeric',
  time: 'numeric',
  integer: 'numeric',
  decimal: 'decimal',
  mm: 'decimal',
  placa: 'text',
};

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      mask,
      value = '',
      onChange,
      onRawChange,
      onCurrencyChange,
      className,
      placeholder,
      disabled,
      ...props
    },
    ref,
  ) => {
    const displayValue = useMemo(() => {
      if (mask === 'currency' && (value === '' || value === null || value === undefined)) {
        return '';
      }
      return applyMask(mask, value ?? '');
    }, [mask, value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const next = applyMask(mask, e.target.value);
      onChange?.(next);
      onRawChange?.(toRawValue(mask, next));
      if (mask === 'currency' && onCurrencyChange) {
        onCurrencyChange(parseCurrencyToNumber(next));
      }
    }

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode={INPUT_MODE[mask] ?? 'text'}
        autoComplete={props.autoComplete ?? 'off'}
        spellCheck={false}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder ?? MASK_PLACEHOLDERS[mask]}
        className={cn(
          'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors',
          'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
    );
  },
);

MaskedInput.displayName = 'MaskedInput';

/** Atalhos tipados (mesma API da V1). */
export function DocumentInput(
  props: Omit<MaskedInputProps, 'mask'> & { kind?: 'auto' | 'cpf' | 'cnpj' },
) {
  const mask: MaskKind =
    props.kind === 'cpf' ? 'cpf' : props.kind === 'cnpj' ? 'cnpj' : 'document';
  const { kind: _kind, ...rest } = props;
  return <MaskedInput {...rest} mask={mask} />;
}

export function PhoneInput(props: Omit<MaskedInputProps, 'mask'>) {
  return <MaskedInput {...props} mask="phone" />;
}

export function CepInput(props: Omit<MaskedInputProps, 'mask'>) {
  return <MaskedInput {...props} mask="cep" />;
}

export function PlacaInput(props: Omit<MaskedInputProps, 'mask'>) {
  return <MaskedInput {...props} mask="placa" className={cn('uppercase', props.className)} />;
}

export function CurrencyInput({
  value,
  onChange,
  onCurrencyChange,
  ...props
}: Omit<MaskedInputProps, 'mask' | 'value' | 'onChange' | 'onCurrencyChange'> & {
  value?: number | null;
  onChange?: (value: number) => void;
  onCurrencyChange?: (value: number) => void;
}) {
  return (
    <MaskedInput
      {...props}
      mask="currency"
      value={value ?? ''}
      onCurrencyChange={(n) => {
        onChange?.(n);
        onCurrencyChange?.(n);
      }}
    />
  );
}

export function MmInput(props: Omit<MaskedInputProps, 'mask'>) {
  return <MaskedInput {...props} mask="mm" />;
}
