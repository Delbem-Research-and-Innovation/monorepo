import {
  getAuth,
  listAllFoldersInFolder,
  listAllSheetsInFolder,
  sheets,
} from '../google';
import {
  type Caption,
  getPolygonsOptionsForCategoricalValues,
  getPolygonsOptionsForNumericalValues,
  type PolygonsOptions,
} from './polygons';

const folderId = '1m3zw1BGQCoKHYHhJzD97fVM0xX0-d0Do';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listAllProjects = async (args: { auth?: any } = {}) => {
  const auth = args.auth || (await getAuth());

  const folders = await listAllFoldersInFolder({
    auth,
    folderId,
  });

  return folders.map((folder) => {
    return {
      id: folder.id,
      name: folder.name,
    };
  });
};

export type { Caption, PolygonsOptions };

export type Location = {
  code: string;
  name: string;
};

export type MapConfig = {
  geoJsonKey: string;
  geoJsonUrl: string;
  zoom: number;
  center: {
    lat: number;
    lng: number;
  };
};

export type Variable = {
  name: string;
  data: Record<string, number | string>;
  captions: Caption[];
  polygonsOptions: PolygonsOptions;
};

export type Region = {
  name: string;
  mapConfig: MapConfig;
  variables: Variable[];
  locations: Location[];
};

export type Project = {
  id: string;
  name: string;
  regions: Region[];
};

export const getProjectByName = async (
  name: string
): Promise<Project | undefined> => {
  const auth = await getAuth();

  const projects = await listAllProjects({ auth });

  const project = projects.find((folder) => {
    return folder.name === name;
  });

  if (!project) {
    return undefined;
  }

  const projectSheets = await listAllSheetsInFolder({
    auth,
    folderId: project.id,
  });

  const getDictionary = async () => {
    const projectDictionarySheet = projectSheets.find((sheet) => {
      return sheet.name === 'Dicionário';
    });

    if (!projectDictionarySheet) {
      return undefined;
    }

    const projectDictionarySheetValues = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: projectDictionarySheet.id,
      range: 'A:C',
    });

    if (!projectDictionarySheetValues.data.values) {
      return undefined;
    }

    const { dictionary } = projectDictionarySheetValues.data.values.reduce(
      (acc, row) => {
        const [variable, code, caption] = row;

        if (variable) {
          acc.currentVariable = variable;
        }

        if (!acc.dictionary[acc.currentVariable]) {
          acc.dictionary[acc.currentVariable] = {};
        }

        if (code && caption) {
          acc.dictionary[acc.currentVariable][code] = caption;
        }

        return acc;
      },
      {
        currentVariable: '',
        dictionary: {} as Record<string, Record<string, string>>,
      }
    );

    return dictionary;
  };

  const dictionary = await getDictionary();

  const projectDataSheet = projectSheets.find((sheet) => {
    return sheet.name === 'Dados';
  });

  if (!projectDataSheet) {
    return undefined;
  }

  const projectDataSheetData = await sheets.spreadsheets.get({
    auth,
    spreadsheetId: projectDataSheet.id,
  });

  /**
   * Get all the tabs of the sheets in the project data sheet.
   */
  const projectDataSheetTabs =
    projectDataSheetData.data.sheets
      ?.map((sheet) => {
        return sheet.properties?.title || '';
      })
      .filter((title) => {
        return !!title;
      }) || [];

  const regions = await Promise.all(
    projectDataSheetTabs.map(async (tabName) => {
      const values = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: projectDataSheet.id,
        range: tabName,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const [, configArr, , headers, ...data] = [...(values.data.values || [])];

      const mapConfig = {
        geoJsonKey: configArr[0],
        geoJsonUrl: configArr[1],
        zoom: configArr[2],
        center: {
          lat: configArr[3],
          lng: configArr[4],
        },
      };

      const [, , ...variablesNames] = headers;

      const locations = data.map((row) => {
        return {
          code: String(row[0]),
          name: row[1],
        };
      });

      const variables = await Promise.all(
        variablesNames.map(async (variableName, index) => {
          const variableData = Object.fromEntries(
            data.map((row) => {
              return [row[0], row[index + 2]];
            })
          ) as Record<string, number | string>;

          const { captions, polygonsOptions } = await (async () => {
            if (dictionary?.[variableName]) {
              return getPolygonsOptionsForCategoricalValues({
                values: variableData,
                dictionary,
                variable: variableName,
              });
            }

            return getPolygonsOptionsForNumericalValues(variableData);
          })();

          return {
            name: variableName,
            data: variableData,
            captions,
            polygonsOptions,
          };
        })
      );

      return {
        name: tabName,
        mapConfig,
        locations,
        variables,
      };
    })
  );

  return {
    ...project,
    regions,
  };
};
