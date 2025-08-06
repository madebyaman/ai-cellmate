import { AlertCircle, InfoIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '~/utils/misc';

function Icon({ type }: { type: 'info' | 'error' }) {
  if (type === 'info') {
    return (
      <InfoIcon className="h-5 w-5 flex-shrink-0 fill-blue-400 text-white [&_circle]:text-blue-400" />
    );
  }
  if (type === 'error') {
    return (
      <AlertCircle className="h-5 w-5 flex-shrink-0 fill-red-400 text-white [&_circle]:text-red-400" />
    );
  }
  return null;
}

export default function Alert({
  type,
  children,
  className,
}: {
  type: 'info' | 'error';
  children: ReactNode;
  className?: string;
}) {
  const classes =
    type === 'info'
      ? 'bg-blue-50 border-l-4 border-blue-400 [&_p]:text-gray-600'
      : type === 'error'
        ? 'bg-red-50 border-l-4 border-red-400 [&_p]:text-gray-700 [&_ul]:text-gray-700'
        : '';

  return (
    <div className={cn('rounded-sm p-4', classes, className)}>
      <div className="flex">
        <Icon type={type} />
        <div className="ml-3">{children}</div>
      </div>
    </div>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="-mx-4 -my-1.5 flex">{children}</div>
    </div>
  );
}

Alert.Actions = Actions;
