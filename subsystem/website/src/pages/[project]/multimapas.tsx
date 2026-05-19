import { useQuery } from '@tanstack/react-query';
import { Flex, Grid, Heading, Label, Select, Stack, Text } from '@ttoss/ui';
import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from 'next';
import * as React from 'react';
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import { Insights } from 'src/multimapas/Insights';
import {
  getProjectByName,
  listAllProjects,
  type Project,
} from 'src/multimapas/projects';
import { SyncCameraProvider } from 'src/multimapas/SyncCameraProvider';

const SELECTORS_BREAKPOINT = '768px';
const SELECTORS_MQ = `@media screen and (min-width: ${SELECTORS_BREAKPOINT})`;

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

  try {
    const projectName = params.project as string;

    const project = await getProjectByName(projectName);

    if (!project || project.regions.length === 0) {
      return { notFound: true };
    }

    return { props: { project }, revalidate: 3600 };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching project:', error);
    return { notFound: true };
  }
};

type Props = InferGetStaticPropsType<typeof getStaticProps>;

type SelectorValues = {
  tabName: string;
  locationCode?: string;
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
        padding: '4',
        gap: '4',
        [SELECTORS_MQ]: {
          padding: '6',
          gap: '6',
        },
      }}
    >
      <Heading as="h2">Selecione as variáveis</Heading>
      <Flex
        sx={{
          // gap shrinks from 1.5rem down to 1rem minimum as the container narrows;
          // items compress via flex-shrink instead of wrapping to a new row.
          // Below 768px the row can't fit the minimum item widths
          // (200+200+140+2×16=572px), so we switch to a stacked column layout.
          gap: 'clamp(1rem, 2vw, 1.5rem)',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          width: '100%',

          [SELECTORS_MQ]: {
            flexDirection: 'row',
          },
        }}
      >
        <Stack
          sx={{
            minWidth: 0,
            flex: '0 0 auto',
            width: '100%',
            gap: 1,
            [SELECTORS_MQ]: {
              minWidth: '200px',
              flex: '1 1 220px',
              maxWidth: '300px',
            },
          }}
        >
          <Label htmlFor="select-region">Tipo de Regionalização</Label>
          <Select
            id="select-region"
            inputId="select-region"
            instanceId="select-region"
            options={tabsOptions}
            value={props.value.tabName}
            onChange={(value) => {
              if (value) {
                props.onChange({
                  tabName: value as string,
                });
              }
            }}
            sx={{ width: '100%' }}
          />
        </Stack>
        <Stack
          sx={{
            minWidth: 0,
            flex: '0 0 auto',
            width: '100%',
            gap: 1,
            [SELECTORS_MQ]: {
              minWidth: '220px',
              flex: '2 1 300px',
              maxWidth: '300px',
            },
          }}
        >
          <Label htmlFor="select-location">Selecione a Localidade</Label>
          <Select
            id="select-location"
            inputId="select-location"
            instanceId="select-location"
            options={itemsOptions}
            value={props.value.locationCode || ''}
            onChange={(value) => {
              props.onChange({
                ...props.value,
                locationCode: (value as string) || '',
              });
            }}
            sx={{ width: '100%' }}
          />
        </Stack>
      </Flex>
    </Stack>
  );
};

const Page = (props: Props) => {
  const [selectorValues, setSelectorValues] = React.useState<SelectorValues>({
    tabName: props.project.regions[0]?.name ?? '',
  });

  const setLocationCode = React.useCallback((locationCode: string) => {
    setSelectorValues((prev) => {
      return { ...prev, locationCode };
    });
  }, []);

  const region = props.project.regions.find((region) => {
    return region.name === selectorValues.tabName;
  });

  const geoJsonUrl = region?.mapConfig.geoJsonUrl;

  /**
   * Pre-fetch the GeoJSON for the active region once and share the result
   * across all maps. staleTime: Infinity means it is never re-fetched within
   * the same browser session (the same GeoJSON file is reused for all 5
   * variables). Maps are only rendered after data is available so MapLibre
   * uses the inline object instead of issuing N individual URL fetches.
   */
  const { data: geoJsonData, isLoading: isGeoJsonLoading } = useQuery({
    queryKey: ['geojson', geoJsonUrl],
    queryFn: async () => {
      const res = await fetch(geoJsonUrl as string);
      if (!res.ok) {
        throw new Error(`Failed to fetch GeoJSON: ${res.status}`);
      }
      return res.json();
    },
    staleTime: Infinity,
    enabled: typeof geoJsonUrl === 'string' && geoJsonUrl.startsWith('http'),
  });

  return (
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
        <SyncCameraProvider>
          {isGeoJsonLoading ? (
            <Flex
              sx={{
                minHeight: '400px',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text>Carregando dados do mapa...</Text>
            </Flex>
          ) : (
            <Grid
              sx={{
                width: '100%',
                // max(440px, calc(50% - 12px)) as the column minimum:
                //   • 50% - 12px (half-container minus half-gap) caps at 2 columns on any width
                //   • when 50% - 12px < 440px (container < 904px), min rises to 440px so
                //     only 1 column fits, which then stretches to 1fr (full width)
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(max(440px, calc(50% - 12px)), 1fr))',
                gap: '6',
              }}
            >
              {region.variables.map((variable) => {
                return (
                  <GeoVisMapWrapper
                    key={variable.name}
                    region={region}
                    variable={variable}
                    selectedLocationCode={selectorValues.locationCode}
                    setLocationCode={setLocationCode}
                    geoJsonData={geoJsonData}
                  />
                );
              })}
            </Grid>
          )}
        </SyncCameraProvider>
      )}
    </Stack>
  );
};

export default Page;
