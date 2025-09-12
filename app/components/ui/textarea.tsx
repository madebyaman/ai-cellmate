import React from "react";
import { cn } from "~/utils/misc";
import ErrorMessage from "../error-message";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  errors?: string[] | null;
}

const Textarea: React.FC<TextareaProps> = ({ errors, className, ...props }) => {
  return (
    <>
      <textarea
        className={cn(
          "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6",
          errors && "ring-1 ring-red-500 text-red-500",
          className,
        )}
        {...props}
      />
      {errors && <ErrorMessage errors={errors} />}
    </>
  );
};

export default Textarea;
