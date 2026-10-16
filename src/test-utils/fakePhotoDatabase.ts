/**
 * An in-memory stand-in for the expo-sqlite database, for unit tests only.
 * It understands exactly the statements photoQueueStorage and remotePhotoCache
 * send (the `photos` table) and throws on anything else, so a test fails loudly
 * if the real code starts sending a statement this doesn't model.
 */
interface Row {
  viewer_id: string;
  id: string;
  origin: string;
  taken_at: number;
  data: string;
}

const squash = (source: string) => source.replace(/\s+/g, ' ').trim();
const originOf = (query: string) => /origin = '(\w+)'/.exec(query)?.[1];

export function createFakePhotoDatabase() {
  const rows = new Map<string, Row>();
  const key = (viewer: string, id: string) => `${viewer}|${id}`;

  return {
    /** Every stored row, for assertions. */
    rows,

    async execAsync(): Promise<void> {},

    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      await task();
    },

    async runAsync(source: string, ...params: unknown[]): Promise<void> {
      const query = squash(source);
      if (query.startsWith('INSERT OR IGNORE INTO photos') || query.startsWith('INSERT OR REPLACE INTO photos')) {
        const [viewer, id, takenAt, data] = params as [string, string, number, string];
        const origin = /VALUES \(\?, \?, '(\w+)'/.exec(query)?.[1] as string;
        if (query.startsWith('INSERT OR IGNORE') && rows.has(key(viewer, id))) return;
        rows.set(key(viewer, id), { viewer_id: viewer, id, origin, taken_at: takenAt, data });
      } else if (query.startsWith('UPDATE photos SET data = ?')) {
        const [data, viewer, id] = params as [string, string, string];
        const row = rows.get(key(viewer, id));
        if (row && row.origin === originOf(query)) row.data = data;
      } else if (query.startsWith('DELETE FROM photos WHERE viewer_id = ? AND origin')) {
        const [viewer] = params as [string];
        for (const [k, row] of rows) if (row.viewer_id === viewer && row.origin === originOf(query)) rows.delete(k);
      } else if (query.startsWith('DELETE FROM photos WHERE viewer_id = ? AND id = ?')) {
        const [viewer, id] = params as [string, string];
        const row = rows.get(key(viewer, id));
        if (row && row.origin === originOf(query)) rows.delete(key(viewer, id));
      } else {
        throw new Error(`fake database: unsupported statement: ${query}`);
      }
    },

    async getAllAsync(source: string, viewer: string): Promise<{ data: string }[]> {
      const query = squash(source);
      if (!query.startsWith('SELECT data FROM photos WHERE viewer_id = ? AND origin')) {
        throw new Error(`fake database: unsupported query: ${query}`);
      }
      return [...rows.values()]
        .filter(row => row.viewer_id === viewer && row.origin === originOf(query))
        .sort((a, b) => b.taken_at - a.taken_at)
        .map(row => ({ data: row.data }));
    },

    async getFirstAsync(source: string, viewer: string, id: string): Promise<{ data: string } | null> {
      const query = squash(source);
      if (!query.startsWith('SELECT data FROM photos WHERE viewer_id = ? AND id = ?')) {
        throw new Error(`fake database: unsupported query: ${query}`);
      }
      const row = rows.get(key(viewer, id));
      return row && row.origin === originOf(query) ? { data: row.data } : null;
    },
  };
}
