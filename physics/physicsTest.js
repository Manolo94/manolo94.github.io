// CONSTANTS
var NEEDS_TESTING = true;
var DX = 1e-5;
var GRAVITY = { x : 0.0, y: -9.8 };
var ACCENT = { r: 0.31, g: 0.80, b: 0.64, a: 1.0 }; // teal: #4ecca3

// VECTOR MATH
class Vector2D {
    constructor(x = 0, y = 0) {this.x = x; this.y = y;}
}
var scalarMultiply = (vector, scalar) => { return new Vector2D(vector.x * scalar, vector.y * scalar); };
var sumVectors = (vector1, vector2) => { return new Vector2D(vector1.x + vector2.x, vector1.y + vector2.y); };
var dotProduct = (vector1, vector2) => { return vector1.x * vector2.x + vector1.y * vector2.y; };
var sqrLength = (vector) => { return dotProduct(vector, vector); };
var vectorNormalize = (vector) => {
    return scalarMultiply(vector, 1 / Math.sqrt(sqrLength(vector)));
};
var crossProduct = (vector1, vector2) => { return vector1.x * vector2.y - vector1.y * vector2.x; };
var equalScalars = (scalar1, scalar2) => { return Math.abs(scalar1 - scalar2) < DX; };
var greaterThanScalar = (scalar1, scalar2) => { return !equalScalars(scalar1, scalar2) && scalar1 > scalar2; };
var equalVectors = (vector1, vector2) => {
    return equalScalars(vector1.x, vector2.x)
        && equalScalars(vector1.y, vector2.y);
};
var rotateVector = (vector, rotation) => {
    var cosTheta = Math.cos(rotation); var sinTheta = Math.sin(rotation);
    var resX = cosTheta * vector.x - sinTheta * vector.y;
    var resY = sinTheta * vector.x + cosTheta * vector.y;
    return new Vector2D(resX, resY);
};

class Ray {
    constructor(o, t, d) { this.o = o; this.t = t; this.d = d; }
    draw(game, world)
    {
        var context = game.context;
        var renderO = world.getRenderCoords(this.o, context.canvas.height);
        var endPos = this.getPointFromTPrime(this.t);
        var renderEnd = world.getRenderCoords(endPos, context.canvas.height);

        context.beginPath()
        game.setContextToColor(ACCENT, false);
        context.moveTo(renderO.x, renderO.y);
        context.lineTo(renderEnd.x, renderEnd.y);
        context.stroke();
    }
    setEndPoint(endPoint)
    {
        this.d = sumVectors(endPoint, scalarMultiply(this.o, -1));
        this.t = Math.sqrt(sqrLength(this.d));
        this.d = vectorNormalize(this.d);
    }
    getPointFromTPrime(tPrime)
    {
        // p = o + t'd
        return sumVectors(scalarMultiply(this.d, tPrime), this.o);
    }
}

var rayCircleTCollision = (ray, circle) => {
    var c = circle.pos; // center
    var r = circle.radius;
    var ominusc = sumVectors(ray.o, scalarMultiply(c, -1));
    // d . d
    var A = dotProduct(ray.d, ray.d);
    // B = 2d(o - c)
    var B = dotProduct(scalarMultiply(ray.d, 2), ominusc);
    var C = dotProduct(ominusc, ominusc) - r*r;

    var D = B*B - 4*A*C;

    var collisions = []

    if(equalScalars(D, 0) || greaterThanScalar(D, 0)) collisions.push((-B+Math.sqrt(D))/(2*A));
    if(greaterThanScalar(D, 0)) collisions.push((-B-Math.sqrt(D))/(2*A)); // two solutions if D > 0, one if D == 0

    if(equalScalars(D,0)) console.log("D is " + D);

    return collisions;
};

var rayCircleCollision = (ray, circle) => {
    var tCollisions = rayCircleTCollision(ray, circle);

    return tCollisions.map(t => ray.getPointFromTPrime(t));
}

