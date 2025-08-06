import Alert from './ui/alert';

export default function FormErrors({
  errors,
  className,
}: {
  errors?: string[] | null;
  className?: string;
}) {
  return (
    <>
      {errors?.length && (
        <Alert type="error" className={className}>
          <div className="text-sm">
            <p>Errors:</p>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}
    </>
  );
}
