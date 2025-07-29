// Minimal service worker types for Deno

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface FetchEvent extends ExtendableEvent {
  readonly clientId: string;
  readonly preloadResponse: Promise<any>;
  readonly request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

interface InstallEvent extends ExtendableEvent {}

interface ActivateEvent extends ExtendableEvent {}

interface Client {
  readonly id: string;
  readonly type: string;
  readonly url: string;
  postMessage(message: any, transfer?: Transferable[]): void;
}

interface Clients {
  claim(): Promise<void>;
  get(id: string): Promise<Client>;
  matchAll(options?: { includeUncontrolled?: boolean; type?: string }): Promise<Client[]>;
  openWindow(url: string): Promise<WindowClient | null>;
}

interface WindowClient extends Client {
  readonly focused: boolean;
  readonly visibilityState: string;
  focus(): Promise<WindowClient>;
  navigate(url: string): Promise<WindowClient | null>;
}

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: string[];
  skipWaiting(): Promise<void>;
  clients: Clients;
  registration: ServiceWorkerRegistration;
  caches: CacheStorage;
};

// Event listener overloads
declare function addEventListener(
  type: 'install',
  listener: (event: InstallEvent) => void,
  options?: boolean | AddEventListenerOptions
): void;

declare function addEventListener(
  type: 'activate',
  listener: (event: ActivateEvent) => void,
  options?: boolean | AddEventListenerOptions
): void;

declare function addEventListener(
  type: 'fetch',
  listener: (event: FetchEvent) => void,
  options?: boolean | AddEventListenerOptions
): void;
