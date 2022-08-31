import type {
  CompilerCtx,

  Config,
  CopyResults
} from '@stencil/core/internal';
import { readFileSync } from 'fs';
import path from 'path';
import type { OutputTargetHappyDOM } from './types';

/**
 * Generate and write the Stencil-HappyDOM worker function to disc
 * @param config the Stencil configuration associated with the project
 * @param compilerCtx the compiler context of the current Stencil build
 * @param outputTarget the output target configuration for generating the HappyDOM wrapper
 */
export async function happyDomOutput(
  config: Config,
  compilerCtx: CompilerCtx,
  outputTarget: OutputTargetHappyDOM,
): Promise<void> {
  const rootDir = config.rootDir as string;
  // create the worker file
  const { content, filepath } = prepareFile(outputTarget)
  await compilerCtx.fs.writeFile(filepath, content);

  // await copyResources(config, outputTarget);
}

/**
 * Prepares Stencil-HappyDOM worker function text
 * @param compilerCtx the compiler context of the current Stencil build
 * @param outputTarget the output target configuration for generating the HappyDOM wrapper
 */
export function prepareFile(
  outputTarget: OutputTargetHappyDOM,
): { content: string, filepath: string } {
  // const rootDir = config.rootDir as string;

  // create the worker file
  const fileString = readFileSync('./template/template.ts')
  const content = fileString.toString()
    .replace('__loaderPath__', outputTarget.loaderPath ?? '../loader')
    .replace('__baseURI__', outputTarget.baseURI ?? 'https://www.exapmle.com')
  const filepath = outputTarget.outputPath ?? 'happyDomWorker.ts'
  return { content, filepath }
}




// /**
//  * Copy resources used to generate the Stencil-HappyDOM bindings. The resources copied here are not specific a project's
//  * Stencil components, but rather the logic used to do the actual component generation.
//  * @param config the Stencil configuration associated with the project
//  * @param outputTarget the output target configuration for generating the Stencil-HappyDOM bindings
//  * @returns The results of performing the copy
//  */
// async function copyResources(config: Config, outputTarget: OutputTargetHappyDOM): Promise<CopyResults> {
//   if (!config.sys || !config.sys.copy || !config.sys.glob) {
//     throw new Error('stencil is not properly initialized at this step. Notify the developer');
//   }
//   const srcDirectory = path.join(__dirname, '..', 'happy-dom-component-lib');
//   const destDirectory = path.join(path.dirname(outputTarget.proxiesFile), 'happy-dom-component-lib');

//   return config.sys.copy(
//     [
//       {
//         src: srcDirectory,
//         dest: destDirectory,
//         keepDirStructure: false,
//         warn: false,
//       },
//     ],
//     srcDirectory,
//   );
// }

