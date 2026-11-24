/**
 * League of Legends Matchup Analysis Engine
 * Strictly lane-specific: analyzes matchups exclusively for the selected lane.
 */

export class MatchupEngine {
  constructor(dataService) {
    this.dataService = dataService;
    // Official U.GG numeric role codes
    this.roleCodes = {
      top: 4,
      jungle: 1,
      mid: 5,
      adc: 3,
      supp: 2
    };
  }

  /**
   * Retrieves head-to-head matchup statistics strictly for the specified role
   */
  getHeadToHead(myChampId, enemyChampId, roleKey, rankId = "17") {
    const roleId = String(this.roleCodes[roleKey] || 4);
    myChampId = String(myChampId);
    enemyChampId = String(enemyChampId);

    if (myChampId === enemyChampId) {
      return { winrate: 50.0, matches: 0, mirror: true, goldDiff: 0, csDiff: 0, xpDiff: 0 };
    }

    // 1. Direct lookup: my champion vs enemy in THIS role
    const myData = this.dataService.getMatchup(myChampId);
    if (myData && myData[rankId] && myData[rankId][roleId]) {
      const roleObj = myData[rankId][roleId];
      if (roleObj[enemyChampId] && Array.isArray(roleObj[enemyChampId])) {
        const tuple = roleObj[enemyChampId];
        const matches = Number(tuple[1]);
        if (matches > 0) {
          return {
            winrate: Number(tuple[0]),
            matches: matches,
            goldDiff: Number(tuple[2] || 0),
            csDiff: Number(tuple[3] || 0),
            xpDiff: Number(tuple[4] || 0),
            direct: true
          };
        }
      }
    }

    // 2. Symmetry lookup: enemy champion vs me in THIS role
    const enemyData = this.dataService.getMatchup(enemyChampId);
    if (enemyData && enemyData[rankId] && enemyData[rankId][roleId]) {
      const roleObj = enemyData[rankId][roleId];
      if (roleObj[myChampId] && Array.isArray(roleObj[myChampId])) {
        const tuple = roleObj[myChampId];
        const matches = Number(tuple[1]);
        if (matches > 0) {
          const enemyWr = Number(tuple[0]);
          return {
            winrate: Number((100.0 - enemyWr).toFixed(2)),
            matches: matches,
            goldDiff: -Number(tuple[2] || 0),
            csDiff: -Number(tuple[3] || 0),
            xpDiff: -Number(tuple[4] || 0),
            direct: false
          };
        }
      }
    }

    // 3. Strict lane isolation: If no matchup data exists in this role, DO NOT use other lanes!
    return { winrate: null, matches: 0, noData: true, goldDiff: 0, csDiff: 0, xpDiff: 0 };
  }

