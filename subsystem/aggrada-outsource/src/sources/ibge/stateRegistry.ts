import axios from 'axios';

import { transformer } from '../../../../aggrada-core/src';

const IBGE_API_LOCALIDADES_URL =
  'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

type IBGERegistry = {
  id: number;
  nome: string;
  [key: string]: string | number | IBGERegistry;
};

export const ibgeStateRegistry = async ({
  ibgeCode,
}: {
  ibgeCode: string;
}): Promise<IBGERegistry> => {
  const response = await axios.get(`${IBGE_API_LOCALIDADES_URL}/${ibgeCode}`);

  if (response?.data?.id && response?.data?.nome) {
    return transformer.flattenObject({
      obj: response.data,
    }) as IBGERegistry;
  }

  throw new Error(`Error: data not founded for IBGE state code ${ibgeCode}`);
};

export const ibgeAllStatesRegistry = async (): Promise<IBGERegistry[]> => {
  let tries = 0;
  while (tries < 5) {
    const response = await axios.get(IBGE_API_LOCALIDADES_URL);
    if (response?.data) {
      tries = 1000;
      const responseData = response.data;
      return responseData.map((obj: object) => {
        return transformer.flattenObject({
          obj,
        });
      });
    }
    await new Promise((resolve) => {
      return setTimeout(resolve, 2000);
    });
  }

  throw Error('No IBGE API response');
};
