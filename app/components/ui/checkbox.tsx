import { cn } from '~/utils/misc';
import ErrorMessage from '~/components/error-message';
import Label from '~/components/ui/label';

interface InputCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  description?: string;
  errors?: string[] | null;
}

export default function Checkbox({
  label,
  id,
  errors,
  description,
  className,
  ...rest
}: InputCheckboxProps) {
  return (
    <div className={cn('grid grid-cols-[auto,1fr] gap-x-3 gap-y-1', className)}>
      <input
        type="checkbox"
        id={id}
        className="h-4 w-4 rounded shadow-sm border border-gray-300 focus:ring-primary-500 text-primary-500 text-sm my-auto"
        {...rest}
      />
      <Label className={cn('mb-0')} htmlFor={id}>
        {label}
      </Label>
      {description && (
        <p className="col-start-2 text-base/6 sm:text-sm/6 text-gray-500">
          {description}
        </p>
      )}
      {errors && <ErrorMessage className="col-start-2 mt-0" errors={errors} />}
    </div>
  );
}