  /**
   * Computes the complete double-entry table strictly for lane champions
   */
  computeMatrix(roleKey, rankId, userPoolIds, filterMode = 'all', searchQuery = "", sortBy = "name_asc") {
    // Only genuine lane champions (e.g. 59 Top champions)
    const roleOpponents = this.dataService.getRoleChampions(roleKey);
    const userPoolChamps = userPoolIds.map(id => this.dataService.getChampionInfo(id)).filter(Boolean);

    const rows = [];
    const uncoveredOpponents = [];
    const uncoveredDoubleOpponents = [];
    let coveredCount = 0;
    let doubleCoveredCount = 0;
    let relevantOpponentCount = 0;

    // Track best pick counts per pool champion across all lane opponents
    const bestCounts = {};
    const bestWinningCounts = {};
    userPoolChamps.forEach(c => {
      const k = String(c.key);
      bestCounts[k] = 0;
      bestWinningCounts[k] = 0;
    });

    for (const enemy of roleOpponents) {
      relevantOpponentCount++;

      const validPicks = [];
      let hasAnyMatchData = false;
      const cellValues = {};

      for (const myChamp of userPoolChamps) {
        const stat = this.getHeadToHead(myChamp.key, enemy.key, roleKey, rankId);
        cellValues[myChamp.key] = stat;

        // In ranked solo/duo and draft, mirror matchups cannot be played! If enemy picks this champion, user CANNOT pick it!
        const isMirror = String(myChamp.key) === String(enemy.key);

        if (!isMirror && !stat.noData && stat.winrate !== null) {
          hasAnyMatchData = true;
          validPicks.push({
            champion: myChamp,
            winrate: stat.winrate,
            matches: stat.matches,
            goldDiff: stat.goldDiff
          });
        }
      }

      // Sort pool champions descending by winrate against this enemy
      validPicks.sort((a, b) => b.winrate - a.winrate);

      const bestPick = validPicks[0] || null;
      const secondPick = validPicks[1] || null;
      const bestWinrate = bestPick ? bestPick.winrate : -1;
      const secondWinrate = secondPick ? secondPick.winrate : null;

      const winningPicks = validPicks.filter(p => p.winrate >= 50.0);
      const isCovered = winningPicks.length >= 1;
      const isDoubleCovered = winningPicks.length >= 2;

      // Record best pick count across all opponents in this lane
      if (bestPick && bestPick.champion) {
        const bestKey = String(bestPick.champion.key);
        if (bestCounts[bestKey] !== undefined) {
          bestCounts[bestKey]++;
          if (bestWinrate >= 50.0) {
            bestWinningCounts[bestKey]++;
          }
        }
      }

      if (isCovered) {
        coveredCount++;
      } else {
        uncoveredOpponents.push({
          enemy,
          bestWinrate: bestWinrate >= 0 ? bestWinrate : null,
          bestPick,
          hasData: hasAnyMatchData
        });
      }

      if (isDoubleCovered) {
        doubleCoveredCount++;
      } else {
        uncoveredDoubleOpponents.push({
          enemy,
          bestWinrate: bestWinrate >= 0 ? bestWinrate : null,
          secondWinrate,
          bestPick,
          secondPick,
          winningPicksCount: winningPicks.length,
          hasData: hasAnyMatchData
        });
      }

      // Check text search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        if (!enemy.name.toLowerCase().includes(q)) {
          continue;
        }
      }

      // Check uncovered filters (single vs double coverage)
      if (filterMode === true || filterMode === 'uncovered') {
        if (isCovered) continue;
      } else if (filterMode === 'uncovered_double') {
        if (isDoubleCovered) continue;
      }

