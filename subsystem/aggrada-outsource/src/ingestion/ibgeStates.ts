/* eslint-disable no-console */
import 'dotenv/config';

import { Op } from 'sequelize';
import { db } from '../db';
import { sources } from '..';
import pLimit from 'p-limit';

export const ibgeAllStates = async ({ years }: { years?: number[] }) => {
  const yearsSearch =
    years ??
    Array.from({ length: new Date().getFullYear() - 2019 + 1 }, (_, i) => {
      return 2019 + i;
    });

  /**
   * Get all states from IBGE to get the maps
   */
  const allStates = await sources.ibgeAllStatesRegistry();

  const searchParams = allStates.flatMap((state) => {
    return yearsSearch.map((year) => {
      return {
        year,
        ...state,
      };
    });
  });

  const dbGeoCode = (
    await db.AggradaSpatial.findAll({
      where: {
        geo_code: {
          [Op.in]: allStates.map((stateRegistry) => {
            return `${stateRegistry.id}`;
          }),
        },
        start_date: {
          [Op.in]: yearsSearch.map((year) => {
            return new Date(year, 0, 1);
          }),
        },
        source: 'ibge',
        admin_level: 'state',
      },
      attributes: ['geo_code'],
    })
  ).map((item) => {
    return item.geo_code;
  });

  console.log(`Total of registers already in database: ${dbGeoCode.length}`);

  const newSearchParams =
    dbGeoCode.length === 0
      ? searchParams
      : searchParams.filter((searchParam) => {
          return !dbGeoCode.includes(`${searchParam.id}`);
        });

  console.log(`Init the creation of ${newSearchParams.length} new maps`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapsData: any[] = [];
  const limit = pLimit(10); // Limit the concurrency
  const mapsPromiseRes = await Promise.allSettled(
    newSearchParams.map((searchParam) => {
      return limit(async () => {
        /**
         * Get the state map polygon
         */
        const resMap = await sources.ibgeStateMap({
          ibgeCode: `${searchParam.id}`,
          year: searchParam.year,
        });

        mapsData.push({
          ...resMap,
          geometry: resMap.raw_geometry,
        });

        return;
      });
    })
  );

  await db.AggradaSpatial.bulkCreate(mapsData, {
    validate: true,
    returning: true,
  });

  console.log(
    `Total maps created: ${
      mapsPromiseRes.filter((result) => {
        return result.status === 'fulfilled';
      }).length
    } of ${newSearchParams.length}`
  );

  return true;
};
