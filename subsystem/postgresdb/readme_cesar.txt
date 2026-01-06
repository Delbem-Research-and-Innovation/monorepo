############ ATIVIDADES INICIAIS MONOREPO ############

############ BAIXAR DADOS ############

Criar Token:

Usar um Personal Access Token (PAT)
Esta é a solução mais rápida para continuar usando HTTPS.
Acesse o GitHub pelo navegador.
Vá em Settings > Developer Settings > Personal Access Tokens > Tokens (classic).
Clique em Generate new token (classic).
Dê um nome ao token e selecione a permissão repo.
Copie o token gerado. Você não conseguirá vê-lo novamente depois de fechar a página.
No terminal, tente o git clone de novo. Quando pedir o Password, cole o Token no lugar da senha.

git clone https://github.com/Delbem-Research-and-Innovation/monorepo.git

############ INSTALANDO PACOTES ############

sudo apt update
sudo apt install nodejs npm -y
sudo npm install -g pnpm
sudo apt install docker.io -y
sudo systemctl enable --now docker

############ CONFIGURANDO O BANCO DE DADOS ############

cd monorepo/subsystem/postgresdb

Criar arquivo de ambiente

sudo docker compose -f docker-compose.dev.yml up -d
sudo docker ps (ver se o container esta ativo)

############ PROCESSAMENTO DE DADOS ERA5 ############

Criar as tabelas manualmente no banco de dados (Spatials e Observations): 
sudo docker exec -it simple4decision-db psql -U postgres -d postgres -c "CREATE TABLE IF NOT EXISTS "AggradaSpatial" (id SERIAL PRIMARY KEY, source TEXT NOT NULL, admin_level TEXT NOT NULL, raw_srid TEXT NOT NULL, geometry GEOMETRY(GEOMETRY, 4326) NOT NULL, raw_geometry GEOMETRY(GEOMETRY) NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL); CREATE TABLE IF NOT EXISTS "AggradaObservation" (id SERIAL PRIMARY KEY, aggrada_spatials_id INTEGER REFERENCES "AggradaSpatial"(id) NOT NULL, data JSONB NOT NULL, temporal_range TSRANGE NOT NULL, temporal_range_tz TSRANGE NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL);"

node scripts/migrateEra5ToPostgres.cjs

############ VALIDAÇÃO NO DBEAVER ############

Procedendo...
