"use strict";

window.CameraAlbum = (() => {
  const photos = "photos";
  const previews = "previews";
  let connection;

  function preview(photo) {
    const { id, timestamp, roll, thumbnail, origin, favorite, trashedAt } = photo;
    return { id, timestamp, roll, thumbnail, origin, favorite, trashedAt };
  }

  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open("shiguang-camera", 4);
      request.onupgradeneeded = event => {
        const database = request.result;
        const photoStore = event.oldVersion === 0
          ? database.createObjectStore(photos, { keyPath: "id" })
          : request.transaction.objectStore(photos);
        const previewStore = event.oldVersion < 2
          ? database.createObjectStore(previews, { keyPath: "id" })
          : request.transaction.objectStore(previews);
        if (event.oldVersion < 2) previewStore.createIndex("newest", ["timestamp", "id"]);
        if (event.oldVersion < 4) {
          const stickers = database.createObjectStore("stickers", { keyPath: "id" });
          stickers.createIndex("newest", "timestamp");
          const entries = database.createObjectStore("compendium", { keyPath: "key" });
          entries.createIndex("newest", "updatedAt");
        }
        if (event.oldVersion > 0) {
          photoStore.openCursor().onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return;
            previewStore.put(preview(cursor.value));
            cursor.continue();
          };
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          connection = undefined;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error);
    }).catch(error => {
      connection = undefined;
      throw error;
    });
    return connection;
  }

  async function transact(stores, mode, operation) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(stores, mode);
      let result;
      let failure;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(failure || transaction.error || new Error("相册操作取消"));
      try {
        operation(transaction, value => { result = value; });
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    });
  }

  function matches(item, filter) {
    if (filter === "trash") return Boolean(item.trashedAt);
    if (item.trashedAt) return false;
    if (filter === "favorites") return Boolean(item.favorite);
    if (filter === "camera") return item.origin !== "导入";
    if (filter === "imports") return item.origin === "导入";
    return true;
  }

  function updateMetadata(ids, changes) {
    return transact([photos, previews], "readwrite", (transaction, done) => {
      const photoStore = transaction.objectStore(photos);
      const previewStore = transaction.objectStore(previews);
      const updated = [];
      done(updated);
      for (const id of new Set(ids)) {
        const request = photoStore.get(id);
        request.onsuccess = () => {
          const photo = request.result;
          if (!photo) return;
          const next = { ...photo, ...changes };
          photoStore.put(next);
          previewStore.put(preview(next));
          updated.push(next.id);
        };
      }
    });
  }

  return {
    list(before, limit = 24, filter = "all") {
      return transact(previews, "readonly", (transaction, done) => {
        const items = [];
        const range = before ? IDBKeyRange.upperBound(before, true) : null;
        const request = transaction.objectStore(previews).index("newest").openCursor(range, "prev");
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            done({ items, next: null });
            return;
          }
          if (matches(cursor.value, filter)) {
            if (items.length === limit) {
              done({ items, next: [items.at(-1).timestamp, items.at(-1).id] });
              return;
            }
            items.push(cursor.value);
          }
          cursor.continue();
        };
      });
    },
    get(id) {
      return transact(photos, "readonly", (transaction, done) => {
        const request = transaction.objectStore(photos).get(id);
        request.onsuccess = () => done(request.result);
      });
    },
    save(photo) {
      return transact([photos, previews], "readwrite", transaction => {
        transaction.objectStore(photos).add(photo);
        transaction.objectStore(previews).add(preview(photo));
      });
    },
    listDiscoveries(store) {
      if (!["stickers", "compendium"].includes(store)) return Promise.reject(new Error("未知的收藏"));
      return transact(store, "readonly", (transaction, done) => {
        const request = transaction.objectStore(store).index("newest").openCursor(null, "prev");
        const items = [];
        done(items);
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const { blob, mask, composite, ...summary } = cursor.value;
            items.push(summary);
            cursor.continue();
          }
        };
      });
    },
    getSticker(id) {
      return transact("stickers", "readonly", (transaction, done) => {
        transaction.objectStore("stickers").get(id).onsuccess = event => done(event.target.result);
      });
    },
    saveSticker(sticker) {
      return transact("stickers", "readwrite", transaction => transaction.objectStore("stickers").put(sticker));
    },
    collectSticker(stickerId, details, replace = false, previousStickerId = null, oldKey = null) {
      const validCategories = ["动物", "植物", "食物", "饮品", "甜点", "花卉", "文具", "家具", "灯饰", "玩具", "器物", "手作", "乐器", "复古", "建筑", "其他"];
      if (typeof details?.name !== "string") return Promise.reject(new Error("请填写物体名称。"));
      const name = details.name.normalize("NFKC").trim().replace(/\s+/g, " ");
      if (!name || name.length > 40 || typeof details.observation !== "string" || details.observation.length > 120 ||
          !validCategories.includes(details.category)) {
        return Promise.reject(new Error("请填写名称、分类和简短观察。"));
      }
      const key = `${details.category}:${name.toLocaleLowerCase("zh-CN")}`;
      return transact(["stickers", "compendium"], "readwrite", (transaction, done) => {
        const stickers = transaction.objectStore("stickers");
        const entries = transaction.objectStore("compendium");
        stickers.get(stickerId).onsuccess = event => {
          const sticker = event.target.result;
          if (!sticker) { transaction.abort(); return; }
          const tags = Array.isArray(details.tags)
            ? details.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim().replace(/^#/, "")).slice(0, 6)
            : (sticker.tags || []);
          const purpose = typeof details.purpose === "string" && details.purpose ? details.purpose : (sticker.purpose || "toy");
          entries.get(key).onsuccess = event => {
            const previous = event.target.result;
            stickers.put({ ...sticker, name, category: details.category, purpose, tags });
            if (previous && previous.stickerId !== stickerId && (!replace || previous.stickerId !== previousStickerId)) {
              done({ conflict: previous });
              return;
            }
            const entry = { key, name, category: details.category, observation: details.observation.trim(),
              tags, purpose, stickerId, createdAt: previous?.createdAt || Date.now(), updatedAt: Date.now() };
            entries.put(entry);
            if (oldKey && oldKey !== key) {
              entries.get(oldKey).onsuccess = event => {
                if (event.target.result?.stickerId === stickerId) entries.delete(oldKey);
              };
            }
            done({ entry });
          };
        };
      });
    },
    setFavorite(ids, favorite) { return updateMetadata(ids, { favorite }); },
    moveToTrash(ids) { return updateMetadata(ids, { trashedAt: Date.now() }); },
    restore(ids) { return updateMetadata(ids, { trashedAt: null }); }
  };
})();
