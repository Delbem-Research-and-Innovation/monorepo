# simple4decision Website

## Production

- Create a `.env` file with the following content:

  ```
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
  OPENAI_API_KEY=
  ```

  - Talk to project manager to get the keys.

- Create Google credentials file `google-credentials.json`. This file is used to access Google Sheets API.

- Build the image by running `pnpm run build:website-image` on root.

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
