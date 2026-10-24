// Hierarchical Calculate path: the same shortest route as PathSearch, found on a much smaller graph.
//
// Instead of stepping cell by cell, the search jumps between key points: the start, the end, the cells of
// the objectives it tracks, and the cells on cluster borders. A cluster is a map region (levels without a
// region are each their own cluster). Distances between the key points of one cluster depend only on the
// gates and objectives inside it, so they are computed once per combination and cached.
//
// On top of that:
//  - A* with a lower bound on what's left (via the farthest required objective, then to the end), using
//    distances with every gate open, so it explores far fewer orders and stays exact.
//  - States that are clearly worse (same point, fewer objectives, no fewer steps) are dropped.
//  - A quick greedy route (nearest objective first) is found up front: it is shown at once and caps the search.
//
// Exact under the planner's rules: objectives are only picked up, gates never close, and passing an
// objective's cell always collects it, so a route can be cut into hops that each end at a key point.

class HierarchicalPathSearch
{
  static MAX_STATES = 6000000;
  static MAX_TRACKED = 30;        // masks are 32-bit numbers; PathSearch handles bigger sets
  static DOMINANCE_WINDOW = 48;   // how many earlier states per point are compared for dominance

  // Same options as PathSearch: have, never, required (Uint8Array per objective)
  constructor(grid, fromPosition, toPosition, options = {})
  {
    let g = this.graph = WorldGraph.build(grid);
    let n = g.objectiveCount, cellCount = g.cellX.length;
    this.have = options.have || new Uint8Array(n);
    this.never = options.never || new Uint8Array(n);
    this.required = options.required || new Uint8Array(n).fill(1);
    this.start = g.cellAt(fromPosition.x, fromPosition.y);
    this.end = g.cellAt(toPosition.x, toPosition.y);
    this.status = "ready";
    this.message = "";
    this.statesSearched = 0;
    this.elapsedMs = 0;
    this.greedyLength = -1;

    if(this.start < 0) return this.fail("the start position is not inside a level");
    if(this.end < 0) return this.fail("the end position is not inside a level");
    let conflicts = [];
    for(let i = 0; i < n; i++) if(this.required[i] && this.never[i] && !this.have[i]) conflicts.push("#" + i);
    if(conflicts.length > 0) return this.fail("objective " + conflicts.join(", ") + " is required but set to Never");
    let reach = g.fixpoint(this.have, this.never, this.start);
    let missing = [];
    for(let i = 0; i < n; i++) if(this.required[i] && !reach.got[i]) missing.push("#" + i);
    if(missing.length > 0) return this.fail("objective " + missing.join(", ") + " can never be collected");
    if(!reach.reach[this.end]) return this.fail("the end position can't be reached");

    // Tracked objectives: required ones and those that open a gate, minus the ones in hand
    let gateObjectives = new Set();
    for(let c = 0; c < cellCount; c++) if(g.needs[c] >= 0) gateObjectives.add(g.needs[c]);
    this.bitOf = new Int32Array(n).fill(-1);
    this.tracked = [];
    for(let i = 0; i < n; i++)
      if((this.required[i] || gateObjectives.has(i)) && !this.have[i] && !this.never[i])
      {
        this.bitOf[i] = this.tracked.length;
        this.tracked.push(i);
      }
    this.tooBig = this.tracked.length > HierarchicalPathSearch.MAX_TRACKED;
    if(this.tooBig) return;
    this.targetMask = 0;
    this.tracked.forEach((i) => { if(this.required[i]) this.targetMask |= 1 << this.bitOf[i]; });

    // Bit picked up in each cell (-1 for none), and the bit each gate needs (-1 open, -2 never opens)
    this.pickBit = new Int32Array(cellCount).fill(-1);
    for(let c = 0; c < cellCount; c++)
    {
      let o = g.objectiveAt[c];
      if(o >= 0 && this.bitOf[o] >= 0) this.pickBit[c] = this.bitOf[o];
    }
    this.gateBit = new Int32Array(cellCount).fill(-1);
    for(let c = 0; c < cellCount; c++)
    {
      let need = g.needs[c];
      if(need == NEEDS_NOTHING || (need >= 0 && this.have[need])) continue;
      this.gateBit[c] = need >= 0 && this.bitOf[need] >= 0 ? this.bitOf[need] : -2;
    }

    // Clusters: regions, or one per level when it has none
    let clusterIds = new Map();
    this.cluster = new Int32Array(cellCount);
    for(let c = 0; c < cellCount; c++)
    {
      let level = g.cellLevel[c];
      let key = level.region ? "r:" + level.region : "l:" + level.id + ":" + grid.levels.indexOf(level);
      if(!clusterIds.has(key)) clusterIds.set(key, clusterIds.size);
      this.cluster[c] = clusterIds.get(key);
    }
    let clusterCount = clusterIds.size;
    this.clusterMask = new Int32Array(clusterCount);   // bits whose gates or objectives lie in the cluster
    for(let c = 0; c < cellCount; c++)
    {
      if(this.gateBit[c] >= 0) this.clusterMask[this.cluster[c]] |= 1 << this.gateBit[c];
      if(this.pickBit[c] >= 0) this.clusterMask[this.cluster[c]] |= 1 << this.pickBit[c];
    }

    // Key points
    this.pointOf = new Int32Array(cellCount).fill(-1);
    this.pointCell = [];
    let addPoint = (c) => { if(this.pointOf[c] < 0) { this.pointOf[c] = this.pointCell.length; this.pointCell.push(c); } };
    addPoint(this.start); addPoint(this.end);
    for(let c = 0; c < cellCount; c++) if(this.pickBit[c] >= 0) addPoint(c);
    for(let c = 0; c < cellCount; c++)
      if(g.neighbors[c].some((d) => this.cluster[d] != this.cluster[c])) addPoint(c);
    // Steps across a cluster border: point -> [neighbor point]
    this.crossings = this.pointCell.map((c) => g.neighbors[c].filter((d) => this.cluster[d] != this.cluster[c]).map((d) => this.pointOf[d]));
    this.tables = new Map();   // cluster * 2^31 + local mask -> Map(source point -> [[point, dist], ...])

    // Lower bounds with every gate open: distance from each tracked objective (and the end) to everywhere
    this.openDistToEnd = g.distancesTo(this.end);
    this.requiredBits = this.tracked.map((i, b) => b).filter((b) => (this.targetMask >> b) & 1);
    this.openDistToObjective = this.requiredBits.map((b) => g.distancesTo(this.tracked[b] !== undefined ? g.objectiveCell[this.tracked[b]] : -1));

    // A quick greedy route caps the search and is shown right away
    let greedy = this.greedyRoute();
    this.bound = greedy ? greedy.length - 1 : Infinity;
    this.greedyCells = greedy;
    this.greedyLength = greedy ? greedy.length - 1 : -1;

    // Search state storage
    this.statePoint = []; this.stateMask = []; this.stateCost = []; this.stateParent = [];
    this.buckets = [];       // f -> state indices
    this.bucket = 0;
    this.closed = new Set();
    this.settledAt = this.pointCell.map(() => []);   // recent settled [mask, cost] per point, for dominance
    let m0 = this.pick(this.start, 0);
    this.push(this.pointOf[this.start], m0, 0, -1);
    this.best = 0;
    this.bestScore = -Infinity;
    this.found = -1;
  }

