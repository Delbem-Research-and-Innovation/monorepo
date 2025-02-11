# simple4decision Website

## Development

- Do the steps in the [website-polygons README](../website-polygons/README.md) package.
- Download the CSVs files from [Google Drive](https://drive.google.com/drive/u/0/folders/1hVQLEPSKASt9kR8ghpdXkZhkPhgiGbXb) and put them in the `temp_csvs/outcomes` folder.
  - The CSVs will be listed in the website.

## Production

- Do the steps in the [website-polygons README](../website-polygons/README.md) package if you haven't already.
  - If you already have the `polygons.json` file in the `subsystem/website/public` folder, you can skip this step.
- Create a `.env` file with the following content:
  ```
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
  ```
- Download [São Paulo_P.csv](https://drive.google.com/file/d/18U3QXle4ZSejdza_ZsbYcNDKdAtVbHZx/view?usp=sharing) and save it on the `temp_csvs/helpers` folder.
- Go to monorepo root and run `pnpm run build:website-image`.
- Turn on VPN `clic4aiL`.
- Push the image by running `docker push registry.simple4decision.com/website`.
  - If you have problems with HTTPs, you can use follow the steps in the [Test an insecure registry](https://distribution.github.io/distribution/about/insecure/) and create a `/etc/docker/daemon.json` file with the following content:
    ```
    {
      "insecure-registries" : ["registry.simple4decision.com"]
    }
    ```
    - Then, restart the Docker service by running `sudo systemctl restart docker`.
- SSH Campari server `ssh pedro.arantes@10.4.0.21`.
- Go to the `simple4decision/website` folder by running `cd /etc/simple4decision/website`.
- Run `docker compose up -d`.
