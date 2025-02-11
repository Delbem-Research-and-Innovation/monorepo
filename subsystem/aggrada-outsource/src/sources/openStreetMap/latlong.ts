/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import axios from 'axios';
import { Point } from 'geojson';

import { transformer } from '../../../../aggrada-core/src';
import { Spatial } from '../../Models';

interface NominatimParams {
  q: string; // Free text search query (required)
  format: 'json' | 'xml' | 'geojson' | 'geocodejson'; // Response format
  addressdetails?: '0' | '1'; // Include address details
  limit?: string; // Limit on the number of results

  // Filter and precision parameters
  street?: string; // Street name and house number
  city?: string; // City name
  county?: string; // County name
  state?: string; // State name
  country?: string; // Country name
  postalcode?: string;

  // Geographic parameters
  countrycodes?: string; // ISO 3166-1 alpha-2 country codes (e.g., BR, US)
  viewbox?: string; // Viewbox to restrict area (left,top,right,bottom)
  bounded?: '0' | '1'; // Force search within viewbox

  // Additional information parameters
  extratags?: '0' | '1'; // Include extra information in results
  namedetails?: '0' | '1'; // Include name details in results
}

type ResponseAPI = {
  place_id: 8769352;
  licence: 'Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright';
  osm_type: 'way';
  osm_id: 88812327;
  lat: '-21.9876453';
  lon: '-47.9302695';
  class: 'highway';
  type: 'residential';
  place_rank: 26;
  importance: 0.05339561684596014;
  addresstype: 'road';
  name: 'Rua Vereador Lucas Perroni Junior';
  display_name: 'Rua Vereador Lucas Perroni Junior, Jardim Ipanema, São Carlos, Região Imediata de São Carlos, Região Geográfica Intermediária de Araraquara, São Paulo, Região Sudeste, 13563-210, Brasil';
  address: {
    road: 'Rua Vereador Lucas Perroni Junior';
    suburb: 'Jardim Ipanema';
    city: 'São Carlos';
    municipality: 'Região Imediata de São Carlos';
    state_district: 'Região Geográfica Intermediária de Araraquara';
    state: 'São Paulo';
    'ISO3166-2-lvl4': 'BR-SP';
    region: 'Região Sudeste';
    postcode: '13563-210';
    country: 'Brasil';
    country_code: 'br';
  };
  boundingbox: ['-21.9894282', '-21.9859143', '-47.9341395', '-47.9264044'];
};

/**
 * Retrieves latitude and longitude based on a configurable address object.
 * Uses OpenStreetMap geocoding API to get precise results.
 * @param input - Object defining sufficient values to identify a location
 * @returns Promise with Spatial data of latitude and longitude.
 */
export const osmLatLongFromAddress = async ({
  fullAddress,
  street,
  city,
  county,
  state,
  country,
  postalcode,
  countrycodes,
}: {
  fullAddress: string; // Free text search query (required)
  street?: string; // Street name and house number
  city?: string; // City name
  county?: string; // County name
  state?: string; // State name
  country?: string; // Country name
  postalcode?: string;
  countrycodes?: string; // ISO 3166-1 alpha-2 country codes (e.g., BR, US)
}): Promise<Spatial | null> => {
  const params: Partial<Record<keyof NominatimParams, string>> = {
    q: fullAddress,
    format: 'json',
    limit: '1',
    addressdetails: '1',
    // extratags: '1',
    // namedetails: '1',
  };

  if (street) {
    params.street = street;
  }
  if (city) {
    params.city = city;
  }
  if (county) {
    params.county = county;
  }
  if (state) {
    params.state = state;
  }
  if (country) {
    params.country = country;
  }
  if (postalcode) {
    params.postalcode = postalcode;
  }
  if (countrycodes) {
    params.countrycodes = countrycodes;
  }

  try {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    const response = await axios.get(baseUrl, {
      params,
      headers: {
        'User-Agent': 'aggrada-outsource/1.0 (aggrada@gmail.com)',
      },
    });

    if (response.data && response.data.length > 0) {
      const result: ResponseAPI = response.data[0];

      const point = {
        type: 'Point',
        coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
        bbox: result.boundingbox.map((pos) => {
          return +pos;
        }),
      } as Point;

      return {
        geo_code: `${point.coordinates[0]}#${point.coordinates[1]}`,
        admin_level: 'latlong',
        source: 'openstreetmap',
        start_date: new Date(1900, 0, 1),
        properties: {
          apiUrl: `${baseUrl}?${new URLSearchParams(params).toString()}`,
          ...transformer.flattenObject({ obj: result }),
        },
        raw_geometry: point,
        raw_srid: '4326',
      };
    }
    return null;
  } catch (error) {
    console.error(
      'Error fetching geolocation from osmLatLongFromAddress:',
      error
    );
    throw Error;
  }
};

// await osmLatLongFromAddress({
//   fullAddress:
//     'Rua Doutor Antônio dos Santos Galante, 435, São José do Rio Preto, SP, Brazil',
//   country: 'Brazil',
//   postalcode: '15090300',
//   street: 'RUA DR ANTONIO DOS SANTOS GALANTE, 435',
//   city: 'São José do Rio Preto',
// }).then(console.log);
