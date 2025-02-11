# Website Polygons

This is a temporary solution to creating polygons for Multimapas module. This package should be removed in the future.

## How to use

1. Add cities kmls to `kmls/cities` folder. You can download kmls [here](https://cms.triangulos.tech/admin/plugins/upload?sort=name:ASC&page=1&pageSize=50&folder=100&folderPath=/17).
1. Run `pnpm run generate-polys` to generate polygons.
1. Copy the generated polygons (`src/polygons.json`) to `subsystem/website/public/polygons.json`.
