import { X } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type SearchableDatalistInputProps = InputHTMLAttributes<HTMLInputElement> & {
  onClear: () => void
  clearLabel?: string
}

export function SearchableDatalistInput({ onClear, clearLabel = 'Borrar selección', value, ...inputProps }: SearchableDatalistInputProps) {
  const hasValue = !inputProps.disabled && String(value ?? '').length > 0

  return <div className="searchable-datalist-input">
    <input {...inputProps} value={value} />
    {hasValue && <button
      type="button"
      className="searchable-datalist-clear"
      aria-label={clearLabel}
      title={clearLabel}
      onMouseDown={event => event.preventDefault()}
      onClick={() => onClear()}
    ><X /></button>}
  </div>
}
