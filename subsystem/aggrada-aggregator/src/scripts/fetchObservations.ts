import 'dotenv/config';

import { Op } from 'sequelize';
import { db } from '../db';

/**
 * Fetches observations where geometries are within or equal to the input geometry and within the specified time range.
 *
 * @param inputGeometry - Geometry object defining the spatial area of interest.
 * @param timeRange - Object defining the time range { start: Date, end: Date }.
 * @returns Array of AggradaObservation instances that match the criteria.
 */
export const fetchObservations = async ({
  inputGeometry,
  timeRange,
}: {
  inputGeometry: (typeof db.AggradaSpatial)['prototype']['geometry'];
  timeRange: { start: Date; end: Date };
}): Promise<InstanceType<typeof db.AggradaObservation>[]> => {
  const observations = await db.AggradaObservation.findAll({
    include: [
      {
        model: db.AggradaSpatial,
        required: true,
        where: db.sequelize.where(
          db.sequelize.fn(
            'ST_Within',
            db.sequelize.col('geometry'),
            db.sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(inputGeometry))
          ),
          true
        ),
      },
    ],
    where: {
      temporal_range: {
        [Op.overlap]: [timeRange.start, timeRange.end],
      },
    },
  });

  return observations;
};
