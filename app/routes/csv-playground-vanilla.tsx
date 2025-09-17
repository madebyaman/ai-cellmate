import { AlertCircle, FileText, Upload } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import {
  VanillaVirtualizer,
  createDefaultRowRenderer,
  type CSVData
} from "~/lib/vanilla-virtualizer";

// Constants
const CONTAINER_HEIGHT = 500;
const MOBILE_BREAKPOINT = 768;

export default function CSVPlaygroundVanilla() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Refs for DOM elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const rowContainerRef = useRef<HTMLDivElement>(null);

  // Virtualizer instance
  const virtualizerRef = useRef<VanillaVirtualizer | null>(null);

  // Check for mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize virtualizer after CSV data loads
  useEffect(() => {
    if (csvData && scrollContainerRef.current && spacerRef.current && rowContainerRef.current) {
      // Clean up existing virtualizer
      if (virtualizerRef.current) {
        virtualizerRef.current.destroy();
      }

      // Create new virtualizer
      virtualizerRef.current = new VanillaVirtualizer({
        containerHeight: CONTAINER_HEIGHT,
        onRowRender: createDefaultRowRenderer(csvData)
      });

      // Initialize with DOM elements and data
      virtualizerRef.current.initialize(
        scrollContainerRef.current,
        spacerRef.current,
        rowContainerRef.current,
        csvData
      );
    }

    // Cleanup function
    return () => {
      if (virtualizerRef.current) {
        virtualizerRef.current.destroy();
        virtualizerRef.current = null;
      }
    };
  }, [csvData]);

  const parseCSVFile = (file: File): Promise<CSVData> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }

          const data = results.data as string[][];
          if (data.length === 0) {
            reject(new Error("CSV file is empty"));
            return;
          }

          const headers = data[0].map(header => header.trim());
          const rows = data.slice(1).map(row =>
            row.map(cell => (cell || "").trim())
          );

          resolve({ headers, rows });
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFileName(file.name);
    setError("");

    try {
      const parsed = await parseCSVFile(file);
      setCsvData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleAutoScrollToggle = () => {
    if (virtualizerRef.current) {
      const newState = virtualizerRef.current.toggleAutoScroll();
      setIsAutoScrolling(newState);
    }
  };

  const resetData = () => {
    setCsvData(null);
    setFileName("");
    setError("");
    setIsAutoScrolling(false);

    // Clean up virtualizer
    if (virtualizerRef.current) {
      virtualizerRef.current.destroy();
      virtualizerRef.current = null;
    }
  };

  if (!csvData) {
    return (
      <LayoutWrapper>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
              CSV Playground (Vanilla JS)
            </h1>
            <p className="text-gray-600">
              Upload a CSV file to explore with custom vanilla JS virtualization
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="csv-upload"
            />

            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-600" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your CSV file here
                </h3>
                <p className="text-gray-500 mb-4">
                  or click to browse and select a file
                </p>

                <Button variant="outline" className="mx-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  Choose CSV File
                </Button>
              </div>

              <p className="text-xs text-gray-400">
                Supports .csv files up to 10MB
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper
      className="flex flex-col h-full overflow-hidden"
      outerContainerClass="overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 flex-shrink-0 gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">{fileName}</h1>
          <div className="text-xs md:text-sm text-gray-500">
            {csvData.rows.length} rows × {csvData.headers.length} columns
            <span className="text-blue-600 ml-1 hidden md:inline">(vanilla JS virtualization)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleAutoScrollToggle}
            className={
              isAutoScrolling
                ? "text-red-700 border-red-300 hover:bg-red-50 text-sm"
                : "text-green-700 border-green-300 hover:bg-green-50 text-sm"
            }
          >
            {isAutoScrolling ? "Stop Auto Scroll" : "Start Auto Scroll"}
          </Button>
          <Button
            variant="outline"
            onClick={resetData}
            className="text-gray-700 border-gray-300 hover:bg-gray-50 text-sm"
          >
            Upload New File
          </Button>
        </div>
      </div>

      {/* Headers */}
      <div className="sticky top-0 bg-white shadow-sm border-b border-gray-200 flex-shrink-0 z-10">
        <div className="flex">
          <div className={`px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${isMobile ? 'w-12' : 'w-16'} border-r border-gray-200`}>
            #
          </div>
          {csvData.headers.map((header, index) => (
            <div
              key={index}
              className={`px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${isMobile ? 'min-w-[100px]' : 'min-w-[120px]'} border-r border-gray-200 flex-1 truncate`}
              title={header}
            >
              {header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-auto ring-1 ring-gray-200"
          style={{ height: CONTAINER_HEIGHT }}
        >
          {/* Spacer div for correct scrollbar */}
          <div ref={spacerRef} className="relative">
            {/* Container for virtualized rows */}
            <div ref={rowContainerRef} className="relative" />
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}