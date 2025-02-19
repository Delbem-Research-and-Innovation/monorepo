import fs from 'node:fs';

import { parse } from 'csv-parse';
import { projects } from 'src/projects';

import { getAllIncomeTypes } from './getAllIncomeTypes';
import { getCSVFileDir } from './getCSVFiles';
import { getIncomeTypeVariables } from './getIncomeTypeVariables';

const project = projects.find((project) => {
  return project.slug === 'inct-combate-a-fome-sp';
});

if (!project) {
  throw new Error('Project not found');
}

export const getIncomeValuesByType = async ({
  incomeType,
}: {
  incomeType: string;
}) => {
  const allIncomeTypes = await getAllIncomeTypes();

  const incomeTypeFile = allIncomeTypes.find((type) => {
    return type.slug === incomeType;
  });

  if (!incomeTypeFile) {
    return {};
  }

  const variables = await getIncomeTypeVariables({ incomeType });

  const values: Record<string, Record<string, string>> = {};

  const parser = fs
    .createReadStream(
      getCSVFileDir({ folder: 'outcomes', fileName: incomeTypeFile.fileName })
    )
    .pipe(
      parse({
        columns: true,
      })
    );

  for await (const record of parser) {
    const id = record['cd_ibge'] as string;
    if (id.startsWith('35')) {
      for (const variable of variables) {
        if (!values[variable]) {
          values[variable] = {};
        }

        values[variable][id] = record[variable];
      }
    }
  }

  return values;
};
