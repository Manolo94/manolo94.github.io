// Calculate path: the shortest route from the start to the end that collects the required objectives.
//
// The search is breadth first over (cell, objectives collected), run a slice at a time with step(), so it can
//  run in the background, be paused, continued or stopped, and report the best partial route found so far.
//  Only objectives that matter are tracked: the required ones and the ones that open a gate. Any other
//  objective picked up on the way changes nothing, so leaving it out of the state shrinks the search.

class PathSearch
{
  // Stop before memory runs out on very open worlds
  static MAX_STATES = 6000000;

  // options: have[i] (in hand from the start), never[i] (can't be picked up), required[i] (must be collected).
  //  Missing arrays mean: nothing in hand, nothing ruled out, every objective required.
  constructor(grid, fromPosition, toPosition, options = {})
  {
    let g = this.graph = WorldGraph.build(grid);
    let n = g.objectiveCount;
    this.have = options.have || new Uint8Array(n);
    this.never = options.never || new Uint8Array(n);
    this.required = options.required || new Uint8Array(n).fill(1);
    this.start = g.cellAt(fromPosition.x, fromPosition.y);
    this.end = g.cellAt(toPosition.x, toPosition.y);
    this.status = "ready";   // ready, running, paused, found, failed, stopped
    this.message = "";
    this.statesSearched = 0;
    this.elapsedMs = 0;

    if(this.start < 0) return this.fail("the start position is not inside a level");
    if(this.end < 0) return this.fail("the end position is not inside a level");
    let conflicts = [];
    for(let i = 0; i < n; i++) if(this.required[i] && this.never[i] && !this.have[i]) conflicts.push("#" + i);
    if(conflicts.length > 0) return this.fail("objective " + conflicts.join(", ") + " is required but set to Never");

    // Fail fast with the fixpoint. When everything required is collectable and the end is reachable, a route
    //  exists (collect it all, then walk back: nothing ever closes), so the search below always finishes.
    let reach = g.fixpoint(this.have, this.never, this.start);
    let missing = [];
    for(let i = 0; i < n; i++) if(this.required[i] && !reach.got[i]) missing.push("#" + i);
    if(missing.length > 0) return this.fail("objective " + missing.join(", ") + " can never be collected");
    if(!reach.reach[this.end]) return this.fail("the end position can't be reached");

    // Objectives tracked in the search state, each given a bit
    let gateObjectives = new Set();
    for(let c = 0; c < g.needs.length; c++) if(g.needs[c] >= 0) gateObjectives.add(g.needs[c]);
    this.bitOf = new Int32Array(n).fill(-1);
    this.tracked = [];
    for(let i = 0; i < n; i++)
      if((this.required[i] || gateObjectives.has(i)) && !this.have[i])
      {
        this.bitOf[i] = this.tracked.length;
        this.tracked.push(i);
      }
    this.useBigInt = this.tracked.length > 30;
    let one = this.useBigInt ? 1n : 1;
    this.zero = this.useBigInt ? 0n : 0;
    this.bit = (i) => this.useBigInt ? (one << BigInt(this.bitOf[i])) : (1 << this.bitOf[i]);
    this.targetMask = this.zero;
    this.tracked.forEach((i) => { if(this.required[i]) this.targetMask |= this.bit(i); });

    // Distance to the end with every gate open, to rank partial routes
    this.distToEnd = g.distancesTo(this.end);

    let m0 = this.pickup(this.start, this.zero);
    this.cells = [this.start];
    this.masks = [m0];
    this.parents = [-1];
    this.depths = [0];
    this.seen = new Set([this.key(this.start, m0)]);
    this.head = 0;
    this.best = 0;
    this.bestScore = this.score(0);
  }

  fail(reason)
  {
    this.status = "failed";
    this.message = "No path: " + reason + ".";
    return this;
  }

  key(cell, mask)
  {
    return this.useBigInt ? cell + ":" + mask : mask * this.graph.cellX.length + cell;
  }

  pickup(cell, mask)
  {
    let o = this.graph.objectiveAt[cell];
    if(o < 0 || this.bitOf[o] < 0 || this.never[o]) return mask;
    return mask | this.bit(o);
  }

  canEnter(cell, mask)
  {
    let need = this.graph.needs[cell];
    if(need == NEEDS_NOTHING) return true;
    if(need < 0 || this.never[need] && !this.have[need]) return false;
    if(this.have[need]) return true;
    return (mask & this.bit(need)) != this.zero;
  }

