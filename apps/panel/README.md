# Babybox Panel

This is a repository for the frontend web application that serves as the primary monitoring tool for an individual [Babybox](httt://www.babybox.cz).

It is built for 24/7 uncontrolled monitoring with many fallbacks and alarms for the hospital staff.

## Development

### IDE

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.vscode-typescript-vue-plugin).

### Used technologies

Main technologies:

- Vue 3
- Vite
- Vue router
- Pinia
- pnpm

Other libraries:

- Stylus
- Howler
- Moment.js
- Lodash

## Commands

### Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

In order to run this website you need to have [pnpm](https://pnpm.io/). It is recommended to also install [Node.js](https://nodejs.org/en/) (LTS version) - this will also install `npm`, so you can then install _pnpm_ by simply running `npm install -g pnpm`.

To run this in production you also need a way to serve the files. The easiest way to do this is by using _serve_. You can install _serve_ by running `pnpm i -g serve`.

### Install all the dependecies

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run the code in production

After build the code for production, a `dist` folder will appear. You can do:

```sh
serve dist
```

This will serve the files from the dist folder on `http://localhost:PORT`

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
