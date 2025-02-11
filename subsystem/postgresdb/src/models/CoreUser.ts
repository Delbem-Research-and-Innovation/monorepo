import { Column, DataType, HasMany, Model, Table } from '@ttoss/postgresdb';

import { CoreFileCollectionUser } from './CoreFileCollectionUser';
import { CoreLog } from './CoreLog';

@Table
export class CoreUser extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password_hash: string;

  /**
   * References
   */
  @HasMany(() => {
    return CoreLog;
  })
  core_logs?: CoreLog[];

  @HasMany(() => {
    return CoreFileCollectionUser;
  })
  core_file_collection_users?: CoreFileCollectionUser[];
}
