import { cn } from '~/utils/misc';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}

export default function Label({ htmlFor, children, className }: LabelProps) {
  return (
    <label
      className={cn(
        'block text-base sm:text-sm leading-6 text-medium text-slate-600',
        className
      )}
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}
