import { Organism, Genome } from './organism.js';

export const SIMULATION_SIZE = 500;
export const PELLET_SIZE = 2;
const EXCHANGE_COOLDOWN = 30; // ticks between energy exchanges on contact

// Directions (0 - up, 1 - left, 2 - down, 3 - right)
export var DIRECTIONS = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
// Directions (0 - up, 1 - up-left, 2 - left, 3 - down-left,
//             4 - down, 5 - down-right, 6 - right, 7 - up-right )
export var EIGHT_DIRECTIONS = [{ x: 0, y: -1 }, { x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: -1 }];

export class Pellet {
    // realEnergy: active fuel — depletes when contributing heat; organism dies when all reach 0
    // storedEnergy: generated from realEnergy; transferred between connected pellets; eaten on collision
    constructor(x, y, size, mass, heatContribution, conversionRate, energyThreshold, energy = 1.0) {
        this.x = x;
        this.y = y;
        this.heatContribution = heatContribution;
        this.size = size;
        this.mass = mass;
        this.realEnergy = energy;
        this.storedEnergy = 0;
        this.conversionRate = conversionRate;
        this.energyThreshold = energyThreshold;
        this.exchangeCooldown = 0;
        this.organismId = null;
    }
    static getSqrdDistance(p1, p2) {
        var distX = p1.x - p2.x;
        var distY = p1.y - p2.y;
        return distX * distX + distY * distY;
    }
}

export class SinHeatSource {
    constructor(x, y, period) {
        this.x = x; this.y = y;
        this.period = period;
    }
}

export class PoolBoard {
    constructor(sideCells = 1, baseThermalConductivity = 0, numOrganisms = 0, pelletsPerOrg = 1, organismSize = 2, pelletMass = 1, numHeatSources = 0, initialEnergy = 500, maxHeatContribution = 0.1) {
        this.sideCells = sideCells;
        this.cellSize = SIMULATION_SIZE / this.sideCells;
        this.baseThermalConductivity = baseThermalConductivity;
        this.numOrganisms = numOrganisms;
        this.pelletsPerOrg = pelletsPerOrg;
        this.organismSize = organismSize;
        this.pelletMass = pelletMass;
        this.numHeatSources = numHeatSources;
        this.initialEnergy = initialEnergy;
        this.maxHeatContribution = maxHeatContribution;

        // Reset organism ID counter so tooltip labels stay small each run
        Organism._nextId = 0;

        // Initialize cells
        this.cells = [];
        for (var x = 0; x < this.sideCells; x++) {
            this.cells[x] = [];
            for (var y = 0; y < this.sideCells; y++)
                this.cells[x][y] = Math.random();
        }

        // Initialize pellets grouped into organisms
        this.PelletList = [];
        this.organisms = [];
        for (var o = 0; o < this.numOrganisms; o++) {
            const genome = Genome.createRandom(this.pelletsPerOrg, this.maxHeatContribution, this.initialEnergy, this.organismSize);
            const slots = [];
            const cx = Math.random() * sideCells;
            const cy = Math.random() * sideCells;
            for (var p = 0; p < this.pelletsPerOrg; p++) {
                const pellet = new Pellet(
                    Math.min(sideCells - 0.001, Math.max(0, cx + genome.pelletOffsets[p].x)),
                    Math.min(sideCells - 0.001, Math.max(0, cy + genome.pelletOffsets[p].y)),
                    PELLET_SIZE,
                    this.pelletMass,
                    genome.heatContributions[p],
                    genome.conversionRates[p],
                    genome.energyThresholds[p],
                    this.initialEnergy
                );
                slots.push(pellet);
                this.PelletList.push(pellet);
            }
            this.organisms.push(new Organism(slots, genome));
        }

        // Initialize sin heat sources
        this.SinHeatSourceList = [];
        for (var s = 0; s < this.numHeatSources; s++) {
            this.SinHeatSourceList[s] = new SinHeatSource(
                Math.floor(Math.random() * this.sideCells),
                Math.floor(Math.random() * this.sideCells),
                Math.random() * 30 + 30
            );
        }
    }

