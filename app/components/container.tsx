import { type ReactNode } from 'react';
import { cn } from '~/utils/misc';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('max-w-6xl w-full mx-auto px-2', className)}>
      {children}
    </div>
  );
}
