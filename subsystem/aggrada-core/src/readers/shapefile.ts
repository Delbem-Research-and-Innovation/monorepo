// /* eslint-disable no-console */
// import { Geometry } from 'geojson';
// import { SpatialCore } from '../Types';
// import fs from 'fs';
// import path from 'path';
// import shapefile from 'shapefile';

// /**
//  * Reads the .prj file to determine SRID based on projection info.
//  * @param prjPath Path to the .prj file.
//  * @returns SRID string or 'unknown' if not recognized.
//  */
// const getSRID = async (prjPath: string): Promise<SpatialCore['raw_srid']> => {
//   try {
//     const projectionData = await fs.promises.readFile(prjPath, 'utf-8');
//     if (projectionData.includes('WGS_1984')) {
//       return '4326';
//     }
//     if (projectionData.includes('SIRGAS_2000')) {
//       return '4674';
//     }
//     // Add here additional checks for other SRIDs as needed
//     return 'unknown';
//   } catch {
//     return 'unknown';
//   }
// };

// /**
//  * Reads shapefile data and returns an array of SpatialSchema objects.
//  * @param shpPath - The path to the .shp file.
//  * @param dbfPath - The path to the .dbf file.
//  * @param prjPath - The path to the .prj file.
//  * @param srid - Optional. The spatial reference identifier (e.g., '4326'). First the function search and use from prj file.
//  * @param codeKey - Optional. The key in properties to use for code.
//  * @param nameKey - Optional. The key in properties to use for name.
//  * @returns An array of SpatialSchema objects.
//  */
// export const readShapefile = async ({
//   shpPath,
//   dbfPath,
//   prjPath,
//   cpgPath,
//   srid,
//   codeKey,
//   nameKey,
//   level,
//   source = 'user',
// }: {
//   shpPath: string;
//   dbfPath: string;
//   prjPath?: string; // Optional, used to detect the coordinates system
//   cpgPath?: string; // Optional, used to detect the enconding
//   srid?: SpatialCore['raw_srid'];
//   codeKey?: string;
//   nameKey?: string;
//   level?: string;
//   source?: string;
// }): Promise<SpatialCore[]> => {
//   try {
//     const encoding = cpgPath
//       ? fs.readFileSync(cpgPath, 'utf-8').trim()
//       : 'UTF-8';

//     // Open the shapefile
//     const sourceData = await shapefile.open(shpPath, dbfPath, {
//       encoding,
//     });

//     const spatialData: SpatialCore[] = [];

//     let result = await sourceData.read();
//     while (!result.done) {
//       const geometry: Geometry = result.value.geometry as Geometry;
//       const properties = result?.value?.properties || undefined;

//       const spatialItem: SpatialCore = {
//         code: codeKey ? properties?.[codeKey] : undefined,
//         name: nameKey
//           ? properties?.[nameKey]
//           : codeKey
//             ? codeKey.toLowerCase()
//             : undefined,
//         admin_level: level ? level : properties?.level,
//         source,
//         startDate: properties?.startDate
//           ? new Date(properties.startDate)
//           : new Date(),
//         properties: {
//           file: path.basename(shpPath),
//           fileFormat: 'shp',
//           ...properties,
//         },
//         geometry,
//         raw_srid: prjPath ? await getSRID(prjPath) : srid ? srid : 'unknown',
//       };

//       spatialData.push(spatialItem);
//       result = await sourceData.read();
//     }

//     return spatialData;
//   } catch (error) {
//     console.error('Error reading shapefile:', error);
//     throw error;
//   }
// };