function TESTING() {
    NEEDS_TESTING = false;

    console.assert(equalVectors({x: 1.0, y: 0.5}, {x:0.5, y:1.0}) === false);
    console.assert(equalVectors({x: 1.0, y: 0.5}, {x:1.0, y:1.0}) === false);
    console.assert(equalVectors({x: 1.0, y: 0.5}, {x:0.5, y:0.5}) === false);
    console.assert(equalVectors({x: 1.0, y: 0.5}, {x:1.0, y:0.5}) === true);

    console.assert(greaterThanScalar(0.000001, 0) == false);
    console.assert(greaterThanScalar(0.001, 0) == true);
    console.assert(greaterThanScalar(3, 1) == true);
    console.assert(greaterThanScalar(0, 0) == false);
    console.assert(greaterThanScalar(-39, -10) == false);
    console.assert(greaterThanScalar(-89.38389329, -89.383893292) == false);
    
    console.assert(equalVectors(scalarMultiply({x:1.0, y:0.5}, 3), {x:3, y:1.5}));
    console.assert(equalVectors(sumVectors({x:1.0, y:1.0}, {x: 1.45, y: 5.6}), {x: 2.45, y: 6.6}));
    console.assert(equalScalars(dotProduct({x:0.0, y:0.0}, {x: 7.0, y: 5.0}), 0));
    console.assert(equalScalars(dotProduct({x:0.0, y:1.0}, {x: 7.0, y: 5.0}), 5.0));
    console.assert(equalScalars(dotProduct({x:1.0, y:0.0}, {x: 7.0, y: 5.0}), 7.0));
    console.assert(equalScalars(dotProduct({ x: 2.0, y: 3.0 }, { x: 7.0, y: 5.0 }), 29.0));
    console.assert(equalScalars(crossProduct({ x:  1.0, y: 0.0 }, { x: 12.5, y: 5.0 }), 5.0));
    console.assert(equalScalars(crossProduct({ x: 12.5, y: 5.0 }, { x: 1.0, y: 0.0 }), -5.0));
    console.assert(equalScalars(crossProduct({ x: 1.0, y: 0.9 }, { x: 12.5, y: 5.0 }), -6.25));
    console.assert(equalScalars(crossProduct({ x: 12.5, y: 5.0 }, { x: 1.0, y: 0.9 }),  6.25));
    
    console.assert(equalVectors(vectorNormalize({x: 20, y: 0}), {x: 1.0, y: 0}));
    console.assert(equalVectors(vectorNormalize({x: 0, y: 20}), {x: 0, y: 1.0}));
    console.assert(equalVectors(vectorNormalize({x: 1, y: 1}), {x: 0.70710678118, y: 0.70710678118}));

    var p = new Physics();
    console.assert(equalVectors({ x: 1.98, y: 0.0 }, p.getWorldCoords(p.getRenderCoords({ x: 1.98, y: 0.0 }, 500), 500)));
    // TODO: test for localtoworld and worldtolocal coords
    console.assert(equalVectors(rotateVector(new Vector2D(1.0, 0), Math.PI / 2), new Vector2D(0.0, 1.0))); // need more test
}

class RigidBody {
    constructor(x, y) {
        this.mass = 1;
        this.I = 1; // moment of inertia
        
        this.pos = {x: x, y: y};
        this.vel = {x: 0, y: 0};
        
        this.rotation = 0;
        this.angVel = 0;
    }
    update(game, world) {        
        var instantVel = scalarMultiply(this.vel, game.deltaTime*world.timeScale);
        
        //if(Math.abs(this.angVel) < 0.01) this.angVel = 0;
        //if(Math.abs(sqrLength(instantVel)) < 0.0000004) this.vel = new Vector2D();
        
        this.pos = sumVectors(instantVel, this.pos);
        

        
        this.rotation += this.angVel * game.deltaTime * world.timeScale;
    }
    toLocalCoords(worldCoordsVector) {
        var localBeforeTranslate = sumVectors(worldCoordsVector, scalarMultiply(this.pos, -1.0));
        return rotateVector(localBeforeTranslate, -this.rotation);
    }
    toWorldCoords(localCoordsVector) {
        var localBeforeTranslate = rotateVector(localCoordsVector, this.rotation);
        return sumVectors(localBeforeTranslate, scalarMultiply(this.pos, 1.0));
    }
}

