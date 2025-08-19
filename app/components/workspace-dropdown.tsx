import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import type { Organization } from "~/types/prisma";
import { createOrganizationSchema } from "~/schema/organization";
import {
  CHANGE_WORKSPACE_FORM,
  CREATE_WORKSPACE_FORM,
  INTENTS,
  ROUTES,
} from "~/utils/constants";

export default function WorkspaceDropdown({
  orgs,
  selectedOrgId,
  hideCreateOption = false,
}: {
  orgs: {
    id: Organization["id"];
    name: Organization["name"];
  }[];
  selectedOrgId: Organization["id"] | null;
  hideCreateOption?: boolean;
}) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const isChanging =
    navigation?.formData?.get(INTENTS.INTENT) === INTENTS.CHANGE_WORKSPACE;

  const [form, fields] = useForm({
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createOrganizationSchema });
    },
  });

  const handleValueChange = (value: string) => {
    if (value === CHANGE_WORKSPACE_FORM.NEW_VALUE && !hideCreateOption) {
      setShowNewDialog(true);
    } else {
      // Submit the form for workspace change
      const form = document.getElementById(
        "workspace-dropdown",
      ) as HTMLFormElement;
      if (form) {
        submit(form);
      }
    }
  };

  return (
    <>
      <Form method="post" id="workspace-dropdown">
        <input
          type="hidden"
          name={INTENTS.INTENT}
          value={INTENTS.CHANGE_WORKSPACE}
        />
        <Select
          disabled={isChanging}
          name={CHANGE_WORKSPACE_FORM.WORKSPACE_ID}
          defaultValue={selectedOrgId ?? orgs[0].id}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full md:w-48 text-inherit bg-inherit data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed">
            <SelectValue placeholder="Select a workspace" />
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
            {!hideCreateOption && (
              <>
                <SelectSeparator />
                <BareSelectItem
                  value={CHANGE_WORKSPACE_FORM.NEW_VALUE}
                  className="items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <SelectItemText>New Workspace</SelectItemText>
                </BareSelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </Form>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <Form method="post" {...getFormProps(form)}>
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.CREATE_WORKSPACE}
            />
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to organize your projects. Click save
                when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 mt-4">
              <div className="grid gap-1">
                <Label htmlFor={fields.name.id}>Workspace Name</Label>
                <Input
                  placeholder="Enter workspace name"
                  errors={fields.name.errors}
                  {...getInputProps(fields.name, { type: "text" })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={fields.slug.id}>Workspace Slug</Label>
                <Input
                  placeholder="Enter workspace slug"
                  errors={fields.slug.errors}
                  {...getInputProps(fields.slug, { type: "text" })}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create Workspace</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
