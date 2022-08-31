import type { DOMElement } from 'react';

export type StencilSSRFunction = (
  e: DOMElement<any, any>,
) => Promise<{
  html: string;
  [key: string]: any;
}>;
