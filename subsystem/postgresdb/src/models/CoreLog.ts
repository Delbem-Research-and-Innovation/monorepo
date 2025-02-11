import { Column, DataType, ForeignKey, Model, Table } from '@ttoss/postgresdb';

import { CoreUser } from './CoreUser';

const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'TRACE'] as const;

@Table
export class CoreLog extends Model {
  @Column({
    type: DataType.ENUM(...logLevels),
    allowNull: false,
  })
  type: (typeof logLevels)[number];

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  message: string;

  @Column({
    type: DataType.STRING,
  })
  source: string;

  @Column({
    type: DataType.JSONB,
  })
  context: object;

  @ForeignKey(() => {
    return CoreUser;
  })
  @Column({
    type: DataType.INTEGER,
  })
  core_users_id: number;

  @ForeignKey(() => {
    return CoreLog;
  })
  @Column({
    type: DataType.INTEGER,
  })
  related_core_logs_id: number;
}
