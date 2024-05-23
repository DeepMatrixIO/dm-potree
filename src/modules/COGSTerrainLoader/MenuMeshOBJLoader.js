
import { htmlf } from '../../htmlf';
import { AmbientLight, DirectionalLight } from '../../three.js/build/three.module';
import { MTLLoader } from './MTLLoader';
import { OBJLoader } from './OBJLoaderGeo';




class MenuMeshLoader {

    constructor(){
        this.menuName = 'Mesh Loader'
        this.name = 'MenuMeshLoader'
        this.loader= new OBJLoader();

        /*
        this.styles = [];//number or name indexed
        this.ruleNames = [];//number or name indexed
        this.content1 = null;
        this.orderedEntries = [];
        this.style_rulez = style_rulez;
        */
    }
    //function for listening keys    

    checkEnter(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            //this.loadGeoJSON3DFunction();
            //replace
        }
    }


    init() {//aqui se cargan los elementos del menu
       
        let menu = document.getElementById('potree_menu')
        let header = htmlf.createNode('h3', { 'id': 'menu_obj2' });
        // this is the main container
        let span = htmlf.createNode('span', { "data-i18n": "tb.obj_opt" });
        span.append(this.menuName)
        header.appendChild(span);
        menu.appendChild(header);

        let content1 = htmlf.createNode('div', { 'class': 'pv-menu-list' });//basic node
        menu.appendChild(content1);

        content1.appendChild(htmlf.createDivider('++++'))

        /////////////////////////////////////////////////////////////////////////////////////

        //Loading a list of segments by id from a txt field and a column name
        //load from this class
        let fields = [
            { id: 'label1', type: 'label', text: 'Browse OBJ file' },
            { id: 'fileinput1', type: 'file' },
            { id: 'buttoninput1', type: 'button', 'action': `window.loaders['${this.name}'].load()`, text: 'Load' }
        ]

        content1.appendChild(htmlf.createSendForm('meshform', fields));
        /////////////////////////////////////////////////////////////////////////////////////
        //content1.appendChild(htmlf.createDivider('Offset Parameters '));
        
          let fieldsOffset = [
            { id: '', type: 'label', text: 'Offset X' },
            { id: 'obj_offset_x', type: 'text', text: '376715' },
            { id: '', type: 'label', text: 'Offset Y' },
            { id: 'obj_offset_y', type: 'text', text: '2334504' },
            { id: '', type: 'label', text: 'Offset Z' },
            { id: 'obj_offset_z', type: 'text', text: '0.0' },

            { id: '', type: 'label', text: 'Color' },
            { id: 'meshcolor', type: 'text', text: '0x00ff00' }
        ];

        content1.appendChild(htmlf.createSendForm('form2', fieldsOffset));
        
       
        /////////////////////////////////////////////////////////////////////////////////////
    }


    loadOBJMTL(viewer, parameters) {


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
        //let url=parameters.obj;
        let url="http://127.0.0.1:5500/src/features/potree/potree_deepmatrix_libs/MeshLoader/test/data.obj";//changethis

        loader.load(
            url,
            //parameters.obj,
            
            function (object) {

                object.name = parameters.obj;
                
                object.children.forEach(element => {
                    //  element.material.side = THREE.DoubleSide;
                    console.log(element)
                });
                console.log(object);

                if (!parameters.offset_x) parameters.offset_x = 0.0;
                if (!parameters.offset_y) parameters.offset_y = 0.0;
                if (!parameters.offset_z) parameters.offset_z = 0.0;
                if (parameters.position) {
                    object.position.set(parameters.position[0], parameters.position[1], parameters.position[2]);//in case of a custom obj
                } else {
                    object.position.set(object.reference.x + parameters.offset_x, object.reference.y + parameters.offset_y, object.reference.z + parameters.offset_z);
                    //parameters.position = [object.reference.x + parameters.offset_x, object.reference.y + parameters.offset_y, object.reference.z + parameters.offset_z]
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
                //addObject2Registry(parameters.obj, object);//agregamos al registro d eobjetos
                
                
                

                viewer.scene.scene.add(object);
                viewer.scene.scene.add(object);
                let alight = new AmbientLight(0xaaffaa, 0.9);
        
                viewer.scene.scene.add(alight);
        
                let light = new DirectionalLight(0xaaffff, 1.0);
                light.position.set(0, 0, 500000);
                light.target.position.set(0, 0, 0);
        
                viewer.scene.scene.add(light);
            }, 
            onProgress, 
            onError);


    }



    //loadMeshFunction() {
    load() {

        let filename = document.getElementById('fileinput1').value;//could be comma separated
        let col = parseInt(document.getElementById('meshcolor').value, 16)
        let offx = document.getElementById('obj_offset_x').value;//could be comma separated
        let offy = document.getElementById('obj_offset_y').value;//could be comma separated
        let offz = document.getElementById('obj_offset_z').value;//could be comma separated

        let file = {
            obj: filename, name: filename,
            //mtl: `obj_assets/au_0.2ppm.mtl`,
            //position: [376059.635, 2333865.288, 200],
            offset_x: parseFloat(offx), offset_y: parseFloat(offy), offset_z: parseFloat(offz),
            preload: true,
            //rotation: [3.14, 3.14, 2],
            //scale: 5.0
        }


        this.loadOBJMTL(window.viewer, file)









    }


};


export { MenuMeshLoader };
