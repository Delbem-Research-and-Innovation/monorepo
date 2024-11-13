// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable no-console */
// import 'dotenv/config';

// import { Op } from 'sequelize';
// import { db } from '../db';
// import { reader } from '../../../aggrada-core/src';

// const sequelizeDb = await db.AggradaSpatial;

// const fetchSpatialData = async ({
//   geo_codeArray,
// }: {
//   geo_codeArray: (string | undefined)[];
// }) => {
//   try {
//     const result = await sequelizeDb.findAll({
//       where: {
//         geo_code: {
//           [Op.in]: geo_codeArray,
//         },
//       },
//       attributes: ['geo_code', 'source', 'admin_level'],
//     });

//     return result;
//   } catch (error) {
//     return undefined;
//   }
// };

// const saveSpatialData = async () => {
//   let maps = await reader.readShapefile({
//     shpPath:
//       '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-core/.local/SP_Malha_Preliminar_2022/SP_Malha_Preliminar_2022.shp',
//     dbfPath:
//       '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-core/.local/SP_Malha_Preliminar_2022/SP_Malha_Preliminar_2022.dbf',
//     prjPath:
//       '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-core/.local/SP_Malha_Preliminar_2022/SP_Malha_Preliminar_2022.prj',
//     cpgPath:
//       '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-core/.local/SP_Malha_Preliminar_2022/SP_Malha_Preliminar_2022.cpg',
//     codeKey: 'CD_SETOR',
//     nameKey: 'CD_SETOR',
//     level: 'census_region',
//     source: 'ibge',
//   });

//   const fetchData = await fetchSpatialData({
//     geo_codeArray: maps.map((item) => {
//       return item.code;
//     }),
//   });

//   maps = maps.filter((map) => {
//     return fetchData?.find((item) => {
//       return (
//         map.code?.includes('3549805') &&
//         map.code == item.geo_code &&
//         map.source == item.source &&
//         map.admin_level == item.admin_level
//       );
//     });
//   });

//   console.log('Init total entries: ', maps.length);

//   await Promise.all(
//     maps.map(async (map) => {
//       const aggradaSpatial = await sequelizeDb.create({
//         geo_code: map.code,
//         source: map.source,
//         start_date: new Date('2022-01-01'),
//         metadata: map.properties,
//         admin_level: map.admin_level,
//         raw_geometry: map.geometry,
//         raw_srid: map.raw_srid,
//         geometry: map.geometry,
//       });

//       console.log(
//         'New entry created: ',
//         `${aggradaSpatial?.geo_code} - ${aggradaSpatial?.start_date}`
//       );
//       console.log(
//         'ENTRY ALREADY REGISTERED: ',
//         `${map.code} - ${map.startDate}`
//       );
//     })
//   );

//   return true;
// };

// saveSpatialData().then(console.log);

// // fetchSpatialData({
// //   geo_code: '45rr45rr45rr45rr',
// //   source: 'ibge',
// //   admin_level: 'block',
// // }).then(console.log);
