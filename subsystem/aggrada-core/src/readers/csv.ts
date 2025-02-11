import { parse } from 'csv-parse';
import fs from 'fs';
import { Readable } from 'stream';
import { promisify } from 'util';

/**
 * Streams and processes large CSV files or buffers line by line, ensuring memory efficiency.
 * It allows processing of each row (or batch of rows) via a callback function.
 * The data is always kept as raw strings to prevent any type conversion.
 *
 * @param options - Configuration options for the CSV reading.
 * @param processFn - Callback function to process each row or batch of rows.
 * @returns A promise that resolves when processing is complete.
 */
export const csvToJsonStream = async (
  {
    file,
    delimiter = ',',
    columns = true,
    batchSize = 100,
  }: {
    file: string | Buffer; // File path or Buffer for in-memory CSV data
    delimiter?: string; // CSV delimiter (optional)
    columns?: boolean; // Whether the first row contains headers (optional)
    batchSize?: number; // Optional batch size for processing multiple rows at once
  },
  processFn: (rows: Record<string, string>[]) => Promise<void> | void
): Promise<void> => {
  let stream: Readable;

  // Check if 'file' is a path (string) or a buffer
  if (typeof file === 'string') {
    stream = fs.createReadStream(file); // File path
  } else if (Buffer.isBuffer(file)) {
    stream = Readable.from(file.toString()); // Buffer
  } else {
    throw new Error(
      'Invalid file input. It must be a string (file path) or Buffer.'
    );
  }

  const parser = parse({ delimiter, columns });
  const rowsBuffer: Record<string, string>[] = [];

  return new Promise((resolve, reject) => {
    stream
      .pipe(parser)
      .on('data', async (row: Record<string, string>) => {
        rowsBuffer.push(row);

        // Process batch when batchSize is reached
        if (rowsBuffer.length >= batchSize) {
          parser.pause(); // Pause reading while processing batch
          try {
            await processFn(rowsBuffer);
            rowsBuffer.length = 0; // Clear buffer after processing
            parser.resume(); // Resume reading
          } catch (error) {
            reject(error); // If processing fails, reject the promise
          }
        }
      })
      .on('end', async () => {
        // Process any remaining rows
        if (rowsBuffer.length > 0) {
          try {
            await processFn(rowsBuffer);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(); // No remaining rows, resolve the promise
        }
      })
      .on('error', (error) => {
        reject(error); // Handle file read errors
      });
  });
};

/**
 * Extracts metadata and a sample from a CSV file or Buffer
 *
 * @param options - Configuration options for the CSV reading.
 * @returns A promise resolving to an object containing the metadata and sample.
 */
export const csvPreview = async ({
  file,
  delimiter = ',',
  columns = true,
}: {
  file: string | Buffer; // File path or Buffer for in-memory CSV data
  delimiter?: string; // CSV delimiter (optional)
  columns?: boolean; // Whether the first row contains headers (optional)
}): Promise<{
  headers: string[] | null;
  totalColumns: number;
  totalRows: number;
  fileSize: number | null; // in megabytes
  sample: Record<string, string>[];
}> => {
  // Utility to get file stats
  const stat = promisify(fs.stat);

  let stream: Readable;
  let fileSize: number | null = null;

  // Handle file input as path or buffer
  if (typeof file === 'string') {
    stream = fs.createReadStream(file); // File path
    const fileStats = await stat(file); // Get file stats for size
    fileSize = fileStats.size / (1024 * 1024); // Convert bytes to megabytes
  } else if (Buffer.isBuffer(file)) {
    stream = Readable.from(file.toString()); // Buffer input
  } else {
    throw new Error(
      'Invalid file input. It must be a string (file path) or Buffer.'
    );
  }

  const parser = parse({ delimiter, columns });
  const sampleData: Record<string, string>[] = [];
  let headers: string[] | null = null;
  let totalRows = 0;

  return new Promise((resolve, reject) => {
    stream
      .pipe(parser)
      .on('data', (row: Record<string, string>) => {
        // Capture headers on the first row if necessary
        if (totalRows === 0 && columns && !headers) {
          headers = Object.keys(row);
        }

        // Capture the first 3 rows as sample
        if (totalRows < 3) {
          sampleData.push(row);
        }

        totalRows++;
      })
      .on('end', () => {
        resolve({
          headers,
          totalColumns: headers?.length || 0,
          totalRows,
          fileSize,
          sample: sampleData,
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};
