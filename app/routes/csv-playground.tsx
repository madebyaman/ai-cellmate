import { useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";

interface CSVData {
  headers: string[];
  rows: string[][];
}

export default function CSVPlayground() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);

  const parseCSV = (text: string): CSVData => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Parse rows
    const rows = lines.slice(1).map(line => {
      return line.split(',').map(cell => cell.trim().replace(/"/g, ''));
    });

    return { headers, rows };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setCsvData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
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

  const resetData = () => {
    setCsvData(null);
    setFileName('');
    setError('');
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
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
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
    <LayoutWrapper className="flex flex-col h-full overflow-auto" outerContainerClass="overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {fileName}
          </h1>
          <div className="text-sm text-gray-500">
            {csvData.rows.length} rows × {csvData.headers.length} columns
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={resetData}
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Upload New File
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto ring-1 ring-gray-200 rounded sm:rounded-lg">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              {csvData.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {csvData.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-sm text-gray-500 text-center font-mono">
                  {rowIndex + 1}
                </td>
                {row.map((cell, cellIndex) => {
                  const isUrl = cell && (cell.startsWith('http') || cell.includes('@'));
                  
                  return (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 text-sm border-l border-gray-200"
                    >
                      {cell ? (
                        isUrl ? (
                          cell.includes('@') ? (
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
                            className={`text-gray-900 ${cell.length > 50 ? 'max-w-xs truncate' : ''}`}
                            title={cell}
                          >
                            {cell}
                          </div>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LayoutWrapper>
  );
}