/* eslint-disable no-console */
import 'dotenv/config';

import { sources } from '@simple4decision/aggrada-outsource';

import { db } from '../db';
import { getSpatialId } from '.';

type PostalCodeAndNumber = {
  postalCode: string | number;
  streetNumber: string | number;
  country: string;
};

type ComposedStreetAndNumber = {
  streetAndNumber: string;
  city: string;
  country: string;
};

type DecomposedAddress = {
  streetName: string;
  streetNumber: string | number;
  city: string;
  country: string;
};

type FullAddress = {
  fullAddress: string;
};

type AddressInput =
  | PostalCodeAndNumber
  | ComposedStreetAndNumber
  | DecomposedAddress
  | FullAddress;

export const indexSpatialFromAddress = async (
  address: AddressInput
): Promise<{
  aggrada_spatials_id: number | null;
}> => {
  const searchParams: Parameters<typeof sources.osmLatLongFromAddress>[0] = {
    fullAddress: '',
  };

  if ('country' in address) {
    searchParams.country = address.country;
  }

  if ('city' in address) {
    searchParams.city = address.city;
  }

  let cepData: Awaited<ReturnType<typeof sources.cepabertoNumber>> = null;
  if ('postalCode' in address && 'streetNumber' in address) {
    searchParams.postalcode = `${address.postalCode}`.replace('-', '').trim();

    if (address.country && address.country.match(/^(brasil|brazil|br)$/i)) {
      cepData = await sources.cepabertoNumber({
        cepNumber: `${address.postalCode}`,
      });

      searchParams.street = `${cepData?.properties?.logradouro}, ${address.streetNumber}`;
      searchParams.city = `${cepData?.properties?.cidade_nome}`;
      searchParams.fullAddress = `${cepData?.properties?.logradouro}, ${address.streetNumber}, ${cepData?.properties?.cidade_nome}, ${cepData?.properties?.estado_sigla}, ${searchParams.country}`;
    }
  }

  if ('streetName' in address && 'streetNumber' in address) {
    searchParams.street = `${address.streetName}, ${address.streetNumber}`;
  }

  if ('streetAndNumber' in address) {
    searchParams.street = address.streetAndNumber;
  }

  if ('fullAddress' in address) {
    searchParams.fullAddress = address.fullAddress;
  }

  if (
    !searchParams?.fullAddress &&
    searchParams?.street &&
    searchParams?.city &&
    searchParams?.country
  ) {
    searchParams.fullAddress = `${searchParams.street}, ${searchParams.city}, ${searchParams.country}`;
  }

  if (!searchParams?.fullAddress) {
    throw Error('Insuficiet params to find address lat long');
  }

  const spatialIndex =
    (await sources.osmLatLongFromAddress({
      fullAddress: searchParams.fullAddress,
    })) || cepData;

  if (!spatialIndex) {
    throw Error('Unable to fetch for latitude and longitude from data');
  }

  /**
   * Check if index already exists
   */
  const selectSpatialIndex = await getSpatialId({
    geo_code: spatialIndex.geo_code,
    source: spatialIndex.source,
    admin_level: spatialIndex.admin_level,
  }).catch(() => {
    return null;
  });

  if (selectSpatialIndex) {
    return {
      aggrada_spatials_id: selectSpatialIndex.aggrada_spatials_id,
    };
  }

  /**
   * Create a new spatial data and index
   */
  const spatialSearch = await db.AggradaSpatial.create({
    ...spatialIndex,
    geometry: spatialIndex.raw_geometry,
  });

  return {
    aggrada_spatials_id: spatialSearch.id,
  };
};
