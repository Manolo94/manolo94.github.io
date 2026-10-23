// World check: fast reachability analysis for the whole world.
//
// The world is compiled once into a graph of cells (one node per grid cell inside a level, with the
//  doors between them and the objective each gate needs). Reachability then uses a fixpoint: flood fill
//  the cells reachable with the objectives in hand, pick up every objective in them, and repeat until
//  nothing new is picked up. This is exact for this planner because collecting an objective never closes
//  anything (no one-way doors, no keys that get used up), so the order of pickups does not matter.
//  It answers "what can be reached" in polynomial time; Calculate Path is still needed for an actual route.

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Values in WorldGraph.needs
const NEEDS_NOTHING = -1;
const NEEDS_REMOVED_OBJECTIVE = -2; // a gate whose objective was deleted: it never opens

class WorldGraph
{
  // Compile the current grid. Movement uses GridState.canPassThrough, so walls and doors behave exactly
  //  as in Calculate Path; gates are kept apart so they can be checked against any set of objectives.
  static build(grid)
  {
    Objective.updateAllObjectives();
    let g = new WorldGraph();
    let objectives = Objective.allObjectives;
    g.objectiveCount = objectives.length;
    g.cellIndex = new Map(); // "x,y" -> cell index
    g.cellX = [];
    g.cellY = [];
    g.cellLevel = [];

    grid.levels.forEach((level) =>
    {
      for(let x = level.pos.x; x < level.pos.x + level.size.x; x++)
        for(let y = level.pos.y; y < level.pos.y + level.size.y; y++)
        {
          let key = x + "," + y;
          if(g.cellIndex.has(key)) continue;
          // Same rule as canPassThrough: a cell belongs to the first level that contains it
          let owner = grid.levels.find((l) => l.isPositionInLevel(createVector(x + 0.5, y + 0.5)));
          g.cellIndex.set(key, g.cellX.length);
          g.cellX.push(x);
          g.cellY.push(y);
          g.cellLevel.push(owner);
        }
    });

    let cellCount = g.cellX.length;
    g.neighbors = new Array(cellCount);
    g.needs = new Int32Array(cellCount).fill(NEEDS_NOTHING);
    g.objectiveAt = new Int32Array(cellCount).fill(-1);
    g.removedObjectiveGates = 0;

    // Doors and walls only: with every objective found, obstacles never block
    let everything = objectives.map(() => true);
    for(let c = 0; c < cellCount; c++)
    {
      let center = createVector(g.cellX[c] + 0.5, g.cellY[c] + 0.5);
      let list = [];
      DIRECTIONS.forEach(([dx, dy]) =>
      {
        if(!grid.canPassThrough(center, createVector(dx, dy), everything)) return;
        let dest = g.cellIndex.get((g.cellX[c] + dx) + "," + (g.cellY[c] + dy));
        if(dest !== undefined) list.push(dest);
      });
      g.neighbors[c] = list;
    }

    // Gates: the obstacle in the cell's own level (the level checkIfObstacleBlocks looks at)
    for(let c = 0; c < cellCount; c++)
    {
      let level = g.cellLevel[c];
      let obs = level.obstacles.find((o) => o.pos.x == g.cellX[c] - level.pos.x && o.pos.y == g.cellY[c] - level.pos.y);
      if(obs === undefined) continue;
      let idx = WorldGraph.obstacleObjectiveIndex(obs);
      if(idx < 0) g.removedObjectiveGates++;
      g.needs[c] = idx;
    }

    // Objectives: the first objective listed at a cell is the one picked up there (as in Calculate Path)
    objectives.forEach((obj, i) =>
    {
      let c = g.cellIndex.get((obj.pos.x + obj.parentLevelPos.x) + "," + (obj.pos.y + obj.parentLevelPos.y));
      if(c !== undefined && g.objectiveAt[c] < 0) g.objectiveAt[c] = i;
    });
    g.objectiveCell = objectives.map((obj) =>
    {
      let c = g.cellIndex.get((obj.pos.x + obj.parentLevelPos.x) + "," + (obj.pos.y + obj.parentLevelPos.y));
      return c === undefined ? -1 : c;
    });

    g.start = g.cellAt(grid.startPosition.x, grid.startPosition.y);
    g.end = g.cellAt(grid.endPosition.x, grid.endPosition.y);
    return g;
  }

