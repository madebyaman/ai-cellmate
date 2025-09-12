import { useState } from "react";
import { useFetcher } from "react-router";
import { Trash, X } from "lucide-react";
import Drawer from "./drawer";
import { Button } from "./ui/button";
import Textarea from "./ui/textarea";
import Input from "./ui/input";
import Label from "./ui/label";

interface AIEnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRows: number[];
  totalRows: number;
}

export function AIEnrichmentModal({
  isOpen,
  onClose,
  selectedRows,
  totalRows,
}: AIEnrichmentModalProps) {
  const fetcher = useFetcher();
  const [prompt, setPrompt] = useState(
    "Tell me if the company with domain '{Domain}' is B2B.",
  );
  const [websites, setWebsites] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("intent", "enrich-data");
    formData.append("prompt", prompt);
    formData.append("websites", JSON.stringify(websites));
    formData.append("selectedRows", JSON.stringify(selectedRows));

    fetcher.submit(formData, { method: "POST" });
    onClose();
  };

  const addWebsite = () => {
    setWebsites([...websites, ""]);
  };

  const updateWebsite = (index: number, value: string) => {
    const updated = [...websites];
    updated[index] = value;
    setWebsites(updated);
  };

  const removeWebsite = (index: number) => {
    setWebsites(websites.filter((_, i) => i !== index));
  };

  return (
    <Drawer open={isOpen} setOpen={onClose} title="Use AI">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Write a prompt */}
        <div>
          <Label htmlFor="prompt" className="mb-1">
            Write a prompt
          </Label>
          <Textarea
            value={prompt}
            name="prompt"
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Tell me if the company with domain '{Domain}' is B2B."
            required
          />
          <p className="mt-1 text-xs text-gray-500">Type / to insert Column</p>
        </div>

        {/* Websites to scrape */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="" className="mb-1">
              Websites to scrape (optional)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWebsite}
            >
              + Add Website
            </Button>
          </div>

          {websites.map((website, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                type="url"
                value={website}
                onChange={(e) => updateWebsite(index, e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeWebsite(index)}
                className="text-gray-600"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {websites.length === 0 && (
            <p className="text-sm text-gray-500">
              Optionally specify websites to focus scraping on. If none
              provided, AI will search the web automatically.
            </p>
          )}
        </div>

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          Will process{" "}
          {selectedRows.length > 0
            ? `${Math.min(selectedRows.length, 10)} selected rows`
            : `first ${Math.min(totalRows, 10)} rows`}
        </div>
      </form>
    </Drawer>
  );
}
