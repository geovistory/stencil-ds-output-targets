import type { Config, OutputTargetCustom } from '@stencil/core/internal';
import { happyDomOutput } from './output-happy-dom';
import type { OutputTargetHappyDOM } from './types';

/**
 * Creates an output target for binding Stencil components to be used in a HappyDOM context
 * @param outputTarget the user-defined output target defined in a Stencil configuration file
 * @returns an output target that can be used by the Stencil compiler
 */
export const happyDomOutputTarget = (outputTarget: OutputTargetHappyDOM): OutputTargetCustom => ({
  type: 'custom',
  name: 'happy-dom-library',
  validate(config) {
    return normalizeOutputTarget(config, outputTarget);
  },
  async generator(config, compilerCtx, buildCtx) {
    const timespan = buildCtx.createTimeSpan(`generate happy-dom started`, true);

    await happyDomOutput(config, compilerCtx, outputTarget);

    timespan.finish(`generate happy-dom finished`);
  },
});

/**
 * Normalizes the structure of a provided output target and verifies a Stencil configuration
 * associated with the wrapper is valid
 * @param config the configuration to validate
 * @param outputTarget the output target to normalize
 * @returns an output target that's been normalized
 */
export function normalizeOutputTarget(config: Config, outputTarget: any): OutputTargetHappyDOM {
  const results: OutputTargetHappyDOM = {
    ...outputTarget,
  };

  if (config.rootDir == null) {
    throw new Error('rootDir is not set and it should be set by stencil itself');
  }
  if (outputTarget.loaderPath == null) {
    throw new Error('loaderPath is required');
  }
  if (outputTarget.baseURI == null) {
    throw new Error('baseURI is required');
  }
  if (outputTarget.outputPath == null) {
    throw new Error('outputPath is required');
  }

  return results;
}
