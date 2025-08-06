import { cn } from '~/utils/misc';

export default function ErrorMessage({
  errors,
  className,
}: {
  errors?: string[] | null;
  className?: string;
}) {
  return (
    <>
      {errors?.length && (
        <p role="alert" className={cn('text-red-500 text-sm mt-1', className)}>
          {errors.map((error, index) => (
            <span key={index}>{error}</span>
          ))}
        </p>
      )}
    </>
  );
}
