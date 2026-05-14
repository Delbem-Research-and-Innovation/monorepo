import { useQuery } from '@tanstack/react-query';
import {
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
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import {
  getProjectByName,
  listAllProjects,
  type Project,
} from 'src/multimapas/projects';
import { SyncCameraProvider } from 'src/multimapas/SyncCameraProvider';

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

    if (!project) {
      return { notFound: true };
    }

    return { props: { project } };
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

  const setLocationCode = React.useCallback((locationCode: string) => {
    setSelectorValues((prev) => {
      return { ...prev, locationCode };
    });
  }, []);

  const region = props.project.regions.find((region) => {
    return region.name === selectorValues.tabName;
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
                <GeoVisMapWrapper
                  key={variable.name}
                  region={region}
                  variable={variable}
                  selectedLocationCode={selectorValues.locationCode}
                  setLocationCode={setLocationCode}
                />
              );
            })}
          </Grid>
        </SyncCameraProvider>
      )}
    </Stack>
  );
};

export default Page;
