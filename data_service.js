/**
 * Data Service
 * Loads U.GG meta rankings, caches champion matchup files, and fetches live stats on demand.
 */

export class DataService {
  constructor() {
    this.meta = null;
    this.matchupsCache = {};
    this.memoryCache = new Map();
    this.currentPatch = "16_23";
    this.currentRank = "17"; // 17 = Emerald+ (default competitive)
    this.ddragonVersion = "16.23.1";
    this.storagePrefix = "lol_matchup_pool_";
    this.favStoragePrefix = "lol_favorite_pool_";

    this.roleCodes = {
      top: 4,
      jungle: 1,
      mid: 5,
      adc: 3,
      supp: 2
    };

    // No pre-set pools: clean state on first visit
    this.defaultPools = {
      mid: [],
      top: [],
      jungle: [],
      adc: [],
      supp: []
    };
  }

  async initialize() {
    try {
      // 1. Load bundled meta
      const metaRes = await fetch('./bundled_meta.json');
      if (metaRes.ok) {
        this.meta = await metaRes.json();
        if (this.meta.ddragonVersion) {
          this.ddragonVersion = this.meta.ddragonVersion;
        }
      }
    } catch (e) {
      console.warn("Could not load bundled_meta.json directly:", e);
    }

    try {
      // 2. Load compact lane matchups cache
      const cacheRes = await fetch('./matchups_lane_compact.json');
      if (cacheRes.ok) {
        this.matchupsCache = await cacheRes.json();
        console.log("Loaded matchups_lane_compact.json successfully");
      }
    } catch (e) {
      console.warn("Matchups lane compact cache not loaded:", e);
    }

    return true;
  }

  async reload() {
    try {
      const cacheBuster = Date.now();
      const metaRes = await fetch(`./bundled_meta.json?t=${cacheBuster}`);
      if (metaRes.ok) {
        this.meta = await metaRes.json();
        if (this.meta.ddragonVersion) {
          this.ddragonVersion = this.meta.ddragonVersion;
        }
      }
      const cacheRes = await fetch(`./matchups_lane_compact.json?t=${cacheBuster}`);
      if (cacheRes.ok) {
        this.matchupsCache = await cacheRes.json();
      }
      this.memoryCache.clear();
      return true;
    } catch (e) {
      console.error("Error reloading data:", e);
      return false;
    }
  }

  getChampionImageUrl(imageName) {
    if (!imageName) return '';
    return `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/img/champion/${imageName}`;
  }

  getChampionInfo(champKey) {
    if (!this.meta || !this.meta.champions) return null;
    const strKey = String(champKey);
    return this.meta.champions[strKey] || null;
  }

  hasLaneMatchups(champKey, roleKey, rankId = "17") {
    const roleId = String(this.roleCodes[roleKey] || 4);
    const key = String(champKey);
    const data = this.getMatchup(key);
    if (data && data[rankId] && data[rankId][roleId]) {
      const keys = Object.keys(data[rankId][roleId]);
      if (keys.length > 0) return true;
    }
    // Also check symmetry if another champion in cache recorded matchups against this champion
    if (this.matchupsCache) {
      for (const otherKey in this.matchupsCache) {
        const otherData = this.matchupsCache[otherKey];
        if (otherData && otherData[rankId] && otherData[rankId][roleId]) {
          if (otherData[rankId][roleId][key]) return true;
        }
      }
    }
    return false;
  }

  getRoleChampions(roleKey, sortBy = 'alpha') {
    if (!this.meta || !this.meta.roles || !this.meta.roles[roleKey]) {
      return [];
    }
    // Strictly filter to champions that have at least one matchup value in this lane
    const list = this.meta.roles[roleKey].filter(c => this.hasLaneMatchups(c.key, roleKey));
    if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }

  getChampionRoleMeta(champKey, roleKey) {
    const list = this.getRoleChampions(roleKey);
    const strKey = String(champKey);
    return list.find(c => String(c.key) === strKey) || null;
  }

  getMatchup(champId) {
    const key = String(champId);
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    if (this.matchupsCache && this.matchupsCache[key]) {
      return this.matchupsCache[key];
    }
    return null;
  }

  getUserPool(roleKey) {
    let pool = null;
    try {
      // 1. Try saved user pool in localStorage
      const saved = localStorage.getItem(`${this.storagePrefix}${roleKey}`);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          pool = parsed.map(String);
        }
      }
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }

    // First visit (no cached pool in localStorage): start clean with 0 pre-set champions
    if (pool === null) {
      return [];
    }

    // Filter strictly to champions with at least one matchup value in this lane
    return pool.filter(id => this.hasLaneMatchups(id, roleKey));
  }

  getFavoritePool(roleKey) {
    try {
      const savedFav = localStorage.getItem(`${this.favStoragePrefix}${roleKey}`);
      if (savedFav !== null) {
        const parsed = JSON.parse(savedFav);
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(id => this.hasLaneMatchups(id, roleKey));
        }
      }
    } catch (e) {
      console.warn("Error reading favorites:", e);
    }
    return [];
  }

  saveUserPool(roleKey, poolIds) {
    try {
      const valid = poolIds.map(String).filter(id => this.hasLaneMatchups(id, roleKey));
      localStorage.setItem(`${this.storagePrefix}${roleKey}`, JSON.stringify(valid));
    } catch (e) {
      console.warn("Error writing to localStorage:", e);
    }
  }

  saveFavoritePool(roleKey, poolIds) {
    try {
      const valid = poolIds.map(String).filter(id => this.hasLaneMatchups(id, roleKey));
      const serialized = JSON.stringify(valid);
      localStorage.setItem(`${this.favStoragePrefix}${roleKey}`, serialized);
      localStorage.setItem(`${this.storagePrefix}${roleKey}`, serialized);
      return true;
    } catch (e) {
      console.warn("Error saving favorite pool:", e);
      return false;
    }
  }

  isPoolFavorite(roleKey, currentPoolIds) {
    try {
      const savedFav = localStorage.getItem(`${this.favStoragePrefix}${roleKey}`);
      if (!savedFav) return false;
      const parsed = JSON.parse(savedFav);
      if (!Array.isArray(parsed) || parsed.length !== currentPoolIds.length) return false;
      return currentPoolIds.every(id => parsed.includes(String(id)));
    } catch (e) {
      return false;
    }
  }

  resetUserPool(roleKey) {
    try {
      localStorage.removeItem(`${this.storagePrefix}${roleKey}`);
      localStorage.removeItem(`${this.favStoragePrefix}${roleKey}`);
    } catch (e) {}
    return (this.defaultPools[roleKey] || []).map(String);
  }
}
