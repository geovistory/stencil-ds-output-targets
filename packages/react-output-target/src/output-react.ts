import path from 'path';
import type { OutputTargetReact, PackageJSON } from './types';
import { dashToPascalCase, normalizePath, readPackageJson, relativeImport, sortBy } from './utils';
import type {
  CompilerCtx,
  ComponentCompilerMeta,
  Config,
  CopyResults,
  OutputTargetDist,
} from '@stencil/core/internal';

/**
 * Generate and write the Stencil-React bindings to disc
 * @param config the Stencil configuration associated with the project
 * @param compilerCtx the compiler context of the current Stencil build
 * @param outputTarget the output target configuration for generating the React wrapper
 * @param components the components to generate the bindings for
 */
export async function reactProxyOutput(
  config: Config,
  compilerCtx: CompilerCtx,
  outputTarget: OutputTargetReact,
  components: ReadonlyArray<ComponentCompilerMeta>,
): Promise<void> {
  const filteredComponents = getFilteredComponents(outputTarget.excludeComponents, components);
  const rootDir = config.rootDir as string;
  const pkgData = await readPackageJson(rootDir);

  if (outputTarget.individualComponentFiles) {
    // create one file per component
    for (const cmp of filteredComponents) {
      const finalText = generateProxies(config, [cmp], pkgData, outputTarget, rootDir);
      const file = path.join(outputTarget.individualComponentFilesDir ?? '', `${cmp.tagName}.ts`)
      await compilerCtx.fs.writeFile(file, finalText);
    }
  }
  else {
    // create one file for all components
    const finalText = generateProxies(config, filteredComponents, pkgData, outputTarget, rootDir);
    await compilerCtx.fs.writeFile(outputTarget.proxiesFile, finalText);
  }
  await copyResources(config, outputTarget);
}

/**
 * Removes all components from the provided `cmps` list that exist in the provided `excludedComponents` list
 * @param excludeComponents the list of components that should be removed from the provided `cmps` list
 * @param cmps a list of components
 * @returns the filtered list of components
 */
function getFilteredComponents(excludeComponents: ReadonlyArray<string> = [], cmps: readonly ComponentCompilerMeta[]): ReadonlyArray<ComponentCompilerMeta> {
  return sortBy(cmps, (cmp) => cmp.tagName).filter(
    (c) => !excludeComponents.includes(c.tagName) && !c.internal,
  );
}

/**
 * Generate the code that will be responsible for creating the Stencil-React bindings
 * @param config the Stencil configuration associated with the project
 * @param components the Stencil components to generate wrappers for
 * @param pkgData `package.json` data for the Stencil project
 * @param outputTarget the output target configuration used to generate the Stencil-React bindings
 * @param rootDir the directory of the Stencil project
 * @returns the generated code to create the Stencil-React bindings
 */
export function generateProxies(
  config: Config,
  components: ReadonlyArray<ComponentCompilerMeta>,
  pkgData: PackageJSON,
  outputTarget: OutputTargetReact,
  rootDir: string,
): string {
  const distTypesDir = path.dirname(pkgData.types);
  const dtsFilePath = path.join(rootDir, distTypesDir, GENERATED_DTS);
  const componentsTypeFile = relativeImport(outputTarget.proxiesFile, dtsFilePath, '.d.ts');
  const pathToCorePackageLoader = getPathToCorePackageLoader(config, outputTarget);

  const imports = `/* eslint-disable */
/* tslint:disable */
/* auto-generated react proxies */
import { createReactComponent } from './react-component-lib';\n`;

  /**
   * Generate JSX import type from correct location.
   * When using custom elements build, we need to import from
   * either the "components" directory or customElementsDir
   * otherwise we risk bundlers pulling in lazy loaded imports.
   */
  const generateTypeImports = () => {
    if (outputTarget.componentCorePackage !== undefined) {
      const dirPath = outputTarget.includeImportCustomElements ? `/${outputTarget.customElementsDir || 'components'}` : '';
      return `import type { ${IMPORT_TYPES} } from '${normalizePath(outputTarget.componentCorePackage)}${dirPath}';\n`;
    }

    return `import type { ${IMPORT_TYPES} } from '${normalizePath(componentsTypeFile)}';\n`;
  }

  const typeImports = generateTypeImports();

  let sourceImports = '';
  let registerCustomElements = '';
  let registerIndividualCustomElements = '';



  /**
   * Create imports from core package loader (by default from my-web-components/loader)
   */
  if (!outputTarget.includeImportCustomElements && !outputTarget.individualComponentFiles) {

    if (outputTarget.includePolyfills && outputTarget.includeDefineCustomElements) {
      sourceImports = `import { ${APPLY_POLYFILLS}, ${REGISTER_CUSTOM_ELEMENTS} } from '${pathToCorePackageLoader}';\n`;
      registerCustomElements = `${APPLY_POLYFILLS}().then(() => ${REGISTER_CUSTOM_ELEMENTS}());`;
    } else if (!outputTarget.includePolyfills && outputTarget.includeDefineCustomElements) {
      sourceImports = `import { ${REGISTER_CUSTOM_ELEMENTS} } from '${pathToCorePackageLoader}';\n`;
      registerCustomElements = `${REGISTER_CUSTOM_ELEMENTS}();`;
    }
  }

  /**
   * Create imports from core package loader (by default from my-web-components/dist/components)
   */
   if ((outputTarget.includeImportCustomElements || outputTarget.enableSSR || outputTarget.individualComponentDefineCustomElement) && outputTarget.componentCorePackage !== undefined) {

    const componentsDir = `${normalizePath(outputTarget.componentCorePackage!)}/${outputTarget.customElementsDir || 'components'}`

    const importDefineCustomElement = outputTarget.includeImportCustomElements || outputTarget.individualComponentDefineCustomElement

    const cmpImports: string[] = []
    const cmpDefineCustomElmts: string[] = []

    components.forEach(component => {
      const pascalImport = dashToPascalCase(component.tagName);
      const impVars = []
      const defineCustomElementName = `define${pascalImport}`

      if (importDefineCustomElement) impVars.push(`defineCustomElement as ${defineCustomElementName}`)

      // if (outputTarget.enableSSR) impVars.push(`${pascalImport} as ${pascalImport}Cmp`)

      cmpImports.push(`import { ${impVars.join(', ')} } from '${componentsDir}/${component.tagName}';`);

      if (outputTarget.individualComponentDefineCustomElement) {
        cmpDefineCustomElmts.push(`${defineCustomElementName}()\n`)
      }
    });

    sourceImports += cmpImports.join('\n');
    registerIndividualCustomElements += cmpDefineCustomElmts.join('\n')
  }


  const final: ReadonlyArray<string> = [
    imports,
    typeImports,
    sourceImports,
    registerCustomElements,
    registerIndividualCustomElements,
    components.map(cmpMeta => createComponentDefinition(
      cmpMeta,
      outputTarget.includeImportCustomElements,
      outputTarget.enableSSR)).join('\n'),
  ];

  return final.filter(s => s !== '').join('\n') + '\n';
}

