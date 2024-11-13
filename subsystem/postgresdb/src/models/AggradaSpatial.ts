import { AggradaObservation } from './AggradaObservation';
import {
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from '@ttoss/postgresdb';
import { CoreFile } from './CoreFile';
import { Geometry } from 'geojson';
import { mapper } from '../../../aggrada-core/src';

// Dynamically extract the enum keys
const adminLevels = [...Object.keys(mapper.adminLevelMap), 'unknown'];
const sridValues = [...Object.keys(mapper.sridMap), 'unknown'];

@Table({
  indexes: [
    {
      fields: ['geometry'],
      using: 'GIST',
      name: 'aggrada_spatials_geometry_gist',
    },
  ],
})
export class AggradaSpatial extends Model {
  // Optional: unique code like ISO, FIPS, or other administrative codes
  @Column({
    type: DataType.STRING,
  })
  geo_code?: string;

  // Data source like IBGE, FIPS, NASA, NOAA, USER PROVIDED
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  source: string;

  // Optional: The date when this spatial data became valid
  @Column({
    type: DataType.DATE,
  })
  start_date?: Date;

  // Optional: Stores additional relevant informantion of the spatial data, for example: adicional references, names or codes
  @Column({
    type: DataType.JSONB,
  })
  properties?: Record<string, string | number | boolean | null>;

  @Column({
    type: DataType.ENUM(...adminLevels),
    allowNull: false,
  })
  admin_level: keyof typeof mapper.adminLevelMap | 'unknown';

  // Stores geospatial data as either POINT, POLYGON or MULTI POLYGON
  @Column({
    type: DataType.GEOMETRY('GEOMETRY'),
    allowNull: false,
  })
  raw_geometry: Geometry;

  // Specifies the spatial reference identifier
  @Column({
    type: DataType.ENUM(...sridValues),
    allowNull: false,
  })
  raw_srid: keyof typeof mapper.sridMap | 'unknown';

  // Stores geospatial data as either POINT, POLYGON or MULTI POLYGON
  @Column({
    type: DataType.GEOMETRY('GEOMETRY', 4326),
    allowNull: false,
  })
  geometry: Geometry;

  @ForeignKey(() => {
    return CoreFile;
  })
  @Column({
    type: DataType.INTEGER,
  })
  core_files_id?: number;

  /**
   * References
   */
  @HasMany(() => {
    return AggradaObservation;
  })
  aggrada_observations?: AggradaObservation[];
}
