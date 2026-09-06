/** Helper kecil untuk membangun DOM tanpa framework. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof (node as never)[k] === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v as unknown as EventListener);
    } else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

export function txt(text: string): Text {
  return document.createTextNode(text);
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

/** Query selector yang dijamin ada. */
export function must<T extends HTMLElement>(sel: string, root: ParentNode = document): T {
  const n = root.querySelector(sel);
  if (!n) throw new Error(`Elemen tidak ditemukan: ${sel}`);
  return n as T;
}

export function esc(s: string | number | null | undefined): string {
  const str = String(s ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
