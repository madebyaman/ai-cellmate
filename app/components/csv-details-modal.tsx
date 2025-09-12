import { Clock, CheckCircle, AlertCircle, Globe, Loader } from "lucide-react";
import Drawer from "./drawer";

interface Run {
  id: string;
  status: string;
  createdAt: string;
  finishedAt?: string;
}

interface EnrichmentHint {
  prompt?: string;
  websites?: string[];
}

interface CSVDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  runs: Run[];
  hint?: EnrichmentHint | null;
  processedCells: number;
  totalCells: number;
  status: string;
}

export function CSVDetailsModal({
  isOpen,
  onClose,
  tableName,
  runs,
  hint,
  processedCells,
  totalCells,
  status,
}: CSVDetailsModalProps) {
  const getStatusIcon = (runStatus: string) => {
    switch (runStatus) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "FAILED":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "RUNNING":
        return <Loader className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (runStatus: string) => {
    switch (runStatus) {
      case "COMPLETED":
        return "Completed";
      case "FAILED":
        return "Failed";
      case "RUNNING":
        return "Running";
      default:
        return "Pending";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const completionPercentage =
    totalCells > 0 ? Math.round((processedCells / totalCells) * 100) : 0;

  return (
    <Drawer open={isOpen} setOpen={onClose} title="CSV Details">
      <div className="space-y-6">
        {/* Table Info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {tableName}
          </h3>

          {/* Progress */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Enrichment Progress
              </span>
              <span className="text-sm text-gray-600">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {processedCells} of {totalCells} cells enriched
            </p>
          </div>
        </div>

        {/* Current Configuration */}
        {hint && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Current Configuration
            </h4>

            {/* Prompt */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrichment Prompt
              </label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-800">
                  {hint.prompt || "No prompt set"}
                </p>
              </div>
            </div>

            {/* Websites */}
            {hint.websites && hint.websites.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Websites ({hint.websites.length})
                </label>
                <div className="space-y-2">
                  {hint.websites.map((website, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded"
                    >
                      <Globe className="w-4 h-4" />
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                      >
                        {website}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Runs History */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Run History ({runs.length})
          </h4>

          <div className="space-y-3">
            {runs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No enrichment runs yet
              </p>
            ) : (
              runs.map((run, index) => (
                <div
                  key={run.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="text-sm font-medium text-gray-900">
                        Run #{runs.length - index}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          run.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : run.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : run.status === "RUNNING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getStatusText(run.status)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Started: {formatDate(run.createdAt)}</p>
                    {run.finishedAt && (
                      <p>Finished: {formatDate(run.finishedAt)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