  fail(reason)
  {
    this.status = "failed";
    this.message = "No path: " + reason + ".";
    return this;
  }

  pick(cell, mask) { return this.pickBit[cell] >= 0 ? mask | (1 << this.pickBit[cell]) : mask; }

  canEnter(cell, mask)
  {
    let b = this.gateBit[cell];
    return b == -1 || (b >= 0 && ((mask >> b) & 1) == 1);
  }

  // Lower bound on the steps left from a cell with a mask (consistent, so A* stays exact)
  heuristic(cell, mask)
  {
    let h = this.openDistToEnd[cell];
    for(let k = 0; k < this.requiredBits.length; k++)
    {
      let b = this.requiredBits[k];
      if((mask >> b) & 1) continue;
      let o = this.graph.objectiveCell[this.tracked[b]];
      let v = this.openDistToObjective[k][cell] + this.openDistToEnd[o];
      if(v > h) h = v;
    }
    return h;
  }

  push(point, mask, cost, parent)
  {
    let f = cost + this.heuristic(this.pointCell[point], mask);
    if(f > this.bound) return;
    let s = this.statePoint.length;
    this.statePoint.push(point); this.stateMask.push(mask); this.stateCost.push(cost); this.stateParent.push(parent);
    (this.buckets[f] || (this.buckets[f] = [])).push(s);
    if(f < this.bucket) this.bucket = f;
  }

