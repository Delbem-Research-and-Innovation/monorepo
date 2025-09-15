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

export type Dictionary = Record<
  string,
  {
    variable: string;
    description: string;
    captions: Record<string, string>;
  }
>;

export type Project = {
  id: string;
  name: string;
  ai: {
    model: string;
    temperature: number;
    instructions: string;
    input: string;
  } | null;
  dictionary: Dictionary | null;
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

  const getAIConfig = async () => {
    const aiSheet = projectSheets.find((sheet) => {
      return sheet.name === 'AI';
    });

    if (!aiSheet) {
      return undefined;
    }

    const sheetValues = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: aiSheet.id,
      range: 'A:B',
    });

    if (!sheetValues.data.values) {
      return undefined;
    }

    return {
      model: sheetValues.data.values[0][1],
      temperature: Number(sheetValues.data.values[1][1]),
      instructions: sheetValues.data.values[2][1],
      input: sheetValues.data.values[3][1],
    };
  };

  const ai = (await getAIConfig()) || null;

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
      range: 'A:D',
    });

    if (!projectDictionarySheetValues.data.values) {
      return undefined;
    }

    const { dictionary } = projectDictionarySheetValues.data.values.reduce(
      (acc, row) => {
        const [variable, description, code, caption] = row;

        if (variable) {
          acc.currentVariable = variable;
        }

        if (!acc.dictionary[acc.currentVariable]) {
          acc.dictionary[acc.currentVariable] = {
            variable: acc.currentVariable,
            description: description || '',
            captions: {},
          };
        }

        if (code && caption) {
          acc.dictionary[acc.currentVariable].captions[code] = caption;
        }

        return acc;
      },
      {
        currentVariable: '',
        dictionary: {} as Dictionary,
      }
    );

    return dictionary;
  };

  const dictionary = (await getDictionary()) || null;

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

      const [, configArr, , headers, ...restRows] = [
        ...(values.data.values || []),
      ];

      const data = restRows.filter((row) => {
        return row[0];
      });

      const mapConfig = {
        geoJsonKey: configArr[0],
        geoJsonUrl: configArr[1],
        zoom: configArr[2],
        center: {
          lat: configArr[3],
          lng: configArr[4],
        },
      };

      const [, , ...variablesNames] = headers as string[];

      const locations = data.map((row) => {
        return {
          code: String(row[0]),
          name: row[1] || 'NOME NÃO INFORMADO',
        };
      });

      const variables = await Promise.all(
        variablesNames.map(async (variableName, index) => {
          const variableData = Object.fromEntries(
            data
              .filter((row) => {
                const cell = row[index + 2];
                return cell !== undefined && cell !== null && cell !== '';
              })
              .map((row) => {
                return [row[0], row[index + 2]];
              })
          ) as Record<string, number | string>;

          const { captions, polygonsOptions } = await (async () => {
            /**
             * Dictionary key may contain variable name or variable name with
             * tabName as suffix separated by some character like space, dash,
             * underscore, etc. When the last case happens, we need to find the
             * entry in the dictionary that starts with the variable name
             * and ends with the tab name.  For example, if the variable name is
             * "population" and the tab name is "2020", we may have in the
             * dictionary an entry like "population 2020" or "population-2020".
             */
            const variableNameWithTabName = Object.keys(dictionary || {}).find(
              (key) => {
                return key.startsWith(variableName) && key.endsWith(tabName);
              }
            );

            let newDictionary = dictionary;

            if (
              variableNameWithTabName &&
              dictionary &&
              dictionary[variableNameWithTabName]
            ) {
              newDictionary = {
                [variableName]: dictionary[variableNameWithTabName],
              };
            }

            if (
              newDictionary &&
              Object.keys(newDictionary?.[variableName]?.captions || {})
                .length > 0
            ) {
              return getPolygonsOptionsForCategoricalValues({
                values: variableData,
                dictionary: newDictionary,
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
    ai,
    dictionary,
    regions,
  };
};
