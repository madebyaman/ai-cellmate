import type { Route } from './+types/home';
import { Welcome } from '../welcome/welcome';
import { requireUser } from '~/utils/auth.server';
import { auth } from '~/lib/auth.server';
import { redirectWithToast } from '~/utils/toast.server';
import { ROUTES } from '~/utils/constants';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);
  await auth.api.signOut({
    headers: request.headers,
  });
  return redirectWithToast(ROUTES.LOGIN, {
    type: 'success',
    title: 'Logout successful',
    description: 'You are now logged out.',
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome />;
}