  // Distances from one key point to the others in its cluster, for the gates and objectives it holds
  hopsFrom(point, mask)
  {
    let cell = this.pointCell[point];
    let k = this.cluster[cell];
    let key = k * 2147483648 + (mask & this.clusterMask[k]);
    let table = this.tables.get(key);
    if(table === undefined) { table = new Map(); this.tables.set(key, table); }
    let hops = table.get(point);
    if(hops !== undefined) return hops;

    // BFS inside the cluster; an objective not collected yet ends a hop (passing it would collect it)
    let g = this.graph;
    hops = [];
    let dist = new Map([[cell, 0]]);
    let queue = [cell];
    for(let head = 0; head < queue.length; head++)
    {
      let c = queue[head], d0 = dist.get(c);
      if(c != cell)
      {
        if(this.pointOf[c] >= 0) hops.push([this.pointOf[c], d0]);
        if(this.pickBit[c] >= 0 && !((mask >> this.pickBit[c]) & 1)) continue;
      }
      let next = g.neighbors[c];
      for(let i = 0; i < next.length; i++)
      {
        let d = next[i];
        if(this.cluster[d] != k || dist.has(d) || !this.canEnter(d, mask)) continue;
        dist.set(d, d0 + 1);
        queue.push(d);
      }
    }
    table.set(point, hops);
    return hops;
  }

  dominated(point, mask, cost)
  {
    let list = this.settledAt[point];
    for(let i = list.length - 1; i >= 0; i--)
      if((list[i][0] & mask) == mask && list[i][1] <= cost) return true;
    return false;
  }