    get numPellets() { return this.PelletList.length; }

    draw(game) {
        var context = game.context;
        // Draw each cell
        for (var x = 0; x < this.sideCells; x++)
            for (var y = 0; y < this.sideCells; y++) {
                var tempColor = this.getTemperatureColor(this.cells[x][y]);
                game.setContextToColor(tempColor);
                context.fillRect(x * this.cellSize, y * this.cellSize,
                    this.cellSize, this.cellSize);
            }

        // Draw lines between all pellets within each organism.
        // When a pair wraps on an axis, shift B onto A's side (and vice versa) and draw
        // two segments — one from each end — letting the canvas clip at the boundary.
        context.strokeStyle = 'rgba(78, 204, 163, 0.35)';
        context.lineWidth = 0.5;
        for (const org of this.organisms) {
            const alive = org.alivePellets;
            for (var i = 0; i < alive.length; i++) {
                for (var j = i + 1; j < alive.length; j++) {
                    const a = alive[i], b = alive[j];
                    const wrapsX = Math.abs(b.x - a.x) > this.sideCells / 2;
                    const wrapsY = Math.abs(b.y - a.y) > this.sideCells / 2;

                    const ax = a.x * this.cellSize, ay = a.y * this.cellSize;
                    const bx = b.x * this.cellSize, by = b.y * this.cellSize;
                    const offX = wrapsX ? (b.x > a.x ? -this.sideCells : this.sideCells) * this.cellSize : 0;
                    const offY = wrapsY ? (b.y > a.y ? -this.sideCells : this.sideCells) * this.cellSize : 0;

                    context.beginPath();
                    context.moveTo(ax, ay);
                    context.lineTo(bx + offX, by + offY);
                    context.stroke();

                    if (wrapsX || wrapsY) {
                        context.beginPath();
                        context.moveTo(bx, by);
                        context.lineTo(ax - offX, ay - offY);
                        context.stroke();
                    }
                }
            }
        }

        // Draw pellets — color indicates real energy (black = none, green = full)
        for (var p = 0; p < this.PelletList.length; p++) {
            var pellet = this.PelletList[p];
            var g = Math.floor(Math.min(1, Math.max(0, pellet.realEnergy / this.initialEnergy)) * 255);
            context.fillStyle = 'rgb(0,' + g + ',0)';
            context.fillRect(
                pellet.x * this.cellSize - pellet.size / 2,
                pellet.y * this.cellSize - pellet.size / 2,
                pellet.size, pellet.size
            );
        }
    }

