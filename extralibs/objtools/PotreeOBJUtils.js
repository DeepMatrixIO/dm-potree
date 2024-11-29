import * as THREE from "../../libs/three.js/build/three.module.js";
import { OBJLoader } from "./OBJLoaderGeo.js";
//import { OBJLoader } from "../../libs/three.js/loaders/OBJLoaderGeo.js";
import { MTLLoader } from "./MTLLoader.js";
import * as UITools from "./PotreeUITools.js";
/**
 * Names fot the elements within the jstree
 */

let viewer;
var jstreedebug;
let objTreeName = '3D Objects';// Name of the three
let objTreeId = '3DObjects';//identifier
let treeRoot = `#jstree_scene`;
/**
 * a registry made to store each object   name -> object
 * 
 * */
let objRegistry = [];//internal registry of 3d objects OBJ, objects are indexed by jstree node name, so no duplicates
function addObject2Registry(name, obj) {
  objRegistry[name] = obj;
}


/**
 * Promise to wait for a jstree div element.
 * @param {*} selector 
 * @returns 
 */
function waitForElement(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}


/**
Function to loading an OBJ from the server
If a mtl file is not existant , then a null value should be passed
this works with the potree implementation for threejs
the object appears within the jstree_scene container into the OBJ section
*/



function add3DObject2Node(nodeName, objFile, mtlFile, opacity, offset_x, offset_y, offset_z) {

  let tree = $(`#jstree_scene`);//arbol principal
  let rootNode = $('#' + objTreeId)[0];

  //If the root node doesnt exist, create it with the name objTreeName
  if (!rootNode) {
    rootNode = tree.jstree(
      'create_node',
      "#",//root node as no parent node exists and # means root
      {
        "text": "<b>" + objTreeName + "</b>",
        "id": objTreeId
      }, //JSON 3D
      "last", //position
      false, //callback
      false);//is loaded

  }//else, use it
  console.log(objTreeId + ' exists, ... using it...')


  let parentNode = objTreeId;//name o refer to the parent note


  //el nodo en cuestion
  let objectNode = tree.jstree(
    'create_node',
    parentNode,//root node

    //a json definition containing  a node description
    //https://www.jstree.com/docs/json/
    {
      text: nodeName,//name of the entry
      icon: `${Potree.resourcePath}/icons/triangle.svg`,//icon used
      _obj: objFile,//added properties
      _mtl: mtlFile,
      _nodeType: 'objNode',
      _opacity: opacity,
      _offset_x: offset_x,
      _offset_y: offset_y,
      _offset_z: offset_z
    },
    "last", false, false);


/*
  let trans = tree.jstree('create_node', objectNode, { text: "Transparency", _nodeType: 'Transparency' }, "last", false, false);//data se usa en sidebar.js
  let opacityNode = tree.jstree('create_node', objectNode, { "text": "Opacity" }, "last", false, false);
*/


  //ask directly to the mesh if it is visible, so fill directly the state od the node as a tect
  //  tree.jstree(mesh.visible ? "check_node" : "uncheck_node", objectNode);//sigo sin entender 
  //  tree.jstree(mesh.children[0].material.transparent ? "check_node" : "uncheck_node", trans);


  return objectNode;//this jstree node id

}


/**

Wrapper function  to load OBJ files and append then into the POTREE rendering system using a built in control.

Work well with a button, but could be better if receives parameters
USes a 1) file reader dialog, 2) a div named fileinput, 3) a function to lad th OBJ file based on the template
which also computes the new center and translates everything 

Makes use of the loadOBJMTLLocal
*/

function loadFile() {
  var input;//input dialog
  var file;// filename
  var fr;//file reader
  var name;//name of the file

  if (typeof window.FileReader !== 'function') {
    alert("The file API isn't supported on this browser yet.");
    return;
  }

  input = document.getElementById('fileinput');
  if (!input) {
    alert("Um, couldn't find the fileinput element.");
  }
  else if (!input.files) {
    alert("This browser doesn't seem to support the `files` property of file inputs.");
  }
  else if (!input.files[0]) {
    alert("Please select a file before clicking 'Load'");
  }
  else {
    file = input.files[0];
    name = file.name;
    fr = new FileReader();

    fr.onload = function (e) {
      let lines = e.target.result;//que objeto es este?
      loadOBJMTLLocal(lines, null, name);
    }//esta funcion se llama cuando se carga o hace la llamada readAsText


    fr.readAsText(file);//only works for obj files in text format.


  }



}






