/**
 * An output target configuration interface used to configure Stencil to properly generate the bindings necessary to use
 * Stencil components in a HappyDOM application
 */
export interface OutputTargetHappyDOM {
  loaderPath?: string;
  outputPath?: string;
}

/**
 * Describes the fields of a package.json file necessary to generate the Stencil-HappyDOM bindings
 */
export interface PackageJSON {
  types: string;
}
