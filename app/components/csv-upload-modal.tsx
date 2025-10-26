import { useState } from "react";
import { useFetcher } from "react-router";
import { Trash, Plus, Upload, Loader, Sparkles } from "lucide-react";
import Drawer from "./drawer";
import { Button } from "./ui/button";
import Textarea from "./ui/textarea";
import Input from "./ui/input";
import Label from "./ui/label";
import Select from "./ui/select";

interface EnrichmentColumn {
  name: string;
  type: "String" | "Number" | "Boolean";
  description: string;
}

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CSVUploadModal({ isOpen, onClose }: CSVUploadModalProps) {
  const fetcher = useFetcher();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedColumns, setGeneratedColumns] = useState<EnrichmentColumn[]>(
    [],
  );
  const [manualColumns, setManualColumns] = useState<EnrichmentColumn[]>([
    { name: "", type: "String", description: "" },
  ]);
  const [enrichmentPrompt, setEnrichmentPrompt] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);

  const isGenerating =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "generate-columns";
  const isUploading =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "upload-csv";

  // Handle AI column generation response
  if (
    fetcher.data &&
    typeof fetcher.data === "object" &&
    "columns" in fetcher.data &&
    generatedColumns.length === 0
  ) {
    setGeneratedColumns(fetcher.data.columns as EnrichmentColumn[]);
  }

  const handleGenerateColumns = () => {
    if (!aiPrompt.trim()) return;

    const formData = new FormData();
    formData.append("intent", "generate-columns");
    formData.append("prompt", aiPrompt);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    const columns = mode === "ai" ? generatedColumns : manualColumns;
    if (columns.length === 0 && !aiPrompt.trim()) {
      return;
    }

    const formData = new FormData();
    formData.append("intent", "upload-csv");
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("enrichmentColumns", JSON.stringify(columns));
    formData.append("enrichmentPrompt", enrichmentPrompt);
    formData.append("websites", JSON.stringify(websites));
    if (mode === "ai") {
      formData.append("aiPrompt", aiPrompt);
    }

    fetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  const addManualColumn = () => {
    setManualColumns([
      ...manualColumns,
      { name: "", type: "String", description: "" },
    ]);
  };

  const updateManualColumn = (
    index: number,
    field: keyof EnrichmentColumn,
    value: string,
  ) => {
    const updated = [...manualColumns];
    updated[index][field] = value as any;
    setManualColumns(updated);
  };

  const removeManualColumn = (index: number) => {
    setManualColumns(manualColumns.filter((_, i) => i !== index));
  };

  const updateGeneratedColumn = (
    index: number,
    field: keyof EnrichmentColumn,
    value: string,
  ) => {
    const updated = [...generatedColumns];
    updated[index][field] = value as any;
    setGeneratedColumns(updated);
  };

  const removeGeneratedColumn = (index: number) => {
    setGeneratedColumns(generatedColumns.filter((_, i) => i !== index));
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
    <Drawer
      open={isOpen}
      setOpen={onClose}
      title="Upload CSV for Enrichment"
      formId="csv-upload-form"
    >
      <form onSubmit={handleSubmit} className="space-y-6" id="csv-upload-form">
        {/* CSV File Upload */}
        <div>
          <Label htmlFor="csv-file" className="mb-2">
            Upload CSV File
          </Label>
          <div className="mt-2">
            <label
              htmlFor="csv-file"
              className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
            >
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-6 h-6 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : "Click to upload CSV file"}
                </span>
              </div>
              <input
                id="csv-file"
                name="csv-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
                required
              />
            </label>
          </div>
        </div>

        {/* Mode Selection */}
        <div>
          <Label htmlFor="mode-selection" className="mb-2">
            Enrichment Columns
          </Label>
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant={mode === "ai" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("ai")}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI Generated
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("manual")}
              className="flex-1"
            >
              Manual Entry
            </Button>
          </div>
        </div>

        {/* AI Mode */}
        {mode === "ai" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ai-prompt" className="mb-1">
                What data do you want to enrich?
              </Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="e.g., Find the company's LinkedIn URL and CEO email address"
                required
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateColumns}
              disabled={!aiPrompt.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating Columns...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Columns
                </>
              )}
            </Button>

            {/* Generated Columns - Editable */}
            {generatedColumns.length > 0 && (
              <div className="space-y-3">
                <Label htmlFor="generated-columns">
                  Generated Columns (you can edit/remove)
                </Label>
                {generatedColumns.map((column, index) => (
                  <div
                    key={index}
                    className="space-y-2 p-3 border border-gray-200 rounded-md"
                  >
                    <div className="flex gap-2">
                      <Input
                        value={column.name}
                        onChange={(e) =>
                          updateGeneratedColumn(index, "name", e.target.value)
                        }
                        placeholder="Column name"
                        className="flex-1"
                      />
                      <Select
                        value={column.type}
                        onChange={(e) =>
                          updateGeneratedColumn(index, "type", e.target.value)
                        }
                        className="w-32"
                      >
                        <option value="String">String</option>
                        <option value="Number">Number</option>
                        <option value="Boolean">Boolean</option>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGeneratedColumn(index)}
                        className="text-gray-600"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={column.description}
                      onChange={(e) =>
                        updateGeneratedColumn(
                          index,
                          "description",
                          e.target.value,
                        )
                      }
                      placeholder="Description of what data to find and how..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === "manual" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="manual-columns">Column Names</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addManualColumn}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Column
              </Button>
            </div>

            <div className="space-y-3">
              {manualColumns.map((column, index) => (
                <div
                  key={index}
                  className="space-y-2 p-3 border border-gray-200 rounded-md"
                >
                  <div className="flex gap-2">
                    <Input
                      value={column.name}
                      onChange={(e) =>
                        updateManualColumn(index, "name", e.target.value)
                      }
                      placeholder="Column name"
                      className="flex-1"
                      required
                    />
                    <Select
                      value={column.type}
                      onChange={(e) =>
                        updateManualColumn(index, "type", e.target.value)
                      }
                      className="w-32"
                    >
                      <option value="String">String</option>
                      <option value="Number">Number</option>
                      <option value="Boolean">Boolean</option>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeManualColumn(index)}
                      className="text-gray-600"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={column.description}
                    onChange={(e) =>
                      updateManualColumn(index, "description", e.target.value)
                    }
                    placeholder="Description: What data should this column contain"
                    rows={2}
                    className="text-sm"
                    required
                  />
                </div>
              ))}
            </div>

            {manualColumns.length === 0 && (
              <p className="text-sm text-gray-500">
                Add columns that you want to enrich with AI
              </p>
            )}
          </div>
        )}

        {/* Optional Enrichment Prompt */}
        <div>
          <Label htmlFor="enrichment-prompt" className="mb-1">
            Enrichment Prompt (optional)
          </Label>
          <Textarea
            id="enrichment-prompt"
            value={enrichmentPrompt}
            onChange={(e) => setEnrichmentPrompt(e.target.value)}
            rows={3}
            placeholder="Additional instructions for data enrichment..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Provide context on how to fill the enrichment columns
          </p>
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
              <Plus className="w-4 h-4 mr-1" />
              Add Website
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
      </form>
    </Drawer>
  );
}