/** 
 * New function to loadOBJMTL, 
 * First creates an entry on the tree and postphones the load until the checkbox is loaded
deprecates the loadOBJMTL as the primary function
  nodeName: NAme of the node
  objFile: obj filename
  mtlFile: material filename
  preLoaded: 
  opacity:  opacity value
  offset_x: amount of x offset from its defined position.
  offset_y: amount of y offset from its defined position.
  offset_z: amount of z offset from its defined position.


 * 
*/


//nodes are attached to the treeRoot and later to the branch objTreeId(3dObjects) typically
//also nodes are registered
function addOBJMTLLazy(parameters) {

  let tree = $(treeRoot);//jquery free

  //try to get the branch, otherwise, is created
  let MallaID = tree.jstree('get_node', objTreeId);//obtenemos el objeto por id
  //If the root node doesnt exist, create it with the name objTreeName
  //ROOT NODE

  if (!MallaID) {//create the node
    MallaID = tree.jstree(
      'create_node',
      "#",//root node as no parent node exists and # means root
      {//config as a json object
        "text": "<b>" + objTreeName + "</b>",
        "id": objTreeId
      }, //JSON
      "last", //position
      false, //callback
      false);//is loaded

  }//else, use it


  let parentNode = objTreeId;//name to refer to the parent node of the new obj


  //aqui se crea
  let objectNodeId = tree.jstree(
    'create_node',
    parentNode,//root node
    //a json definition containing  a node description
    //https://www.jstree.com/docs/json/
    {//setting the object
      text: parameters.name,//name of the entry
      icon: `${Potree.resourcePath}/icons/triangle.svg`,
      _obj: parameters.obj,//obj path
      _mtl: parameters.mtl,//mtl path
      _name: parameters.name,//mtl path

      _nodeType: 'objNode',
      _opacity: parameters.opacity,//display parameters
      _offset_x: parameters.offset_x,//display parameters
      _offset_y: parameters.offset_y,
      _offset_z: parameters.offset_z,
      _positon: parameters.position,
      _parameters: parameters



      //,//icon used
      //data: null//en este caso, es un objeto al cual se le puede asignar un valor
      //mesh //the reference to the object
    },
    "last",
    false,//callback after loading 
    false);

  //additional features, accesssible by name and type
  
//  let transId = tree.jstree('create_node', objectNodeId, { "text": "Transparency", _nodeType: 'Transparency' }, "last",    false    , false);//data se usa en sidebar.js
//  let opacityId = tree.jstree('create_node', objectNodeId, { "text": "Opacity" }, "last", false, false);



  tree.jstree(parameters.preload ? "check_node" : "uncheck_node", objectNodeId);//mando o no el evento de activado

  //intentando colapsar
  //tree.jstree("close_node",  objectNodeId);
  /*
  if(collapsed){
    console.log('Collapsing :::::::::::::::::::: '+ nodeName + ' > ' + objectNodeId)
    if(tree.jstree("is_open",  objectNodeId)){
      tree.jstree("close_node",  objectNodeId);//mando o no el evento de activado
    }    
  }
  */

  return objectNodeId;
}





