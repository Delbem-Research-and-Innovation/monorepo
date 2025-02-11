import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from '@ttoss/postgresdb';

import { CoreFileCollection } from './CoreFileCollection';
import { CoreUser } from './CoreUser';

const permissionLevels = ['READ', 'ADMIN', 'OWNER'] as const;

@Table
export class CoreFileCollectionUser extends Model {
  @ForeignKey(() => {
    return CoreUser;
  })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  core_users_id: number;

  @BelongsTo(() => {
    return CoreUser;
  })
  core_users?: CoreUser;

  @ForeignKey(() => {
    return CoreFileCollection;
  })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  core_file_collections_id: number;

  @BelongsTo(() => {
    return CoreFileCollection;
  })
  core_file_collections?: CoreFileCollection;

  @Column({
    type: DataType.ENUM(...permissionLevels),
    allowNull: false,
  })
  permission_level: (typeof permissionLevels)[number];
}
