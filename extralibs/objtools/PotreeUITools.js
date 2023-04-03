import * as THREE from "../../libs/three.js/build/three.module.js";
  
/**
 * General POTREE UI Functions
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} offset 
 */
 function setNewViewPosition(x, y, z, offset,viewer) {
  viewer.scene.view.position.set(x + offset, y + offset, z + offset);
  viewer.scene.view.lookAt(new THREE.Vector3(x, y, z));
}



export {setNewViewPosition};