class Circle extends RigidBody {
    constructor(x, y, radius = 0.3) {
        super(x, y);
        this.radius = radius;
    }
    draw(game, world) {
        var context = game.context;
        
        // TODO: Need a function (camera) that does all the transformations
        var renderCoords = world.getRenderCoords(this.pos, context.canvas.height);
        
        context.beginPath();
        context.arc(renderCoords.x, renderCoords.y, this.radius*100, 0, 2 * Math.PI);

        var surfacePoint = new Vector2D(this.radius, 0.0);
        surfacePoint = this.toWorldCoords(surfacePoint);
        surfacePoint = world.getRenderCoords(surfacePoint, context.canvas.height);
        game.setContextToColor(ACCENT, false);
        context.moveTo(renderCoords.x, renderCoords.y);
        context.lineTo(surfacePoint.x, surfacePoint.y);
        context.stroke();
        //game.context.fillText("Y: " + this.pos.y, renderCoords.x + 30, renderCoords.y);
    }
    update(game, world) {
        super.update(game, world);
        
        var floor = 1.0;
        
        if (this.pos.y - this.radius < floor) {
            this.pos.y = floor + this.radius;
            this.vel.y = -0.8*this.vel.y;
        }
    }
}

class Rectangle extends RigidBody {
    constructor(x, y, width, height) {
        super(x, y);
        this.width = width;
        this.height = height;
        
        this.lastLocalRectPoints = [new Vector2D(), new Vector2D(), new Vector2D(), new Vector2D()];
        this.localRectPointsVel = [new Vector2D(), new Vector2D(), new Vector2D(), new Vector2D()];
    }
    draw(game, world) {
        var context = game.context;

        var localRectPoints = [
            new Vector2D( this.width,  this.height),
            new Vector2D(-this.width,  this.height),
            new Vector2D(-this.width, -this.height),
            new Vector2D( this.width, -this.height)
        ];

        for (var i = 0; i < 4; i++) {
            localRectPoints[i] = this.toWorldCoords(localRectPoints[i]);
            localRectPoints[i] = world.getRenderCoords(localRectPoints[i], context.canvas.height);
        }

        game.setContextToColor(ACCENT, false);

        // center of mass
        var renderCoords_Center = world.getRenderCoords(this.pos, context.canvas.height);
        context.beginPath();
        context.arc(renderCoords_Center.x, renderCoords_Center.y, 2, 0, 2 * Math.PI);
        context.fill();
        
        context.beginPath(); context.moveTo(localRectPoints[0].x, localRectPoints[0].y);
        for (i = 1; i < 4; i++) {
            context.lineTo(localRectPoints[i].x, localRectPoints[i].y);
        }
        context.lineTo(localRectPoints[0].x, localRectPoints[0].y);
        context.stroke();
    }
    update(game, world) {
        super.update(game, world);

        var localRectPoints = [
            new Vector2D(this.width, this.height),
            new Vector2D(-this.width, this.height),
            new Vector2D(-this.width, -this.height),
            new Vector2D(this.width, -this.height)
        ];
        
        var floor = 1.0;
        var worldRectPoints = [];
        
        for (var i = 0; i < 4; i++) {
            worldRectPoints[i] = this.toWorldCoords(localRectPoints[i]);
            
            this.localRectPointsVel[i] = sumVectors(worldRectPoints[i], scalarMultiply(this.lastLocalRectPoints[i], -1));
            this.localRectPointsVel[i] = scalarMultiply(this.localRectPointsVel[i], 1/game.deltaTime);
            
            if (worldRectPoints[i].y < floor) {
                this.pos.y += floor - worldRectPoints[i].y;
                worldRectPoints[i] = this.toWorldCoords(localRectPoints[i]);
                world.applyInstantForceAtPoint(this, scalarMultiply(this.localRectPointsVel[i], -1), worldRectPoints[i]);
            }
            this.lastLocalRectPoints[i] = worldRectPoints[i];
        }
    }
}

