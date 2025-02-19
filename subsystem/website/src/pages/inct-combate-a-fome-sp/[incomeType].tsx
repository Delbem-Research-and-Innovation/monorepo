import * as React from 'react';
import {
  Flex,
  Heading,
  IconButton,
  InfiniteLinearProgress,
  Label,
  Select,
  SelectProps,
  Stack,
  Text,
} from '@ttoss/ui';
import { GetStaticPaths, InferGetStaticPropsType } from 'next';
import { Icon } from '@ttoss/react-icons';
import { getAllIncomeTypes } from 'src/inct/getAllIncomeTypes';
import { getIncomeTypeVariables } from 'src/inct/getIncomeTypeVariables';
import { getNumberOfPeoplePerCity } from 'src/inct/getNumberOfPeoplePerCity';
import { getPolygonsOptions } from 'src/inct/getPolygonsOptions';
import { useGoogleMaps, useMap } from '@ttoss/google-maps';
import { useRouter } from 'next/router';
import { variablesDictionary } from 'src/inct/variablesDictionary';
import Link from 'next/link';

const polygonsCommonOptions: Record<string, google.maps.PolygonOptions> = {
  selected: {
    strokeWeight: 5,
    fillOpacity: 1,
  },
  unselected: {
    strokeWeight: 1,
    fillOpacity: 1,
  },
  onHover: {
    strokeWeight: 3,
    fillOpacity: 0.6,
  },
};

export const getStaticPaths: GetStaticPaths = async () => {
  const incomeTypes = await getAllIncomeTypes();
  const paths = incomeTypes.map((incomeType) => {
    return {
      params: { incomeType: incomeType.slug },
    };
  });
  return { paths, fallback: false };
};

export const getStaticProps = async ({
  params,
}: {
  params: { incomeType: string };
}) => {
  if (!params?.incomeType) {
    return { notFound: true };
  }

  const incomeTypeVariables = await getIncomeTypeVariables({
    incomeType: params.incomeType,
  });

  if (incomeTypeVariables.length === 0) {
    return { notFound: true };
  }

  const polygonsOptions = await getPolygonsOptions({
    incomeType: params.incomeType,
  });

  const numberOfPeoplePerCity = await getNumberOfPeoplePerCity();

  return {
    props: {
      incomeType: params.incomeType,
      polygonsOptions,
      numberOfPeoplePerCity,
    },
  };
};

type Props = InferGetStaticPropsType<typeof getStaticProps>;

type PolygonsObject = {
  [key: string]: google.maps.Polygon;
};

const LoadingMessage = ({ children }: { children: React.ReactNode }) => {
  return (
    <Stack>
      <Text
        sx={{
          fontStyle: 'italic',
        }}
      >
        {children}
      </Text>
      <InfiniteLinearProgress />
    </Stack>
  );
};

const SP_CENTER = { lat: -22.50873987182417, lng: -48.57016906185558 };

const DEFAULT_ZOOM = 7;

