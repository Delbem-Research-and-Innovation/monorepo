import { getCSVFilesDir } from './getCSVFiles';
import { projects } from 'src/projects';
import fs from 'node:fs';

const project = projects.find((project) => {
  return project.slug === 'inct-combate-a-fome-sp';
});

if (!project) {
  throw new Error('Project not found');
}

export const getAllIncomeTypes = async () => {
  const allFilesInFolder = fs.readdirSync(
    getCSVFilesDir({ folder: 'outcomes' })
  );
  return allFilesInFolder.map((file) => {
    return {
      fileName: file,
      slug: file.replace('.csv', ''),
    };
  });
};
