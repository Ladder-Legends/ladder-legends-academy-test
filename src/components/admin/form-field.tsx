'use client';

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

interface BaseFormFieldProps {
  /** Field label */
  label: string;
  /** Whether field is required (shows asterisk) */
  required?: boolean;
  /** Help text shown below field */
  helpText?: string;
  /** Error message to display */
  error?: string;
  /** Additional class name for wrapper */
  className?: string;
}

interface TextInputFieldProps extends BaseFormFieldProps {
  type: 'text' | 'email' | 'url' | 'number' | 'date' | 'time';
  inputProps: InputProps;
}

interface TextareaFieldProps extends BaseFormFieldProps {
  type: 'textarea';
  inputProps: TextareaProps;
  rows?: number;
}

interface SelectFieldProps extends BaseFormFieldProps {
  type: 'select';
  inputProps: SelectProps;
  options: { value: string; label: string }[];
}

interface CheckboxFieldProps extends BaseFormFieldProps {
  type: 'checkbox';
  inputProps: InputProps;
  checkboxLabel?: string;
}

interface CustomFieldProps extends BaseFormFieldProps {
  type: 'custom';
  children: ReactNode;
}

type FormFieldProps =
  | TextInputFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | CheckboxFieldProps
  | CustomFieldProps;

const inputClassName = 'w-full px-3 py-2 border border-border rounded-md bg-background';
const labelClassName = 'block text-sm font-medium mb-1';
const helpTextClassName = 'text-xs text-muted-foreground mt-1';
const errorClassName = 'text-xs text-destructive mt-1';

/**
 * Reusable form field component for edit modals
 *
 * Supports: text input, textarea, select, checkbox, and custom content
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Title"
 *   required
 *   type="text"
 *   inputProps={{
 *     value: formData.title || '',
 *     onChange: (e) => setFormData({ ...formData, title: e.target.value }),
 *     placeholder: 'Enter title...',
 *   }}
 * />
 *
 * <FormField
 *   label="Race"
 *   type="select"
 *   inputProps={{ value: formData.race || 'terran' }}
 *   options={[
 *     { value: 'terran', label: 'Terran' },
 *     { value: 'zerg', label: 'Zerg' },
 *     { value: 'protoss', label: 'Protoss' },
 *   ]}
 * />
 * ```
 */
export function FormField(props: FormFieldProps) {
  const { label, required, helpText, error, className = '' } = props;

  const renderLabel = () => (
    <label className={labelClassName}>
      {label}
      {required && ' *'}
    </label>
  );

  const renderHelpText = () =>
    helpText && <p className={helpTextClassName}>{helpText}</p>;

  const renderError = () =>
    error && <p className={errorClassName}>{error}</p>;

  if (props.type === 'custom') {
    return (
      <div className={className}>
        {renderLabel()}
        {props.children}
        {renderHelpText()}
        {renderError()}
      </div>
    );
  }

  if (props.type === 'checkbox') {
    return (
      <div className={className}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border"
            {...props.inputProps}
          />
          <span className="text-sm font-medium">
            {props.checkboxLabel || label}
            {required && ' *'}
          </span>
        </label>
        {renderHelpText()}
        {renderError()}
      </div>
    );
  }

  if (props.type === 'textarea') {
    return (
      <div className={className}>
        {renderLabel()}
        <textarea
          className={inputClassName}
          rows={props.rows || 3}
          {...props.inputProps}
        />
        {renderHelpText()}
        {renderError()}
      </div>
    );
  }

  if (props.type === 'select') {
    return (
      <div className={className}>
        {renderLabel()}
        <select className={inputClassName} {...props.inputProps}>
          {props.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {renderHelpText()}
        {renderError()}
      </div>
    );
  }

  // Default: text input
  return (
    <div className={className}>
      {renderLabel()}
      <input
        type={props.type}
        className={inputClassName}
        {...props.inputProps}
      />
      {renderHelpText()}
      {renderError()}
    </div>
  );
}