class Physics {
    constructor() {
        if (NEEDS_TESTING) TESTING();

        this.objectList = [];
        this.timeScale = 1.0;
        
        this.vectorsToDraw = [];
    }
    update(game) {
        this.objectList.forEach((pObject) => {
            this.applyInstantAcceleration(pObject, scalarMultiply(GRAVITY, game.deltaTime));
            pObject.update(game, this);
        });
    }
    draw(game) {
        //game.setContextToColor({ r: 1.0, g: 1.0, b: 1.0 });
        //game.context.fillRect(0, 0, game.context.canvas.width, game.context.canvas.height);
        this.objectList.forEach((pObject) => {
            pObject.draw(game, this);
        });
        
        var toRemove = [];
        this.vectorsToDraw.forEach((r, pos) => {
            this.drawVector(game, r.position, r.vector);
            if(Math.abs(r.timestamp - (new Date).getTime()) > 3000) // 3 seconds
                toRemove.push(pos);
        });
        
        toRemove.forEach((r) => {
            this.vectorsToDraw.splice(r);
        });
        this.vectorsToDraw = [];
    }
    addVectorToDraw(position, vector) {
        this.vectorsToDraw.push({position: position, vector: vector, timestamp: (new Date).getTime()});
    }
    drawVector(game, position, vector) {
        var context = game.context;
        var startRenderCoords = this.getRenderCoords(position, context.canvas.height);
        var endRenderCoords = this.getRenderCoords(sumVectors(position, vector), context.canvas.height);
        
        game.setContextToColor({ r: 1.0, g: 1.0, b: 0.0, a: 1.0 }, false);
        context.beginPath(); context.moveTo(startRenderCoords.x, startRenderCoords.y);
        context.lineTo(endRenderCoords.x, endRenderCoords.y);
        context.stroke();
    }
    applyInstantAcceleration(physicsObject, accel) {
        physicsObject.vel = sumVectors(physicsObject.vel, accel);
    }
    applyInstantForceAtPoint(physicsObject, worldForce, worldPoint) {
        var localPoint = sumVectors(worldPoint, scalarMultiply(physicsObject.pos, -1));
        var radialComponent = vectorNormalize(scalarMultiply(localPoint, -1));
        radialComponent = scalarMultiply(radialComponent, dotProduct(worldForce, radialComponent));
        var accel = new Vector2D(radialComponent.x / physicsObject.mass, radialComponent.y / physicsObject.mass);
        
        //this.addVectorToDraw(worldPoint, scalarMultiply(vectorNormalize(radialComponent), 0.1));
        
        this.applyInstantAcceleration(physicsObject, accel);
        this.applyInstantTorque(physicsObject, crossProduct(localPoint, worldForce));
    }
    applyInstantTorque(physicsObject, torque) {
        physicsObject.angVel += torque / physicsObject.I;
    }
    // TODO: Need a function (camera) that does all the transformations. Need to add panning
    getRenderCoords(worldCoords, height) {
        var renderX = worldCoords.x * 100;
        console.assert(height !== undefined);
        var renderY = height - worldCoords.y * 100;

        return { x: renderX, y: renderY };
    }
    // TODO: Need a function (camera) that does all the transformations. Need to add panning
    getWorldCoords(renderCoords, height) {
        var worldX = renderCoords.x / 100;
        console.assert(height !== undefined);
        var worldY = (height - renderCoords.y) / 100;

        return { x: worldX, y: worldY };
    }
}

export { Physics, Vector2D, Circle, Rectangle, Ray,
    scalarMultiply, 
    sumVectors,
    dotProduct,
    sqrLength,
    vectorNormalize,
    crossProduct,
    equalScalars,
    equalVectors,
    rotateVector,
    rayCircleCollision }