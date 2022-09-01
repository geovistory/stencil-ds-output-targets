import React, { createElement, useContext, useEffect } from 'react';
import {
  attachProps,
  camelToDashCase,
  createForwardRef,
  dashToPascalCase,
  isCoveredByReact,
  mergeRefs,
} from './utils';
import { StencilSSRFunction } from './utils/StencilSSRFunction';
import { InternalContext, useSSE } from './utils/useSSE';

export interface HTMLStencilElement extends HTMLElement {
  componentOnReady(): Promise<this>;
}

interface StencilReactInternalProps<ElementType> extends React.HTMLAttributes<ElementType> {
  forwardedRef: React.RefObject<ElementType>;
  ref?: React.Ref<any>;
  data?: any;
}
export type NewProps<ElementType> = Omit<StencilReactInternalProps<ElementType>, 'forwardedRef'>;
export interface HTMLStencilFetchElement extends HTMLStencilElement {
  fetchData?: () => Promise<any>;
  data?: any;
}

export type StencilHydrate = {
  renderToString: StencilSSRFunction;
};

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

    const isServer = typeof window === 'undefined';
    const { children, forwardedRef, style, className, ref, ...cProps } = props;

    /**
     * Server Side Rendering
     */
    const [sse, error] = useSSE(async () => {
      // stop, if we are in a browser
      if (!isServer) return true;

      const stencilRenderToStringPromise = useContext(InternalContext).renderToString;

      // stop, if we have no render to string function
      if (!stencilRenderToStringPromise) return true;

      const stencilRenderToString = await stencilRenderToStringPromise;
      const e = createElement(tagName, newProps, children)

      return stencilRenderToString(e)
    });

    if (error) console.warn(error);

    let propsToPass = Object.keys(cProps).reduce((acc: any, name) => {
      const value = (cProps as any)[name];

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

    useEffect(() => {
      // useEffect() is only called in browser

      // attatch all props the webcomponent, even objects, arrays, functions that
      // could not be passed to component via createElement
      let toAttatch = { ...cProps };

      if (!!sse) {
        // if data is fetched by useSSE, we attatch sse data here (-> hydration)
        toAttatch = { ...cProps, ...sse };
      }

      attachProps(componentEl, toAttatch, newProps); // TODO: newProps should be prevProps!
    });

    /**
     * We use createElement here instead of
     * React.createElement to work around a
     * bug in Vite (https://github.com/vitejs/vite/issues/6104).
     * React.createElement causes all elements to be rendered
     * as <tagname> instead of the actual Web Component.
     */
    return sse?.html ? (
      <div dangerouslySetInnerHTML={{ __html: sse?.html }}></div>
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
