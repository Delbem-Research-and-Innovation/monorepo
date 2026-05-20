import 'maplibre-gl/dist/maplibre-gl.css';

import type { AppProps } from 'next/app';
import { RootLayout } from 'src/RootLayout';
import { RootProviders } from 'src/RootProviders';

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <RootProviders>
      <RootLayout>
        <Component {...pageProps} />
      </RootLayout>
    </RootProviders>
  );
};

export default App;