      rows.push({
        enemy,
        cells: cellValues,
        bestPick,
        secondPick,
        bestWinrate: bestWinrate >= 0 ? bestWinrate : null,
        secondWinrate,
        isCovered,
        isDoubleCovered,
        winningPicksCount: winningPicks.length,
        hasData: hasAnyMatchData,
        vulnerability: !hasAnyMatchData ? 'unknown' : bestWinrate < 46.5 ? 'critical' : bestWinrate < 49.0 ? 'high' : bestWinrate < 50.0 ? 'slight' : 'safe'
      });
    }

    // Sort uncovered lists by pick rate / meta danger
    uncoveredOpponents.sort((a, b) => (b.enemy.pickrate || 0) - (a.enemy.pickrate || 0));
    uncoveredDoubleOpponents.sort((a, b) => (b.enemy.pickrate || 0) - (a.enemy.pickrate || 0));

    // Sort rows (Left column): Default is strictly Alphabetical (A-Z)
    if (sortBy === 'name_desc') {
      rows.sort((a, b) => b.enemy.name.localeCompare(a.enemy.name));
    } else if (sortBy === 'meta_tier') {
      rows.sort((a, b) => (b.enemy.pickrate || 0) - (a.enemy.pickrate || 0));
    } else if (sortBy === 'winrate_asc') {
      rows.sort((a, b) => {
        const wrA = a.bestWinrate !== null ? a.bestWinrate : 999;
        const wrB = b.bestWinrate !== null ? b.bestWinrate : 999;
        return wrA - wrB;
      });
    } else {
      // Default: Alphabetical A-Z
      rows.sort((a, b) => a.enemy.name.localeCompare(b.enemy.name));
    }

    const coveragePct = relevantOpponentCount > 0 
      ? Number(((coveredCount / relevantOpponentCount) * 100).toFixed(1)) 
      : 100;
    const doubleCoveragePct = relevantOpponentCount > 0 
      ? Number(((doubleCoveredCount / relevantOpponentCount) * 100).toFixed(1)) 
      : 0;

    return {
      rows,
      userPoolChamps,
      roleOpponents,
      bestCounts,
      bestWinningCounts,
      stats: {
        totalOpponents: relevantOpponentCount,
        coveredCount,
        uncoveredCount: uncoveredOpponents.length,
        coveragePct,
        doubleCoveredCount,
        uncoveredDoubleCount: uncoveredDoubleOpponents.length,
        doubleCoveragePct
      },
      uncoveredOpponents,
      uncoveredDoubleOpponents
    };
  }

  /**
   * Generates smart champion suggestions to patch pool vulnerabilities strictly from this lane
   * Ranks candidates comprehensively:
   * 1. Candidates that fix single coverage blind spots (0 winning picks) - highest priority
   * 2. Candidates that fix double coverage vulnerabilities (1 winning pick) - anti-ban priority
   * 3. Overall meta strength (winrate, pickrate, tier)
   */
  getCoverageRecommendations(roleKey, rankId, userPoolIds, uncoveredList = [], uncoveredDoubleList = [], limit = null) {
    const roleOpponents = this.dataService.getRoleChampions(roleKey);
    const poolSet = new Set(userPoolIds.map(String));
    // Candidate MUST be a legitimate champion of this lane!
    const candidateChampions = roleOpponents.filter(c => !poolSet.has(String(c.key)));

    if (!candidateChampions.length) return [];

    const recommendations = [];
    const singleSet = new Set((uncoveredList || []).map(u => String(u.enemy.key)));

    for (const cand of candidateChampions) {
      const candKeyStr = String(cand.key);
      const singleCovered = [];
      const doubleCovered = [];

      // Check single blind spots (0 winning picks)
      if (uncoveredList && uncoveredList.length > 0) {
        for (const unc of uncoveredList) {
          if (candKeyStr === String(unc.enemy.key)) continue; // No mirror
          const stat = this.getHeadToHead(cand.key, unc.enemy.key, roleKey, rankId);
          if (!stat.noData && stat.winrate !== null && stat.winrate >= 50.0) {
            singleCovered.push(unc.enemy.name);
          }
        }
      }

      // Check double blind spots (1 winning pick) - exclude those already in single blind spots
      if (uncoveredDoubleList && uncoveredDoubleList.length > 0) {
        for (const unc of uncoveredDoubleList) {
          const enemyKeyStr = String(unc.enemy.key);
          if (candKeyStr === enemyKeyStr) continue; // No mirror
          if (singleSet.has(enemyKeyStr)) continue; // Already counted as single blind spot

          const stat = this.getHeadToHead(cand.key, unc.enemy.key, roleKey, rankId);
          if (!stat.noData && stat.winrate !== null && stat.winrate >= 50.0) {
            doubleCovered.push(unc.enemy.name);
          }
        }
      }

      const singleCoversCount = singleCovered.length;
      const doubleCoversCount = doubleCovered.length;
      const tierBonus = cand.tier === 'S+' ? 4 : cand.tier === 'S' ? 2 : cand.tier === 'A' ? 1 : 0;
      const wrScore = (cand.winrate || 50.0) - 50.0;
      
      // Score: 100 per single blind spot covered, 15 per double blind spot covered, plus winrate and tier
      const score = (singleCoversCount * 100) + (doubleCoversCount * 15) + wrScore + tierBonus;

      recommendations.push({
        champion: cand,
        singleCovered,
        singleCoversCount,
        doubleCovered,
        doubleCoversCount,
        score
      });
    }

    // Sort descending by score, then by champion winrate
    recommendations.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.champion.winrate || 0) - (a.champion.winrate || 0);
    });

    return limit ? recommendations.slice(0, limit) : recommendations;
  }

  /**
   * Quick Draft Helper: Instant counter-pick advice strictly in this lane
   */
  getDraftAdvice(enemyChampId, userPoolIds, roleKey, rankId) {
    const enemyMeta = this.dataService.getChampionInfo(enemyChampId);
    if (!enemyMeta) return null;

    // Filter out mirror champion in ranked: cannot pick enemy's champion!
    const matchups = userPoolIds
      .filter(myId => String(myId) !== String(enemyChampId))
      .map(myId => {
        const myInfo = this.dataService.getChampionInfo(myId);
        const stat = this.getHeadToHead(myId, enemyChampId, roleKey, rankId);
        return {
          champion: myInfo,
          ...stat
        };
      }).filter(m => !m.noData); // Only picks with real lane matchup data

    matchups.sort((a, b) => (b.winrate || 0) - (a.winrate || 0));

    return {
      enemy: enemyMeta,
      matchups,
      bestPick: matchups.length > 0 ? matchups[0] : null,
      isCovered: matchups.length > 0 && matchups[0].winrate >= 50.0
    };
  }
}
