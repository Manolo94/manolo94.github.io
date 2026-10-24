# Manuel Gonzalez: portfolio

Source for [manolo94.github.io](https://manolo94.github.io/), my portfolio of browser projects built alongside my work in simulation software. Everything runs in the browser, with no build step: open a page and play.

## Projects

| Project | What it is | Built with |
| --- | --- | --- |
| [Metroidvania Planner](https://manolo94.github.io/Metroidvania_Planner/) | A map editor for Metroidvania games: rooms, doors, objectives and the gates they open, with reachability checks and route finding. More below. | p5.js |
| [Halloween Pacman](https://manolo94.github.io/HalloweenPacman/pacman.html) | First-person Pacman with some really creepy ghosts. Grid-based collision detection aided by raytracing, A* pathfinding. | three.js |
| [Planet Guardian 3D](https://manolo94.github.io/PlanetGuardian3D/PlanetGuardian3D.html) | A fast-paced strategy game. Raytracing, shaders, particle systems, collision detection. | three.js |
| [Pool](https://manolo94.github.io/pool/pool.html) | An experiment with cellular automata: organism energy models, genomes, and a genetic algorithm with crossover, mutation and autoplay. | JavaScript |
| [Board Game](https://manolo94.github.io/BoardGame/boardGame.html) | A strategy board game with three types of buildings, resources to manage and an AI to play against. Web workers, raytracing, breadth-first search. | three.js |
| [Physics Demo](https://manolo94.github.io/physics/index.html) | Rigid body simulation with gravity. | JavaScript |

Also here:
- [Resume](https://manolo94.github.io/resume.html)
- `MLpython/`: machine learning exercises in Python (pandas, scikit-learn)
- `Hexwiperz/`: the privacy policy for my mobile game Hexwiperz

## Metroidvania Planner

A planner for the high-level shape of a Metroidvania: which rooms exist, how they connect, where the abilities and keys are, and which gates each one opens. It answers the questions that matter while designing: can the player reach everything, what does each area need, and what's the shortest route through the game. It has been tested on a room-level map of about 450 rooms.

**Building a map**
- Add levels, then move and resize them. Open and close doors between neighboring levels.
- Place objectives (abilities, keys, bosses) and name them. Place obstacles: cells that only open once a chosen objective is collected. A gate on an objective's own cell means "collecting this needs that".
- Give each level an id, a name and a color. Group levels into regions, which collapse into one shape when zoomed out; click a region to zoom into it.
- Set the start and the end. Keys 1–9 switch tools.

**Checking a map**
- **Check world:**
  - shades every cell that can't be reached
  - lists each objective with what it strictly needs
  - shows each region's reachable share and what getting in needs
  - warns about objectives that can never be collected and gates with a way around them
  - reruns by itself as you edit
- **Auto / Have / Never** toggles per objective test partial setups: what can I reach with only these abilities, or if this one didn't exist?
- **Inspect cells:** click any cell to see what it needs, whether alternative routes exist, why it can't be reached, and what an objective unlocks.

**Calculate path**
- Finds the shortest route from start to end that collects the objectives you tick in the Route column, plus whatever the gates on the way need.
- It runs in the background with Pause, Continue and Stop, and shows a quick complete route at once while it searches for a shorter one.
- Under the hood: an A* search over key points (objectives, region borders), with distance tables cached per region, dominance pruning and a greedy upper bound.

**Files**
- Maps save in the browser automatically.
- **Download World** and **Upload World** move them as JSON files. Upload checks a file before replacing anything.

### Code

The planner is plain JavaScript on [p5.js](https://p5js.org/). Serve the folder and open `Metroidvania_Planner/index.html` (for example `python -m http.server`, then visit `http://localhost:8000/Metroidvania_Planner/`).

| File | What's in it |
| --- | --- |
| `sketch.js` | Setup, drawing, input, the tool rail, file upload and download, the Check world panel, Inspect cells, Calculate path controls |
| `grid.js` | World state: levels, regions, start and end, saving and loading, movement rules (`canPassThrough`), zoom and pan |
| `level.js` | Levels, objectives and obstacles: editing, drawing, walls and doors |
| `world_check.js` | Compiles the world into a cell graph, and the fixpoint reachability behind Check world and Inspect |
| `regions.js` | Region shapes, collapsing when zoomed out, the region list and Paint regions |
| `hier_search.js` | Calculate path: the hierarchical A* search |
| `grid_solver.js` | The flat breadth-first search, used when a map tracks more than 30 objectives |
| `style.css` | Layout and look |

## Credits

The portfolio page started from the [Start Bootstrap Portfolio Item](https://github.com/StartBootstrap/startbootstrap-portfolio-item) template by Iron Summit Media Strategies, released under the [Apache 2.0](LICENSE) license.
