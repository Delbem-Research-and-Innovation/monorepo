import axios from 'axios';

import { Spatial } from '../../Models';
import { ibgeCityRegistry } from './cityRegistry';

const IBGE_API_MALHAS_URL =
  'https://servicodados.ibge.gov.br/api/v3/malhas/municipios';

export const ibgeCityMap = async ({
  ibgeCode,
  year = 2022,
}: {
  ibgeCode: string;
  year: number;
}): Promise<Spatial> => {
  const url = `${IBGE_API_MALHAS_URL}/${ibgeCode}`;
  const params = {
    periodo: `${year}`,
    formato: 'application/vnd.geo+json',
    qualidade: 'maxima',
  };

  try {
    const { data } = await axios.get(url, {
      params,
      timeout: 10000,
    });

    if (
      `${data.features[0]?.properties.codarea}` !== `${ibgeCode}` &&
      !data.features[0]?.geometry
    ) {
      throw new Error();
    }

    const cityRegistry = await ibgeCityRegistry({ ibgeCode });

    return {
      geo_code: `${ibgeCode}`,
      admin_level: 'municipality',
      source: 'ibge',
      start_date: new Date(year, 0, 1),
      properties: {
        apiUrl: `${url}?${new URLSearchParams(params).toString()}`,
        name: cityRegistry?.nome || '',
        ...cityRegistry,
      },
      raw_geometry: data.features[0].geometry,
      raw_srid: '4674',
    };
  } catch (error) {
    throw new Error(`Failed to fetch data for IBGE code ${ibgeCode}: ${error}`);
  }
};
