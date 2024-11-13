/* eslint-disable no-console */
import { Point } from 'geojson';
import { Spatial } from '../../Models';
import { transformer } from '../../../../aggrada-core/src';
import axios from 'axios';

// API Doc: https://www.cepaberto.com
const API_TOKEN = '8cbac120c4ead2039aae60a0f41a8080'; // enniolopes@usp.br

type CepNumber = {
  altitude: number; // 812;
  cep: string; // '13563665'
  latitude: string; //'-22.0194400023';
  longitude: string; // '-47.8925532897';
  logradouro: string; // 'Rua Vereador Lucas Perroni Júnior';
  bairro: string; // 'Jardim Ipanema';
  cidade: {
    ddd: number; // 16
    ibge: string; // '3548906'
    nome: string; // 'São Carlos'
  };
  estado: {
    sigla: string; // 'SP'
  };
};

type CepNumberFlatten = {
  apiUrl: string;
  altitude: number;
  cep: string;
  latitude: string;
  longitude: string;
  logradouro: string;
  bairro: string;
  cidade_ddd: number;
  cidade_ibge: string;
  cidade_nome: string;
  estado_sigla: string;
};

export const cepabertoNumber = async ({
  cepNumber,
}: {
  cepNumber: string;
}): Promise<Spatial | null> => {
  const cepTidy = cepNumber.trim().replaceAll('-', '').replaceAll(' ', '');

  const url = `https://www.cepaberto.com/api/v3/cep?cep=${cepTidy}`;
  const headers = { Authorization: `Token token=${API_TOKEN}` };

  const result: {
    data: CepNumber;
    status: number;
  } = await axios.get(url, {
    headers,
    timeout: 10000,
  });

  if (result.status != 200 && !result?.data?.cep) {
    console.log(`Error: cepaberto did not found cep: ${cepNumber}`);
    return null;
  }

  const point = {
    type: 'Point',
    coordinates: [
      parseFloat(result.data.longitude),
      parseFloat(result.data.latitude),
    ],
  } as Point;

  return {
    geo_code: `${result.data.latitude}#${result.data.longitude}`,
    admin_level: 'latlong',
    source: 'cepaberto',
    start_date: new Date(1900, 0, 1),
    properties: {
      apiUrl: url,
      ...transformer.flattenObject({ obj: result.data }),
    },
    raw_geometry: point,
    raw_srid: '4674',
  };
};

export const cepabertoAddress = async ({
  state,
  city,
  neighborhood,
  street,
}: {
  state: string;
  city: string;
  neighborhood?: string;
  street?: string;
}): Promise<Spatial | null> => {
  const url = 'https://www.cepaberto.com/api/v3/address';
  const headers = { Authorization: `Token token=${API_TOKEN}` };
  const params: {
    estado: string;
    cidade: string;
    bairro?: string;
    logradouro?: string;
  } = {
    estado: state,
    cidade: city,
  };

  if (neighborhood) {
    params['bairro'] = neighborhood;
  }

  if (street) {
    params['logradouro'] = street;
  }

  const result: {
    data: CepNumber;
    status: number;
  } = await axios.get(url, {
    headers,
    params,
    timeout: 10000,
  });

  if (!result?.data?.cep || result.data.cep == 'undefined') {
    console.log(`Error: cepaberto did not found cep: ${params}`);
    return null;
  }

  const point = {
    type: 'Point',
    coordinates: [
      parseFloat(result.data.longitude),
      parseFloat(result.data.latitude),
    ],
  } as Point;

  return {
    geo_code: `${result?.data?.cep}`,
    admin_level: 'latlong',
    source: 'cepaberto',
    start_date: new Date(1900, 0, 1),
    properties: {
      apiUrl: url,
      ...transformer.flattenObject({ obj: result.data }),
    } as CepNumberFlatten,
    raw_geometry: point,
    raw_srid: '4674',
  };
};
