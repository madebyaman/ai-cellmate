import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import type { ReactNode } from "react";

export default function Drawer({
  open,
  setOpen,
  title,
  children,
  formId,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children: ReactNode;
  formId?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-gray-500/70 fixed inset-0 " />
        <Dialog.Content className="max-w-2xl w-2/5 h-screen fixed shadow right-0 bottom-0 top-0 bg-white overflow-y-auto data-[state=open]:animate-slide-right data-[state=closed]:animate-slide-out-right flex flex-col">
          <Dialog.Title className="text-base font-semibold text-gray-900 p-5 border-b border-gray-300">
            {title}
          </Dialog.Title>
          <Dialog.Close className="fixed right-5 top-5 text-gray-400 hover:text-gray-800 cursor-pointer">
            <X className="w-5 h-5" />
          </Dialog.Close>
          <div className="relative flex-1 overflow-auto p-5 bg-white">
            {children}
          </div>
          <div className="flex shrink-0 gap-2 justify-end py-4 px-5 border-t border-gray-300">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit" form={formId}>
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
