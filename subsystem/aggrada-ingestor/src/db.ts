import { models } from '@simple4decision/postgresdb';
import { initialize } from '@ttoss/postgresdb';

export const db = await initialize({
  models,
  define: {
    timestamps: true,
  },
});
