import { Heading, Stack } from '@ttoss/ui';
import { InferGetStaticPropsType } from 'next';
import { getAllIncomeTypes } from 'src/inct/getAllIncomeTypes';
import Link from 'next/link';

export const getStaticProps = async () => {
  const incomeTypes = await getAllIncomeTypes();
  return { props: { incomeTypes } };
};

type Props = InferGetStaticPropsType<typeof getStaticProps>;

const IncomeList = ({ incomeTypes }: Props) => {
  return (
    <Stack sx={{ gap: '8' }}>
      <Heading as="h2">Tipos de renda</Heading>
      <Stack sx={{ gap: '2' }}>
        <Link href="/inct-combate-a-fome-sp/multimapas/fronteira-de-pareto">
          Fronteira de Pareto
        </Link>
        {incomeTypes.map((incomeType) => {
          const href = `/inct-combate-a-fome-sp/multimapas/${incomeType.slug}`;
          return (
            <Link key={href} href={href}>
              {incomeType.slug}
            </Link>
          );
        })}
      </Stack>
    </Stack>
  );
};

const ProjectMultimapasPage = ({ incomeTypes }: Props) => {
  return (
    <Stack sx={{ gap: '10' }}>
      <Heading as="h1">INCT - Combate à Fome SP - Multimapas</Heading>
      <IncomeList incomeTypes={incomeTypes} />
    </Stack>
  );
};

export default ProjectMultimapasPage;