//attach action to the obj items, loaded after adding each element
function registerOBJActions(viewer) {


  let tree = $(treeRoot)
  tree.on("check_node.jstree", function (e, data) {// data is the selected node

    let _obj = data.node.original._obj;//accessing the parent object in original
    let _mtl = data.node.original._mtl;

    let selectedNodeType = data.node.original._nodeType;
    let associated_obj;
    //si es transparencia, se debe obtener el nombre del padre para saber a quien aplicar
    //if(sparencia, se debe obtener el nombre del padre para saber a quien aplicar
    if (selectedNodeType == 'Transparency') {
      // associated_obj = $("#jstree_scene").jstree("get_node", data.node.parent).original._obj;//obtenemos el nombre del obj guardado
      let associated_node = $("#jstree_scene").jstree("get_node", data.node.parent);
      let associated_obj = associated_node.original._obj;
      //si no estuviera cargado, hay que cargarlo
      //si ya esta cargado, solo activar la transparencia
      console.log('CHECKING TRANSPARENCY FOR ' + associated_obj)
      if (associated_obj != null) {//si es uno de los nodos que hice
        if (objRegistry[associated_obj] != null) {
          console.log('ENABLING TRANSPARENCY ON ' + associated_obj)
          objRegistry[associated_obj].children[0].material.transparent = true;
          objRegistry[associated_obj].children[0].material.opacity = associated_node.original._opacity;//opacity;
        } else {
          //please enable it first
        }

      }
    }///////////////////////// end of transparency

    //si el click corresponde con el nombre de un nodo
    if (selectedNodeType == 'objNode') {//si el click corresponde al nombre de un nodo de obj, 
      //associated_obj = data.node.original._obj;

      if (objRegistry[_obj] == null) {
        console.log('ENABLING  NODE ' + _obj);
        let parameters = data.node.original._parameters;//

        loadOBJMTL(viewer, parameters)
        //loadOBJMTL_simple(_obj, _mtl, offx, offy, offz, loader, viewer);//<----aqui se registra
      }
      else {
        console.log('Already loaded, making it visible ' + _obj);
        objRegistry[_obj].visible = true;

      }


      
          if (data.node.text == 'Opacity') {
            //let currentValue = objRegistry[thisNode].children[0].material.opacity;
            let currentValue = objRegistry[_obj].children[0].material.opacity;
            if (currentValue > 0.25) {
              //          objRegistry[thisNode].children[0].material.opacity = currentValue - 0.25;
              objRegistry[_obj].children[0].material.opacity = currentValue - 0.25;
            } else {
              //objRegistry[thisNode].children[0].material.opacity = 1.0;
              objRegistry[_obj].children[0].material.opacity = 1.0;
            }
          }
      



    }

    // mesh.children[0].material.transparent = mesh.children[0].material.transparent ^ true;
  });




  //on uncheck
  tree.on("uncheck_node.jstree", function (e, data) {//en este caso, data es el nodo
    let _obj = data.node.original._obj;//el 
    let _mtl = data.node.original._mtl;

    //////todo
    // revisar si es transparencia, extraer de la info del json



    let selectedNodeType = data.node.original._nodeType;
    let associated_obj;
    //si es transparencia, se debe obtener el nombre del padre para saber a quien aplicar
    //if(sparencia, se debe obtener el nombre del padre para saber a quien aplicar
    if (selectedNodeType == 'Transparency') {
      associated_obj = $("#jstree_scene").jstree("get_node", data.node.parent).original._obj;//obtenemos el nombre del obj guardado
      //si no estuviera cargado, hay que cargarlo
      //si ya esta cargado, solo activar la transparencia
      if (objRegistry[associated_obj] != null) {
        console.log('DISABLING TRANSPARENCY ON ' + associated_obj)
        objRegistry[associated_obj].children[0].material.transparent = false;
        objRegistry[associated_obj].children[0].material.opacity = 1.0;//opacity;      }else{
        //please enable ir first
      }
    }
    //si el click corresponde con el nombre de un nodo
    if (selectedNodeType == 'objNode') {//si el click corresponde al nombre de un nodo de obj, 
      console.log('DISABLING NODE ' + _obj);

      //associated_obj = data.node.original._obj;

      objRegistry[_obj].visible = false;



    }
  });




  tree.on("close_node.jstree", function (e, data) {
    console.log("*************************************************")
    let name = data.name;
    console.log(e);
    console.log(data.node.text);
    if (data.node.text = name) {
      console.log('CLOSED EVT on +++++++++++ : ' + name)
    } else {
      console.log('CLOSED EVT on OTHER  >>>>>>>> :' + name)

    }


  }
  );

  tree.on("select_node.jstree", function (e, data) {
    console.log("*************************************************")

    console.log("select NODE")

    let parameters = data.node.original._parameters;//
    UITools.setNewViewPosition(parameters.position[0],parameters.position[1],parameters.position[2],100,viewer);

  });
/*
    let name = data.name;
    console.log(e);
    console.log(data.node.text);
    if (data.node.text = name) {
      console.log('CLOSED EVT on +++++++++++ : ' + name)
    } else {
      console.log('CLOSED EVT on OTHER  >>>>>>>> :' + name)

    }

*/
 
/*
  tree.on("hover_node.jstree", function (e, data) {
    console.log("*************************************************")

    console.log("hover NODE")


  });
*/

  



}

function collapseItem(nodeId) {
  //harcoded jstree id
  $("#jstree_scene").jstree("close_node", "#" + nodeId);

}








