/* eslint-disable no-console */
import 'dotenv/config';

import { db } from './db';

(async () => {
  const result = await db.AggradaObservation.create({
    aggrada_spatials_id: 12,
    temporal_range_tz: [
      '2022-04-09T00:00:00.000-03:00',
      '2022-04-09T23:59:59.999-03:00',
    ],
    temporal_range: ['2022-04-09 00:00:00', '2022-04-09 23:59:59'],
    data: {
      NU_NOTIFIC: '0036314',
      ID_UNIDADE: '2083272',
      DT_NOTIFIC: '2022/04/11',
      SEM_NOT: '202215',
      DT_SIN_PRI: '2022/04/09',
      SEM_PRI: '202214',
      NM_PACIENT: 'cc22c8d7275c7d1c6731afd40e6a5509',
      DT_NASC: '1966/09/16',
      ID_BAIRRO: '1',
      NM_BAIRRO: 'CENTRO',
      NM_LOGRADO: 'RUA CEL SPINOLA DE CASTRO',
      NU_NUMERO: '2916',
      GEOFIELD: 'RUA CEL SPINOLA DE CASTRO 2916',
      NU_CEP: '15015500',
      CLASSIFICA: 'POSITIVO',
      CLASSI_FIN: '10',
      CRITERIO: '1',
      SOROTIPO: '',
      COMUNINF: '354980',
      ORIGEM: 'AUTOCTONE',
      EVOLUCAO: '1',
      DT_OBITO: '',
      join_AREA: '10',
      join_CENSITARIO: '354980505000003',
      join_QUARTEIRAO: '3774',
      join_TERREO: '0',
      join_CODIGO: '10',
      join_REGIAO: 'Central',
      join_ABRANG: 'CENTRAL',
      join_Shap_Lngth: '398.781106593731',
      join_Shape_Area: '10292.1585109642',
      distance: '0',
    },
  });

  console.log(result);
})();