const IncomeTypePage = ({
  incomeType,
  polygonsOptions,
  numberOfPeoplePerCity,
}: Props) => {
  const router = useRouter();

  const { google } = useGoogleMaps();

  const delta = { lat: 4.5, lng: 9 };

  const { ref, map } = useMap({
    mapId: 'cb4133f1a7bdc518',
    center: SP_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 7,
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

  const [googleMapsPolygons, setGoogleMapsPolygons] =
    React.useState<PolygonsObject | null>(null);

  const isLoadingPolygons = !googleMapsPolygons;

  const [citiesOptions, setCitiesOptions] = React.useState<
    {
      value: string;
      label: string;
    }[]
  >([]);

  /**
   * Setup polygons.
   */
  React.useEffect(() => {
    if (!google.maps || !map) {
      return;
    }

    (async () => {
      const response = await fetch('/polygons.json');

      const polygons = (await response.json()) as {
        id: string;
        name: string;
        administrativeRegionId: string;
        type: string;
        ibgeId: string;
        polygon: number[][];
      }[];

      setGoogleMapsPolygons(
        polygons.reduce<PolygonsObject>((acc, polygon) => {
          const polygonOptions = {
            map,
            paths: [
              ...polygon.polygon.map(([lat, lng]) => {
                return { lat, lng };
              }),
            ],
            strokeColor: '#000000',
            strokeOpacity: 1,
            strokeWeight: 1.5,
            fillOpacity: 1,
            fillColor: 'transparent',
          };

          const googleMapsPolygon = new google.maps.Polygon(polygonOptions);

          acc[polygon.id] = googleMapsPolygon;

          return acc;
        }, {})
      );

      setCitiesOptions(
        polygons
          .map((polygon) => {
            return {
              value: polygon.id,
              label: polygon.name,
            };
          })
          .sort((a, b) => {
            return a.label.localeCompare(b.label);
          })
      );
    })();
  }, [google, map]);

  const variableOptions = Object.keys(polygonsOptions).map((value) => {
    return {
      label: value,
      value,
    };
  });

  const onSelectVariable: SelectProps['onChange'] = (value) => {
    router.push(
      {
        query: {
          ...router.query,
          variavel: value,
        },
      },
      undefined,
      { scroll: false }
    );
  };

  const currentVariable = router.query.variavel as string | undefined;

  const variablePolygonsOptions = currentVariable
    ? polygonsOptions[currentVariable]
    : null;

  const [selectedPolygonId, setSelectedPolygonId] = React.useState('');

  React.useEffect(() => {
    if (map) {
      map.addListener('rightclick', () => {
        setSelectedPolygonId('');
      });
    }
  }, [map]);

  /**
   * Return to default zoom removing selected polygon.
   */
  React.useEffect(() => {
    if (map && !selectedPolygonId) {
      map?.setCenter(SP_CENTER);
      map?.setZoom(DEFAULT_ZOOM);
    }
  }, [selectedPolygonId, map]);

  const [selectionMarker, setSelectionMarker] =
    React.useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  /**
   * Handle selection marker
   */
  React.useEffect(() => {
    if (!googleMapsPolygons) {
      return;
    }

    if (!google.maps) {
      return;
    }

    if (!selectionMarker) {
      const pinScaled = new google.maps.marker.PinElement({
        scale: 1,
      });
      setSelectionMarker(
        new google.maps.marker.AdvancedMarkerElement({
          position: null,
          map,
          content: pinScaled.element,
        })
      );
    }

    if (selectionMarker) {
      if (selectedPolygonId) {
        const polygon = googleMapsPolygons[selectedPolygonId];

        if (!polygon) {
          return;
        }

        const bounds = new google.maps.LatLngBounds();

        polygon.getPath().forEach((latLng) => {
          bounds.extend(latLng);
        });

        map?.fitBounds(bounds);

        const center = bounds.getCenter();

        selectionMarker.position = center;

        map?.setCenter(center);
      } else {
        selectionMarker.position = null;
      }
    }
  }, [
    googleMapsPolygons,
    google.maps,
    selectionMarker,
    map,
    selectedPolygonId,
  ]);

  /**
   * General polygon options and listeners.
   */
  React.useEffect(() => {
    if (!googleMapsPolygons) {
      return;
    }

    for (const [id, polygon] of Object.entries(googleMapsPolygons)) {
      const isPolygonSelected = selectedPolygonId === id;

      const options = variablePolygonsOptions?.options[id];

      if (!selectedPolygonId) {
        if (options) {
          polygon.setOptions({
            fillColor: options.fillColor,
            ...polygonsCommonOptions.unselected,
          });
        }
      } else {
        if (isPolygonSelected) {
          polygon.setOptions({
            fillColor: options?.fillColor || 'transparent',
            ...polygonsCommonOptions.selected,
          });
        } else {
          polygon.setOptions({
            fillColor: 'transparent',
            ...polygonsCommonOptions.unselected,
          });
        }
      }

      polygon.addListener('mouseover', () => {
        polygon.setOptions(polygonsCommonOptions.onHover);
      });

      polygon.addListener('mouseout', () => {
        if (!isPolygonSelected) {
          polygon.setOptions(polygonsCommonOptions.unselected);
        } else {
          polygon.setOptions(polygonsCommonOptions.selected);
        }
      });

      polygon.addListener('click', () => {
        setSelectedPolygonId(id);
      });

      polygon.addListener('rightclick', () => {
        setSelectedPolygonId('');
      });
    }
  }, [googleMapsPolygons, selectedPolygonId, variablePolygonsOptions?.options]);

  const selectedCity = citiesOptions.find((c) => {
    return c.value === selectedPolygonId;
  });

  const renderCityDetails = React.useMemo(() => {
    if (!currentVariable) {
      return null;
    }

    const cityName = selectedCity?.label;
    const polygonOption =
      polygonsOptions[currentVariable]?.options[selectedPolygonId];

    if (!cityName) {
      return null;
    }

    const variableDictionary = variablesDictionary[currentVariable];

    const value = (() => {
      if (variableDictionary.type === 'numeric') {
        /**
         * Get the caption name in which the value fits.
         */
        const captions = polygonsOptions[currentVariable]?.captions;
        const buckets = Object.keys(captions);
        const getMaximalBucket = (value: number) => {
          return buckets
            .map((key) => {
              return Number(key);
            })
            .reduce((acc, bucket) => {
              return value >= bucket ? bucket : acc;
            }, 0);
        };
        const bucket = getMaximalBucket(Number(polygonOption?.value || 0));
        const caption = captions[bucket];
        return caption.name || 'Dados não disponíveis';
      }

      return (
        variableDictionary.options[polygonOption?.value] || 'Não informado'
      );
    })();

    const numberOfPeople =
      numberOfPeoplePerCity[selectedPolygonId] === undefined
        ? 'Dados não disponíveis'
        : numberOfPeoplePerCity[selectedPolygonId];

    return (
      <Flex
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          margin: '4',
          padding: '2',
          backgroundColor: 'white',
          flexDirection: 'column',
          gap: '1',
          borderRadius: 'default',
        }}
      >
        <Flex
          sx={{
            justifyContent: 'space-between',
            gap: '1',
            alignItems: 'center',
          }}
        >
          <Text
            sx={{
              fontSize: 'lg',
              fontWeight: 'bold',
            }}
          >
            Detalhes
          </Text>
          <IconButton
            variant="secondary"
            onClick={() => {
              return setSelectedPolygonId('');
            }}
          >
            <Icon icon="close" />
          </IconButton>
        </Flex>
        <Flex sx={{ gap: '1' }}>
          <Text sx={{ fontWeight: 'bold' }}>Município:</Text>
          <Text sx={{}}>{cityName}</Text>
        </Flex>
        <Flex sx={{ gap: '1' }}>
          <Text sx={{ fontWeight: 'bold' }}>{currentVariable}:</Text>
          {polygonOption && (
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: polygonOption?.fillColor,
              }}
            />
          )}
          <Text>{value}</Text>
        </Flex>
        <Flex sx={{ gap: '1' }}>
          <Text sx={{ fontWeight: 'bold' }}>Número de pessoas:</Text>
          <Text>{numberOfPeople}</Text>
        </Flex>
      </Flex>
    );
  }, [
    currentVariable,
    numberOfPeoplePerCity,
    polygonsOptions,
    selectedCity?.label,
    selectedPolygonId,
  ]);

  const renderLegend = React.useMemo(() => {
    if (!variablePolygonsOptions) {
      return null;
    }

    return (
      <Flex
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          margin: '4',
          padding: '2',
          backgroundColor: 'white',
          flexDirection: 'column',
          gap: '2',
          borderRadius: 'default',
        }}
      >
        <Text sx={{ fontWeight: 'bold', fontSize: 'md' }}>Legenda</Text>
        {Object.entries(variablePolygonsOptions.captions).map(
          ([key, value]) => {
            return (
              <Flex key={key} sx={{ gap: '1', fontSize: 'sm' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: value.fillColor,
                  }}
                />
                <Text>{value.name}</Text>
              </Flex>
            );
          }
        )}
      </Flex>
    );
  }, [variablePolygonsOptions]);

  return (
    <Stack sx={{ gap: '4', alignItems: 'flex-start', width: '100%' }}>
      <Heading as="h1">Tipo de renda: {incomeType}</Heading>
      <Flex sx={{ gap: '2' }}>
        <Link href="/inct-combate-a-fome-sp/multimapas">Multimapas</Link>
        <Text>{'>'}</Text>
        <Text>{incomeType}</Text>
      </Flex>
      <Flex sx={{ gap: '2', flexDirection: ['column', 'row'] }}>
        <Stack sx={{ width: '350px' }}>
          <Label htmlFor="select-variable">Selecione a variável</Label>
          <Select
            id="select-variable"
            options={variableOptions}
            value={currentVariable}
            onChange={onSelectVariable}
          />
        </Stack>
        <Stack sx={{ width: '350px' }}>
          <Label htmlFor="select-city">Selecione o município</Label>
          <Select
            id="select-variable"
            options={citiesOptions}
            value={selectedPolygonId}
            onChange={(value) => {
              if (value) {
                return setSelectedPolygonId(value as string);
              }
            }}
          />
        </Stack>
      </Flex>
      {isLoadingPolygons && <LoadingMessage>Carregando mapa...</LoadingMessage>}
      <Flex
        sx={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 100px)',
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
        {renderCityDetails}
        {renderLegend}
      </Flex>
    </Stack>
  );
};

export default IncomeTypePage;
