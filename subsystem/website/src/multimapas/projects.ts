import {
  getAuth,
  listAllFoldersInFolder,
  listAllSheetsInFolder,
  sheets,
} from '../google';
import { computeCentroid } from './geometry';
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
  /** Geographic centroid of the location, used to center the map when selected. */
  center?: { lat: number; lng: number };
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

      const allHeaders = headers as string[];

      // Identify special coordinate columns (optional; absent = no centering per location).
      const CENTER_LAT_HEADER = 'center_lat';
      const CENTER_LNG_HEADER = 'center_lng';
      const centerLatCol = allHeaders.indexOf(CENTER_LAT_HEADER);
      const centerLngCol = allHeaders.indexOf(CENTER_LNG_HEADER);

      // Build variable column entries from headers[2+], skipping the special columns.
      const variableColumns = allHeaders
        .slice(2)
        .reduce<Array<{ name: string; col: number }>>((acc, name, i) => {
          if (name !== CENTER_LAT_HEADER && name !== CENTER_LNG_HEADER) {
            acc.push({ name, col: i + 2 });
          }
          return acc;
        }, []);

      const locations = data.map((row) => {
        const loc: Location = {
          code: String(row[0]),
          name: row[1] || 'NOME NÃO INFORMADO',
        };
        if (centerLatCol !== -1 && centerLngCol !== -1) {
          const lat = Number(row[centerLatCol]);
          const lng = Number(row[centerLngCol]);
          if (!isNaN(lat) && !isNaN(lng)) {
            loc.center = { lat, lng };
          }
        }
        return loc;
      });

      /**
       * Enrich locations that have no manual center with the geometric centroid
       * computed from the GeoJSON source. The fetch runs once per region at
       * build time (getStaticProps) so there is no runtime cost.
       *
       * Failures (network error, malformed GeoJSON) are silently swallowed so
       * they do not break the build — the map will simply not auto-center for
       * those locations.
       */
      try {
        const geoJsonRes = await fetch(mapConfig.geoJsonUrl);
        if (geoJsonRes.ok) {
          const geoJson =
            (await geoJsonRes.json()) as GeoJSON.FeatureCollection;
          const centroidByKey = new Map<string, { lat: number; lng: number }>();
          for (const feature of geoJson.features ?? []) {
            const key = String(
              feature.properties?.[mapConfig.geoJsonKey] ?? ''
            );
            if (!key || !feature.geometry) {
              continue;
            }
            const centroid = computeCentroid(feature.geometry);
            if (centroid) {
              centroidByKey.set(key, centroid);
            }
          }
          for (const loc of locations) {
            if (!loc.center && centroidByKey.has(loc.code)) {
              loc.center = centroidByKey.get(loc.code);
            }
          }
        }
      } catch {
        // Non-fatal: centroid enrichment is a best-effort enhancement.
      }

      const variables = await Promise.all(
        variableColumns.map(async ({ name: variableName, col }) => {
          const variableData = Object.fromEntries(
            data
              .filter((row) => {
                const cell = row[col];
                return cell !== undefined && cell !== null && cell !== '';
              })
              .map((row) => {
                return [row[0], row[col]];
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
