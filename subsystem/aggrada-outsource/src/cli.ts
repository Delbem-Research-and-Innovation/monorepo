/* eslint-disable no-console */
import { ingest } from '.';

const [, , command, ...args] = process.argv;

(async () => {
  if (command == 'ibgeAllCities') {
    const years = args.map((year) => {
      return parseInt(year, 10);
    });

    await ingest.ibgeAllCities({ years });
    return;
  }

  if (command == 'ibgeAllStates') {
    const years = args.map((year) => {
      return parseInt(year, 10);
    });

    await ingest.ibgeAllStates({ years });
    return;
  }

  if (command == 'osmAddress') {
    const years = args.map((year) => {
      return parseInt(year, 10);
    });

    await ingest.ibgeAllCities({ years });
    return;
  }
  // add more functions here

  throw new Error('Command not recognized');
})();
