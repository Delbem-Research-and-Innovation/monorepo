import { initialize } from '@ttoss/postgresdb';
import { models } from '@simple4decision/postgresdb';

export const db = await initialize({
  models,
  define: {
    timestamps: true,
  },
});
