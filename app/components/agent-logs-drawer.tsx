import { Dot, Loader } from "lucide-react";
import Drawer from "./drawer";

interface LogEntry {
  message: string;
  timestamp: string;
  type: string;
}

interface AgentLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
}

export function AgentLogsDrawer({
  isOpen,
  onClose,
  logs,
}: AgentLogsDrawerProps) {
  return (
    <Drawer open={isOpen} setOpen={onClose} title="Agent Activity Log">
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Connecting to enrichment stream...</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 text-sm py-2 px-3 rounded ${
                log.type === "row-start"
                  ? "text-orange-600 font-medium bg-orange-50"
                  : "text-gray-600"
              }`}
            >
              {log.type === "row-start" ? (
                <span className="mt-1">⚡</span>
              ) : (
                <Dot className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
              )}
              <span className="flex-1">{log.message}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </Drawer>
  );
}