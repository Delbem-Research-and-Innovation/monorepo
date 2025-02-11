import * as React from 'react';
import * as googleapis from 'googleapis';
import {
  Flex,
  Grid,
  Heading,
  InputNumber,
  Label,
  Select,
  Stack,
  Text,
} from '@ttoss/ui';
import { type InferGetStaticPropsType } from 'next';
import {
  getPolygonsOptionsForCategoricValues,
  getPolygonsOptionsForNumericValues,
} from 'src/inct/getPolygonsOptions';
import { useGoogleMaps, useMap } from '@ttoss/google-maps';
import { variablesDictionary } from 'src/inct/variablesDictionary';
import Link from 'next/link';
import path from 'node:path';

const sheets = googleapis.google.sheets('v4');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * https://docs.google.com/spreadsheets/d/11TjY5jW3jQrVlI8StmNKBOiPuLokEJhUPzg4TP9zbJk/edit
 */
const SPREADSHEET_ID = '11TjY5jW3jQrVlI8StmNKBOiPuLokEJhUPzg4TP9zbJk';

const SP_CENTER = { lat: -22.50873987182417, lng: -48.57016906185558 };

const DEFAULT_ZOOM = 6;

export const getStaticProps = async () => {
  const getAuth = async () => {
    const auth = new googleapis.google.auth.GoogleAuth({
      scopes: SCOPES,
      keyFile: path.join(process.cwd(), 'simple4decision-f90a46b9bcbc.json'),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return auth.getClient() as Promise<any>;
  };

  const auth = await getAuth();

  const spreadsheetData = await sheets.spreadsheets.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetsTitles =
    spreadsheetData.data.sheets
      ?.map((sheet) => {
        return sheet.properties?.title || '';
      })
      .filter((title) => {
        return !!title;
      }) || [];

  const sheetsData = await Promise.all(
    sheetsTitles.map(async (sheet) => {
      const values = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SPREADSHEET_ID,
        range: sheet,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const [, [geoJsonKey, geoJsonUrl], , headers, ...data] = [
        ...(values.data.values || []),
      ];

      const [, , ...indicators] = headers;

      const locations = data.map((row) => {
        return {
          cdIbge: String(row[0]),
          name: row[1],
        };
      });

      const indicatorsJson = await Promise.all(
        indicators.map(async (indicator, index) => {
          const indicatorData = Object.fromEntries(
            data.map((row) => {
              return [row[0], row[index + 2]];
            })
          );

          const polygonsOptions = await (async () => {
            const dict = variablesDictionary[indicator];

            if (dict?.options) {
              return getPolygonsOptionsForCategoricValues(
                indicatorData,
                indicator
              );
            }

            return getPolygonsOptionsForNumericValues(indicatorData);
          })();

          return {
            name: indicator,
            captions: polygonsOptions.captions,
            options: polygonsOptions.options,
          };
        })
      );

      return {
        sheet,
        geoJsonKey,
        geoJsonUrl,
        locations,
        indicators: indicatorsJson,
      };
    })
  );

  return { props: { sheetsTitles, sheetsData } };
};

type Props = InferGetStaticPropsType<typeof getStaticProps>;

type SheetData = Props['sheetsData'][number];

type Locations = SheetData['locations'];

type Location = Locations[number];

type IndicatorData = SheetData['indicators'][number];

type Captions = IndicatorData['captions'];

type Option = IndicatorData['options'][number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GeoJsonDataContext = React.createContext<Record<string, any>>({});

/**
 * Load GeoJson Data before to avoid fetching the same data multiple times.
 */
const GeoJsonDataProvider = ({
  sheetsData,
  children,
}: {
  sheetsData: SheetData[];
  children: React.ReactNode;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoJsonData, setGeoJsonData] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    const geoJsonUrls = sheetsData.map((sheet) => {
      return sheet.geoJsonUrl;
    });

    geoJsonUrls.forEach(async (url) => {
      const response = await fetch(url);
      const geoJson = await response.json();
      setGeoJsonData((prev) => {
        return { ...prev, [url]: geoJson };
      });
    }, []);
  }, []);

  return (
    <GeoJsonDataContext.Provider value={geoJsonData}>
      {children}
    </GeoJsonDataContext.Provider>
  );
};

type SelectorValues = {
  sheet: string;
  locationId?: string;
  mapHeight: number;
};

const Selector = (
  props: Props & {
    value: SelectorValues;
    onChange: (values: SelectorValues) => void;
  }
) => {
  const regionsOptions = props.sheetsTitles.map((sheet) => {
    return { value: sheet, label: sheet };
  });

  const sheetData = props.sheetsData.find((sheet) => {
    return sheet.sheet === props.value.sheet;
  });

  const itemsOptions = [
    { value: '', label: 'Selecione um item' },
    ...(sheetData?.locations || [])
      .map(({ cdIbge, name }) => {
        return { value: cdIbge, label: name };
      })
      .sort((a, b) => {
        if (a.label < b.label) {
          return -1;
        }
        if (a.label > b.label) {
          return 1;
        }
        return 0;
      }),
  ];

  return (
    <Stack
      sx={{
        width: '100%',
        backgroundColor: 'white',
        padding: '6',
        gap: '6',
      }}
    >
      <Heading as="h2">Selecione as variáveis</Heading>
      <Flex
        sx={{
          gap: '6',
        }}
      >
        <Stack sx={{ width: '350px', gap: 1 }}>
          <Label htmlFor="select-region">Tipo de Regionalização</Label>
          <Select
            id="select-region"
            options={regionsOptions}
            value={props.value.sheet}
            onChange={(value) => {
              if (value) {
                props.onChange({
                  sheet: value as string,
                  mapHeight: props.value.mapHeight,
                });
              }
            }}
          />
        </Stack>
        <Stack sx={{ width: '350px', gap: 1 }}>
          <Label htmlFor="select-location">Selecione a Localidade</Label>
          <Select
            id="select-location"
            options={itemsOptions}
            value={props.value.locationId || ''}
            onChange={(value) => {
              props.onChange({
                ...props.value,
                locationId: (value as string) || '',
              });
            }}
          />
        </Stack>
        <Stack sx={{ width: '200px', gap: 1 }}>
          <Label htmlFor="map-height">Altura dos Mapas (px)</Label>
          <InputNumber
            id="map-height"
            value={props.value.mapHeight}
            step={50}
            onChange={(value) => {
              props.onChange({
                ...props.value,
                mapHeight: value,
              });
            }}
          />
        </Stack>
      </Flex>
    </Stack>
  );
};

const MapCaption = ({ captions }: { captions: Captions }) => {
  return (
    <Stack
      sx={{
        gap: '2',
        padding: '4',
        backgroundColor: 'white',
      }}
    >
      <Text sx={{ fontWeight: 'bold' }}>Legenda</Text>
      <Stack
        sx={{
          gap: '1',
        }}
      >
        {captions.map((caption) => {
          return (
            <Flex
              key={caption.name}
              sx={{
                gap: '1',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: caption.fillColor,
                }}
              />
              <Text
                sx={{
                  fontSize: 'sm',
                }}
              >
                {caption.name}
              </Text>
            </Flex>
          );
        })}
      </Stack>
    </Stack>
  );
};

const LocationInfo = ({
  name,
  option,
  indicator,
}: {
  indicator: string;
  name?: string;
  option?: Option;
}) => {
  if (!name) {
    return null;
  }

  return (
    <Stack
      sx={{
        gap: '2',
        padding: '4',
        backgroundColor: 'white',
      }}
    >
      <Text sx={{ fontWeight: 'bold' }}>{name}</Text>
      <Stack
        sx={{
          gap: '1',
        }}
      >
        {option && (
          <Flex
            sx={{
              gap: '1',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: option.caption.fillColor,
              }}
            />
            <Text>{option.caption.name}</Text>
          </Flex>
        )}
        <Flex>
          {indicator}: {option?.value}
        </Flex>
      </Stack>
    </Stack>
  );
};

const Map = ({
  geoJsonUrl,
  geoJsonKey,
  locations,
  indicatorData,
  selectedLocationId,
  setLocationId,
}: {
  geoJsonUrl: string;
  geoJsonKey: string;
  locations: Locations;
  indicatorData: IndicatorData;
  selectedLocationId?: string;
  setLocationId: (locationId: string) => void;
}) => {
  const { google } = useGoogleMaps();

  const delta = { lat: 4.5, lng: 9 };

  const { ref, map } = useMap({
    mapId: 'cb4133f1a7bdc518',
    center: SP_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 6,
    maxZoom: 10,
    restriction: {
      latLngBounds: {
        east: SP_CENTER.lng + delta.lng,
        north: SP_CENTER.lat + delta.lat,
        south: SP_CENTER.lat - delta.lat,
        west: SP_CENTER.lng - delta.lng,
      },
    },
    mapTypeControl: false,
    gestureHandling: 'cooperative',
    disableDefaultUI: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  const currentGeoJson = React.useRef<google.maps.Data>(null);

  const geoJsonData = React.useContext(GeoJsonDataContext);

  const [temporaryLocationId, setTemporaryLocationId] = React.useState('');

  const temporaryLocation = locations.find((l) => {
    return l.cdIbge === temporaryLocationId;
  });

  /**
   * Load GeoJson
   */
  React.useEffect(() => {
    if (map && google.maps) {
      if (currentGeoJson.current) {
        currentGeoJson.current.forEach((feature) => {
          currentGeoJson.current?.remove(feature);
        });
      }

      const geoJson = new google.maps.Data({
        map,
        style: {
          strokeColor: 'black',
          strokeWeight: 1,
          fillOpacity: 1,
        },
      });

      currentGeoJson.current = geoJson;

      geoJson.addGeoJson(geoJsonData[geoJsonUrl], null);

      geoJson.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
        const cdIbge = event.feature.getProperty(geoJsonKey) as string;
        setTemporaryLocationId(cdIbge);
        geoJson.overrideStyle(event.feature, { strokeWeight: 3 });
      });

      geoJson.addListener('mouseout', (event: google.maps.Data.MouseEvent) => {
        setTemporaryLocationId('');
        const cdIbge = event.feature.getProperty(geoJsonKey) as string;
        if (cdIbge !== selectedLocationId) {
          geoJson.overrideStyle(event.feature, { strokeWeight: 1 });
        }
      });

      geoJson.addListener('click', (event: google.maps.Data.MouseEvent) => {
        const cdIbge = event.feature.getProperty(geoJsonKey) as string;
        setLocationId(cdIbge);
      });

      geoJson.addListener('rightclick', () => {
        setLocationId('');
      });

      geoJson.forEach((feature) => {
        const cdIbge = feature.getProperty(geoJsonKey) as string;
        const options = indicatorData.options[cdIbge];
        geoJson.overrideStyle(feature, {
          fillColor: options?.fillColor || 'transparent',
        });
      });
    }
  }, [
    map,
    google,
    geoJsonData,
    geoJsonUrl,
    geoJsonKey,
    indicatorData,
    setLocationId,
    selectedLocationId,
  ]);

  const [selectedLocation, setSelectedLocation] =
    React.useState<Location | null>(null);

  /**
   * Handle selected location
   */
  React.useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find((l) => {
        return l.cdIbge === selectedLocationId;
      });

      setSelectedLocation(location || null);

      if (location) {
        currentGeoJson.current?.forEach((feature) => {
          if (feature.getProperty(geoJsonKey) === selectedLocationId) {
            currentGeoJson.current?.overrideStyle(feature, { strokeWeight: 5 });

            /**
             * Center map
             */
            if (google.maps) {
              const bounds = new google.maps.LatLngBounds();

              feature.getGeometry()?.forEachLatLng((latLng) => {
                bounds.extend(latLng);
              });

              map?.fitBounds(bounds);
            }
          }
        });
      }
    } else {
      setSelectedLocation(null);
      map?.setCenter(SP_CENTER);
      map?.setZoom(DEFAULT_ZOOM);
    }
  }, [geoJsonKey, google.maps, locations, map, selectedLocationId]);

  return (
    <Flex
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <Flex
        ref={ref}
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />
      <Flex
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {temporaryLocationId && (
          <LocationInfo
            name={temporaryLocation?.name}
            indicator={indicatorData.name}
            option={indicatorData.options[temporaryLocationId]}
          />
        )}
        {selectedLocation && !temporaryLocationId && (
          <LocationInfo
            name={selectedLocation.name}
            indicator={indicatorData.name}
            option={indicatorData.options[selectedLocation.cdIbge]}
          />
        )}
      </Flex>
      <Flex
        sx={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '4',
        }}
      >
        <Text sx={{ fontWeight: 'bold' }}>{indicatorData.name}</Text>
      </Flex>
      <Flex
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      >
        <MapCaption captions={indicatorData.captions} />
      </Flex>
    </Flex>
  );
};

