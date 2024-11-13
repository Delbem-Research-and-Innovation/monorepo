import { db } from '../db';
import { models } from '@simple4decision/postgresdb';

/**
 * Spatial Indexer - Automatically indexes spatial references for heterogeneous observations.
 *
 * @param observations - Array of observations to be indexed.
 * @returns Array of indexed observations with populated `aggrada_spatials_id`.
 */
export const getSpatialId = async ({
  geo_code,
  source,
  admin_level,
  start_date,
}: Pick<
  models.AggradaSpatial,
  'geo_code' | 'source' | 'admin_level' | 'start_date'
>): Promise<{
  aggrada_spatials_id: number | null;
}> => {
  return {
    aggrada_spatials_id: (
      await db.AggradaSpatial.findOne({
        where: {
          geo_code,
          source,
          admin_level,
          start_date,
        },
        attributes: ['id'],
      })
    )?.dataValues.id,
  };
};
