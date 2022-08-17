import React, { createElement } from 'react';
import { HTMLStencilFetchElement, NewProps } from '../createComponent';

export type StencilSSRFunction = (html: string, options?: object) => Promise<{
  html: string;
  [key: string]: any;
}>;

/**
 * Server side render web component
 * @param tagName
 * @param newProps
 * @param children
 * @param renderToStringFn renderToString() function exposed by dist-hydrate-script
 * @param data
 * @returns html string with web component
 */
export async function serverRenderWebComponent<
  ElementType extends HTMLStencilFetchElement
>(
  tagName: string,
  newProps: NewProps<ElementType>,
  children: React.ReactNode,
  renderToStringFn: StencilSSRFunction,
  data?: any,
) {
  const props = data ? { ...newProps, data: JSON.stringify(data) } : newProps;
  const e = createElement(tagName, props, children);
  const ReactDOMServer = await import('react-dom/server');
  const plainHtml = ReactDOMServer.renderToString(e);
  const hydrateResult = await renderToStringFn(plainHtml, {
    prettyHtml: true,
    removeScripts: true,
    removeHtmlComments: true,
  });
  const renderedHtml = hydrateResult.html;

  // TODO: improve the way we extract the component html out of document
  // TODO: remove the data attribute from the tag name, since sse data is
  //       provided via javascript
  const regex = new RegExp(`<${tagName}(.*)${tagName}>`, 'gs');
  const html = regex.exec(renderedHtml)?.[0];
  return html;
}
