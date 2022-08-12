import React, { createElement, useEffect } from 'react';
import {
  attachProps,
  camelToDashCase,
  createForwardRef,
  dashToPascalCase,
  isCoveredByReact,
  mergeRefs,
} from './utils';
import { StencilSSRFunction } from './utils/serverRenderWebComponent';
import { useSSE } from './utils/useSSE';

export interface HTMLStencilElement extends HTMLElement {
  componentOnReady(): Promise<this>;
}

interface StencilReactInternalProps<ElementType> extends React.HTMLAttributes<ElementType> {
  forwardedRef: React.RefObject<ElementType>;
  ref?: React.Ref<any>;
}
export type NewProps<ElementType> = Omit<StencilReactInternalProps<ElementType>, 'forwardedRef'>;
export interface HTMLStencilFetchElement extends HTMLStencilElement {
  fetchData?: () => Promise<any>;
  data?: any;
}

export const createReactComponent = <
  PropType,
  ElementType extends HTMLStencilFetchElement,
  ContextStateType = {},
  ExpandedPropsTypes = {}
>(
  tagName: string,
  ReactComponentContext?: React.Context<ContextStateType>,
  manipulatePropsFunction?: (
    originalProps: StencilReactInternalProps<ElementType>,
    propsToPass: any,
  ) => ExpandedPropsTypes,
  defineCustomElement?: () => void,
  componentClass?: any,
  stencilRenderToString?: StencilSSRFunction,
) => {
  if (defineCustomElement !== undefined) {
    defineCustomElement();
  }

  const displayName = dashToPascalCase(tagName);
  const ReactComponent = (props: StencilReactInternalProps<ElementType>) => {
    let componentEl!: ElementType;
    const setComponentElRef = (element: ElementType) => {
      componentEl = element;
    };
    useEffect(() => {
      attachProps(componentEl, props, props);
    });

    const isServer = typeof window === 'undefined';
    const { children, forwardedRef, style, className, ref, ...cProps } = props;

    /**
     * Server Side Rendering
     */
    const [data, error] = useSSE(async () => {
      // stop, if we are in a browser
      if (!isServer || !componentClass || !stencilRenderToString) return true;

      let serverFetched: any;

      // instantiate new component
      componentClass.prototype.__attachShadow = () => {}; // shim __attachShadow()
      componentClass.prototype.attachShadow = () => {}; // shim attachShadow()
      const component = new componentClass();

      // assign properties to the component
      Object.assign(component, cProps);

      // fetch data, if component has fetchData() function
      if (component?.fetchData) {
        serverFetched = await component.fetchData();
      }

      // render webcomponent html (using stencil hydrate)
      const { serverRenderWebComponent } = await import('./utils/serverRenderWebComponent');
      const html = await serverRenderWebComponent<ElementType>(
        tagName,
        newProps,
        children,
        stencilRenderToString,
        serverFetched,
      );

      return { serverFetched, html };
    });

    if (error) console.warn(error);

    const cPropsWithData = { ...cProps, data: data };

    let propsToPass = Object.keys(cPropsWithData).reduce((acc: any, name) => {
      const value = (cPropsWithData as any)[name];

      if (name.indexOf('on') === 0 && name[2] === name[2].toUpperCase()) {
        const eventName = name.substring(2).toLowerCase();
        if (typeof document !== 'undefined' && isCoveredByReact(eventName)) {
          acc[name] = value;
        }
      } else {
        // we should only render strings, booleans, and numbers as attrs in html.
        // objects, functions, arrays etc get synced via properties on mount.
        const type = typeof value;

        if (type === 'string' || type === 'boolean' || type === 'number') {
          acc[camelToDashCase(name)] = value;
        }
      }
      return acc;
    }, {});

    if (manipulatePropsFunction) {
      propsToPass = manipulatePropsFunction(props, propsToPass);
    }

    const newProps: NewProps<ElementType> = {
      ...propsToPass,
      ref: mergeRefs(forwardedRef, setComponentElRef),
      style,
    };

    /**
     * We use createElement here instead of
     * React.createElement to work around a
     * bug in Vite (https://github.com/vitejs/vite/issues/6104).
     * React.createElement causes all elements to be rendered
     * as <tagname> instead of the actual Web Component.
     */
    return data?.html ? (
      <div dangerouslySetInnerHTML={{ __html: data?.html }}></div>
    ) : (
      createElement(tagName, newProps, children)
    );
  };

  // If context was passed to createReactComponent then conditionally add it to the Component Class
  if (ReactComponentContext) {
    ReactComponent.contextType = ReactComponentContext;
  }

  return createForwardRef<PropType, ElementType>(ReactComponent, displayName);
};
