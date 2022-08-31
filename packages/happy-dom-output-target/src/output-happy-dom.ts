import type {
  CompilerCtx
} from '@stencil/core/internal';
import type { OutputTargetHappyDOM } from './types';

/**
 * Generate and write the Stencil-HappyDOM worker function to disc
 * @param config the Stencil configuration associated with the project
 * @param compilerCtx the compiler context of the current Stencil build
 * @param outputTarget the output target configuration for generating the HappyDOM wrapper
 */
export async function happyDomOutput(
  // config: Config,
  compilerCtx: CompilerCtx,
  outputTarget: OutputTargetHappyDOM,
): Promise<void> {
  // const rootDir = config.rootDir as string;
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
  const content = fileTemplate.toString()
    .replace('__loaderPath__', outputTarget.loaderPath ?? '../loader')
  const filepath = outputTarget.outputPath ?? 'happyDomWorker.ts'
  return { content, filepath }
}


const fileTemplate = `import { parentPort, workerData } from 'node:worker_threads';

import { Window } from 'happy-dom';

const window = new Window();
// @ts-ignore
globalThis.window = window
// @ts-ignore
globalThis.document = window.document
// @ts-ignore
globalThis.customElements = window.customElements
// @ts-ignore
globalThis.HTMLElement = window.HTMLElement
// @ts-ignore
globalThis.fetch = window.fetch
// @ts-ignore
globalThis.requestAnimationFrame = window.requestAnimationFrame;
// @ts-ignore
globalThis.CustomEvent = window.CustomEvent;
// @ts-ignore
window.asyncTaskManager = window.happyDOM.asyncTaskManager

document.write(\`
<html>
        <head>
        <base href="\${workerData.baseURI}" target="_blank">
        </head>
        <body></body>
    </html>\`)
let renderId = 0;

const start = async () => {
    const { defineCustomElements } = await import('__loaderPath__')
    defineCustomElements(undefined)

    // render web component(s) to html, including data fetching
    const document = globalThis.document;
    var div = document.createElement('div');
    div.setAttribute('class', 'happy-dom-wrapper');
    const id = 'happy-dom-wrapper-' + renderId;
    renderId++;
    div.setAttribute('id', id);
    div.setAttribute('class', 'happy-dom-wrapper');
    div.innerHTML = workerData.html.trim();
    document.body.appendChild(div)


    const wrapper = window?.document?.body?.querySelector('#' + id);

    // wait one tick to wait for lazyLoaded stencil components
    await new Promise(res =>setTimeout(()=>{res(true)},0))
    return window.happyDOM.whenAsyncComplete().then(() => {
        document.body.removeChild(div)
        // @ts-ignore
        const data = wrapper.data
        // console.log(data);

        // Do something when all async tasks are completed.
        const html = wrapper?.getInnerHTML({ includeShadowRoots: true })
        // console.log(html);
        return { data, html }
    });


}

start().then((res) => {
    parentPort?.postMessage({ success: res });
}).catch(e => parentPort?.postMessage({ error: e }))
`



