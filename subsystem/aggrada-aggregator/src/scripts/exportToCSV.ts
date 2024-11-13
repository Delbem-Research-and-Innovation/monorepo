/* eslint-disable no-console */
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';

type AggregatedDataEntry = {
  [key: string]: string | number | Date | string[]; // Accepting all potential types, with arrays for data columns
};

/**
 * Writes aggregated data to a CSV file.
 *
 * @param aggregatedData - Array of aggregated data entries to write to CSV.
 * @param outputPath - File path to save the CSV.
 */
export const writeCsv = ({
  aggregatedData,
  outputPath,
}: {
  aggregatedData: AggregatedDataEntry[];
  outputPath: string;
}) => {
  if (aggregatedData.length === 0) {
    console.warn('No data provided to write to CSV.');
    return;
  }

  // Step 1: Collect all unique headers across entries for consistent column structure
  const allHeaders = new Set<string>();
  aggregatedData.forEach((entry) => {
    Object.keys(entry).forEach((key) => {
      return allHeaders.add(key);
    });
  });
  const headers = Array.from(allHeaders);

  // Step 2: Transform data to ensure all columns are consistent
  const transformedData = aggregatedData.map((entry) => {
    const row: { [key: string]: string | number | Date | string[] } = {};
    headers.forEach((header) => {
      row[header] = header in entry ? entry[header] : []; // Populate empty array for missing keys
    });
    return row;
  });

  // Step 3: Use csv-stringify to generate CSV content
  const csvContent = stringify(transformedData, {
    header: true,
    columns: headers,
  });

  // Step 4: Write the CSV content to a file
  fs.writeFileSync(outputPath, csvContent);
  console.log(`CSV successfully written to ${outputPath}`);
};
