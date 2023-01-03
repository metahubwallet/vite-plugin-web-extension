# @samrum/vite-plugin-web-extension

[![npm version](https://badge.fury.io/js/@samrum%2Fvite-plugin-web-extension.svg)](https://badge.fury.io/js/@samrum%2Fvite-plugin-web-extension)
[![ci](https://github.com/samrum/vite-plugin-web-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/samrum/vite-plugin-web-extension/actions/workflows/ci.yml)

> Generate cross browser platform, ES module based web extensions.

- Manifest V2 & V3 Support
- Completely ES module based extensions
  - Including in content scripts!
- Vite based html and static asset handling
  - Including in content scripts!
- HMR support
  - All Manifest entry points
    - Including content scripts when using a Chromium browser!
  - CSS styles in content scripts
    - Including shadow DOM rendered content!
  - Including Manifest V3 support since Chromium 110!

## Quick Start

Create a new Vite web extension project

```sh
npm init @samrum/vite-plugin-web-extension@latest
```

Supports choice of Manifest version, TypeScript support, and framework (Vanilla, Vue, React, Preact, Svelte).

Check the README of the generated extension for usage information.

## Usage

Requires Vite 3+

```sh
npm install @samrum/vite-plugin-web-extension
```

### Examples

<details>
  <summary>Manifest V2</summary>

vite.config.js:

```js
import { defineConfig } from "vite";
import webExtension from "@samrum/vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    webExtension({
      manifest: {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        manifest_version: 2,
        background: {
          scripts: ["src/background/script.js"],
        },
      },
    }),
  ],
});
```

</details>

<details>
  <summary>Manifest V3</summary>

vite.config.js:

```js
import { defineConfig } from "vite";
import webExtension from "@samrum/vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    webExtension({
      manifest: {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        manifest_version: 3,
        background: {
          service_worker: "src/background/serviceWorker.js",
        },
      },
    }),
  ],
});
```

</details>

<details>
  <summary>Firefox Experimental Manifest V3 </summary>
  There are two configurations an extension needs to make for experimental manifest V3 support:
  
  1. Background service workers are not supported, so you are required to use a background script.
  2. The `use_dynamic_url` property is not supported for web accessible resources. In the plugin options, set `useDynamicUrlContentScripts` to false:

      ```js
        webExtension({
          ...
          useDynamicUrlContentScripts: false,
        }),
      ```

</details>

<details>
  <summary>Devtools</summary>
  To add content to the browser dev tools, add `devtools_page` to your manifest

```js
devtools_page: "src/entries/devtools/index.html",
```

Place a script `devtools.js` in `public` dir.

```js
var _browser;
if (chrome) {
  _browser = chrome;
} else {
  _browser = browser;
}
_browser.devtools.panels.create(
  "My Panel", // title
  "images/icon-16.png", // icon
  "src/entries/devtools/index.html" // content
);
```

Then load the script from your devtools html which placed in `src/entries/devtools/index.html`.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Devtools</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
    <script src="/devtools.js"></script>
  </body>
</html>
```

</details>

### Options

manifest

- The [manifest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json) definition for your extension
- All manifest property file names should be relative to the root of the project.

useDynamicUrlContentScripts: boolean (optional)

- Adds the `use_dynamic_url` property to web accessible resources generated by the plugin
- Default: `true`

webAccessibleScripts: [rollup filter](https://github.com/rollup/plugins/tree/master/packages/pluginutils#createfilter) (optional)

- A filter that will be applied to `web_accessible_resources` entries in the provided manifest. When the filter matches a resource, it will be parsed by the plugin and treated as a content script. This can be useful to generate content scripts that will be manually injected at runtime.
- Default:
  ```js
  {
    include: /\.([cem]?js|ts)$/,
    exclude: "",
  }
  ```

### Content Scripts

- For HMR style support within shadow DOMs, use the `addStyleTarget` function to add the shadowRoot of your element as a style target:

  ```js
  if (import.meta.hot) {
    const { addViteStyleTarget } = await import(
      "@samrum/vite-plugin-web-extension/client"
    );

    await addViteStyleTarget(appContainer);
  }
  ```

- For builds, use the `import.meta.PLUGIN_WEB_EXT_CHUNK_CSS_PATHS` variable to reference an array of CSS asset paths associated with the current output chunk.

### TypeScript

In an [env.d.ts file](https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript), add the following type reference to define the plugin specific `import.meta` variables as well as plugin client functions:

```ts
/// <reference types="@samrum/vite-plugin-web-extension/client" />
```

### Browser Support

The following requirements must be met by the browser:

- Must support dynamic module imports made by web extension content scripts.
- Must support `import.meta.url`

A sample of supported browsers:

|          | Manifest V2 | Manifest V3                                                                            |
| -------- | ----------- | -------------------------------------------------------------------------------------- |
| Chromium | 64          | 91                                                                                     |
| Firefox  | 89          | N/A ([In development](https://blog.mozilla.org/addons/2021/05/27/manifest-v3-update/)) |

The plugin will automatically default vite's `build.target` config option to these minimum browser versions if not already defined by the user.

For dev mode support in Manifest V3, Chromium version must be at least 110.

## How it works

The plugin will take the provided manifest, generate rollup input scripts for supported manifest properties, then output an ES module based web extension.

This includes:

- Generating and using a dynamic import wrapper script in place of original content scripts. Then, moving the original scripts to `web_accessible_resources` so they are accessible by the wrapper script. Needed because content scripts are not able to be loaded directly as ES modules.
  - This may expose your extension to fingerprinting by other extensions or websites. Manifest V3 supports a [`use_dynamic_url` property](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/#:~:text=access%20the%20resources.-,use_dynamic_url,-If%20true%2C%20only) that will mitigate this. This option is set for manifest V3 web accessible resources generated by this plugin.
- Modifying Vite's static asset handling to maintain `import.meta.url` usages instead of rewriting to `self.location`. Needed so content script static asset handling can function correctly.
- Modifying Vite's HMR client to add support for targeting specific elements as style injection locations. Needed to support HMR styles in shadow DOM rendered content.

### Why this is a Vite specific plugin

The plugin relies on Vite to parse and handle html files in addition to relying on Vite's manifest generation in order to map generated files to the eventual extension manifest.

## Development

This project uses [pnpm](https://pnpm.io/) for package management.

### Lint

```sh
pnpm lint
```

### Tests

```sh
pnpm test
```

### Build

```sh
pnpm build
```
