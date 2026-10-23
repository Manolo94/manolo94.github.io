class GridSolver
{
  // Stop an exact search after this many states, so a very open world can't freeze the page
  static MAX_STATES = 2000000;

  // Why the last search found no path (shown next to the Calculate Path button), or "" after a success
  static lastMessage = "";

  // Shortest route from fromPosition to toPosition that collects every objective.
  //  fromPosition and toPosition are vectors in grid space.
  //  Returns the path as a stack (last element is the start), or null with GridSolver.lastMessage set.
  static GetPathFromTo(fromPosition, toPosition, grid)
  {
    let g = WorldGraph.build(grid);
    let n = g.objectiveCount;
    let start = g.cellAt(fromPosition.x, fromPosition.y);
    let end = g.cellAt(toPosition.x, toPosition.y);
    GridSolver.lastMessage = "";

    if(start < 0) return GridSolver.fail("the start position is not inside a level");
    if(end < 0) return GridSolver.fail("the end position is not inside a level");

    // Fail fast: the fixpoint says in an instant whether everything can be collected and the end reached
    let all = g.fixpoint(new Uint8Array(n), new Uint8Array(n));
    let missing = [];
    for(let i = 0; i < n; i++) if(!all.got[i]) missing.push("#" + i);
    if(missing.length > 0) return GridSolver.fail("objective " + missing.join(", ") + " can never be collected");
    if(!all.reach[end]) return GridSolver.fail("the end position can't be reached");

    // Exact search over (cell, objectives collected), breadth first, so the first route found is the shortest.
    //  States are marked as seen when queued, so each one is queued only once.
    let full = (1n << BigInt(n)) - 1n;
    let pickup = (c, mask) => g.objectiveAt[c] >= 0 ? mask | (1n << BigInt(g.objectiveAt[c])) : mask;
    let canEnter = (c, mask) => g.needs[c] == NEEDS_NOTHING || (g.needs[c] >= 0 && ((mask >> BigInt(g.needs[c])) & 1n) == 1n);

    let cells = [start], masks = [pickup(start, 0n)], parents = [-1];
    let seen = new Set([start + ":" + masks[0]]);
    let found = -1;
    for(let head = 0; head < cells.length; head++)
    {
      let c = cells[head], mask = masks[head];
      if(c == end && mask == full) { found = head; break; }
      let next = g.neighbors[c];
      for(let k = 0; k < next.length; k++)
      {
        let d = next[k];
        if(!canEnter(d, mask)) continue;
        let m = pickup(d, mask);
        let key = d + ":" + m;
        if(seen.has(key)) continue;
        seen.add(key);
        cells.push(d); masks.push(m); parents.push(head);
      }
      if(cells.length > GridSolver.MAX_STATES)
        return GridSolver.fail("the search stopped after " + GridSolver.MAX_STATES.toLocaleString() +
                               " states (too many possible orders). Check World still works for this map");
    }
    if(found < 0) return GridSolver.fail("no route collects every objective and then reaches the end");

    console.log("Found Path! (" + cells.length + " states searched)");
    let moveStack = [];
    for(let s = found; s >= 0; s = parents[s])
      moveStack.push(createVector(g.cellX[cells[s]], g.cellY[cells[s]]));
    return moveStack;
  }

  static fail(reason)
  {
    GridSolver.lastMessage = "No path: " + reason + ".";
    console.log(GridSolver.lastMessage);
    return null;
  }
}
