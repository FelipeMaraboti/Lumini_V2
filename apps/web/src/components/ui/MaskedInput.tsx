import { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  applyMask,
  MASK_PLACEHOLDERS,
  parseCurrencyToNumber,
  toRawValue,
  withUnit,
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
  /** Unidade exibida dentro do campo: mm, cm, kg, kg/m³. */
  unit?: string;
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
      unit,
      className,
      placeholder,
      disabled,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const caretRef = useRef<number | null>(null);
    const suffix = unit ? ` ${unit}` : '';

    const displayValue = useMemo(() => {
      if (value === '' || value === null || value === undefined) return '';
      return withUnit(applyMask(mask, value), unit);
    }, [mask, unit, value]);

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el || caretRef.current == null) return;
      const pos = caretRef.current;
      caretRef.current = null;
      el.setSelectionRange(pos, pos);
    }, [displayValue]);

    function numberLength(text: string) {
      return suffix && text.endsWith(suffix) ? text.length - suffix.length : text.length;
    }

    function commit(source: string) {
      const next = withUnit(applyMask(mask, source), unit);
      caretRef.current = numberLength(next);
      onChange?.(next);
      onRawChange?.(toRawValue(mask, next));
      if (mask === 'currency' && onCurrencyChange) {
        onCurrencyChange(parseCurrencyToNumber(next));
      }
    }

    function clampCaret(el: HTMLInputElement) {
      const max = numberLength(el.value);
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start > max || end > max) {
        el.setSelectionRange(Math.min(start, max), Math.min(end, max));
      }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (!suffix) return;
      const el = e.currentTarget;
      const max = numberLength(el.value);
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;

      if (e.key === 'Backspace' && start === end && start >= max) {
        e.preventDefault();
        commit(el.value.slice(0, max).slice(0, -1));
        return;
      }

      if (e.key === 'Delete' && start >= max) {
        e.preventDefault();
      }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      commit(e.target.value);
    }

    return (
      <input
        {...props}
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="text"
        inputMode={INPUT_MODE[mask] ?? 'text'}
        autoComplete={props.autoComplete ?? 'off'}
        spellCheck={false}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => clampCaret(e.currentTarget)}
        disabled={disabled}
        placeholder={placeholder ?? withUnit(mask === 'mm' ? '0' : MASK_PLACEHOLDERS[mask], unit)}
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

export function MmInput({ unit = 'mm', ...props }: Omit<MaskedInputProps, 'mask'>) {
  return <MaskedInput {...props} mask="mm" unit={unit} />;
}

export function CmInput(props: Omit<MaskedInputProps, 'mask' | 'unit'>) {
  return <MaskedInput {...props} mask="mm" unit="cm" />;
}

export function KgInput(props: Omit<MaskedInputProps, 'mask' | 'unit'>) {
  return <MaskedInput {...props} mask="decimal" unit="kg" />;
}
