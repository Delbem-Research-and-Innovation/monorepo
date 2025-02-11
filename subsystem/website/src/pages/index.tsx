import * as React from 'react';
import { useRouter } from 'next/router';

const Page = () => {
  const router = useRouter();

  React.useEffect(() => {
    router.push('/inct-combate-a-fome-sp/multimapas');
  }, [router]);

  return null;
};

export default Page;
