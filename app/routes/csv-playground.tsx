import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { AlertCircle, FileText, Upload } from "lucide-react";
import Papa from "papaparse";
import { memo, useEffect, useRef, useState } from "react";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";

// Constants
const CHUNK_SIZE = 5000;
const ROW_HEIGHT = 45;
const LOAD_MORE_THRESHOLD = 20; // Load more when within 50 rows of the end

interface CSVData {
  headers: string[];
  rows: string[][];
  loadedRows: number;
  hasMore: boolean;
}

interface CSVRowProps {
  row: string[];
  rowIndex: number;
  virtualItem: VirtualItem;
}

const CSVRow = ({ row, rowIndex, virtualItem }: CSVRowProps) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start}px)`,
      }}
      className="flex hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
    >
      <div className="px-4 py-3 text-sm text-gray-500 text-center font-mono w-16 border-r border-gray-200 flex items-center justify-center">
        {rowIndex + 1}
      </div>
      {row.map((cell, cellIndex) => {
        const isUrl = cell && (cell.startsWith("http") || cell.includes("@"));

        return (
          <div
            key={cellIndex}
            className="px-4 py-3 text-sm border-r border-gray-200 min-w-[120px] flex-1 flex items-center"
          >
            {cell ? (
              isUrl ? (
                cell.includes("@") ? (
                  <a
                    href={`mailto:${cell}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {cell}
                  </a>
                ) : (
                  <a
                    href={cell}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {cell}
                  </a>
                )
              ) : (
                <div
                  className={`text-gray-900 ${cell.length > 50 ? "max-w-xs truncate" : ""}`}
                  title={cell}
                >
                  {cell}
                </div>
              )
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const csvRowCompareFn = (prevProps: CSVRowProps, nextProps: CSVRowProps) => {
  // Compare rowIndex
  if (prevProps.rowIndex !== nextProps.rowIndex) {
    return false;
  }

  // Compare virtualItem properties that affect rendering
  if (
    prevProps.virtualItem.key !== nextProps.virtualItem.key ||
    prevProps.virtualItem.size !== nextProps.virtualItem.size ||
    prevProps.virtualItem.start !== nextProps.virtualItem.start
  ) {
    return false;
  }

  // Compare row data (array of strings)
  if (prevProps.row.length !== nextProps.row.length) {
    return false;
  }

  for (let i = 0; i < prevProps.row.length; i++) {
    if (prevProps.row[i] !== nextProps.row[i]) {
      return false;
    }
  }

  // All comparisons passed, props are equal
  return true;
};

const MemoizedCSVRow = memo(CSVRow, csvRowCompareFn);

interface VirtualizedTableProps {
  csvData: CSVData;
  isAutoScrolling: boolean;
  onAutoScrollToggle: () => void;
}

const VirtualizedTable = ({
  csvData,
  isAutoScrolling,
  onAutoScrollToggle,
}: VirtualizedTableProps) => {
  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: csvData ? csvData.rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Load extra rows for smooth scrolling
    getItemKey: (index) => index, // Use index as key since it's unique
  });

  // Auto-scroll functionality
  const startAutoScroll = () => {
    if (!parentRef.current) return;

    let direction = "down";
    let scrollSpeed = 100;

    const scroll = () => {
      if (!parentRef.current) return;

      const container = parentRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;

      if (direction === "down") {
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          direction = "up";
        } else {
          container.scrollTop += scrollSpeed;
        }
      } else {
        if (scrollTop <= 10) {
          direction = "down";
        } else {
          container.scrollTop -= scrollSpeed;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    // Stop any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(scroll);
  };

  const stopAutoScroll = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Handle auto-scroll toggle
  useEffect(() => {
    if (isAutoScrolling) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAutoScrolling]);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto ring-1 ring-gray-200"
      style={{
        height: "100%",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const row = csvData.rows[virtualItem.index];
          const rowIndex = virtualItem.index;

          return (
            <MemoizedCSVRow
              key={virtualItem.key}
              row={row}
              rowIndex={rowIndex}
              virtualItem={virtualItem}
            />
          );
        })}
      </div>
    </div>
  );
};

