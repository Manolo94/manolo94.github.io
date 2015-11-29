function createLavaSphere()
{
    // base image texture for mesh
    var lavaTexture = new THREE.ImageUtils.loadTexture( 'images/lava.jpg');
    lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping; 
    // multiplier for distortion speed 		
    var baseSpeed = 0.02;
    // number of times to repeat texture in each direction
    var repeatS = repeatT = 4.0;

    // texture used to generate "randomness", distort all other textures
    var noiseTexture = new THREE.ImageUtils.loadTexture( 'images/cloud.png' );
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping; 
    // magnitude of noise effect
    var noiseScale = 0.5;

    // texture to additively blend with base image texture
    var blendTexture = new THREE.ImageUtils.loadTexture( 'images/lava.jpg' );
    blendTexture.wrapS = blendTexture.wrapT = THREE.RepeatWrapping; 
    // multiplier for distortion speed 
    var blendSpeed = 0.01;
    // adjust lightness/darkness of blended texture
    var blendOffset = 0.25;

    // texture to determine normal displacement
    var bumpTexture = noiseTexture;
    bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping; 
    // multiplier for distortion speed 		
    var bumpSpeed   = 0.05;
    // magnitude of normal displacement
    var bumpScale   = 2.0;

    // use "this." to create global object
    this.customUniforms = {
        baseTexture: 	{ type: "t", value: lavaTexture },
        baseSpeed:		{ type: "f", value: baseSpeed },
        repeatS:		{ type: "f", value: repeatS },
        repeatT:		{ type: "f", value: repeatT },
        noiseTexture:	{ type: "t", value: noiseTexture },
        noiseScale:		{ type: "f", value: noiseScale },
        blendTexture:	{ type: "t", value: blendTexture },
        blendSpeed: 	{ type: "f", value: blendSpeed },
        blendOffset: 	{ type: "f", value: blendOffset },
        bumpTexture:	{ type: "t", value: bumpTexture },
        bumpSpeed: 		{ type: "f", value: bumpSpeed },
        bumpScale: 		{ type: "f", value: bumpScale },
        alpha: 			{ type: "f", value: 1.0 },
        time: 			{ type: "f", value: 1.0 }
    };

    // create custom material from the shader code above
    //   that is within specially labeled script tags
    var customMaterial = new THREE.ShaderMaterial( 
    {
        uniforms: customUniforms,
        vertexShader:   document.getElementById( 'planetCoreVertexShader'   ).textContent,
        fragmentShader: document.getElementById( 'planetCoreFragmentShader' ).textContent
    }   );

    var ballGeometry = new THREE.SphereGeometry( 15, 64, 64 );
    var ball = new THREE.Mesh(	ballGeometry, customMaterial );
    scene.add( ball );
    console.log('Lave sphere done');
}

function CreatePlanetSphere()
{
    // Objects
    // Models
    var g = new THREE.BoxGeometry(200,200,200, 20, 20, 20);

    for (var i in g.vertices) {
        var vertex = g.vertices[i];
        vertex.normalize().multiplyScalar(PLANET_RADIUS);
    }

    g.dynamic = true;
    g.normalsNeedUpdate = true;

    var material = new THREE.MeshPhongMaterial({color: 'brown', fog: false});
    
//    material.map = THREE.ImageUtils.loadTexture('images/earthmap1k.jpg');
//    material.bumpScale = 8;
    planetSphere = new THREE.Mesh( g, material);
    planetSphere.castShadow = true;

    //otherSphere = new THREE.Mesh( new THREE.SphereGeometry(1,3,3), new THREE.MeshBasicMaterial({color: 'red', fog: false}));

    sPosition = planetSphere.position.clone();
    sPosition.negate();


    for( var i = 0; i < planetSphere.geometry.vertices.length; i++ )
        {                        
            var v = planetSphere.geometry.vertices[i].clone();
            v.add( sPosition );
            v.normalize();
            var r = Math.random()*0.1 - 0.05;

            planetSphere.geometry.vertices[i].x -= v.x*r;
            planetSphere.geometry.vertices[i].y -= v.y*r;
            planetSphere.geometry.vertices[i].z -= v.z*r;
        }

    planetSphere.geometry.verticesNeedUpdate = true;
    planetSphere.geometry.normalsNeedUpdate = true;

    /* Compute normals */
    planetSphere.geometry.computeFaceNormals();
    planetSphere.geometry.computeVertexNormals();
}

// Push back materials
var materials = [];

var materialsShieldType = [new THREE.MeshPhongMaterial({color: 'blue', fog: false, transparent:true, opacity:0.2}),
                           new THREE.MeshPhongMaterial({color: 'blue', fog: false, transparent:true, opacity:0.6}),
                            new THREE.MeshPhongMaterial({color: 'blue', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'red', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'gray', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'yellow', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'green', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'white', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'purple', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'pink', fog: false, side: THREE.DoubleSide}),
                          new THREE.MeshPhongMaterial({color: 'magenta', fog: false, side: THREE.DoubleSide})];

//number of shields per axis
var nsa = 4;

