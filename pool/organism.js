// Genome encodes the heritable rules for an organism.
// Slot indices reference fixed positions in Organism.slots (stable even after pellet death).
export class Genome {
    // connections: [{from, to, rate}]  — storedEnergy fraction transferred per tick
    // heatContributions: [float]       — per slot, signed heat added to cell each tick
    // conversionRates: [float]         — per slot, fraction of realEnergy converted per tick
    // energyThresholds: [float]        — per slot, realEnergy level that flips conversion direction
    //   above threshold: realEnergy → storedEnergy
    //   below threshold: storedEnergy → realEnergy
    // pelletOffsets: [{x, y}]          — per slot, position relative to organism center (cell units)
    constructor(connections, heatContributions, conversionRates, energyThresholds, pelletOffsets) {
        this.connections = connections;
        this.heatContributions = heatContributions;
        this.conversionRates = conversionRates;
        this.energyThresholds = energyThresholds;
        this.pelletOffsets = pelletOffsets;
    }

    static createRandom(pelletCount, maxHeatContribution, initialEnergy = 500, organismSize = 2) {
        const heatContributions = [];
        const conversionRates = [];
        const energyThresholds = [];
        const pelletOffsets = [];
        const connections = [];

        for (let i = 0; i < pelletCount; i++) {
            heatContributions.push((Math.random() * 2 - 1) * maxHeatContribution);
            conversionRates.push(Math.random() * 0.015 + 0.005); // 0.5–2% per tick
            energyThresholds.push(Math.random() * initialEnergy);
            const angle = Math.random() * 2 * Math.PI;
            const r = Math.random() * organismSize;
            pelletOffsets.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }

        for (let i = 0; i < pelletCount; i++) {
            for (let j = 0; j < pelletCount; j++) {
                if (i !== j && Math.random() < 0.4) {
                    connections.push({ from: i, to: j, rate: Math.random() * 0.009 + 0.001 }); // 0.1–1%
                }
            }
        }

        return new Genome(connections, heatContributions, conversionRates, energyThresholds, pelletOffsets);
    }

    // Uniform crossover: each per-slot gene randomly taken from parent A or B.
    // Connections: union of both parents' connections; duplicate (from,to) pairs take a random parent's rate.
    // The merged set is thinned to ~70% to avoid connection bloat.
    static crossover(a, b) {
        const n = a.heatContributions.length;
        const heatContributions = [];
        const conversionRates = [];
        const energyThresholds = [];
        const pelletOffsets = [];

        for (let i = 0; i < n; i++) {
            const useA = Math.random() < 0.5;
            heatContributions.push(useA ? a.heatContributions[i] : b.heatContributions[i]);
            conversionRates.push(useA ? a.conversionRates[i] : b.conversionRates[i]);
            energyThresholds.push(useA ? a.energyThresholds[i] : b.energyThresholds[i]);
            pelletOffsets.push({ ...(useA ? a.pelletOffsets[i] : b.pelletOffsets[i]) });
        }

        const connMap = new Map();
        const key = c => `${c.from},${c.to}`;
        for (const c of a.connections) connMap.set(key(c), { ...c });
        for (const c of b.connections) {
            const k = key(c);
            if (connMap.has(k)) { if (Math.random() < 0.5) connMap.set(k, { ...c }); }
            else connMap.set(k, { ...c });
        }
        const connections = [...connMap.values()].filter(() => Math.random() < 0.7);

        return new Genome(connections, heatContributions, conversionRates, energyThresholds, pelletOffsets);
    }