let loadOBJMTL = function (viewer, parameters) {


  let onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      let percentComplete = xhr.loaded / xhr.total * 100;
      console.log(Math.round(percentComplete, 2) + '% downloaded');
    }
  };

  let onError = function (xhr) { };

  let loader = new OBJLoader();//debia tener una opcion para recentrarlo
  let mtlLoader = new MTLLoader();
  if (parameters.mtl) {

    mtlLoader.load(parameters.mtl, function (materialsCreator) {
      console.log(materialsCreator)
      materialsCreator.preload();

      loader.setMaterials(materialsCreator);
    });
  }
  loader.load(
    parameters.obj,
    function (object) {

      object.name = parameters.obj;
      
      object.children.forEach(element => {
      //  element.material.side = THREE.DoubleSide;
        console.log(element)
    });
      

      if (!parameters.offset_x) parameters.offset_x = 0.0;
      if (!parameters.offset_y) parameters.offset_y = 0.0;
      if (!parameters.offset_z) parameters.offset_z = 0.0;
      if (parameters.position) {
        object.position.set(parameters.position[0], parameters.position[1], parameters.position[2]);//in case of a custom obj
      } else {
        object.position.set(object.reference.x + parameters.offset_x, object.reference.y + parameters.offset_y, object.reference.z + parameters.offset_z);
        parameters.position=[object.reference.x + parameters.offset_x, object.reference.y + parameters.offset_y, object.reference.z + parameters.offset_z]
      }
/*
      let objPosition = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      }
*/
      if (parameters.scale) {
        object.scale.multiplyScalar(parameters.scale);
      }
      if (parameters.rotation) {
        object.rotation.set(parameters.rotation[0], parameters.rotation[1], parameters.rotation[2]);
      }

      addObject2Registry(parameters.obj, object);//agregamos al registro d eobjetos

      viewer.scene.scene.add(object);


      /*
      viewer.onGUILoaded(() => {
        // Add entries to object list in sidebar
        let tree = $(`#jstree_scene`);
        let parentNode = "other";

        if(!parameters.name){
          parameters.name=parameters.url;
        }

        let objID = tree.jstree('create_node', parentNode, {
          text: parameters.name,
          icon: `${Potree.resourcePath}/icons/triangle.svg`,
          data: object
        },
          "last", false, false);

        //adding custom functions	
        tree.jstree(object.visible ? "check_node" : "uncheck_node", objID);


        //tree.jstree("open_node", parentNode);
      });
*/


    }
    , onProgress, onError);


};


let loadOBJMTLSimple = function (viewer, parameters) {
  	let manager = new THREE.LoadingManager();
			//manager.onProgress = function (item, loaded, total) {
			//		console.log(item, loaded, total);
			//	};



			let onProgress = function (xhr) {
				if (xhr.lengthComputable) {
					let percentComplete = xhr.loaded / xhr.total * 100;
					console.log(Math.round(percentComplete, 2) + '% downloaded');
				}
			};
			let onError = function (xhr) { };

  let loader = new OBJLoader(manager);//debia tener una opcion para recentrarlo
  let mtlLoader = new MTLLoader(manager);
  if (parameters.mtl) {

    mtlLoader.load(parameters.mtl, function (materialsCreator) {
      console.log(materialsCreator)
      materialsCreator.preload();

      loader.setMaterials(materialsCreator);
    });
  }
  loader.load(
    parameters.obj,
    function (object) {

       object.name = parameters.obj;
      ;
      
      object.children.forEach(element => {
       // element.material.side = THREE.DoubleSide;
       console.log(element)

      });


      if (!parameters.offset_x) parameters.offset_x = 0.0;
      if (!parameters.offset_y) parameters.offset_y = 0.0;
      if (!parameters.offset_z) parameters.offset_z = 0.0;
      if (parameters.position) {
        object.position.set(parameters.position[0], parameters.position[1], parameters.position[2]);//in case of a custom obj
      } else {
        object.position.set(object.reference.x + parameters.offset_x, object.reference.y + parameters.offset_y, object.reference.z + parameters.offset_z);
      }

      let objPosition = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      }

      if (parameters.scale) {
        object.scale.multiplyScalar(parameters.scale);
      }
      if (parameters.rotation) {
        object.rotation.set(parameters.rotation[0], parameters.rotation[1], parameters.rotation[2]);
      }


      viewer.scene.scene.add(object);

      viewer.onGUILoaded(() => {
        // Add entries to object list in sidebar
        let tree = $(`#jstree_scene`);
        let parentNode = "other";

        if (!parameters.name) {
          parameters.name = parameters.obj;
        }

        let objID = tree.jstree('create_node', parentNode, {
          text: parameters.name,
          icon: `${Potree.resourcePath}/icons/triangle.svg`,
          data: object
        },
          "last", false, false);

        //adding custom functions	
        tree.jstree(object.visible ? "check_node" : "uncheck_node", objID);


        //tree.jstree("open_node", parentNode);
      });



    }
    , onProgress, onError);


};





export { addOBJMTLLazy, loadOBJMTLSimple, registerOBJActions, objRegistry };