/**
 * Defines the React component that developers will import to use in their applications.
 * @param cmpMeta Meta data for a single Web Component
 * @param includeCustomElement If `true`, the Web Component instance will be passed in to createReactComponent to be
 * registered with the Custom Elements Registry.
 * @param enableSSR If `true`, the Web Component Class will be passed in to createReactComponent.
 * @returns An array where each entry is a string version of the React component definition.
 */
export function createComponentDefinition(cmpMeta: ComponentCompilerMeta, includeCustomElement: boolean = false, enableSSR: boolean = false): ReadonlyArray<string> {
  const tagNameAsPascal = dashToPascalCase(cmpMeta.tagName);
  const args = [`'${cmpMeta.tagName}'`, 'undefined', 'undefined', 'undefined']

  let template = `export const ${tagNameAsPascal} = /*@__PURE__*/createReactComponent<${IMPORT_TYPES}.${tagNameAsPascal}, HTML${tagNameAsPascal}Element>(`;

  if (includeCustomElement) {
    args[3] = `define${tagNameAsPascal}`
  }

  // if (enableSSR) {
  //   args[4] = `${tagNameAsPascal}Cmp`
  //   // args[5] = `stencilRenderToString`
  // }

  while (args[args.length - 1] === 'undefined') {
    args.pop()
  }

  template += args.join(', ')

  template += `);`;

  return [
    template
  ];
}

/**
 * Copy resources used to generate the Stencil-React bindings. The resources copied here are not specific a project's
 * Stencil components, but rather the logic used to do the actual component generation.
 * @param config the Stencil configuration associated with the project
 * @param outputTarget the output target configuration for generating the Stencil-React bindings
 * @returns The results of performing the copy
 */
async function copyResources(config: Config, outputTarget: OutputTargetReact): Promise<CopyResults> {
  if (!config.sys || !config.sys.copy || !config.sys.glob) {
    throw new Error('stencil is not properly initialized at this step. Notify the developer');
  }
  const srcDirectory = path.join(__dirname, '..', 'react-component-lib');
  const destDirectory = path.join(path.dirname(outputTarget.proxiesFile), 'react-component-lib');

  return config.sys.copy(
    [
      {
        src: srcDirectory,
        dest: destDirectory,
        keepDirStructure: false,
        warn: false,
      },
    ],
    srcDirectory,
  );
}

/**
 * Derive the path to the loader
 * @param config the Stencil configuration for the project
 * @param outputTarget the output target used for generating the Stencil-React bindings
 * @returns the derived loader path
 */
export function getPathToCorePackageLoader(config: Config, outputTarget: OutputTargetReact): string {
  const basePkg = outputTarget.componentCorePackage || '';
  const distOutputTarget = config.outputTargets?.find((o) => o.type === 'dist') as OutputTargetDist;

  const distAbsEsmLoaderPath =
    distOutputTarget?.esmLoaderPath && path.isAbsolute(distOutputTarget.esmLoaderPath)
      ? distOutputTarget.esmLoaderPath
      : null;

  const distRelEsmLoaderPath =
    config.rootDir && distAbsEsmLoaderPath
      ? path.relative(config.rootDir, distAbsEsmLoaderPath)
      : null;

  const loaderDir = outputTarget.loaderDir || distRelEsmLoaderPath || DEFAULT_LOADER_DIR;
  return normalizePath(path.join(basePkg, loaderDir));
}



export const GENERATED_DTS = 'components.d.ts';
const IMPORT_TYPES = 'JSX';
const REGISTER_CUSTOM_ELEMENTS = 'defineCustomElements';
const APPLY_POLYFILLS = 'applyPolyfills';
const DEFAULT_LOADER_DIR = '/dist/loader';

