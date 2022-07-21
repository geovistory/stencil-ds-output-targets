import React, { createElement, useEffect } from 'react';
import { useSSE } from './utils/useSSE';
import {
  attachProps,
  camelToDashCase,
  createForwardRef,
  dashToPascalCase,
  isCoveredByReact,
  mergeRefs,
} from './utils';

export interface HTMLStencilElement extends HTMLElement {
  componentOnReady(): Promise<this>;
}

interface StencilReactInternalProps<ElementType> extends React.HTMLAttributes<ElementType> {
  forwardedRef: React.RefObject<ElementType>;
  ref?: React.Ref<any>;
}

interface HTMLStencilFetchElement extends HTMLStencilElement {
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

    useSSE(async () => {

      // we don't want to fetch here, if we are in a client
      if(typeof window) return;

      await customElements.whenDefined(tagName);
      if (componentEl?.fetchData) {
        const data = await componentEl.fetchData();

        attachProps(componentEl, { ...props, data }, props);;
        return data;
      }
      return;
    });

    const { children, forwardedRef, style, className, ref, ...cProps } = props;

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

    const newProps: Omit<StencilReactInternalProps<ElementType>, 'forwardedRef'> = {
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
    return createElement(tagName, newProps, children);
  };

  // If context was passed to createReactComponent then conditionally add it to the Component Class
  if (ReactComponentContext) {
    ReactComponent.contextType = ReactComponentContext;
  }

  return createForwardRef<PropType, ElementType>(ReactComponent, displayName);
};
