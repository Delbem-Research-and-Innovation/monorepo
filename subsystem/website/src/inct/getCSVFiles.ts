import path from 'node:path';

export const getCSVFilesDir = ({ folder }: { folder?: string } = {}) => {
  return path.resolve('.', 'temp_csvs', folder || '');
};

export const getCSVFileDir = ({
  fileName,
  folder,
}: {
  fileName: string;
  folder?: string;
}) => {
  const csvFilesDir = getCSVFilesDir();
  return path.resolve(csvFilesDir, folder || '', fileName);
};