    // Point mutation: each value independently perturbed with probability mutationRate.
    static mutate(genome, mutationRate, maxHeatContribution, initialEnergy, organismSize) {
        const n = genome.heatContributions.length;
        const rnd = () => Math.random() * 2 - 1;

        const heatContributions = genome.heatContributions.map(v =>
            Math.random() < mutationRate
                ? Math.max(-maxHeatContribution, Math.min(maxHeatContribution, v + rnd() * maxHeatContribution * 0.3))
                : v
        );
        const conversionRates = genome.conversionRates.map(v =>
            Math.random() < mutationRate ? Math.max(0.001, v + rnd() * 0.005) : v
        );
        const energyThresholds = genome.energyThresholds.map(v =>
            Math.random() < mutationRate ? Math.max(0, v + rnd() * initialEnergy * 0.2) : v
        );
        const pelletOffsets = genome.pelletOffsets.map(o =>
            Math.random() < mutationRate
                ? { x: o.x + rnd() * organismSize * 0.3, y: o.y + rnd() * organismSize * 0.3 }
                : { ...o }
        );

        // Perturb existing connections; occasionally drop or add one
        let connections = genome.connections
            .filter(() => Math.random() > mutationRate * 0.3)
            .map(c => Math.random() < mutationRate
                ? { ...c, rate: Math.max(0.001, c.rate + rnd() * 0.003) }
                : { ...c }
            );
        if (Math.random() < mutationRate) {
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);
            if (i !== j && !connections.some(c => c.from === i && c.to === j))
                connections.push({ from: i, to: j, rate: Math.random() * 0.009 + 0.001 });
        }

        return new Genome(connections, heatContributions, conversionRates, energyThresholds, pelletOffsets);
    }
}

export class Organism {
    // slots: fixed-length array of Pellet | null (null = pellet was eaten)
    // Genome connection indices are stable slot indices, not live array indices.
    constructor(slots, genome) {
        this.slots = slots;
        this.genome = genome;
        this.id = ++Organism._nextId;
        for (const p of slots) if (p) p.organismId = this.id;
    }

    get alivePellets() {
        return this.slots.filter(p => p !== null);
    }

    // True when all slots are empty (all pellets eaten)
    get isDead() {
        return this.slots.every(p => p === null);
    }

    get totalStoredEnergy() {
        return this.alivePellets.reduce((sum, p) => sum + p.storedEnergy, 0);
    }

    // Called each tick: converts realEnergy → storedEnergy, then applies connection transfers.
    update() {
        const alive = this.alivePellets;
        if (alive.length === 0) return;

        // Starvation: any pellet hitting 0 kills the whole organism
        if (alive.some(p => p.realEnergy <= 0)) {
            this.release();
            return;
        }

        // Energy conversion per slot: positive = save to stored, negative = draw from stored
        // Clamped so storedEnergy never goes below 0
        for (const p of alive) {
            const converted = (p.realEnergy - p.energyThreshold) * p.conversionRate;
            const actual = Math.max(-p.storedEnergy, converted);
            p.storedEnergy += actual;
            p.realEnergy -= actual;
        }

        // Batched connection transfers (avoids order dependence)
        const deltas = new Array(this.slots.length).fill(0);
        for (const conn of this.genome.connections) {
            const sender = this.slots[conn.from];
            const receiver = this.slots[conn.to];
            if (!sender || !receiver) continue;
            const amount = sender.storedEnergy * conn.rate;
            if (amount > 0) {
                deltas[conn.from] -= amount;
                deltas[conn.to] += amount;
            }
        }
        for (let i = 0; i < this.slots.length; i++) {
            const p = this.slots[i];
            if (p) p.storedEnergy = Math.max(0, p.storedEnergy + deltas[i]);
        }
    }

    // Remove a single pellet from this organism (eaten by another pellet)
    removePellet(pellet) {
        const idx = this.slots.indexOf(pellet);
        if (idx !== -1) {
            this.slots[idx] = null;
            pellet.organismId = null;
        }
    }

    // Starvation death: all pellets become free (keep storedEnergy, lose group membership)
    release() {
        for (const p of this.slots) if (p) p.organismId = null;
        for (let i = 0; i < this.slots.length; i++) this.slots[i] = null;
    }
}

Organism._nextId = 0;
