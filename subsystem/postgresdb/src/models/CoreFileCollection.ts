import { Column, DataType, HasMany, Model, Table } from '@ttoss/postgresdb';

import { CoreFile } from './CoreFile';
import { CoreFileCollectionUser } from './CoreFileCollectionUser';

@Table
export class CoreFileCollection extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.ENUM('PUBLIC', 'PRIVATE'),
    allowNull: false,
    defaultValue: 'PRIVATE',
  })
  privacy: 'PUBLIC' | 'PRIVATE';

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_raw: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_Spatial: boolean;

  @Column({
    type: DataType.TEXT,
  })
  description?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
  })
  tags?: string[];

  /**
   * References
   */
  @HasMany(() => {
    return CoreFile;
  })
  core_files!: CoreFile[];

  @HasMany(() => {
    return CoreFileCollectionUser;
  })
  core_file_collection_users!: CoreFileCollectionUser[];
}
