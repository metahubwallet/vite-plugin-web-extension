import { OutputChunk } from "rollup";
import { getOutputFileName } from "./file";

export function getScriptHtmlLoaderFile(name: string, scriptSrcs: string[]) {
  const scriptsHtml = scriptSrcs
    .map((scriptSrc) => {
      return `<script type="module" src="${scriptSrc}"></script>`;
    })
    .join("");

  return {
    fileName: `${name}.html`,
    source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scriptsHtml}</head></html>`,
  };
}

export function getScriptLoaderFile(
  scriptFileName: string,
  inputFileNames: string[],
  isInject = false
): {
  fileName: string;
  source: string;
} {
  const outputFile = getOutputFileName(scriptFileName);

  const importStatements = inputFileNames
    .filter((fileName) => Boolean(fileName))
    .map((fileName) => {
      if (isInject) {
        return `"${"../".repeat(outputFile.split("/").length - 1) + fileName}"`;
      } else {
        return fileName.startsWith("http")
          ? `"${fileName}"`
          : `chrome.runtime.getURL("${fileName}")`;
      }
    })
    .map((importPath) =>
      isInject ? `import ${importPath}` : `await import(${importPath})`
    )
    .join(";");

  return {
    fileName: `${outputFile}.js`,
    source: isInject ? importStatements : `(async()=>{${importStatements}})();`,
  };
}

export function getServiceWorkerLoaderFile(inputFileNames: string[]) {
  const importStatements = inputFileNames
    .filter((fileName) => Boolean(fileName))
    .map((fileName) => {
      return fileName.startsWith("http") ? fileName : `/${fileName}`;
    })
    .map((importPath) => `import "${importPath}";`)
    .join("\n");

  return {
    fileName: `serviceWorker.js`,
    source: importStatements,
  };
}

export function getScriptLoaderForOutputChunk(
  contentScriptFileName: string,
  chunk: OutputChunk,
  isInject = false
): { fileName: string; source: string } | null {
  if (!chunk.imports.length && !chunk.dynamicImports.length) {
    return null;
  }
  return getScriptLoaderFile(contentScriptFileName, [chunk.fileName], isInject);
}