  static obstacleObjectiveIndex(obs)
  {
    let all = Objective.allObjectives;
    if(obs.parentObjective !== undefined)
      return all.includes(obs.parentObjective) ? obs.parentObjective.index : NEEDS_REMOVED_OBJECTIVE;
    let idx = obs.unlockedByObjectiveIdx;
    return Number.isInteger(idx) && idx >= 0 && idx < all.length ? idx : NEEDS_REMOVED_OBJECTIVE;
  }

  cellAt(x, y)
  {
    let c = this.cellIndex.get(Math.floor(x) + "," + Math.floor(y));
    return c === undefined ? -1 : c;
  }

  // Everything reachable from the start.
  //  have[i]: objective i is in hand from the start. never[i]: objective i is never picked up.
  //  Returns { reach: Uint8Array per cell, got: Uint8Array per objective }.
  fixpoint(have, never)
  {
    let got = Uint8Array.from(have);
    let reach = new Uint8Array(this.cellX.length);
    if(this.start < 0) return { reach, got };

    let canEnter = (c) => this.needs[c] == NEEDS_NOTHING || (this.needs[c] >= 0 && got[this.needs[c]] == 1);
    let pick = (c) =>
    {
      let o = this.objectiveAt[c];
      if(o >= 0 && !never[o] && !got[o]) { got[o] = 1; return true; }
      return false;
    };

    // Flood fill; cells turned away by a closed gate wait in 'blocked' and are retried after each pickup
    let queue = [this.start];
    reach[this.start] = 1;
    pick(this.start);
    let blocked = [];
    let pickedSomething = false;
    while(true)
    {
      while(queue.length > 0)
      {
        let c = queue.pop();
        let next = this.neighbors[c];
        for(let k = 0; k < next.length; k++)
        {
          let d = next[k];
          if(reach[d]) continue;
          if(!canEnter(d)) { blocked.push(d); continue; }
          reach[d] = 1;
          if(pick(d)) pickedSomething = true;
          queue.push(d);
        }
      }
      // Gates only change when the objectives in hand change
      if(!pickedSomething) break;
      pickedSomething = false;
      let retry = blocked;
      blocked = [];
      retry.forEach((d) =>
      {
        if(reach[d]) return;
        if(!canEnter(d)) { blocked.push(d); return; }
        reach[d] = 1;
        if(pick(d)) pickedSomething = true;
        queue.push(d);
      });
      if(queue.length == 0 && !pickedSomething) break;
    }
    return { reach, got };
  }
}

// Objective toggles: "auto" (pick it up if reachable), "have" (in hand from the start), "never" (ignored).
//  Kept per Objective object so they survive renumbering while the world is edited.
const objectiveModes = new Map();
function getObjectiveMode(obj) { return objectiveModes.get(obj) || "auto"; }

