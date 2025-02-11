import * as React from 'react';
import { Flex, Stack, Text } from '@ttoss/ui';

export const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Stack sx={{ width: 'full' }}>
      <Flex
        as="header"
        sx={{
          backgroundColor: 'display.background.primary.default',
          paddingX: '12',
          paddingY: '8',
          width: 'full',
        }}
      >
        <Text
          sx={{
            color: 'white',
            fontSize: '2xl',
          }}
        >
          simple4decision
        </Text>
      </Flex>
      <Flex
        as="main"
        sx={{
          paddingX: '12',
          paddingY: '12',
          width: 'full',
        }}
      >
        {children}
      </Flex>
      <Flex
        as="footer"
        sx={{
          backgroundColor: 'display.background.primary.default',
          paddingX: '12',
          paddingY: '8',
          color: 'white',
          justifyContent: 'center',
          width: 'full',
        }}
      >
        simple4decision © {new Date().getFullYear()} - All rights reserved
      </Flex>
    </Stack>
  );
};
