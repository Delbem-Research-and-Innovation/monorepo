import xarray as xr
import os
from datetime import datetime
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NC_FILE = os.path.join(BASE_DIR, '../samples/t2_global.nc')
OUTPUT_SQL = os.path.join(BASE_DIR, '../import_era5.sql')

def run_ingestion():
    try:
        print(f"lendo: {NC_FILE}")
        ds = xr.open_dataset(NC_FILE)
        
        df = ds.to_dataframe().reset_index()
        total_points = len(df)
        print(f"total de pontos: {total_points}")

        now = datetime.now().isoformat()

        with open(OUTPUT_SQL, 'w') as f:
            f.write("BEGIN;\n")
            
            for index, row in df.iterrows():
                geom = {
                    "type": "Point",
                    "coordinates": [float(row['longitude']), float(row['latitude'])]
                }
                geom_json = json.dumps(geom)
                
                obs_data = json.dumps({"t2m": float(row['d2m'])})
                
                f.write(f"""
INSERT INTO "AggradaSpatial" (source, admin_level, raw_srid, geometry, raw_geometry, "createdAt", "updatedAt")
VALUES ('ERA5', '0', '4326', ST_GeomFromGeoJSON('{geom_json}'), ST_GeomFromGeoJSON('{geom_json}'), '{now}', '{now}');
""")

                f.write(f"""
INSERT INTO "AggradaObservation" (aggrada_spatials_id, data, temporal_range, temporal_range_tz, "createdAt", "updatedAt")
VALUES (currval(pg_get_serial_sequence('"AggradaSpatial"', 'id')), '{obs_data}', '[{now}, {now}]', '[{now}, {now}]', '{now}', '{now}');
""")

                if index % 10000 == 0:
                    print(f"processado: {index}/{total_points}...")

            f.write("COMMIT;")
        
        print(f"arquivo gerado em: {OUTPUT_SQL}")

    except Exception as e:
        print(f"erro: {e}")

if __name__ == "__main__":
    run_ingestion()
