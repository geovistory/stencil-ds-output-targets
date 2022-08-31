# @stencil/happy-dom-output-target

Stencil can generate a HappyDOM rendering function for your web components. This allows your Stencil components to be server side rendered in a node application. 

## Installation

```bash
npm install @geovistory/happy-dom-output-target
```

## Usage

In your `stencil.config.ts` add the following configuration to the `outputTargets` section:

```ts
import { Config } from '@stencil/core';
import { happyDomOutputTarget } from '@stencil/geovistory-dom-output-target';

export const config: Config = {
  namespace: 'demo',
  outputTargets: [
    happyDomOutputTarget({
      loaderPath: 'my-webcomponents/loader'
    }),
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
  ],
};
```

## Config Options

| Property                      | Description                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loaderPath`        | The NPM package name of your Stencil component library loader path. This package is used as a dependency for your HappyDOM wrappers.                                                                                                                                                                                                            |
| `outputPath`        | The file path to put the resulting file to.                                                                                                                                                                                                            |
| `baseURI`        | The the base URI set on HappyDOM document.                                                                                                                                                                                                            |