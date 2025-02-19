import { GoogleMapsProvider } from '@ttoss/google-maps';
import { BruttalTheme } from '@ttoss/theme/Bruttal';
import { ThemeProvider } from '@ttoss/ui';
import Script from 'next/script';

export const RootProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <GoogleMapsProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}
      Script={Script}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loading={'' as any} // cannot use 'async' here else it stops after refreshing the page
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      libraries={['marker'] as any}
    >
      <ThemeProvider theme={BruttalTheme}>{children}</ThemeProvider>
    </GoogleMapsProvider>
  );
};