const Page = (props: Props) => {
  const [selectorValues, setSelectorValues] = React.useState<SelectorValues>({
    sheet: props.sheetsTitles[0],
    mapHeight: 800,
  });

  const setLocationId = (locationId: string) => {
    setSelectorValues({
      ...selectorValues,
      locationId,
    });
  };

  const sheetData = props.sheetsData.find((sheet) => {
    return sheet.sheet === selectorValues.sheet;
  });

  return (
    <GeoJsonDataProvider sheetsData={props.sheetsData}>
      <Stack sx={{ gap: '8', alignItems: 'flex-start', width: '100%' }}>
        <Heading as="h1">Fronteira de Pareto</Heading>
        <Flex sx={{ gap: '2' }}>
          <Link href="/inct-combate-a-fome-sp/multimapas">Multimapas</Link>
          <Text>{'>'}</Text>
          <Text>Fronteira de Pareto</Text>
        </Flex>
        <Selector
          {...props}
          value={selectorValues}
          onChange={(values) => {
            setSelectorValues(values);
          }}
        />
        {sheetData && (
          <Grid
            sx={{
              height: `${selectorValues.mapHeight}px`,
              width: '100%',
              gridTemplateColumns: '1fr 1fr',
              gap: '6',
            }}
          >
            {sheetData?.indicators.map((indicatorData) => {
              return (
                <Map
                  key={indicatorData.name}
                  geoJsonUrl={sheetData.geoJsonUrl}
                  geoJsonKey={sheetData.geoJsonKey}
                  locations={sheetData.locations}
                  indicatorData={indicatorData}
                  selectedLocationId={selectorValues.locationId}
                  setLocationId={setLocationId}
                />
              );
            })}
          </Grid>
        )}
      </Stack>
    </GeoJsonDataProvider>
  );
};

export default Page;
