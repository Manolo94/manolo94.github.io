function Asteroid( size, color, horizontalSpeed, verticalSpeed ) {
    
  var colorValue, material, asteroid, texture, geometry, particleSystem, options, spawnerOptions;
  
  spawnerOptions = {
        spawnRate: 15000,
        horizontalSpeed: horizontalSpeed,
        verticalSpeed: verticalSpeed,
        timeScale: 1
  }  
      
  switch( color ) {
      case 'ice':
          colorValue = 0x56C1DC;
      break;
      case 'fire':
          colorValue = 0xEA3500;
      break;
      default:
          colorValue = 0xBA55D3;
      break;        
  }
        
  particleSystem = new THREE.GPUParticleSystem( { maxParticles: 10000 } );
        
  options =           {
                        position: new THREE.Vector3(),
                        positionRandomness: 1,
                        velocity: new THREE.Vector3(),
                        velocityRandomness: 1,
                        color: colorValue,
                        colorRandomness: .2,
                        turbulence: .15,
                        lifetime: 1,
                        size: size,
                        sizeRandomness: 1
                      };
        
  scene.add( particleSystem );
        
  geometry = new THREE.IcosahedronGeometry( size, size );
     
  switch( colorValue ) {
      case 0x56C1DC:
          texture = THREE.ImageUtils.loadTexture( 'images/Blue.jpg' );
      break;
      case 0xEA3500:
          texture = THREE.ImageUtils.loadTexture( 'images/Fire.jpg' );
      break;
      default:
          texture = THREE.ImageUtils.loadTexture( 'images/Nova.jpg' );
      break;
  }
          
  material = new THREE.ShaderMaterial( {
                       uniforms: { 
                       tExplosion: { 
                       type: "t", 
                       value: texture
                       },
                       time: { 
                       type: "f", 
                       value: 0.0 
                       }
                       },
                       vertexShader: document.getElementById( 'vertexShader' ).textContent,
                       fragmentShader: document.getElementById( 'fragmentShader' ).textContent
                       });
        
  asteroid = new THREE.Mesh( geometry, material );
  asteroid.castShadow = true;
  asteroid.position = new THREE.Vector3( 0, 0, 0 ); 
  scene.add( asteroid );
        
  this.positionX = function( value ){
    options.position.x = value;
    asteroid.position.x = value;
  }
    
  this.positionY = function( value ){
    options.position.y = value;
    asteroid.position.y = value;
  }
      
  this.positionZ = function( value ){
    options.position.z = value;
    asteroid.position.z = value;
  }
       
  this.rotationXYZ = function( value ){
    asteroid.rotation.x += value;
    asteroid.rotation.y += value;
    asteroid.rotation.z += value;
  }
  
  this.horizontalSpeed = function( value ){
      spawnerOptions.horizontalSpeed = value;
  }
  
  this.verticalSpeed = function( value ){
      spawnerOptions.verticalSpeed = value;
  }
       
  this.partSystem = particleSystem;
  this.option = options;
  this.spawnOptions = spawnerOptions;     
}