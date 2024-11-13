import 'dotenv/config';

import { QueryTypes } from 'sequelize';
import { db } from '../db';

export const getJsonbKeys = async ({
  aoi,
  timeRange,
}: {
  aoi: (typeof db.AggradaSpatial)['prototype']['geometry'];
  timeRange: { start: Date; end: Date };
}) => {
  // Step 1: Retrieve unique JSONB keys from AggradaObservation data field with spatial and temporal filters
  const uniqueKeysQuery = await db.sequelize.query<{ key: string }>(
    `
      SELECT DISTINCT jsonb_object_keys(data) AS key
      FROM "AggradaObservation" AS obs
      INNER JOIN "AggradaSpatial" AS spatial
      ON obs.aggrada_spatials_id = spatial.id
      WHERE ST_Within(spatial.geometry, ST_GeomFromGeoJSON(:aoi)) = true
      AND obs.temporal_range @> daterange(:startDate, :endDate, '[]')
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        aoi: JSON.stringify(aoi),
        startDate: timeRange.start.toISOString(),
        endDate: timeRange.end.toISOString(),
      },
    }
  );

  return uniqueKeysQuery.map((row) => {
    return row.key;
  });
};
