import { Flex, Global, Stack, Text } from '@ttoss/ui';
import type * as React from 'react';

export const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Stack sx={{ width: 'full' }}>
      {/*
       * This Global rule restores the expected heading sizes and weights.
       */}
      <Global
        styles={{
          h1: { fontSize: '2rem', fontWeight: 'bold' },
          h2: { fontSize: '1.5rem', fontWeight: 'bold' },
        }}
      />
      <Flex
        as="header"
        sx={{
          backgroundColor: 'display.background.primary.active',
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
          backgroundColor: 'display.background.primary.active',
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