function CreateDefenseSphere()
{
    // Objects
    // Models
    var g = new THREE.BoxGeometry(200,200,200, 20, 20, 20);



    g.dynamic = true;
    g.normalsNeedUpdate = true;

    for (var i in g.vertices) {
        var vertex = g.vertices[i];
        vertex.normalize().multiplyScalar(DEFENSE_RADIUS);
    }



    g.verticesNeedUpdate = true;
    g.normalsNeedUpdate = true;

    /* Compute normals */
    g.computeFaceNormals();
    g.computeVertexNormals();

    for( var f = 0; f < g.faces.length; f++ )
    {
//                    g.faces[i].materialIndex = 0;
//                    
//                    if( i > g.faces.length / 2 )
//                        g.faces[i].materialIndex = 1;
        


        var index = calculateShield( g, g.faces[f] );

        if(shields[ index ] === undefined)
        {
            shields[ index ] = new Shield();
        }

        shields[ index ].AddFaceIndex( f );

    }
    
    // For every shield
    for( var s = 0; s < shields.length; s++ )
    {
        materials[s] = materialsShieldType[0];
        
        if( shields[s] === undefined)
            continue;
        
        for( var f = 0; f < shields[s].faceIndex.length; f++ )
        {
                g.faces[ shields[s].faceIndex[f] ].materialIndex = s;
        }
    }
        
    defenseSphere = new THREE.Mesh( g, new THREE.MeshFaceMaterial() );            


    defenseSphere.material.materials = materials;


    defenseSphere.castShadow = true;

    //otherSphere = new THREE.Mesh( new THREE.SphereGeometry(1,3,3), new THREE.MeshBasicMaterial({color: 'red', fog: false}));

    sPosition = defenseSphere.position.clone();
    sPosition.negate();

    defenseSphere.geometry.verticesNeedUpdate = true;
    defenseSphere.geometry.normalsNeedUpdate = true;

    /* Compute normals */
    defenseSphere.geometry.computeFaceNormals();
    defenseSphere.geometry.computeVertexNormals();
}

function calculateShield( geometry, face )
{
    var vertexa = geometry.vertices[ face.a ].clone();
    var vertexb = geometry.vertices[ face.b ].clone();
    var vertexc = geometry.vertices[ face.c ].clone();

    var vertex = new THREE.Vector3( (vertexa.x + vertexb.x + vertexc.x) / 3, (vertexa.y + vertexb.y + vertexc.y) / 3, (vertexa.z + vertexb.z + vertexc.z) / 3 );
    
    var beta = Math.asin(vertex.z/DEFENSE_RADIUS);

    var d = vertex.x/(Math.cos(beta) * DEFENSE_RADIUS);
    if( d > 1 )
        d = 1;
    if( d < -1 )
        d = -1;

    var alpha = Math.acos( d );

    var i = Math.floor((alpha)/(2 * Math.PI) * nsa);
    var j = 0;

    if( vertex.z < 0 )
        j = 1;

    if( vertex.y < 0 )
        i = nsa - i - 1;   

//    console.log((2 * Math.PI) / nsa);
//
//    console.log( "alpha =" + alpha + " beta =" + beta + " i =" + i + " j =" + j);
    
    return i + j * nsa;
}

function changeDefenseAppearance( shield, materialIndex )
{
//    console.log("The shield is " + shield);
    
    materials[shield] = materialsShieldType[materialIndex];
}

function collideAsteroid( asteroid )
{
    // update the picking ray with the camera and mouse position	
    raycaster.set( asteroid.asteroid.position.clone(), asteroid.option.velocity.clone().normalize() );

    if( asteroid.asteroid.position.length() > 40 || asteroid.asteroid.position.length() < 20 )
        return;

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects( [planetSphere] );

    if( intersects.length > 0 )
    {       
        var clone = asteroid.asteroid.position.clone();
        createExplosion(clone.x,clone.y,clone.z);
        
        
        extrudeFaceInsideSphere( intersects[0].face.a, planetSphere.geometry, 0.3, planetSphere.position );
        extrudeFaceInsideSphere( intersects[0].face.b, planetSphere.geometry, 0.3, planetSphere.position );
        extrudeFaceInsideSphere( intersects[0].face.c, planetSphere.geometry, 0.3, planetSphere.position );  
        
        
        
        scene.remove(asteroid.asteroid);
        asteroid.remove();
    }

//                    for( var i = 0; i < planetSphere.geometry.vertices.length; i++ )
//                    {                        
//                        //var v = planetSphere.geometry.vertices[i].clone();
//                        //v.add( sPosition );
//                        //v.normalize();
//                        var r = Math.random()*0.5 - 0.25;
//                        
//                        planetSphere.geometry.vertices[i].x -= planetSphere.geometry.vertices[i].normalv.x*r;
//                        planetSphere.geometry.vertices[i].y -= v.y*r;
//                        planetSphere.geometry.vertices[i].z -= v.z*r;
//                    }

    planetSphere.geometry.verticesNeedUpdate = true;
    planetSphere.geometry.normalsNeedUpdate = true;

    /* Compute normals */
    planetSphere.geometry.computeFaceNormals();
    planetSphere.geometry.computeVertexNormals();
}

/*
 * Remember to call geometry.computeFaceNormals();
 *                  geometry.computeVertexNormals();
 */
function extrudeFaceInsideSphere( faceIndex, sphereGeometry, extrudeAmount, sphereCenter )
{
    var v = sphereGeometry.vertices[faceIndex].clone();
    v.add( sphereCenter.clone().negate() );
    v.normalize();

    sphereGeometry.vertices[faceIndex].x -= v.x*extrudeAmount;
    sphereGeometry.vertices[faceIndex].y -= v.y*extrudeAmount;
    sphereGeometry.vertices[faceIndex].z -= v.z*extrudeAmount;
}