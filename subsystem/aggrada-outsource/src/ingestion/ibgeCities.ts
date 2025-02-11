/* eslint-disable no-console */
import 'dotenv/config';

import pLimit from 'p-limit';
import { Op } from 'sequelize';

import { sources } from '..';
import { db } from '../db';

export const ibgeAllCities = async ({ years }: { years?: number[] }) => {
  const yearsSearch =
    years ??
    Array.from({ length: new Date().getFullYear() - 2019 + 1 }, (_, i) => {
      return 2019 + i;
    });

  /**
   * Get all cities from IBGE to get the maps
   */
  const allCities = await sources.ibgeAllCitiesRegistry();

  const searchParams = allCities.flatMap((city) => {
    return yearsSearch.map((year) => {
      return {
        year,
        ...city,
      };
    });
  });

  const dbGeoCode = (
    await db.AggradaSpatial.findAll({
      where: {
        geo_code: {
          [Op.in]: allCities.map((cityRegistry) => {
            return `${cityRegistry.id}`;
          }),
        },
        start_date: {
          [Op.in]: yearsSearch.map((year) => {
            return new Date(year, 0, 1);
          }),
        },
        source: 'ibge',
        admin_level: 'municipality',
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
         * Get the city map polygon
         */
        const resMap = await sources.ibgeCityMap({
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
