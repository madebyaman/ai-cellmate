import { useFetcher } from "react-router";
import { addCsvEnrichmentJob } from "~/queues/queues";
import { getUserId, requireUser } from "~/utils/auth.server";
import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const csv = formData.get("csv");
  if (csv instanceof File) {
    const csvContent = await csv.text();
    console.log("Adding enrichment job with content", {
      contentLength: csvContent.length,
    });
    await addCsvEnrichmentJob({
      csvContent,
      enrichmentPrompt:
        "Enrich the CSV with the following information: name, email, phone, address",
      userId: (await getUserId(request)) ?? "unknown",
    });
  }
}

export default function Home() {
  return <Welcome />;
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
