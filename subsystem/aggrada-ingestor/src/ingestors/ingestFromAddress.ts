/* eslint-disable no-console */
import 'dotenv/config';

import { db } from '../db';
import { indexer } from '..';
import { reader, transformer } from '../../../aggrada-core/src';

type AddressKeys = {
  streetName?: string;
  streetNumber?: string;
  streetAndNumber?: string;
  postalCode?: string;
  country?: string;
  city?: string;
  fullAddress?: string;
};

const sleep = (ms: number) => {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
};

const createObservation = async ({
  addressKeys,
  fixedAddressValues,
  timeKey,
  timezone = 'America/Sao_Paulo', // ToDo: get timezone from state-country
  data,
}: {
  addressKeys: AddressKeys;
  fixedAddressValues: AddressKeys;
  timeKey: string;
  timezone?: string;
  data: Record<string, string>;
}) => {
  const indexSpatialParams: Record<string, string> = {};
  Object.entries(addressKeys).forEach(([addressKey, addressField]) => {
    if (addressField && data[addressField]) {
      indexSpatialParams[addressKey] = data[addressField];
    }
  });

  Object.entries(fixedAddressValues).forEach(
    ([fixedAddressKey, fixedAddressValue]) => {
      if (fixedAddressValue) {
        indexSpatialParams[fixedAddressKey] = fixedAddressValue;
      }
    }
  );

  await sleep(1300);
  const spatialId = await indexer
    .indexSpatialFromAddress(
      indexSpatialParams as Parameters<
        typeof indexer.indexSpatialFromAddress
      >[0]
    )
    .catch((err) => {
      console.log('Spatial id not founded: ', err);
      return null;
    });

  if (!spatialId?.aggrada_spatials_id) {
    throw Error('Spatial id not founded');
  }

  const timeRange = transformer.createTimeRange({
    date: data[timeKey],
    timezone,
  });

  if (!timeRange?.startTz) {
    throw Error('Time range not processed');
  }

  const observationRecord = {
    aggrada_spatials_id: spatialId.aggrada_spatials_id,
    temporal_range_tz: [timeRange.startTz, timeRange.endTz],
    temporal_range: [timeRange.start, timeRange.end],
    data,
  };

  /**
   * Check if observation already exists in the database.
   */
  const existingObservation = await db.AggradaObservation.findOne({
    where: observationRecord,
  }).catch(() => {
    return null;
  });
  if (existingObservation) {
    console.log('Check if observation already exists in the database.');
    return false;
  }

  const aggradaEntryObs = await db.AggradaObservation.create(
    observationRecord
  ).catch(() => {
    return null;
  });

  if (!aggradaEntryObs?.dataValues) {
    return false;
  }

  return true;
};

export const ingestFromAddress = async ({
  file,
  fileFormat,
  addressKeys,
  fixedAddressValues,
  timeKey,
}: {
  file: string | Buffer; // File path or Buffer for in-memory CSV data
  fileFormat: 'csv' | 'xlsx' | 'xls';
  addressKeys: AddressKeys;
  fixedAddressValues: AddressKeys;
  timeKey: string;
}) => {
  if (!Object.keys(addressKeys)) {
    throw Error('No addressKeys detected');
  }

  if (fileFormat === 'csv') {
    await reader.csvToJsonStream(
      {
        file,
        delimiter: ',',
      },
      async (batch) => {
        console.log('init batch');

        for (const data of batch) {
          try {
            await createObservation({
              addressKeys,
              fixedAddressValues,
              timeKey,
              data,
            });
          } catch (err) {
            console.log(`Error creating: ${err}\n`, data);
          }
        }
      }
    );
  }

  if (fileFormat === 'xlsx') {
    await reader.excelToJsonStream(
      {
        file,
      },
      async (batch) => {
        console.log('init batch');

        for (const data of batch) {
          try {
            await createObservation({
              addressKeys,
              fixedAddressValues,
              timeKey,
              data,
            });
          } catch (err) {
            console.log(`Error creating: ${err}\n`, data);
          }
        }
      }
    );
  }
};
