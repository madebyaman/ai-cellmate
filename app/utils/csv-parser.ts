import fs from 'fs';
import path from 'path';

export interface CSVRow {
  id: number;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  website: string;
  instagram_id: string;
  facebook_id: string;
  x_id: string;
  bio: string;
}

export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map((line, index) => {
    // Handle CSV parsing with quoted fields that may contain commas
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Don't forget the last value
    values.push(currentValue.trim());
    
    // Create object with proper mapping
    return {
      id: parseInt(values[0]) || index + 1,
      created_at: values[1] || '',
      first_name: values[2] || '',
      last_name: values[3] || '',
      email: values[4] || '',
      website: values[5] || '',
      instagram_id: values[6] || '',
      facebook_id: values[7] || '',
      x_id: values[8] || '',
      bio: values[9] || '',
    };
  });
}

export function loadCSVData(): CSVRow[] {
  try {
    const csvPath = path.join(process.cwd(), 'new.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    return parseCSV(csvContent);
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return [];
  }
}