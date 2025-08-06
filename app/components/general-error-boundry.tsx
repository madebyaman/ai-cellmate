import type { ReactNode } from 'react';
import {
  isRouteErrorResponse,
  useParams,
  useRouteError,
  type ErrorResponse,
} from 'react-router';
import { getErrorMessage } from '~/utils/misc';
import Container from './container';

type StatusHandler = (info: {
  error: ErrorResponse;
  params: Record<string, string | undefined>;
}) => ReactNode | null;

export function GeneralErrorBoundary({
  defaultStatusHandler = ({ error }) => (
    <p>
      {error.status} {getErrorMessage(error.data)}
    </p>
  ),
  statusHandlers,
  unexpectedErrorHandler = (error) => <p>{getErrorMessage(error)}</p>,
}: {
  defaultStatusHandler?: StatusHandler;
  statusHandlers?: Record<number, StatusHandler>;
  unexpectedErrorHandler?: (error: unknown) => ReactNode | null;
}) {
  const error = useRouteError();
  const params = useParams();

  if (typeof document !== 'undefined') {
    console.error(error);
  }

  return (
    <Container className="my-10">
      <div className="container flex h-full w-full items-center justify-center p-20 text-h2 text-red-500 bg-white border border-gray-200 rounded mx-auto">
        {isRouteErrorResponse(error)
          ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
              error,
              params,
            })
          : unexpectedErrorHandler(error)}
      </div>
    </Container>
  );
}
