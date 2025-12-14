import { JSONFilePreset } from 'lowdb/node';

function throttle(callback, ms) {
  let lastCall = 0;
  let timeout = null;
  let lastArgs, lastThis;

  return function (...args) {
    const now = Date.now();
    const remaining = ms - (now - lastCall);

    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      callback.apply(lastThis, lastArgs);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        callback.apply(lastThis, lastArgs);
      }, remaining);
    }
  };
}

if (!globalThis.dbPromise) {
  globalThis.dbPromise = (async () => {
    const cacheDb = await JSONFilePreset('engine-cache.json', {});
    await cacheDb.read();
    cacheDb.data ||= {};
    const playerDataDb = await JSONFilePreset('player-data.json', {});
    await playerDataDb.read();
    playerDataDb.data ||= {};
    return { cacheDb, playerDataDb };
  })();
}

const { cacheDb, playerDataDb } = await globalThis.dbPromise;

const throttledDBWrite = throttle(async db => {
  await db.write();
}, 10000);

export function getCache(key) {
  return cacheDb.data[key];
}

export function setCache(key, value) {
  cacheDb.data[key] = value;
  throttledDBWrite(cacheDb);
}

export function getPlayerData() {
  return playerDataDb.data;
}

export function savePlayerData(data) {
  if (data !== undefined)
    playerDataDb.data = data;
  throttledDBWrite(playerDataDb);
}
