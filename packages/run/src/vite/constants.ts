type ValuesOf<T> = T[keyof T];

export const markoRunFilePrefix = '__marko-run__'

export const virtualFilePrefix = 'virtual:marko-run';
export const virtualRoutesPrefix = `${virtualFilePrefix}/routes`;
export const virtualRuntimePrefix = `${virtualFilePrefix}/internal`;

export const httpVerbs = ['get', 'post', 'put', 'delete'] as const;

// These need to match the Marko Vite plugin
export const serverEntryQuery = "?marko-server-entry"; 
export const browserEntryQuery = "?marko-browser-entry";

export const RoutableFileTypes = {
  Page: 'page',
  Layout: 'layout',
  Handler: 'handler',
  Middleware: 'middleware',
  Meta: 'meta',
  NotFound: '404',
  Error: '500'
} as const;

export type RoutableFileType = ValuesOf<typeof RoutableFileTypes>
export type HttpVerb = typeof httpVerbs[number];