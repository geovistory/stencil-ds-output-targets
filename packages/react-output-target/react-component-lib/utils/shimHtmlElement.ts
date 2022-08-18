function shimHtmlElement(element: any) {
  element.prototype.__attachShadow = () => { }; // shim __attachShadow()
  element.prototype.attachShadow = () => { }; // shim attachShadow()
  element.prototype.__createElement = (nodeName) => { };
  element.prototype.createElement = (nodeName) => { };
  element.prototype.__createTextNode = (value) => { };
  element.prototype.createTextNode = (value) => { };
  element.prototype.__appendChild = (node) => { };
  element.prototype.appendChild = (node) => { };
  element.prototype.__replaceChild = (node) => { };
  element.prototype.replaceChild = (node) => { };
  element.prototype.__removeChild = (node) => { };
  element.prototype.removeChild = (node) => { };
  element.prototype.__insertBefore = (newItem, existing) => { };
  element.prototype.insertBefore = (newItem, existing) => { };
  element.prototype.__toString = () => { };
  element.prototype.toString = () => { };
  element.prototype.__setAttribute = (name, value) => { };
  element.prototype.setAttribute = (name, value) => { };
  element.prototype.__getAttribute = (name) => { };
  element.prototype.getAttribute = (name) => { };
  element.prototype.__setProperty = (name, value) => { };
  element.prototype.setProperty = (name, value) => { };
  element.prototype.__getProperty = (name) => { };
  element.prototype.getProperty = (name) => { };
  element.prototype.__innerHTML = () => { };
  element.prototype.innerHTML = () => { };
  element.prototype.__outerHTML = () => { };
  element.prototype.outerHTML = () => { };
  element.prototype.__textContent = () => { };
  element.prototype.textContent = () => { };
  element.prototype.__addEventListener = (eventType, listenerFunc) => { };
  element.prototype.addEventListener = (eventType, listenerFunc) => { };
  element.prototype.__removeEventListener = (eventType, listenerFunc) => { };
  element.prototype.removeEventListener = (eventType, listenerFunc) => { };
  element.prototype.__dispatchEvent = (event) => { };
  element.prototype.dispatchEvent = (event) => { };
  return element
}
