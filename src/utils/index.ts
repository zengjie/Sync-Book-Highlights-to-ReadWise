export function removeSlash(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

export function printJSON(json: any) {
  return new Response(`<pre>${JSON.stringify(json, null, 2)}</pre>`);
} 