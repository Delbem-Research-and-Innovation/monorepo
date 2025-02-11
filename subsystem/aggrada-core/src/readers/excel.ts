import fs from 'fs';
import xlsx from 'xlsx';

/**
 * Streams and processes large Excel files (xlsx, xls) row by row for memory efficiency.
 * It allows processing of each row (or batch of rows) via a callback function.
 * The data is always kept as raw strings to prevent any type conversion.
 *
 * @param options - Configuration options for reading the Excel file.
 * @param processFn - Callback function to process each row or batch of rows.
 * @returns A promise that resolves when processing is complete.
 */
export const excelToJsonStream = async (
  {
    file,
    batchSize = 100,
  }: {
    file: string | Buffer; // File path or Buffer for in-memory Excel data
    batchSize?: number; // Optional batch size for processing multiple rows at once
  },
  processFn: (rows: Record<string, string>[]) => Promise<void> | void
): Promise<void> => {
  let workbook: xlsx.WorkBook;

  // Check if 'file' is a path (string) or a buffer
  if (typeof file === 'string') {
    const fileBuffer = fs.readFileSync(file);
    workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  } else if (Buffer.isBuffer(file)) {
    workbook = xlsx.read(file, { type: 'buffer' });
  } else {
    throw new Error(
      'Invalid file input. It must be a string (file path) or Buffer.'
    );
  }

  const sheetName = workbook.SheetNames[0]; // Assuming the first sheet
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: '',
  });
  const rowsBuffer: Record<string, string>[] = [];

  for (const row of rows) {
    rowsBuffer.push(row);

    // Process batch when batchSize is reached
    if (rowsBuffer.length >= batchSize) {
      await processFn(rowsBuffer);
      rowsBuffer.length = 0; // Clear buffer after processing
    }
  }

  // Process any remaining rows
  if (rowsBuffer.length > 0) {
    await processFn(rowsBuffer);
  }
};

/**
 * Extracts metadata and a sample from an Excel (xlsx/xls) file or Buffer.
 *
 * @param options - Configuration options for the Excel reading.
 * @returns A promise resolving to an object containing the metadata and sample.
 */
export const excelPreview = async ({
  file,
}: {
  file: string | Buffer; // File path or Buffer for in-memory Excel data
}): Promise<{
  headers: string[] | null;
  totalColumns: number;
  totalRows: number;
  fileSize: number | null; // in megabytes
  sample: Record<string, string | number>[]; // first 3 rows as a sample
}> => {
  let workbook: xlsx.WorkBook;
  let fileSize: number | null = null;

  // Handle file input as path or buffer
  if (typeof file === 'string') {
    try {
      const fileStats = fs.statSync(file); // Synchronously get file stats
      fileSize = fileStats.size / (1024 * 1024); // Convert bytes to megabytes

      const fileBuffer = fs.readFileSync(file);
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch {
      throw new Error('Failed to calculate file size or read Excel file.');
    }
  } else if (Buffer.isBuffer(file)) {
    try {
      workbook = xlsx.read(file, { type: 'buffer' });
    } catch {
      throw new Error('Failed to read Excel buffer.');
    }
  } else {
    throw new Error(
      'Invalid file input. It must be a string (file path) or Buffer.'
    );
  }

  // Get the first sheet from the workbook
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel file contains no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert the sheet to JSON (header: 1 means each row is an array, not an object)
  const jsonData = xlsx.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    throw new Error('The Excel file contains no data.');
  }

  const headers = jsonData[0] as string[];
  const totalColumns = headers.length;
  const totalRows = jsonData.length - 1; // Exclude the header row
  const sample = jsonData.slice(1, 4).map((row) => {
    const rowData: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index] || ''; // Ensure empty cells are handled
    });
    return rowData;
  });

  return {
    headers,
    totalColumns,
    totalRows,
    fileSize,
    sample,
  };
};