class WorldCheck
{
  // Full analysis under the current toggles
  static analyze(grid)
  {
    let g = WorldGraph.build(grid);
    let n = g.objectiveCount;
    let modes = Objective.allObjectives.map(getObjectiveMode);
    let have = Uint8Array.from(modes, (m) => m == "have" ? 1 : 0);
    let never = Uint8Array.from(modes, (m) => m == "never" ? 1 : 0);

    let base = g.fixpoint(have, never);
    let r = { graph: g, modes, have, never, base, without: new Array(n).fill(null) };

    // For every objective in hand: what is lost without it. A cell needs objective j when it is
    //  reachable normally but not with j taken away, so one extra fill per objective gives every
    //  cell's requirements at once.
    for(let j = 0; j < n; j++)
    {
      if(!base.got[j]) continue;
      let have2 = Uint8Array.from(have); have2[j] = 0;
      let never2 = Uint8Array.from(never); never2[j] = 1;
      r.without[j] = g.fixpoint(have2, never2);
    }

    let cellCount = g.cellX.length;
    r.reachableCount = base.reach.reduce((a, b) => a + b, 0);
    r.cellCount = cellCount;
    r.endReachable = g.end >= 0 && base.reach[g.end] == 1;

    // Gate cells per objective
    let gatesOf = Array.from({ length: n }, () => []);
    for(let c = 0; c < cellCount; c++) if(g.needs[c] >= 0) gatesOf[g.needs[c]].push(c);
    r.gatesOf = gatesOf;

    r.objectives = Objective.allObjectives.map((obj, i) =>
    {
      let cell = g.objectiveCell[i];
      let status = modes[i] == "have" ? "have" : modes[i] == "never" ? "never" : base.got[i] ? "collected" : "unreachable";
      let info = { index: i, color: obj.color, status, requires: [], lostCells: 0, lostObjectives: [] };
      if(status == "collected" && cell >= 0) info.requires = WorldCheck.requiresOf(r, cell);
      if(r.without[i])
      {
        info.lostCells = cellCount ? r.reachableCount - r.without[i].reach.reduce((a, b) => a + b, 0) : 0;
        for(let k = 0; k < n; k++)
          if(k != i && base.got[k] && !have[k] && !r.without[i].got[k]) info.lostObjectives.push(k);
      }
      return info;
    });

    // Warnings
    r.warnings = [];
    if(g.start < 0) r.warnings.push("The start position is not inside a level.");
    if(g.end < 0) r.warnings.push("The end position is not inside a level.");
    else if(!r.endReachable) r.warnings.push("The end position cannot be reached.");
    r.objectives.forEach((o) =>
    {
      if(o.status == "unreachable") r.warnings.push("Objective #" + o.index + " can never be collected.");
    });
    for(let k = 0; k < n; k++)
    {
      if(gatesOf[k].length == 0 || !r.without[k] || have[k]) continue;
      // Every cell lost without k is one of k's own gates: the gates hold nothing behind them
      let gateSet = new Set(gatesOf[k]);
      let holdsSomething = false;
      for(let c = 0; c < cellCount && !holdsSomething; c++)
        if(base.reach[c] && !r.without[k].reach[c] && !gateSet.has(c)) holdsSomething = true;
      if(!holdsSomething)
        r.warnings.push("Gates needing #" + k + " block nothing new (there is a way around them, or they lead nowhere).");
    }
    if(g.removedObjectiveGates > 0)
      r.warnings.push(g.removedObjectiveGates + " gate(s) need an objective that was removed, so they never open.");
    return r;
  }

  // Objectives every route to this (reachable) cell needs
  static requiresOf(r, cell)
  {
    let list = [];
    for(let j = 0; j < r.graph.objectiveCount; j++)
      if(r.without[j] && !r.without[j].reach[cell]) list.push(j);
    return list;
  }

  // Everything the cell popup shows, worked out when the cell is clicked
  static describeCell(r, x, y)
  {
    let g = r.graph;
    let c = g.cellAt(x, y);
    if(c < 0) return null;
    let level = g.cellLevel[c];
    let d = { cell: c, x: g.cellX[c], y: g.cellY[c], level: level.name || level.id,
              objective: g.objectiveAt[c], gate: g.needs[c], reachable: r.base.reach[c] == 1 };

    if(d.reachable)
    {
      d.requires = WorldCheck.requiresOf(r, c);
      // Are these enough on their own? If not, the rest is an either/or between several routes
      let have = Uint8Array.from(r.have);
      let never = Uint8Array.from(r.have, (h) => h ? 0 : 1);
      d.requires.forEach((j) => { have[j] = 1; never[j] = 0; });
      d.exact = g.fixpoint(have, never).reach[c] == 1;
    }
    else
    {
      let n = g.objectiveCount;
      let all = new Uint8Array(n).fill(1), none = new Uint8Array(n);
      if(!g.fixpoint(all, none).reach[c]) d.reason = "No doors lead here from the start, even with every objective.";
      else if(r.never.some((v) => v) && g.fixpoint(r.have, none).reach[c]) d.reason = "Opens if objectives set to Never are allowed.";
      else d.reason = "Behind gates whose objectives can't be collected.";
    }

    if(d.objective >= 0) d.objectiveInfo = r.objectives[d.objective];
    return d;
  }
}
