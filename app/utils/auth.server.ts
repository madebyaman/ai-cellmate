import { redirect } from 'react-router';
import { auth } from '~/lib/auth.server';
import { ROUTES } from './constants';

export async function requireUser(request: Request) {
  const session = await auth.api.getSession(request);
  if (!session) {
    redirect(ROUTES.LOGIN);
  }
  return session;
}

export async function requireAnonymous(request: Request) {
  const session = await auth.api.getSession(request);
  if (session) {
    redirect(ROUTES.DASHBOARD);
  }
  return session;
}
