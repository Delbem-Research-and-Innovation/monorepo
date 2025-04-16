import { useQuery } from '@tanstack/react-query';
import { useGoogleMaps, useMap } from '@ttoss/google-maps';
import { Icon } from '@ttoss/react-icons';
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Image,
  Label,
  Select,
  Stack,
  Text,
} from '@ttoss/ui';
import {
  GetStaticPaths,
  GetStaticProps,
  type InferGetStaticPropsType,
} from 'next';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import {
  type Caption,
  getProjectByName,
  listAllProjects,
  type Location,
  type Project,
  type Region,
  type Variable,
} from 'src/multimapas/projects';

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await listAllProjects();

  return {
    paths: projects.map((project) => {
      return {
        params: {
          project: project.name,
        },
      };
    }),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<{
  project: Project;
}> = async ({ params }) => {
  if (!params) {
    return { notFound: true };
  }

  const projectName = params.project as string;

  const project = await getProjectByName(projectName);

  if (!project) {
    return { notFound: true };
  }

  return { props: { project } };
};

type Props = InferGetStaticPropsType<typeof getStaticProps>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GeoJsonDataContext = React.createContext<Record<string, any>>({});

/**
 * Load GeoJson Data before to avoid fetching the same data multiple times.
 */
const GeoJsonDataProvider = ({
  regions,
  children,
}: {
  regions: Region[];
  children: React.ReactNode;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoJsonData, setGeoJsonData] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    const geoJsonUrls = regions.map((region) => {
      return region.mapConfig.geoJsonUrl;
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
  tabName: string;
  locationCode?: string;
  mapHeight: number;
};

const Selector = (
  props: Props & {
    value: SelectorValues;
    onChange: (values: SelectorValues) => void;
  }
) => {
  const tabsOptions = props.project.regions.map((region) => {
    return { value: region.name, label: region.name };
  });

  const tabData = props.project.regions.find((region) => {
    return region.name === props.value.tabName;
  });

  const itemsOptions = [
    { value: '', label: 'Selecione um item' },
    ...(tabData?.locations || [])
      .map(({ code, name }) => {
        return { value: code, label: name };
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
        <Stack sx={{ minWidth: '350px', gap: 1 }}>
          <Label htmlFor="select-region">Tipo de Regionalização</Label>
          <Select
            id="select-region"
            options={tabsOptions}
            value={props.value.tabName}
            onChange={(value) => {
              if (value) {
                props.onChange({
                  tabName: value as string,
                  mapHeight: props.value.mapHeight,
                });
              }
            }}
          />
        </Stack>
        <Stack sx={{ minWidth: '350px', gap: 1 }}>
          <Label htmlFor="select-location">Selecione a Localidade</Label>
          <Select
            id="select-location"
            options={itemsOptions}
            value={props.value.locationCode || ''}
            onChange={(value) => {
              props.onChange({
                ...props.value,
                locationCode: (value as string) || '',
              });
            }}
          />
        </Stack>
        <Stack sx={{ minWidth: '200px', gap: 1 }}>
          <Label htmlFor="map-height">Altura dos Mapas (px)</Label>
          <Select
            id="map-height"
            value={props.value.mapHeight}
            isSearchable={false}
            options={[
              { value: 700, label: '700px' },
              { value: 800, label: '800px' },
              { value: 900, label: '900px' },
              { value: 1000, label: '1000px' },
              { value: 1100, label: '1100px' },
              { value: 1200, label: '1200px' },
            ]}
            onChange={(value) => {
              if (value) {
                props.onChange({
                  ...props.value,
                  mapHeight: Number(value),
                });
              }
            }}
          />
        </Stack>
      </Flex>
    </Stack>
  );
};

const MapCaptions = (props: { captions: Caption[] }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Flex
      sx={{
        gap: '2',
        padding: '3',
        backgroundColor: 'white',
        flexDirection: 'column',
        fontSize: 'sm',
      }}
    >
      <Flex
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontWeight: 'bold',
          gap: '4',
        }}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <Text>Legenda</Text>
        <Text
          sx={{
            fontSize: 'md',
          }}
        >
          <Icon icon={isOpen ? 'picker-down' : 'picker-up'} />
        </Text>
      </Flex>
      <Flex
        sx={{
          gap: '1',
          flexDirection: 'column',
          display: isOpen ? 'flex' : 'none',
        }}
      >
        {props.captions.map((caption) => {
          return (
            <Flex
              key={caption.name}
              sx={{
                gap: '1',
              }}
            >
              <Box
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
      </Flex>
    </Flex>
  );
};

const LocationInfo = (props: { location: Location; variable: Variable }) => {
  const caption = props.variable.polygonsOptions[props.location.code]?.caption;

  const value =
    caption?.dataType === 'categorical' ? caption.name : caption.value;

  const hasValue = value !== undefined && value !== null;

  if (!props.location) {
    return null;
  }

  return (
    <Stack
      sx={{
        gap: '2',
        padding: '3',
        backgroundColor: 'white',
        fontSize: 'sm',
      }}
    >
      <Text sx={{ fontWeight: 'bold' }}>{props.location.name}</Text>
      {hasValue && (
        <Stack
          sx={{
            gap: '1',
          }}
        >
          <Flex>Valor: {value}</Flex>
        </Stack>
      )}
    </Stack>
  );
};

const Map = (props: {
  region: Region;
  variable: Variable;
  selectedLocationCode?: string;
  setLocationCode: (locationCode: string) => void;
}) => {
  const { google } = useGoogleMaps();

  // const delta = { lat: 4.5, lng: 9 };

  const { ref, map } = useMap({
    mapId: 'cb4133f1a7bdc518',
    center: props.region.mapConfig.center,
    zoom: props.region.mapConfig.zoom,
    minZoom: props.region.mapConfig.zoom - 3,
    maxZoom: props.region.mapConfig.zoom + 4,
    // restriction: {
    //   latLngBounds: {
    //     east: SP_CENTER.lng + delta.lng,
    //     north: SP_CENTER.lat + delta.lat,
    //     south: SP_CENTER.lat - delta.lat,
    //     west: SP_CENTER.lng - delta.lng,
    //   },
    // },
    mapTypeControl: false,
    gestureHandling: 'cooperative',
    disableDefaultUI: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  const currentGeoJson = React.useRef<google.maps.Data>(null);

  const geoJsonData = React.useContext(GeoJsonDataContext);

  const [temporaryLocationCode, setTemporaryLocationCode] = React.useState('');

  const temporaryLocation = props.region.locations.find((l) => {
    return l.code === temporaryLocationCode;
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

      geoJson.addGeoJson(geoJsonData[props.region.mapConfig.geoJsonUrl], null);

      geoJson.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
        const code = String(
          event.feature.getProperty(props.region.mapConfig.geoJsonKey)
        );

        setTemporaryLocationCode(code);

        geoJson.overrideStyle(event.feature, { strokeWeight: 3 });
      });

      geoJson.addListener('mouseout', (event: google.maps.Data.MouseEvent) => {
        setTemporaryLocationCode('');

        const code = String(
          event.feature.getProperty(props.region.mapConfig.geoJsonKey)
        );

        if (code !== props.selectedLocationCode) {
          geoJson.overrideStyle(event.feature, { strokeWeight: 1 });
        }
      });

      geoJson.addListener('click', (event: google.maps.Data.MouseEvent) => {
        const code = String(
          event.feature.getProperty(props.region.mapConfig.geoJsonKey)
        );

        props.setLocationCode(String(code));
      });

      geoJson.addListener('rightclick', () => {
        props.setLocationCode('');
      });

      geoJson.forEach((feature) => {
        const code = String(
          feature.getProperty(props.region.mapConfig.geoJsonKey)
        );

        const options = props.variable.polygonsOptions[code];

        geoJson.overrideStyle(feature, {
          fillColor: options?.fillColor || 'transparent',
        });
      });
    }
  }, [map, google, geoJsonData, props]);

  const selectedLocation = props.region.locations.find((l) => {
    return String(l.code) === props.selectedLocationCode;
  });

  /**
   * Handle selected location
   */
  React.useEffect(() => {
    if (selectedLocation) {
      currentGeoJson.current?.forEach((feature) => {
        if (
          String(feature.getProperty(props.region.mapConfig.geoJsonKey)) ===
          props.selectedLocationCode
        ) {
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
    } else {
      map?.setCenter(props.region.mapConfig.center);
      map?.setZoom(props.region.mapConfig.zoom);
    }
  }, [
    google.maps,
    map,
    props.region.mapConfig.center,
    props.region.mapConfig.geoJsonKey,
    props.region.mapConfig.zoom,
    props.selectedLocationCode,
    selectedLocation,
  ]);

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
          bottom: 0,
          left: 0,
        }}
      >
        {temporaryLocation && (
          <LocationInfo
            location={temporaryLocation}
            variable={props.variable}
          />
        )}
        {selectedLocation && !temporaryLocation && (
          <LocationInfo location={selectedLocation} variable={props.variable} />
        )}
      </Flex>
      <Flex
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          backgroundColor: 'white',
          padding: '1',
        }}
      >
        <Text sx={{ fontWeight: 'bold' }}>{props.variable.name}</Text>
      </Flex>
      <Flex
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      >
        <MapCaptions captions={props.variable.captions} />
      </Flex>
    </Flex>
  );
};

const Insights = (
  props: Props & {
    selectorValues: SelectorValues;
    setLocationCode: (locationCode: string) => void;
  }
) => {
  // check if URL has query alexandre-ai=true
  const searchParams = useSearchParams();

  const isAlexandreAiEnabled =
    searchParams.get('alexandre-ai') === 'true' && props.project.ai;

  const showPrompt = searchParams.get('show-prompt') === 'true';

  const [wasLocationCodeSet, setWasLocationCodeSet] = React.useState(false);

  const { data, isFetching, isError, refetch } = useQuery({
    enabled: false,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('region', props.selectorValues.tabName);
      const response = await fetch(
        `/api/${props.project.name}/multimapas/insights?${searchParams.toString()}`,
        {
          method: 'POST',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      return response.json();
    },
    queryKey: ['insights', props.project.name, props.selectorValues.tabName],
  });

  const setLocationCode = props.setLocationCode;

  React.useEffect(() => {
    if (!data?.locationCode) {
      return;
    }

    if (wasLocationCodeSet) {
      return;
    }

    if (isFetching) {
      return;
    }

    setLocationCode(data.locationCode);
    setWasLocationCodeSet(true);
  }, [data?.locationCode, setLocationCode, wasLocationCodeSet, isFetching]);

  if (!isAlexandreAiEnabled) {
    return null;
  }

  const imageSrc = (() => {
    if (isFetching) {
      return '/alexandre-ai-thinking.jpeg';
    }

    if (!data?.insight) {
      return '/alexandre-ai.jpeg';
    }

    return '/alexandre-ai-happy.jpeg';
  })();

  return (
    <Flex sx={{ width: '100%', backgroundColor: 'white', padding: '6' }}>
      <Flex sx={{ justifyContent: 'center', alignItems: 'flex-start' }}>
        <Image
          src={imageSrc}
          alt="Alexandre AI"
          width={300}
          height={300}
          sx={{
            objectFit: 'contain',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </Flex>
      <Stack sx={{ gap: '6', flex: 1, maxWidth: '800px' }}>
        <Heading as="h2">Alexandre AI</Heading>
        <Flex
          sx={{
            gap: '6',
          }}
        >
          <Button
            onClick={() => {
              setWasLocationCodeSet(false);
              refetch();
            }}
            disabled={isFetching}
            loading={isFetching}
          >
            {isFetching ? 'Pensando...' : 'Insights do Alexandre'}
          </Button>
        </Flex>
        {isError && (
          <Text color="red">Não consegui obter nenhum insight...</Text>
        )}
        {data && (
          <Stack sx={{ gap: '3' }}>
            <Heading as="h3">Insights:</Heading>
            <Text
              sx={{
                fontStyle: 'italic',
                whiteSpace: 'pre-line',
              }}
            >
              {data.insight}
            </Text>
            {data.factCheck && (
              <Text
                sx={{
                  fontSize: 'sm',
                  color: 'gray',
                  fontStyle: 'italic',
                }}
              >
                Verificação de dados: {data.factCheck}
              </Text>
            )}
            {showPrompt && (
              <>
                <Heading as="h3">Instruções:</Heading>
                <Text
                  sx={{
                    fontStyle: 'italic',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {data.instructions}
                </Text>
                <Heading as="h3">Input:</Heading>
                <Text
                  sx={{
                    fontStyle: 'italic',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {data.input}
                </Text>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Flex>
  );
};

const Page = (props: Props) => {
  const [selectorValues, setSelectorValues] = React.useState<SelectorValues>({
    tabName: props.project.regions[0].name,
    mapHeight: 800,
  });

  const setLocationCode = React.useCallback(
    (locationCode: string) => {
      setSelectorValues({
        ...selectorValues,
        locationCode,
      });
    },
    [selectorValues]
  );

  const region = props.project.regions.find((region) => {
    return region.name === selectorValues.tabName;
  });

  return (
    <GeoJsonDataProvider regions={props.project.regions}>
      <Stack sx={{ gap: '8', alignItems: 'flex-start', width: '100%' }}>
        <Heading as="h1">Multimapas</Heading>
        <Selector
          {...props}
          value={selectorValues}
          onChange={(values) => {
            setSelectorValues(values);
          }}
        />
        <Insights
          {...props}
          selectorValues={selectorValues}
          setLocationCode={setLocationCode}
        />
        {region && (
          <Grid
            sx={{
              height: `${selectorValues.mapHeight}px`,
              width: '100%',
              gridTemplateColumns: '1fr 1fr',
              gap: '6',
            }}
          >
            {region?.variables.map((variable) => {
              return (
                <Map
                  key={variable.name}
                  region={region}
                  variable={variable}
                  selectedLocationCode={selectorValues.locationCode}
                  setLocationCode={setLocationCode}
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
