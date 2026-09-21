export type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createSaveStore<T>(key: string, normalize: (value: unknown) => T | null, storage: () => SaveStorage | undefined) {
  return {
    load(): T | null {
      try { return normalize(JSON.parse(storage()?.getItem(key) ?? "null")); }
      catch { return null; }
    },
    write(saved: T | null) {
      const target = storage();
      if (saved) target?.setItem(key, JSON.stringify(saved));
      else target?.removeItem(key);
    }
  };
}
