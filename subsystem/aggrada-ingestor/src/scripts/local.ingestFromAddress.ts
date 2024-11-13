import 'dotenv/config';

import { ingestFromAddress } from '../ingestors/ingestFromAddress';

// Sinan Dengon xlsx
// await ingestFromAddress({
//   file: '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-ingestor/.local/data/sinan/SINAN-DENGON22.xlsx',
//   fileFormat: 'xlsx',
//   timeKey: 'DT_SIN_PRI',
//   addressKeys: {
//     streetName: 'NM_LOGRADO',
//     streetNumber: 'NU_NUMERO',
//     postalCode: 'NU_CEP',
//   },
//   fixedAddressValues: {
//     country: 'Brazil',
//   },
// });

// Dengue CSV
await ingestFromAddress({
  file: '/home/ennio.lopes/repo/simple4decision/monorepo/subsystem/aggrada-ingestor/.local/data/dengue/dengue_2022.csv',
  fileFormat: 'csv',
  timeKey: 'DT_SIN_PRI',
  addressKeys: {
    streetName: 'NM_LOGRADO',
    streetNumber: 'NU_NUMERO',
    postalCode: 'NU_CEP',
  },
  fixedAddressValues: {
    country: 'Brazil',
  },
});
