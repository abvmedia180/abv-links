// DOM building. Every string child becomes a text node, so data can never turn into markup.
// Tools build all of their elements with h(); innerHTML is not used anywhere in the site.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (name === 'class') el.className = value;
    else if (name === 'style') Object.assign(el.style, value);
    else if (name === 'dataset') Object.assign(el.dataset, value);
    else if (name.startsWith('on')) el.addEventListener(name.slice(2), value);
    else el.setAttribute(name, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
  return parent;
}
