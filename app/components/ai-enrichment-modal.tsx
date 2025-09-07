import { useState } from "react";
import { X, Sparkles, User, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { useFetcher } from "react-router";

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
  const [aiRole, setAiRole] = useState("Custom");
  const [returnStructured, setReturnStructured] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [examples, setExamples] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("intent", "enrich-data");
    formData.append("prompt", prompt);
    formData.append("aiRole", aiRole);
    formData.append("returnStructured", returnStructured.toString());
    formData.append("selectedRows", JSON.stringify(selectedRows));
    
    fetcher.submit(formData, { method: "POST" });
    onClose();
  };

  const handleAddExample = () => {
    setExamples([...examples, ""]);
  };

  const updateExample = (index: number, value: string) => {
    const updated = [...examples];
    updated[index] = value;
    setExamples(updated);
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Use AI</h2>
                <p className="text-sm text-gray-600">
                  Learn how to use: check out our blog on AI for Sales Prospecting for use cases, templates, and inspiration!
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start with an integration template (optional)
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplate("browse")}>
                  + Browse Templates
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplate("save")}>
                  Save current config
                </Button>
              </div>
            </div>

            {/* Write a prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Write a prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Tell me if the company with domain '{Domain}' is B2B."
              />
              <p className="mt-1 text-xs text-gray-500">
                Type / to insert Column
              </p>
            </div>

            {/* Examples */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Give examples of the results you expect (optional)
                </label>
                <Button variant="outline" size="sm" onClick={handleAddExample}>
                  + Add Example
                </Button>
              </div>
              
              {examples.map((example, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={example}
                    onChange={(e) => updateExample(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Example result..."
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeExample(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* AI Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select an AI Role (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAiRole("Custom")}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    aiRole === "Custom"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Custom</span>
                  </div>
                </button>
                <button
                  onClick={() => setAiRole("Cold Email Copywriter")}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    aiRole === "Cold Email Copywriter"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">Cold Email Copywriter</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Describe the persona you'd like the AI to adopt
                  </p>
                </button>
              </div>
            </div>

            {/* Return as structured format */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReturnStructured(!returnStructured)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    returnStructured ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {returnStructured && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Return as structured format (JSON Mode)
                  </span>
                </button>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  OFF
                </span>
              </div>
              
              <div className="text-xs text-gray-600">
                If enabled, the output will be a JSON object. Be very clear about the properties 
                you want to return, and mention the word "json" somewhere in your prompt.
              </div>
            </div>

            {/* Settings */}
            <div className="border-t pt-4">
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                ⚙️ SETTINGS
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Try on 5 rows 
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded ml-1">
                  Free
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={fetcher.state !== "idle"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {selectedRows.length > 0 
                    ? `Save & Run first ${Math.min(selectedRows.length, 10)} rows`
                    : `Save & Run first ${Math.min(totalRows, 10)} rows`
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}