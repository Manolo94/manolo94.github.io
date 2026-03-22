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
        var numPellets = document.getElementById("numPelletsTxt").value;
        var thermalCond = document.getElementById("thermalCondTxt").value;
        var pelletMass = document.getElementById("pelletMassTxt").value;
        var numHeatSources = document.getElementById("numHeatSourcesTxt").value;
        var initialEnergy = document.getElementById("initialEnergyTxt").value;
        var maxHeatContribution = document.getElementById("maxHeatContribTxt").value;
        this.board = new PoolBoard(sideCells, thermalCond, numPellets, pelletMass, numHeatSources, initialEnergy, maxHeatContribution);
        this.started = true;
        this.resetView();
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

    update() {
        if (this.started) this.board.update(this);
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

        // FPS overlay
        this.context.font = '13px monospace';
        this.context.textAlign = 'right';
        this.context.textBaseline = 'top';
        this.context.fillStyle = 'rgba(0,0,0,0.55)';
        this.context.fillRect(this.canvas.width - 94, 6, 88, 22);
        this.context.fillStyle = '#4ecca3';
        this.context.fillText('FPS: ' + this.realFps, this.canvas.width - 8, 10);

        if (this._zoomDisplay) this._zoomDisplay.textContent = this.zoom.toFixed(1) + '×';

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
        for (var p = 0; p < this.board.numPellets; p++) {
            const pellet = this.board.PelletList[p];
            const sx = pellet.x * cellSize * totalScale + this.panX;
            const sy = pellet.y * cellSize * totalScale + this.panY;
            const dist = Math.hypot(this._canvasMouseX - sx, this._canvasMouseY - sy);
            if (dist < minDist) { minDist = dist; hovered = pellet; }
        }

        if (!hovered) return;

        const text = 'Energy: ' + hovered.energy.toFixed(3);
        const tx = this._canvasMouseX + 14;
        const ty = this._canvasMouseY - 10;

        this.context.font = '12px monospace';
        this.context.textAlign = 'left';
        this.context.textBaseline = 'bottom';
        const textW = this.context.measureText(text).width;
        this.context.fillStyle = 'rgba(0,0,0,0.75)';
        this.context.fillRect(tx - 4, ty - 16, textW + 8, 20);
        this.context.fillStyle = '#4ecca3';
        this.context.fillText(text, tx, ty);
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
