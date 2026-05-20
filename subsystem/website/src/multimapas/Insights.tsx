import { useQuery } from '@tanstack/react-query';
import { Button, Flex, Heading, Image, Stack, Text } from '@ttoss/ui';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { type Project } from './projects';

type InsightsProps = {
  project: Project;
  selectorValues: { tabName: string };
  setLocationCode: (locationCode: string) => void;
};

export const Insights = (props: InsightsProps) => {
  // check if URL has query alexandre-ai=true
  const searchParams = useSearchParams();

  const isAlexandreAiEnabled =
    searchParams.get('alexandre-ai') === 'true' && props.project.ai;

  const showPrompt = searchParams.get('show-prompt') === 'true';

  const wasLocationCodeSet = React.useRef(false);

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

    if (wasLocationCodeSet.current) {
      return;
    }

    if (isFetching) {
      return;
    }

    setLocationCode(data.locationCode);
    wasLocationCodeSet.current = true;
  }, [data?.locationCode, setLocationCode, isFetching]);

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
              wasLocationCodeSet.current = false;
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
