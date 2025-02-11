import { mapper, transformer } from '@simple4decision/aggrada-core';
import { Op } from 'sequelize';

import { db } from '../db';
import { fetchObservations } from './fetchObservations';
// import { getJsonbKeys } from './getJsonbKeys';

// Type definition for aggregated data entry at each space-time key
export type AggregatedDataKeys = {
  key_spatial_id: number;
  key_spatial_geo_code: string | undefined;
  key_spatial_source: string;
  key_spatial_start_date: Date | undefined;
  key_time_label: string;
  key_time_start_date: Date;
  key_time_end_date: Date;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AggregatedDataEntry = Record<string, any>;

/**
 * Transforms observations aggregated by spatial subdivisions and time intervals.
 *
 * @param observations - Observations retrieved from fetchObservations.
 * @param config - Configuration containing geographic region, spatial subdivision, time range, and time granularity.
 * @returns Aggregated data.
 */
export const getAggregation = async ({
  aoi,
  subdivision,
  subdivisionSource,
  timeRange,
  timeGranularity,
}: {
  // observations: InstanceType<typeof db.AggradaObservation>[];{
  aoi: (typeof db.AggradaSpatial)['prototype']['geometry'];
  subdivision: keyof typeof mapper.adminLevelMap;
  subdivisionSource: string; // ibge | openstreetmap | ...
  timeRange: { start: Date; end: Date };
  timeGranularity: keyof typeof mapper.timeGranularity;
}): Promise<AggregatedDataEntry[]> => {
  // 1. Retrieve geographic subdivisions (e.g., municipalities within São Paulo)
  const subdivisions = await db.AggradaSpatial.findAll({
    where: {
      admin_level: subdivision,
      source: subdivisionSource,
      [Op.and]: db.sequelize.where(
        db.sequelize.fn(
          'ST_Within',
          db.sequelize.col('geometry'),
          db.sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(aoi))
        ),
        true
      ),
    },
    attributes: ['id', 'geo_code', 'source', 'start_date', 'geometry'],
  });

  // 2. Generate temporal intervals based on time granularity
  const temporalRanges = transformer.generateTimeIntervals({
    timeRange,
    granularity: timeGranularity,
  });

  // Retrieve unique JSONB keys from AggradaObservation data field with spatial and temporal filters
  // const observationDataUniqueKeys: Record<string, string[]> = (await getJsonbKeys({
  //   aoi,
  //   timeRange
  // })).reduce<Record<string, string[]>>((acc, key) => {
  //   acc[key] = [];
  //   return acc;
  // }, {});

  // 3. Create unique key structure (space-time) for aggregation with all combinations of subdivisions and temporal ranges
  const aggregationUniqueKeys: AggregatedDataKeys[] = subdivisions.flatMap(
    (subdivision) => {
      return temporalRanges.map(({ start, end, label }) => {
        return {
          key_spatial_id: subdivision.dataValues.id as number,
          key_spatial_geo_code: subdivision.dataValues.geo_code,
          key_spatial_source: subdivision.dataValues.source,
          key_spatial_start_date: subdivision.dataValues.start_date,
          key_time_label: label,
          key_time_start_date: start,
          key_time_end_date: end,
          // ...observationDataUniqueKeys
        };
      });
    }
  );

  // 4. Map each
  const aggregatedData: AggregatedDataEntry[] = [];

  await Promise.all(
    aggregationUniqueKeys.map(async (keyItem) => {
      const subdivisionGeometry = subdivisions.find((subdivision) => {
        return subdivision.dataValues.id == keyItem.key_spatial_id;
      });

      if (!subdivisionGeometry?.dataValues?.geometry) {
        throw new Error('Subdivision geometry not found');
      }

      const observations = await fetchObservations({
        inputGeometry: subdivisionGeometry.dataValues.geometry,
        timeRange: {
          start: keyItem.key_time_start_date,
          end: keyItem.key_time_end_date,
        },
      });

      if (!observations || observations.length === 0) {
        return keyItem;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aggregatedRecord: Record<string, any[]> = {};

      observations.forEach((obs) => {
        Object.entries(obs.data).forEach(([key, value]) => {
          // Ensure each key has a corresponding array in aggregatedData
          if (!aggregatedRecord[key]) {
            aggregatedRecord[key] = [];
          }
          aggregatedRecord[key].push(value);
        });
      });

      aggregatedData.push({
        ...keyItem,
        ...aggregatedRecord,
      });

      return;
    })
  );

  return aggregatedData;
};
