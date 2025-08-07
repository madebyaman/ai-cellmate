import type { Route } from './+types/home';
import { Welcome } from '../welcome/welcome';
import { getUserId, requireUser } from '~/utils/auth.server';
import { auth } from '~/lib/auth.server';
import { redirectWithToast } from '~/utils/toast.server';
import { ROUTES } from '~/utils/constants';
import { useFetcher } from 'react-router';
import { addCsvEnrichmentJob } from '~/queues/queues';

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
  const formData = await request.formData();
  const action = formData.get('action');
  if (action === 'upload-csv') {
    const csv = formData.get('csv');
    if (csv instanceof File) {
      const csvContent = await csv.text();
      console.log('Adding enrichment job with content', { contentLength: csvContent.length });
      await addCsvEnrichmentJob({
        csvContent,
        enrichmentPrompt:
          'Enrich the CSV with the following information: name, email, phone, address',
        userId: await getUserId(request),
      });
    }
  } else if (action === 'logout') {
    await auth.api.signOut({
      headers: request.headers,
    });
    return redirectWithToast(ROUTES.LOGIN, {
      type: 'success',
      title: 'Logout successful',
      description: 'You are now logged out.',
    });
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <Welcome />
      <UploadCSV />
    </div>
  );
}

function UploadCSV() {
  let fetcher = useFetcher();
  return (
    <fetcher.Form method="post" encType="multipart/form-data">
      <input type="hidden" name="action" value="upload-csv" />
      <label htmlFor="csv">Upload CSV</label>
      <input type="file" name="csv" />
      <button type="submit">Upload</button>
    </fetcher.Form>
  );
}
