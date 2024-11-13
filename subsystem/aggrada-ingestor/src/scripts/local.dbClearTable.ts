/* eslint-disable no-console */
import 'dotenv/config';

import { db } from '../db';

const clearTables = async () => {
  try {
    // Limpar dados da tabela AggradaObservation
    await db.AggradaObservation.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    console.log('Tabela AggradaObservation limpa com sucesso.');

    // Limpar dados da tabela AggradaSpatial
    await db.AggradaSpatial.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    console.log('Tabela AggradaSpatial limpa com sucesso.');
  } catch (error) {
    console.error('Erro ao limpar as tabelas:', error);
  }
};

clearTables();
