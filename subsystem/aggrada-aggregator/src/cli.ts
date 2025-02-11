/* eslint-disable no-console */
import 'dotenv/config';

import { db } from './db';
import { writeCsv } from './scripts/exportToCSV';
import { getAggregation } from './scripts/getAggregation';
// import { asyncIterableFromArray } from './scripts/asyncIterable';

const spatialRecord = await db.AggradaSpatial.findOne({
  attributes: ['id', 'geo_code', 'geometry'],
  where: {
    geo_code: '35',
    source: 'ibge',
  },
});

if (spatialRecord?.id && spatialRecord?.geometry && spatialRecord?.geo_code) {
  const startDate = new Date(2022, 1, 1);
  const endDate = new Date(2022, 12, 31);

  const dataAgg = await getAggregation({
    aoi: spatialRecord.geometry,
    subdivision: 'municipality',
    subdivisionSource: 'ibge',
    timeRange: {
      start: startDate,
      end: endDate,
    },
    timeGranularity: 'quarterly',
  });

  if (dataAgg) {
    console.log('Init writing csv - total lines:\n', dataAgg.length);

    await writeCsv({
      aggregatedData: dataAgg,
      outputPath:
        '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-aggregator/.local/aggregations/ibge_35_municipality_monthly.csv',
    });

    console.log('Finish writing csv');
  }
}
