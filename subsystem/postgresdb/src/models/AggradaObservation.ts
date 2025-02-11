import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from '@ttoss/postgresdb';

import { AggradaSpatial } from './AggradaSpatial';
import { CoreFile } from './CoreFile';

@Table({
  indexes: [
    {
      fields: ['temporal_range_tz'],
      using: 'GIST',
      name: 'aggrada_observations_temporal_range_tz_gist',
    },
    {
      fields: ['temporal_range'],
      using: 'GIST',
      name: 'aggrada_observations_temporal_range_gist',
    },
  ],
})
export class AggradaObservation extends Model {
  @ForeignKey(() => {
    return AggradaSpatial;
  })
  @Column({
    type: DataType.INTEGER,
    allowNull: false, // Every observation must be tied to spatial data
  })
  aggrada_spatials_id: number;

  @BelongsTo(() => {
    return AggradaSpatial;
  })
  aggrada_spatials: AggradaSpatial;

  @Column({
    type: DataType.RANGE(DataType.DATE),
    allowNull: false,
  })
  temporal_range_tz: Date[];

  @Column({
    type: DataType.RANGE(DataType.DATE),
    allowNull: false,
  })
  temporal_range: Date[];

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  data: object; // Stores observation data

  @ForeignKey(() => {
    return CoreFile;
  })
  @Column({
    type: DataType.INTEGER,
    // allowNull: false,
  })
  core_files_id: number;

  // @BelongsTo(() => {
  //   return CoreFile;
  // })
  // core_files: CoreFile;
}
