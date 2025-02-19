import fs from 'node:fs';

import { parse } from 'csv-parse';

import { getAllIncomeTypes } from './getAllIncomeTypes';
import { getCSVFileDir } from './getCSVFiles';
import { variablesDictionary } from './variablesDictionary';

const allowedVariables = Object.keys(variablesDictionary);

export const getIncomeTypeVariables = async ({
  incomeType,
}: {
  incomeType: string;
}) => {
  const allIncomeTypes = await getAllIncomeTypes();

  const incomeTypeProps = allIncomeTypes.find((type) => {
    return type.slug === incomeType;
  });

  if (!incomeTypeProps) {
    return [];
  }

  const csvFileDir = getCSVFileDir({
    folder: 'outcomes',
    fileName: incomeTypeProps.fileName,
  });

  const parser = fs.createReadStream(csvFileDir).pipe(parse());

  const headers = [] as string[];

  for await (const record of parser) {
    headers.push(...record);
    break;
  }

  parser.destroy();

  return headers.filter((header) => {
    return allowedVariables.includes(header);
  });
};
