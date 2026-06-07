// Local-first cache for fetched web pages, in IndexedDB (chosen over
// localStorage: async, structured, and no ~5 MB string cap — articles can be
// large). A scraped URL is fetched once per browser, then re-opens instantly
// and offline.

export type WebDoc = { url: string; title: string; markdown: string; fetchedAt: number };

const DB_NAME = "speed-reader";
const STORE = "web-docs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "url" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const getDoc = (url: string) => run<WebDoc | undefined>("readonly", (s) => s.get(url));

export const putDoc = (doc: WebDoc) => run<IDBValidKey>("readwrite", (s) => s.put(doc));

export async function recentDocs(limit = 8): Promise<WebDoc[]> {
  const all = await run<WebDoc[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.fetchedAt - a.fetchedAt).slice(0, limit);
}