  requiredCollected(mask)
  {
    let m = mask & this.targetMask;
    m = m - ((m >> 1) & 0x55555555);
    m = (m & 0x33333333) + ((m >> 2) & 0x33333333);
    return (((m + (m >> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
  }

  get requiredCount() { return this.requiredBits ? this.requiredBits.length : 0; }

  step(budgetMs)
  {
    if(this.status == "ready" || this.status == "paused") this.status = "running";
    if(this.status != "running") return this.status;
    let t0 = performance.now(), checked = 0;
    while(true)
    {
      while(this.bucket < this.buckets.length && (!this.buckets[this.bucket] || this.buckets[this.bucket].length == 0)) this.bucket++;
      if(this.bucket >= this.buckets.length) break;
      let s = this.buckets[this.bucket].pop();
      let point = this.statePoint[s], mask = this.stateMask[s], cost = this.stateCost[s];
      let key = mask * this.pointCell.length + point;
      if(this.closed.has(key)) continue;
      this.closed.add(key);
      if(this.dominated(point, mask, cost)) continue;
      let settled = this.settledAt[point];
      settled.push([mask, cost]);
      if(settled.length > HierarchicalPathSearch.DOMINANCE_WINDOW) settled.shift();
      this.statesSearched++;

      let cell = this.pointCell[point];
      if(cell == this.end && (mask & this.targetMask) == this.targetMask)
      {
        this.found = s; this.best = s;
        this.status = "found";
        break;
      }
      let score = this.requiredCollected(mask) * 1e6 - this.openDistToEnd[cell];
      if(score > this.bestScore) { this.bestScore = score; this.best = s; }

      let hops = this.hopsFrom(point, mask);
      for(let i = 0; i < hops.length; i++)
        this.push(hops[i][0], this.pick(this.pointCell[hops[i][0]], mask), cost + hops[i][1], s);
      let across = this.crossings[point];
      for(let i = 0; i < across.length; i++)
      {
        let d = this.pointCell[across[i]];
        if(this.canEnter(d, mask)) this.push(across[i], this.pick(d, mask), cost + 1, s);
      }

      if(this.statePoint.length > HierarchicalPathSearch.MAX_STATES)
      {
        this.status = "stopped";
        this.message = "Stopped after " + HierarchicalPathSearch.MAX_STATES.toLocaleString() + " states to keep memory in check. " +
                       (this.greedyCells ? "Showing the quick route, which is valid but may not be the shortest." : "Showing the best partial route.");
        break;
      }
      if(++checked % 256 == 0 && performance.now() - t0 > budgetMs) break;
    }
    if(this.status == "running" && this.bucket >= this.buckets.length)
    {
      // Nothing beats the quick route, so it is the shortest
      if(this.greedyCells) { this.status = "found"; this.found = -2; }
      else { this.status = "failed"; this.message = "No path: no route collects the required objectives and then reaches the end."; }
    }
    this.elapsedMs += performance.now() - t0;
    return this.status;
  }

  pause() { if(this.status == "running" || this.status == "ready") this.status = "paused"; }

  stop()
  {
    if(this.isActive) { this.status = "stopped"; this.message = this.greedyCells ? "Showing the quick route, which is valid but may not be the shortest." : "Showing the best partial route found."; }
  }

  get isActive() { return this.status == "ready" || this.status == "running" || this.status == "paused"; }

  // ----- turning states back into cells -----

  // Cells from the start to state s (start first)
  cellsToState(s)
  {
    let chain = [];
    for(let t = s; t >= 0; t = this.stateParent[t]) chain.push(t);
    chain.reverse();
    let cells = [this.pointCell[this.statePoint[chain[0]]]];
    for(let i = 1; i < chain.length; i++)
    {
      let from = this.pointCell[this.statePoint[chain[i - 1]]], to = this.pointCell[this.statePoint[chain[i]]];
      let mask = this.stateMask[chain[i - 1]];
      let piece = this.graph.neighbors[from].includes(to) && this.cluster[from] != this.cluster[to]
        ? [from, to] : this.cellPath(from, to, mask, true);
      cells.push(...piece.slice(1));
    }
    return cells;
  }

  // Shortest cell path from a to b with a mask (inside a's cluster when sameCluster), stopping at uncollected objectives
  cellPath(a, b, mask, sameCluster)
  {
    let g = this.graph, prev = new Map([[a, -1]]), queue = [a];
    for(let head = 0; head < queue.length; head++)
    {
      let c = queue[head];
      if(c == b) break;
      if(c != a && this.pickBit[c] >= 0 && !((mask >> this.pickBit[c]) & 1)) continue;
      for(let d of g.neighbors[c])
      {
        if(prev.has(d) || !this.canEnter(d, mask) || (sameCluster && this.cluster[d] != this.cluster[a])) continue;
        prev.set(d, c);
        queue.push(d);
      }
    }
    let path = [];
    for(let c = b; c != -1 && c !== undefined; c = prev.get(c)) path.push(c);
    return path.reverse();
  }

  // Greedy: walk to the nearest required objective not yet collected (or, when none can be reached, the
  //  nearest objective that opens a gate), then to the end. Returns the cells, or null.
  greedyRoute()
  {
    let g = this.graph, mask = this.pick(this.start, 0), at = this.start, route = [this.start];
    for(let guard = 0; guard <= this.tracked.length + 1; guard++)
    {
      let done = (mask & this.targetMask) == this.targetMask;
      let prev = new Map([[at, -1]]), queue = [at], goal = -1, fallback = -1;
      for(let head = 0; head < queue.length && goal < 0; head++)
      {
        let c = queue[head];
        if(c != at)
        {
          let b = this.pickBit[c];
          if(done && c == this.end) { goal = c; break; }
          if(b >= 0 && !((mask >> b) & 1))
          {
            if(!done && ((this.targetMask >> b) & 1)) { goal = c; break; }
            if(fallback < 0) fallback = c;   // opens a gate: the way on when nothing required is in reach
          }
        }
        for(let d of g.neighbors[c])
          if(!prev.has(d) && this.canEnter(d, mask)) { prev.set(d, c); queue.push(d); }
      }
      if(goal < 0) goal = fallback;
      if(goal < 0) return null;
      let piece = [];
      for(let c = goal; c != -1; c = prev.get(c)) piece.push(c);
      piece.reverse();
      piece.slice(1).forEach((c) => { route.push(c); mask = this.pick(c, mask); });
      at = goal;
      if(at == this.end && (mask & this.targetMask) == this.targetMask) return route;
    }
    return null;
  }

  routeCells()
  {
    if(this.statePoint === undefined) return [];
    if(this.status == "found" && this.found == -2) return this.greedyCells;
    if(this.status == "found") return this.cellsToState(this.found);
    if(this.greedyCells) return this.greedyCells;   // a complete route beats a partial one while searching
    return this.cellsToState(this.best);
  }

  routeStack()
  {
    let g = this.graph;
    return this.routeCells().slice().reverse().map((c) => createVector(g.cellX[c], g.cellY[c]));
  }

  routeObjectives()
  {
    let g = this.graph, got = new Set(), list = [];
    this.routeCells().forEach((c) =>
    {
      let o = g.objectiveAt[c];
      if(o >= 0 && !this.never[o] && !this.have[o] && !got.has(o)) { got.add(o); list.push(o); }
    });
    return list;
  }

  get bestDepth() { return this.routeCells().length - 1; }
  get bestRequiredCollected()
  {
    let route = this.routeCells(), mask = 0;
    route.forEach((c) => { mask = this.pick(c, mask); });
    return this.requiredCollected(mask);
  }
  get bestDistanceToEnd() { let r = this.routeCells(); return r.length ? this.openDistToEnd[r[r.length - 1]] : 0; }
  get cachedTables() { return this.tables ? this.tables.size : 0; }
}
