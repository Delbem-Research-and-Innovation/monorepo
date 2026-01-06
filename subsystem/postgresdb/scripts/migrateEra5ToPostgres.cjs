const fs = require('fs');

// Onde coloquei 'saida.geojson', deve-se colocar o arquivo de temperatura da superficie (que tambem eh conhecido em meteorologia com T2M ou T2, que indica que é a temperatua a dois metros do solo para qualquer relevo) gerado pelo script python responsavel por transformar os dados NC do ERA5 para GeoJSON.

async function gerarSQL() {
  try {
    const geojsonPath = './d2m.geojson';
    const outputSqlPath = './importacao_era5.sql';

    if (!fs.existsSync(geojsonPath)) {
      console.error(`arquivo ${geojsonPath} nao encontrado.`);
      return;
    }

    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    const total = geojson.features.length;
    console.log(`SQL para ${total} pontos...`);

    fs.writeFileSync(outputSqlPath, '-- script de Importacao ERA5\nBEGIN;\n\n');

    for (let i = 0; i < total; i++) {
      const feature = geojson.features[i];
      const geomStr = JSON.stringify(feature.geometry);
      const propsStr = JSON.stringify(feature.properties);
      
      const dataIso = new Date().toISOString();
      const range = `[${dataIso}, ${dataIso}]`;

      let sql = `
-- registro ${i + 1}
INSERT INTO "AggradaSpatial" (source, admin_level, raw_srid, geometry, raw_geometry, "createdAt", "updatedAt") 
VALUES ('ERA5', 'unknown', '4326', ST_GeomFromGeoJSON('${geomStr}'), ST_GeomFromGeoJSON('${geomStr}'), NOW(), NOW());

INSERT INTO "AggradaObservation" (aggrada_spatials_id, data, temporal_range, temporal_range_tz, "createdAt", "updatedAt") 
VALUES (currval(pg_get_serial_sequence('"AggradaSpatial"', 'id')), '${propsStr}', '${range}', '${range}', NOW(), NOW());
`;

      fs.appendFileSync(outputSqlPath, sql);

      if ((i + 1) % 100000 === 0) {
        console.log(`gerados: ${i + 1} / ${total}...`);
      }
    }

    fs.appendFileSync(outputSqlPath, '\nCOMMIT;');
    console.log(`\n arquivo gerado em: ${outputSqlPath}`);

  } catch (err) {
    console.error('erro ao gerar o SQL:', err.message);
  }
}

gerarSQL();
