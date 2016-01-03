function Shield() {
    
  this.faceIndex = [];
    
  // 0 - Blue 1 - Red 2 - Gray -1 No shield
  this.shieldType = -1;
    
  this.life = 3;
    
  this.AddFaceIndex = function( value, face ){
    this.faceIndex.push(value);
  }   
}