import React from 'react';
import { cn } from '~/utils/misc';
import ErrorMessage from '../error-message';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  errors?: string[] | null;
}

const Input: React.FC<InputProps> = ({ errors, className, ...props }) => {
  return (
    <div className="">
      <input
        className={cn(
          'block w-full rounded border-0 py-1.5 px-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 focus:outline-none',
          errors && 'ring-1 ring-red-500 text-red-500j',
          className
        )}
        {...props}
      />
      {errors && <ErrorMessage errors={errors} />}
    </div>
  );
};

export default Input;
