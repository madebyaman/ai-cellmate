import { Plus } from "lucide-react";
import { Form, useNavigation, useSubmit } from "react-router";
import {
  BareSelectItem,
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/select-advanced";
import type { Organization } from "~/types/prisma";
import { INTENTS } from "~/utils/constants";

export default function WorkspaceDropdown({
  orgs,
  selectedOrgId,
}: {
  orgs: {
    id: Organization["id"];
    name: Organization["name"];
  }[];
  selectedOrgId: Organization["id"];
}) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isChanging =
    navigation?.formData?.get("intent") === INTENTS.CHANGE_WORKSPACE;

  return (
    <Form
      method="post"
      id="workspace-dropdown"
      onChange={(event) => submit(event.currentTarget)}
    >
      <input type="hidden" name="intent" value={INTENTS.CHANGE_WORKSPACE} />
      <Select
        disabled={isChanging}
        name="project"
        defaultValue={selectedOrgId ?? orgs[0].id}
      >
        <SelectTrigger className="w-full md:w-48 text-inherit bg-inherit data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent
          sideOffset={5}
          position="popper"
          className="w-full md:w-48"
        >
          {orgs.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
          <SelectSeparator />

          <BareSelectItem value="new" className="items-center gap-2">
            <Plus className="w-4 h-4" />
            <SelectItemText>New Project</SelectItemText>
          </BareSelectItem>
        </SelectContent>
      </Select>
    </Form>
  );
}