function virtualTableCompareFn(
  a: VirtualizedTableProps,
  b: VirtualizedTableProps,
) {
  return (
    a.csvData.rows.length === b.csvData.rows.length &&
    a.isAutoScrolling === b.isAutoScrolling
  );
}

const MemoizedVirtualTable = memo(VirtualizedTable, virtualTableCompareFn);

export default function CSVPlayground() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreRequested, setLoadMoreRequested] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Refs
  const currentParserRef = useRef<any>(null);

  // Auto-load more data when scrolling near the end
  // useEffect(() => {
  //   if (!csvData || !csvData.hasMore || isLoadingMore) return;

  //   const virtualItems = rowVirtualizer.getVirtualItems();
  //   if (virtualItems.length === 0) return;

  //   const lastVisibleIndex = virtualItems[virtualItems.length - 1].index;
  //   const shouldLoadMore =
  //     csvData.rows.length - lastVisibleIndex <= LOAD_MORE_THRESHOLD;

  //   console.log("🔍 Scroll detection:", {
  //     lastVisibleIndex,
  //     totalRows: csvData.rows.length,
  //     threshold: LOAD_MORE_THRESHOLD,
  //     shouldLoadMore,
  //     hasMore: csvData.hasMore,
  //     isLoadingMore,
  //   });

  //   if (shouldLoadMore) {
  //     console.log("🚀 Auto-triggering load more");
  //     loadMoreRows();
  //   }
  // }, [rowVirtualizer.getVirtualItems(), csvData, isLoadingMore]);

  const parseCSVFile = (
    file: File,
    maxRows: number = CHUNK_SIZE,
  ): Promise<CSVData> => {
    console.log("🚀 parseCSVFile started", {
      fileName: file.name,
      maxRows,
      fileSize: file.size,
    });

    return new Promise((resolve, reject) => {
      let headers: string[] = [];
      const rows: string[][] = [];
      let isFirstRow = true;
      let loadedRows = 0;
      let totalProcessed = 0;
      let chunkSize = maxRows;
      let currentChunkRows = 0;

      console.log("📋 Setting up Papa.parse");

      const parser = Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        // worker:true,
        // No worker - required for pause/resume functionality
        step: (result, parser) => {
          totalProcessed++;
          // console.log(`📊 Step callback #${totalProcessed}`, {
          //   isFirstRow,
          //   loadedRows,
          //   currentChunkRows,
          //   chunkSize,
          //   loadMoreRequested,
          //   rowLength: Array.isArray(result.data)
          //     ? result.data.length
          //     : "not array",
          // });

          if (result.errors.length > 0) {
            console.error("❌ Step error:", result.errors[0]);
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`));
            return;
          }

          const row = result.data as string[];
          const trimmedRow = row.map((cell) => cell.trim());
          // console.log("🔄 Processing row:", {
          //   rowData: trimmedRow.slice(0, 3),
          //   totalCells: trimmedRow.length,
          // });

          if (isFirstRow) {
            headers = trimmedRow;
            isFirstRow = false;
            // console.log("📝 Headers set:", headers.slice(0, 5));
          } else {
            rows.push(trimmedRow);
            loadedRows++;
            currentChunkRows++;
            // console.log(
            //   `➕ Added row ${loadedRows} (chunk: ${currentChunkRows}/${chunkSize})`,
            // );

            // Check if we should pause (reached chunk size)
            if (currentChunkRows >= chunkSize) {
              // console.log("⏸️ Pausing parser - reached chunk size");
              parser.pause();
              currentParserRef.current = parser; // Store parser for resume

              // Update csvData state
              const newData = {
                headers,
                rows,
                loadedRows,
                hasMore: true,
              };

              // console.log("✅ Updating state with chunk data:", {
              //   rowCount: newData.rows.length,
              //   hasMore: newData.hasMore,
              // });

              setCsvData(newData);
              setIsLoadingMore(false);

              // Reset chunk counter for next load
              currentChunkRows = 0;

              // If this is the initial load, resolve the promise
              if (loadedRows === maxRows) {
                resolve(newData);
              }
            }
          }
        },
        complete: () => {
          console.log("🏁 Parse complete callback", {
            headersLength: headers.length,
            rowsLength: rows.length,
            totalProcessed,
            loadedRows,
          });

          if (headers.length === 0) {
            console.error("❌ Complete error: CSV file is empty");
            reject(new Error("CSV file is empty"));
            return;
          }

          console.log("✅ Resolving complete data (end of file)");
          currentParserRef.current = null; // No more data to parse
          const finalData = {
            headers,
            rows,
            loadedRows,
            hasMore: false,
          };

          setCsvData(finalData);
          setIsLoadingMore(false);

          // If this is the initial load and we haven't resolved yet
          if (loadedRows <= maxRows) {
            resolve(finalData);
          }
        },
        error: (error) => {
          console.error("❌ Parse error:", error);
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });

      console.log("🎯 Papa.parse initiated", parser);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    console.log("🔥 processFile called", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      console.log("❌ Invalid file type");
      setError("Please select a CSV file");
      return;
    }

    console.log("🔧 Setting up file processing");
    setFileName(file.name);
    setError("");

    try {
      console.log("🚀 Calling parseCSVFile");
      const parsed = await parseCSVFile(file);
      console.log("✅ parseCSVFile resolved:", {
        headers: parsed.headers.length,
        rows: parsed.rows.length,
        loadedRows: parsed.loadedRows,
        hasMore: parsed.hasMore,
      });
      setCsvData(parsed);
      console.log("📊 setCsvData completed");
    } catch (err) {
      console.error("❌ processFile error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse CSV file");
    }
  };

  const loadMoreRows = () => {
    console.log("🔄 loadMoreRows called", {
      hasCurrentParser: !!currentParserRef.current,
      hasCsvData: !!csvData,
      hasMore: csvData?.hasMore,
      isLoadingMore,
    });

    if (
      !currentParserRef.current ||
      !csvData ||
      !csvData.hasMore ||
      isLoadingMore
    ) {
      console.log("❌ loadMoreRows early return - conditions not met");
      return;
    }

    console.log("✅ loadMoreRows proceeding");
    setIsLoadingMore(true);
    setLoadMoreRequested(true);
    setError("");

    console.log("▶️ Resuming parser for load more");
    currentParserRef.current.resume();
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
    setIsAutoScrolling(!isAutoScrolling);
  };

  const resetData = () => {
    // Abort current parser if it exists
    if (currentParserRef.current) {
      currentParserRef.current.abort();
      currentParserRef.current = null;
    }

    setCsvData(null);
    setFileName("");
    setError("");
    setIsLoadingMore(false);
    setLoadMoreRequested(false);
    setIsAutoScrolling(false);
  };

  if (!csvData) {
    return (
      <LayoutWrapper>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
              CSV Playground
            </h1>
            <p className="text-gray-600">
              Upload a CSV file to explore and preview your data
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
      className="flex flex-col h-full overflow-auto"
      outerContainerClass="overflow-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">{fileName}</h1>
          <div className="text-sm text-gray-500">
            Showing {csvData.rows.length} rows × {csvData.headers.length}{" "}
            columns
            {csvData.hasMore && (
              <span className="text-blue-600 ml-1">(more available)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLoadingMore && (
            <div className="text-sm text-blue-600 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Loading more rows...
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleAutoScrollToggle}
            className={
              isAutoScrolling
                ? "text-red-700 border-red-300 hover:bg-red-50"
                : "text-green-700 border-green-300 hover:bg-green-50"
            }
          >
            {isAutoScrolling ? "Stop Auto Scroll" : "Start Auto Scroll"}
          </Button>
          <Button
            variant="outline"
            onClick={resetData}
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Upload New File
          </Button>
        </div>
      </div>

      {/* Headers */}
      <div className="sticky top-0 bg-white shadow-sm border-b border-gray-200 flex-shrink-0 z-10">
        <div className="flex">
          <div className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 border-r border-gray-200">
            #
          </div>
          {csvData.headers.map((header, index) => (
            <div
              key={index}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-r border-gray-200 flex-1"
            >
              {header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table */}
      <MemoizedVirtualTable
        csvData={csvData}
        isAutoScrolling={isAutoScrolling}
        onAutoScrollToggle={handleAutoScrollToggle}
      />
    </LayoutWrapper>
  );
}
