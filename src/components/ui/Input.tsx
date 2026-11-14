import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, startAdornment, endAdornment, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startAdornment && (
            <span className="absolute left-3 text-am-ink-muted pointer-events-none text-sm">{startAdornment}</span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-am-surface text-am-ink text-base md:text-sm h-11 px-3.5 rounded-am-input border ${
              error ? 'border-am-danger focus:ring-am-danger' : 'border-am-border focus:border-am-primary focus:ring-am-primary'
            } ${startAdornment ? 'pl-9' : ''} ${
              endAdornment ? 'pr-9' : ''
            } focus:outline-none focus:ring-1 transition placeholder:text-am-ink-muted/50 disabled:opacity-50 disabled:bg-am-surface-2 ${className}`}
            {...props}
          />
          {endAdornment && (
            <span className="absolute right-3 text-am-ink-muted pointer-events-none text-sm">{endAdornment}</span>
          )}
        </div>
        {error && <span className="text-xs text-am-danger font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-am-ink-muted">{helperText}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `textarea_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={props.rows || 3}
          className={`w-full bg-am-surface text-am-ink text-base md:text-sm p-3.5 rounded-am-input border ${
            error ? 'border-am-danger focus:ring-am-danger' : 'border-am-border focus:border-am-primary focus:ring-am-primary'
          } focus:outline-none focus:ring-1 transition placeholder:text-am-ink-muted/50 disabled:opacity-50 disabled:bg-am-surface-2 ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-am-danger font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-am-ink-muted">{helperText}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `select_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={`w-full bg-am-surface text-am-ink text-base md:text-sm h-11 px-3.5 rounded-am-input border ${
            error ? 'border-am-danger focus:ring-am-danger' : 'border-am-border focus:border-am-primary focus:ring-am-primary'
          } focus:outline-none focus:ring-1 transition disabled:opacity-50 disabled:bg-am-surface-2 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-am-danger font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-am-ink-muted">{helperText}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
