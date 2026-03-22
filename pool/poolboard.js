export const SIMULATION_SIZE = 500;
export const PELLET_SIZE = 2;

// Directions (0 - up, 1 - left, 2 - down, 3 - right)
export var DIRECTIONS = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
// Directions (0 - up, 1 - up-left, 2 - left, 3 - down-left,
// 			   4 - down, 5 - down-right, 6 - right, 7 - up-right )
export var EIGHT_DIRECTIONS = [{ x: 0, y: -1 }, { x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: -1 }];

export class Pellet {
    constructor(x, y, size, mass, heatContribution, energy = 1.0) {
        this.x = x;
        this.y = y;
        this.heatContribution = heatContribution;
        this.size = size;
        this.mass = mass;
        this.energy = energy;
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
    constructor(sideCells = 1, baseThermalConductivity = 0, numPellets = 0, pelletMass = 1, numHeatSources = 0, initialEnergy = 500, maxHeatContribution = 0.1) {
        this.sideCells = sideCells;
        this.cellSize = SIMULATION_SIZE / this.sideCells;
        this.baseThermalConductivity = baseThermalConductivity;
        this.numPellets = numPellets;
        this.pelletMass = pelletMass;
        this.numHeatSources = numHeatSources;
        this.initialEnergy = initialEnergy;
        this.maxHeatContribution = maxHeatContribution;

        // Initialize cells
        this.cells = [];
        for (var x = 0; x < this.sideCells; x++) {
            this.cells[x] = [];
            for (var y = 0; y < this.sideCells; y++)
                this.cells[x][y] = Math.random();
        }

        // Initialize pellets
        this.PelletList = [];
        for (var p = 0; p < this.numPellets; p++) {
            this.PelletList[p] = new Pellet(Math.random() * sideCells, Math.random() * sideCells, PELLET_SIZE, this.pelletMass, (Math.random() * 2 - 1) * this.maxHeatContribution, this.initialEnergy);
        }

        // Initialize sin heat sources
        this.SinHeatSourceList = [];
        for (var s = 0; s < this.numHeatSources; s++) {
            this.SinHeatSourceList[s] = new SinHeatSource(Math.floor(Math.random() * this.sideCells),
                Math.floor(Math.random() * this.sideCells), Math.random() * 30 + 30);
        }
    }
    // TODO: pass only game, do this better. NEEDS some love
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

        // Draw the pellets — color indicates energy level (black = none, green = full)
        for (var p = 0; p < this.numPellets; p++) {
            var pellet = this.PelletList[p];
            var g = Math.floor(Math.min(1, Math.max(0, pellet.energy)) * 255);
            context.fillStyle = 'rgb(0,' + g + ',0)';
            context.fillRect(pellet.x * this.cellSize - pellet.size / 2, pellet.y * this.cellSize - pellet.size / 2, pellet.size, pellet.size);
        }
    }
    update(game) {
        // Use fixed simulation size so cell size is consistent regardless of display canvas size
        this.cellSize = SIMULATION_SIZE / this.sideCells;
        var cellChanges = [];
        var cells = this.cells;
        var cellFlowX = [];
        var cellFlowY = [];
        var cellPelletList = [];
        var pelletVel = [];

        // Do nothing if not initialized
        if (cells === undefined || cells[0] === undefined) return;

        // Calculate all cells temperature change
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
                    // positive change means heat is coming from there, so cellFlow is in the opposite direction
                    cellFlowX[x][y] += -change * direction.x; // direction.x will be 0 when y != 0
                    cellFlowY[x][y] += -change * direction.y; // direction.x will be 0 when x != 0
                }
            }
        }

        // Apply temperature change
        for (x = 0; x < this.sideCells; x++)
            for (y = 0; y < this.sideCells; y++)
                if (Math.abs(cellChanges[x][y]) > 0.000001) {
                    cells[x][y] += cellChanges[x][y];

                    // Cap temperature at 1.0 and 0.0
                    if (cells[x][y] > 1.0) cells[x][y] = 1.0;
                    if (cells[x][y] < 0.0) cells[x][y] = 0.0;
                }

        // Simulate all heat sources changing through time
        for (var s = 0; s < this.numHeatSources; s++) {
            var heatSource = this.SinHeatSourceList[s];
            cells[heatSource.x][heatSource.y] = Math.sin(game.frameCount / heatSource.period);
        }

        // Update the pellets
        for (var p = 0; p < this.numPellets; p++) {
            var pellet = this.PelletList[p];

            // Get the cell for the current pellet
            var cellX = Math.floor(pellet.x);
            var cellY = Math.floor(pellet.y);

            // Add the current pellet to the corresponding cellPelletList
            cellPelletList[cellX][cellY].push(p);

            // Calculate the velocity of the pellet based on the current cells flow
            pelletVel[p] = {};
            pelletVel[p].x = cellFlowX[cellX][cellY] * (10 / pellet.mass);
            pelletVel[p].y = cellFlowY[cellX][cellY] * (10 / pellet.mass);
        }

        // Check for collisions and apply velocity
        for (p = 0; p < this.numPellets; p++) {

            pellet = this.PelletList[p];

            // Get the cell for the current pellet
            cellX = Math.floor(pellet.x);
            cellY = Math.floor(pellet.y);

            // Go to the next cell in all eight directions
            for (dir = 0; dir < EIGHT_DIRECTIONS.length; dir++) {
                direction = EIGHT_DIRECTIONS[dir];

                nextCell = this.getNextCell(cellX, cellY, direction, this.sideCells);

                // Check only with pellets within that cell
                for (var pi = 0; pi < cellPelletList[nextCell.x][nextCell.y].length; pi++) {
                    var currentPelletID = cellPelletList[nextCell.x][nextCell.y][pi];
                    // dont try to collide with itself
                    if (currentPelletID === p) continue;

                    var pelletP = this.PelletList[currentPelletID];

                    var dist = this.getSqrdDistance(pellet.x + pelletVel[p].x, pellet.y + pelletVel[p].y,
                        pelletP.x, pelletP.y);

                    if (dist < (pelletP.size + pellet.size) / this.cellSize * (pelletP.size + pellet.size) / this.cellSize) {

                        // binary search the right multiplier
                        var vML = 0.0; // vel multiplier low
                        var vMH = 1.0; // vel multiplier high

                        while (Math.abs(vML - vMH) > 0.0001) {
                            var midVelX = (vMH + vML) / 2 * pelletVel[p].x;
                            var midVelY = (vMH + vML) / 2 * pelletVel[p].y;

                            var middleDist = this.getSqrdDistance(pellet.x + midVelX,
                                pellet.y + midVelY,
                                pelletP.x, pelletP.y);

                            // collision, go down
                            if (middleDist < (pelletP.size + pellet.size) * (pelletP.size + pellet.size)) {
                                vMH = (vMH + vML) / 2;
                            }
                            else {
                                vML = (vMH + vML) / 2;
                            }
                        }

                        pelletVel[p].x *= vML;
                        pelletVel[p].y *= vML;
                    }
                }
            }

            // Update position
            pellet.x += pelletVel[p].x;
            pellet.y += pelletVel[p].y;

            // Wrap around
            if (pellet.x > this.sideCells)
                pellet.x = 0;
            if (pellet.x < 0)
                pellet.x = this.sideCells - 0.001;
            if (pellet.y > this.sideCells)
                pellet.y = 0;
            if (pellet.y < 0)
                pellet.y = this.sideCells - 0.001;

            // Update heat contribution to the current cell (costs energy)
            var energyCost = Math.abs(pellet.heatContribution);
            if (pellet.energy >= energyCost) {
                cells[cellX][cellY] += pellet.heatContribution;
                pellet.energy -= energyCost;
            }
        }
    }
    // Temp1 temp2 from 0 to 1.0
    getTemperatureChange(sourceTemp, targetTemp, thermalConductivity) {
        return (targetTemp - sourceTemp) * thermalConductivity;
    }
    getSqrdDistance(pellet1X, pellet1Y, pellet2X, pellet2Y) {
        var distX = pellet1X - pellet2X;
        var distY = pellet1Y - pellet2Y;
        return distX * distX + distY * distY;
    } // make this static to the pellet class
    // Temperature from 0.0 to 1.0
    getTemperatureColor(temperature) {
        var color = {};
        color.r = temperature;
        color.g = 0;
        color.b = 1.0 - temperature;
        color.a = 1.0;

        return color;
    }
    getNextCell(currentCellX, currentCellY, direction, sideCells) {
        var nextCell = { x: currentCellX + direction.x, y: currentCellY + direction.y };

        // Wrap around
        if (nextCell.x >= sideCells)
            nextCell.x = 0;
        if (nextCell.x < 0)
            nextCell.x = sideCells - 1;
        if (nextCell.y >= sideCells)
            nextCell.y = 0;
        if (nextCell.y < 0)
            nextCell.y = sideCells - 1;

        return nextCell;
    }
}
