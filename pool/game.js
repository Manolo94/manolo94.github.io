import { PoolBoard, SIMULATION_SIZE, PELLET_SIZE } from './poolboard.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');
        this.fps = 60;
        this.frame = 0;
        this.frameCount = 0;
        this.realFps = -1;
        this.board = new PoolBoard();
        this.started = false;
        this.paused = false;
        this._intervalId = null;
        this._fpsIntervalId = null;

        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this._isDragging = false;
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._canvasMouseX = -1;
        this._canvasMouseY = -1;
        this._zoomDisplay = document.getElementById('zoomDisplay');
        this.generation = 0;
        this.gaConfig = { autoplay: false };
        this.generationStats = [];

        this._setupResizeHandler();
        this._setupInputHandlers();
    }

    _setupResizeHandler() {
        const resize = () => {
            const container = this.canvas.parentElement;
            const size = Math.max(100, Math.min(container.clientWidth - 32, container.clientHeight - 32));
            this.canvas.width = size;
            this.canvas.height = size;
            this._clampPan();
        };
        new ResizeObserver(resize).observe(this.canvas.parentElement);
        resize();
    }

    _setupInputHandlers() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            this.setZoom(this.zoom * factor, e.offsetX, e.offsetY);
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            this._isDragging = true;
            this._lastMouseX = e.clientX;
            this._lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this._canvasMouseX = e.clientX - rect.left;
            this._canvasMouseY = e.clientY - rect.top;

            if (!this._isDragging) return;
            this.panX += e.clientX - this._lastMouseX;
            this.panY += e.clientY - this._lastMouseY;
            this._lastMouseX = e.clientX;
            this._lastMouseY = e.clientY;
            this._clampPan();
        });

        window.addEventListener('mouseup', () => {
            this._isDragging = false;
            this.canvas.style.cursor = 'grab';
        });
    }

    setZoom(newZoom, pivotX = this.canvas.width / 2, pivotY = this.canvas.height / 2) {
        newZoom = Math.max(1.0, Math.min(8.0, newZoom));
        const ratio = newZoom / this.zoom;
        this.panX = pivotX - ratio * (pivotX - this.panX);
        this.panY = pivotY - ratio * (pivotY - this.panY);
        this.zoom = newZoom;
        this._clampPan();
    }

    resetView() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    _clampPan() {
        const scaledSize = this.canvas.width * this.zoom;
        this.panX = Math.min(0, Math.max(this.canvas.width - scaledSize, this.panX));
        this.panY = Math.min(0, Math.max(this.canvas.height - scaledSize, this.panY));
    }

    initialize() {
        var sideCells = document.getElementById("sideCellsTxt").value;
        var numOrganisms = document.getElementById("numOrganismsTxt").value;
        var pelletsPerOrg = document.getElementById("pelletsPerOrgTxt").value;
        var organismSize = document.getElementById("organismSizeTxt").value;
        var thermalCond = document.getElementById("thermalCondTxt").value;
        var pelletMass = document.getElementById("pelletMassTxt").value;
        var numHeatSources = document.getElementById("numHeatSourcesTxt").value;
        var initialEnergy = document.getElementById("initialEnergyTxt").value;
        var maxHeatContribution = document.getElementById("maxHeatContribTxt").value;
        var spawnMaxEnergy = document.getElementById("spawnMaxEnergyTxt").value;
        var spawnIntervalTicks = Math.round(parseFloat(document.getElementById("spawnRateTxt").value) * 60);
        this.board = new PoolBoard(sideCells, thermalCond, numOrganisms, pelletsPerOrg, organismSize, pelletMass, numHeatSources, initialEnergy, maxHeatContribution, spawnMaxEnergy, spawnIntervalTicks);
        this.started = true;
        this.paused = false;
        this.generation = 1;
        this.generationStats = [];
        this.resetView();
        const genEl = document.getElementById('genDisplay');
        if (genEl) genEl.textContent = 'Gen 1';
        this._drawLifetimeGraph();
    }

    run() {
        if (this._intervalId) clearInterval(this._intervalId);
        if (this._fpsIntervalId) clearInterval(this._fpsIntervalId);
        this._intervalId = setInterval(() => {
            this.update();
            this.draw();
        }, 1000 / this.fps);
        this._fpsIntervalId = setInterval(() => {
            this.realFps = this.frame;
            this.frame = 0;
        }, 1000);
    }

    togglePause() {
        this.paused = !this.paused;
    }

    nextGeneration() {
        const deathOrder = this.board.deathOrder;
        if (deathOrder.length === 0) return;
        const eliteCount = parseInt(document.getElementById('eliteCountTxt')?.value) || 5;
        const mutationRate = parseFloat(document.getElementById('mutationRateTxt')?.value) || 0.1;
        const n = Math.max(1, Math.min(eliteCount, deathOrder.length));

        // Record lifetime stats for this generation before resetting
        const lifetimes = deathOrder.map(e => e.lifetime);
        const avg = lifetimes.reduce((s, v) => s + v, 0) / lifetimes.length;
        const max = Math.max(...lifetimes);
        this.generationStats.push({ gen: this.generation, avg, max });

        const eliteGenomes = deathOrder.slice(deathOrder.length - n).map(e => e.genome);
        this.board.respawnFromGenomes(eliteGenomes, mutationRate);
        this.generation++;
        const genEl = document.getElementById('genDisplay');
        if (genEl) genEl.textContent = 'Gen ' + this.generation;
        this._drawLifetimeGraph();
    }

    _drawLifetimeGraph() {
        const canvas = document.getElementById('lifetimeGraph');
        if (!canvas) return;
        canvas.width = canvas.clientWidth || 188;
        canvas.height = canvas.clientHeight || 110;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, w, h);

        const stats = this.generationStats;
        if (stats.length === 0) return;

        const pad = { top: 8, right: 8, bottom: 18, left: 34 };
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        const maxVal = Math.max(...stats.map(s => s.max), 1);
        const xScale = stats.length < 2 ? 0 : plotW / (stats.length - 1);
        const toX = i => pad.left + i * xScale;
        const toY = v => pad.top + plotH - (v / maxVal) * plotH;

        // Grid lines
        ctx.strokeStyle = '#1a1a2a';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
            const y = pad.top + (plotH / 3) * i;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
        }

        // Max lifetime (faint line)
        ctx.strokeStyle = 'rgba(78,204,163,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < stats.length; i++)
            i === 0 ? ctx.moveTo(toX(i), toY(stats[i].max)) : ctx.lineTo(toX(i), toY(stats[i].max));
        ctx.stroke();

        // Avg lifetime (main line)
        ctx.strokeStyle = '#4ecca3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < stats.length; i++)
            i === 0 ? ctx.moveTo(toX(i), toY(stats[i].avg)) : ctx.lineTo(toX(i), toY(stats[i].avg));
        ctx.stroke();

        // Dots
        ctx.fillStyle = '#4ecca3';
        for (let i = 0; i < stats.length; i++) {
            ctx.beginPath(); ctx.arc(toX(i), toY(stats[i].avg), 2, 0, Math.PI * 2); ctx.fill();
        }

        // Y labels
        ctx.fillStyle = '#404060';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(maxVal.toFixed(0), pad.left - 3, pad.top);
        ctx.fillText('0', pad.left - 3, pad.top + plotH);

        // X labels (first and last gen)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(stats[0].gen, toX(0), pad.top + plotH + 3);
        if (stats.length > 1) ctx.fillText(stats[stats.length - 1].gen, toX(stats.length - 1), pad.top + plotH + 3);
    }

    update() {
        if (this.started && !this.paused) {
            this.board.update(this);
            if (this.gaConfig.autoplay) {
                const eliteCount = parseInt(document.getElementById('eliteCountTxt')?.value) || 5;
                if (this.board.organisms.length <= eliteCount && this.board.deathOrder.length > 0)
                    this.nextGeneration();
            }
        }
    }

    draw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.started) {
            this._drawPlaceholder();
            return;
        }

        const displayScale = this.canvas.width / SIMULATION_SIZE;
        const totalScale = displayScale * this.zoom;

        this.context.save();
        this.context.setTransform(totalScale, 0, 0, totalScale, this.panX, this.panY);
        this.board.draw(this);
        this.context.restore();

        this.frame++;
        this.frameCount++;

        // FPS + organism count + generation overlay
        this.context.font = '13px monospace';
        this.context.textAlign = 'right';
        this.context.textBaseline = 'top';
        this.context.fillStyle = 'rgba(0,0,0,0.55)';
        this.context.fillRect(this.canvas.width - 94, 6, 88, 60);
        this.context.fillStyle = '#4ecca3';
        this.context.fillText('FPS: ' + this.realFps, this.canvas.width - 8, 10);
        this.context.fillText('Org: ' + this.board.organisms.length, this.canvas.width - 8, 28);
        this.context.fillText('Gen: ' + this.generation, this.canvas.width - 8, 46);

        if (this._zoomDisplay) this._zoomDisplay.textContent = this.zoom.toFixed(1) + '×';

        const eliteCount = parseInt(document.getElementById('eliteCountTxt')?.value) || 5;
        const canAdvance = this.board.organisms.length <= eliteCount && this.board.deathOrder.length > 0;
        const nextGenBtn = document.getElementById('nextGenBtn');
        if (nextGenBtn) nextGenBtn.disabled = !canAdvance;

        this._drawTooltip();
    }

    _drawTooltip() {
        if (this._canvasMouseX < 0) return;

        const displayScale = this.canvas.width / SIMULATION_SIZE;
        const totalScale = displayScale * this.zoom;
        const cellSize = SIMULATION_SIZE / this.board.sideCells;
        const HOVER_RADIUS_PX = PELLET_SIZE * 5 * this.zoom;

        // Find the closest pellet within hover radius (in screen space)
        let hovered = null;
        let minDist = HOVER_RADIUS_PX;
        for (var p = 0; p < this.board.PelletList.length; p++) {
            const pellet = this.board.PelletList[p];
            const sx = pellet.x * cellSize * totalScale + this.panX;
            const sy = pellet.y * cellSize * totalScale + this.panY;
            const dist = Math.hypot(this._canvasMouseX - sx, this._canvasMouseY - sy);
            if (dist < minDist) { minDist = dist; hovered = pellet; }
        }

        if (!hovered) return;

        // Build tooltip lines
        const lines = [
            'Real:   ' + hovered.realEnergy.toFixed(2),
            'Stored: ' + hovered.storedEnergy.toFixed(2),
        ];
        if (hovered.organismId !== null) {
            const org = this.board.organisms.find(o => o.id === hovered.organismId);
            lines.push('Org #' + hovered.organismId);
            if (org) lines.push('Org stored: ' + org.totalStoredEnergy.toFixed(2));
        } else {
            lines.push('Free pellet');
        }

        this.context.font = '12px monospace';
        this.context.textAlign = 'left';
        this.context.textBaseline = 'top';

        const lineH = 16;
        const maxW = Math.max(...lines.map(l => this.context.measureText(l).width));
        const tx = this._canvasMouseX + 14;
        const ty = this._canvasMouseY - 10 - lines.length * lineH;

        this.context.fillStyle = 'rgba(0,0,0,0.75)';
        this.context.fillRect(tx - 4, ty - 4, maxW + 8, lines.length * lineH + 8);
        this.context.fillStyle = '#4ecca3';
        for (let i = 0; i < lines.length; i++) {
            this.context.fillText(lines[i], tx, ty + i * lineH);
        }
    }

    _drawPlaceholder() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const lines = [
            'Each cell has a heat value — red is hot, blue is cold.',
            'Heat transfers between adjacent cells,',
            'controlled by Thermal Conductivity.',
            '',
            'Pellets move with the heat flow and contribute',
            'heat to their current cell,',
            'controlled by Pellet Mass.',
            '',
            'Configure the parameters and press Run to start.',
        ];

        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        const lineHeight = 22;
        const startY = cy - ((lines.length * lineHeight) / 2);

        lines.forEach((line, i) => {
            if (line === '') return;
            const isCallToAction = i === lines.length - 1;
            this.context.font = isCallToAction
                ? 'italic 14px "Segoe UI", system-ui, sans-serif'
                : '14px "Segoe UI", system-ui, sans-serif';
            this.context.fillStyle = isCallToAction ? '#606080' : '#383858';
            this.context.fillText(line, cx, startY + i * lineHeight);
        });
    }

    // color: { r, g, b, a } with r/g/b in range 0.0–1.0, a in range 0.0–1.0
    // fill: true sets fillStyle, false sets strokeStyle
    setContextToColor(color, fill = true) {
        var r = Math.floor(color.r * 255);
        var g = Math.floor(color.g * 255);
        var b = Math.floor(color.b * 255);
        var style = "rgba(" + r + "," + g + "," + b + "," + color.a + ")";
        if (fill) this.context.fillStyle = style;
        else this.context.strokeStyle = style;
    }
}
