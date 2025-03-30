# Simple4Decision

# Node.js Version Management and Package Installation

## About

- We use [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) to manage multiple versions of Node.js efficiently.
- [PNPM](https://pnpm.io/) is our package manager of choice for its speed and efficiency in managing dependencies.
- Docker is used to containerize the application and manage dependencies consistently across environments.

## Installation

### Install NVM

To install NVM, follow these steps:

1. Download and install NVM using the following command:
   ```sh
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
   ```
2. Restart your terminal or run:
   ```sh
   source ~/.nvm/nvm.sh
   ```
3. Verify installation:
   ```sh
   nvm --version
   ```

### Install a Specific Node.js Version

To install and use a specific version of Node.js:

1. Install a specific Node.js version:
   ```sh
   nvm install <version>
   ```
   Example:
   ```sh
   nvm install 18.17.1
   ```
2. Use the installed version:
   ```sh
   nvm use <version>
   ```
   Example:
   ```sh
   nvm use 18.17.1
   ```
3. Set a default Node.js version:
   ```sh
   nvm alias default <version>
   ```

### Install PNPM

To install PNPM globally:

```sh
npm install -g pnpm
```

Verify installation:

```sh
pnpm --version
```

### Install Dependencies

To install project dependencies using PNPM:

```sh
pnpm install
```
