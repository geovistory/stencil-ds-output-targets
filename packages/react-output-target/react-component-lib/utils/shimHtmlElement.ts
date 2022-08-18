function shimHtmlElement(element: any) {
  element.prototype.__attachShadow = () => { }; // shim __attachShadow()
  element.prototype.attachShadow = () => { }; // shim attachShadow()
  element.prototype.__createElement = () => { };
  element.prototype.createElement = () => { };
  element.prototype.__createTextNode = () => { };
  element.prototype.createTextNode = () => { };
  element.prototype.__appendChild = () => { };
  element.prototype.appendChild = () => { };
  element.prototype.__replaceChild = () => { };
  element.prototype.replaceChild = () => { };
  element.prototype.__removeChild = () => { };
  element.prototype.removeChild = () => { };
  element.prototype.__insertBefore = () => { };
  element.prototype.insertBefore = () => { };
  element.prototype.__toString = () => { };
  element.prototype.toString = () => { };
  element.prototype.__setAttribute = () => { };
  element.prototype.setAttribute = () => { };
  element.prototype.__getAttribute = () => { };
  element.prototype.getAttribute = () => { };
  element.prototype.__setProperty = () => { };
  element.prototype.setProperty = () => { };
  element.prototype.__getProperty = () => { };
  element.prototype.getProperty = () => { };
  element.prototype.__innerHTML = () => { };
  element.prototype.innerHTML = () => { };
  element.prototype.__outerHTML = () => { };
  element.prototype.outerHTML = () => { };
  element.prototype.__textContent = () => { };
  element.prototype.textContent = () => { };
  element.prototype.__addEventListener = () => { };
  element.prototype.addEventListener = () => { };
  element.prototype.__removeEventListener = () => { };
  element.prototype.removeEventListener = () => { };
  element.prototype.__dispatchEvent = () => { };
  element.prototype.dispatchEvent = () => { };
  return element
}