  // How many required objectives a state has collected
  requiredCollected(mask)
  {
    let m = mask & this.targetMask;
    if(this.useBigInt) { let count = 0; for(; m; m &= m - 1n) count++; return count; }
    m = m - ((m >> 1) & 0x55555555);
    m = (m & 0x33333333) + ((m >> 2) & 0x33333333);
    return (((m + (m >> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
  }

  // Partial routes are ranked by required objectives collected, then by distance left to the end
  score(state)
  {
    return this.requiredCollected(this.masks[state]) * 1e6 - this.distToEnd[this.cells[state]];
  }

  get requiredCount()
  {
    return this.tracked.filter((i) => this.required[i]).length;
  }

  // Run for about budgetMs. Returns the status afterwards.
  step(budgetMs)
  {
    if(this.status == "ready" || this.status == "paused") this.status = "running";
    if(this.status != "running") return this.status;
    let g = this.graph;
    let t0 = performance.now();
    let checked = 0;
    while(this.head < this.cells.length)
    {
      let s = this.head++;
      let c = this.cells[s], mask = this.masks[s];
      if(c == this.end && (mask & this.targetMask) == this.targetMask)
      {
        this.best = s;
        this.status = "found";
        break;
      }
      let sc = this.score(s);
      if(sc > this.bestScore) { this.bestScore = sc; this.best = s; }

      let next = g.neighbors[c];
      for(let k = 0; k < next.length; k++)
      {
        let d = next[k];
        if(!this.canEnter(d, mask)) continue;
        let m = this.pickup(d, mask);
        let key = this.key(d, m);
        if(this.seen.has(key)) continue;
        this.seen.add(key);
        this.cells.push(d); this.masks.push(m); this.parents.push(s); this.depths.push(this.depths[s] + 1);
      }
      if(this.cells.length > PathSearch.MAX_STATES)
      {
        this.status = "stopped";
        this.message = "Stopped after " + PathSearch.MAX_STATES.toLocaleString() + " states to keep memory in check. " +
                       "Showing the best partial route; requiring fewer objectives makes the search smaller.";
        break;
      }
      if(++checked % 512 == 0 && performance.now() - t0 > budgetMs) break;
    }
    if(this.status == "running" && this.head >= this.cells.length)
    {
      // Can't happen when the fixpoint said yes, but never leave the search hanging
      this.status = "failed";
      this.message = "No path: no route collects the required objectives and then reaches the end.";
    }
    this.statesSearched = this.head;
    this.elapsedMs += performance.now() - t0;
    return this.status;
  }

  pause() { if(this.status == "running" || this.status == "ready") this.status = "paused"; }

  stop()
  {
    if(this.status == "running" || this.status == "paused" || this.status == "ready")
    {
      this.status = "stopped";
      this.message = "Showing the best partial route found.";
    }
  }

  get isActive() { return this.status == "ready" || this.status == "running" || this.status == "paused"; }

  // Cells of the route to the found state (or the best partial one), start first
  routeCells()
  {
    if(this.cells === undefined) return [];
    let route = [];
    for(let s = this.best; s >= 0; s = this.parents[s]) route.push(this.cells[s]);
    return route.reverse();
  }

  // Path as the planner draws it: a stack of grid vectors with the start last
  routeStack()
  {
    let g = this.graph;
    return this.routeCells().reverse().map((c) => createVector(g.cellX[c], g.cellY[c]));
  }

  // Objectives picked up along the route (required or not), in order
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

  get bestDepth() { return this.cells === undefined ? 0 : this.depths[this.best]; }
  get bestRequiredCollected() { return this.cells === undefined ? 0 : this.requiredCollected(this.masks[this.best]); }
  get bestDistanceToEnd() { return this.cells === undefined ? 0 : this.distToEnd[this.cells[this.best]]; }
}

class GridSolver
{
  // Why the last search found no path, or "" after a success
  static lastMessage = "";

  // Run a whole search at once (no time slicing). Every objective is required.
  //  Returns the path as a stack (last element is the start), or null with GridSolver.lastMessage set.
  static GetPathFromTo(fromPosition, toPosition, grid)
  {
    let search = new PathSearch(grid, fromPosition, toPosition);
    while(search.isActive) search.step(1000);
    GridSolver.lastMessage = search.status == "found" ? "" : search.message;
    return search.status == "found" ? search.routeStack() : null;
  }
}