    update(game) {
        this.cellSize = SIMULATION_SIZE / this.sideCells;
        var cells = this.cells;
        if (cells === undefined || cells[0] === undefined) return;

        // --- 1. Calculate cell temperature changes and flow vectors ---
        var cellChanges = [];
        var cellFlowX = [];
        var cellFlowY = [];
        var cellPelletList = [];

        for (var x = 0; x < this.sideCells; x++) {
            cellChanges[x] = [];
            cellFlowX[x] = [];
            cellFlowY[x] = [];
            cellPelletList[x] = [];
            for (var y = 0; y < this.sideCells; y++) {
                cellChanges[x][y] = 0.0;
                cellFlowX[x][y] = 0.0;
                cellFlowY[x][y] = 0.0;
                cellPelletList[x][y] = [];

                for (var dir = 0; dir < DIRECTIONS.length; dir++) {
                    var direction = DIRECTIONS[dir];
                    var nextCell = this.getNextCell(x, y, direction, this.sideCells);
                    var change = this.getTemperatureChange(cells[x][y], cells[nextCell.x][nextCell.y], this.baseThermalConductivity);
                    cellChanges[x][y] += change;
                    cellFlowX[x][y] += -change * direction.x;
                    cellFlowY[x][y] += -change * direction.y;
                }
            }
        }

        // --- 2. Apply temperature changes ---
        for (x = 0; x < this.sideCells; x++)
            for (y = 0; y < this.sideCells; y++)
                if (Math.abs(cellChanges[x][y]) > 0.000001) {
                    cells[x][y] += cellChanges[x][y];
                    if (cells[x][y] > 1.0) cells[x][y] = 1.0;
                    if (cells[x][y] < 0.0) cells[x][y] = 0.0;
                }

        // --- 3. Simulate heat sources ---
        for (var s = 0; s < this.numHeatSources; s++) {
            var heatSource = this.SinHeatSourceList[s];
            cells[heatSource.x][heatSource.y] = Math.sin(game.frameCount / heatSource.period);
        }

        // --- 4. Update organisms (energy conversion + connection transfers) ---
        for (const org of this.organisms) org.update();

        // --- 5. Build cell pellet map + calculate individual velocities ---
        var pelletVel = [];
        for (var p = 0; p < this.PelletList.length; p++) {
            if (this.PelletList[p].exchangeCooldown > 0) this.PelletList[p].exchangeCooldown--;
            var pellet = this.PelletList[p];
            var cellX = Math.floor(pellet.x);
            var cellY = Math.floor(pellet.y);
            cellPelletList[cellX][cellY].push(p);
            pelletVel[p] = {
                x: cellFlowX[cellX][cellY] * (10 / pellet.mass),
                y: cellFlowY[cellX][cellY] * (10 / pellet.mass)
            };
        }

        // --- 6. Replace organism member velocities with group average ---
        // Build O(1) pellet→index map to avoid repeated indexOf calls
        const pelletToIdx = new Map();
        for (let i = 0; i < this.PelletList.length; i++) pelletToIdx.set(this.PelletList[i], i);

        for (const org of this.organisms) {
            const alive = org.alivePellets;
            if (alive.length === 0) continue;
            let avgX = 0, avgY = 0;
            for (const ap of alive) {
                const idx = pelletToIdx.get(ap);
                if (idx !== undefined) { avgX += pelletVel[idx].x; avgY += pelletVel[idx].y; }
            }
            avgX /= alive.length;
            avgY /= alive.length;
            for (const ap of alive) {
                const idx = pelletToIdx.get(ap);
                if (idx !== undefined) { pelletVel[idx].x = avgX; pelletVel[idx].y = avgY; }
            }
        }

        // --- 7. Collision and eating ---
        // Same-organism pairs are skipped (they share velocity, shouldn't overlap).
        // Cross-organism (or free pellet) collision: higher storedEnergy eats the other.
        const toRemove = new Set();

        for (p = 0; p < this.PelletList.length; p++) {
            if (toRemove.has(p)) continue;
            pellet = this.PelletList[p];
            cellX = Math.floor(pellet.x);
            cellY = Math.floor(pellet.y);

            for (dir = 0; dir < EIGHT_DIRECTIONS.length; dir++) {
                direction = EIGHT_DIRECTIONS[dir];
                var nearCell = this.getNextCell(cellX, cellY, direction, this.sideCells);

                for (var pi = 0; pi < cellPelletList[nearCell.x][nearCell.y].length; pi++) {
                    var qIdx = cellPelletList[nearCell.x][nearCell.y][pi];
                    if (qIdx === p || toRemove.has(qIdx)) continue;

                    var pelletQ = this.PelletList[qIdx];

                    // Same organism: no collision (they move as a unit)
                    if (pellet.organismId !== null && pellet.organismId === pelletQ.organismId) continue;

                    var collisionThreshSq = ((pellet.size + pelletQ.size) / this.cellSize) *
                        ((pellet.size + pelletQ.size) / this.cellSize);
                    var distSq = this.getSqrdDistance(
                        pellet.x + pelletVel[p].x, pellet.y + pelletVel[p].y,
                        pelletQ.x, pelletQ.y
                    );

                    if (distSq < collisionThreshSq) {
                        // Free vs free: no interaction
                        if (pellet.organismId === null && pelletQ.organismId === null) continue;

                        // Organism hits free pellet: absorb all its stored energy, free pellet dies
                        if (pellet.organismId === null) { toRemove.add(p); break; }
                        if (pelletQ.organismId === null) {
                            pellet.realEnergy += pelletQ.storedEnergy;
                            toRemove.add(qIdx);
                            continue;
                        }

                        // Both in organisms (different): mutual exchange with cooldown
                        if (pellet.exchangeCooldown === 0 && pelletQ.exchangeCooldown === 0) {
                            const takenByA = Math.min(pellet.realEnergy, pelletQ.storedEnergy);
                            const takenByB = Math.min(pelletQ.realEnergy, pellet.storedEnergy);
                            pellet.realEnergy   += takenByA;
                            pellet.storedEnergy  = Math.max(0, pellet.storedEnergy - takenByB);
                            pelletQ.realEnergy  += takenByB;
                            pelletQ.storedEnergy = Math.max(0, pelletQ.storedEnergy - takenByA);
                            pellet.exchangeCooldown  = EXCHANGE_COOLDOWN;
                            pelletQ.exchangeCooldown = EXCHANGE_COOLDOWN;

                            if (pelletQ.realEnergy <= 0) toRemove.add(qIdx);
                            if (pellet.realEnergy  <= 0) { toRemove.add(p); break; }
                        }
                    }
                }
            }
        }

        // --- 8. Apply velocities, wrap, and heat contribution ---
        for (p = 0; p < this.PelletList.length; p++) {
            if (toRemove.has(p)) continue;
            pellet = this.PelletList[p];
            cellX = Math.floor(pellet.x); // cell before move (for heat contribution)
            cellY = Math.floor(pellet.y);

            pellet.x += pelletVel[p].x;
            pellet.y += pelletVel[p].y;

            if (pellet.x > this.sideCells) pellet.x = 0;
            if (pellet.x < 0) pellet.x = this.sideCells - 0.001;
            if (pellet.y > this.sideCells) pellet.y = 0;
            if (pellet.y < 0) pellet.y = this.sideCells - 0.001;

            if (pellet.realEnergy > 0) {
                var energyCost = Math.abs(pellet.heatContribution);
                var fraction = Math.min(1, pellet.realEnergy / energyCost);
                cells[cellX][cellY] += pellet.heatContribution * fraction;
                pellet.realEnergy -= energyCost * fraction;
            }
        }

        // --- 9. Remove eaten pellets + kill their organism ---
        for (const idx of toRemove) {
            const dead = this.PelletList[idx];
            if (dead.organismId !== null) {
                const org = this.organisms.find(o => o.id === dead.organismId);
                if (org) org.release(); // losing any pellet kills the whole organism
            }
        }
        // Remove in descending order to keep earlier indices valid during splice
        const sortedRemove = [...toRemove].sort((a, b) => b - a);
        for (const idx of sortedRemove) this.PelletList.splice(idx, 1);

        // --- 10. Release starved organisms + prune dead ones ---
        for (const org of this.organisms) {
            const alive = org.alivePellets;
            if (alive.length > 0 && alive.some(ap => ap.realEnergy <= 0)) {
                org.release(); // pellets drift free, keeping their storedEnergy
            }
        }
        this.organisms = this.organisms.filter(org => !org.isDead);
    }

    getTemperatureChange(sourceTemp, targetTemp, thermalConductivity) {
        return (targetTemp - sourceTemp) * thermalConductivity;
    }
    getSqrdDistance(pellet1X, pellet1Y, pellet2X, pellet2Y) {
        var distX = pellet1X - pellet2X;
        var distY = pellet1Y - pellet2Y;
        return distX * distX + distY * distY;
    }
    getTemperatureColor(temperature) {
        return {
            r: temperature * 0.55,
            g: temperature * (1 - temperature) * 0.25,  // slight warm midtone
            b: (1.0 - temperature) * 0.38,
            a: 1.0
        };
    }
    getNextCell(currentCellX, currentCellY, direction, sideCells) {
        var nextCell = { x: currentCellX + direction.x, y: currentCellY + direction.y };
        if (nextCell.x >= sideCells) nextCell.x = 0;
        if (nextCell.x < 0) nextCell.x = sideCells - 1;
        if (nextCell.y >= sideCells) nextCell.y = 0;
        if (nextCell.y < 0) nextCell.y = sideCells - 1;
        return nextCell;
    }
}
