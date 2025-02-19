import fs from 'node:fs';

import { parse } from 'csv-parse';

import { getCSVFileDir } from './getCSVFiles';

export const getNumberOfPeoplePerCity = async () => {
  const values: Record<string, number> = {};

  const parser = fs
    .createReadStream(
      getCSVFileDir({
        folder: 'helpers',
        fileName: 'São Paulo_P.csv',
      })
    )
    .pipe(
      parse({
        columns: true,
      })
    );

  for await (const record of parser) {
    const id = record['cd_ibge'] as string;
    if (id.startsWith('35')) {
      if (!values[id]) {
        values[id] = 0;
      }

      values[id] += 1;
    }
  }

  return values;
};
