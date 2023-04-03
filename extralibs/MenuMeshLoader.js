//automated insertion into sidebar.html within the potree_menu node



let menuName = 'MeshLoader2';
let idMenuName = 'test';


let htmlf = {
    createNode: function (nodeType, attributes, innerElement) {
        let mynode = document.createElement(nodeType);
        if (attributes) {
            Object.keys(attributes).forEach(key =>
                mynode.setAttribute(key, attributes[key])
            );
        }
        if (innerElement) {
            mynode.appendChild(innerElement);
        }
        return mynode;
    },

    createTextNode: function (nodeType, attributes, text) {
        let mynode = document.createElement(nodeType);

        if (attributes) {
            Object.keys(attributes).forEach(key =>
                mynode.setAttribute(key, attributes[key])
            );
        }
        if (text) {
            mynode.append(text);
        }
        return mynode;
    },

    createDivider: function (title) {
        //        <div class="divider" style="padding: 10px 0px 15px 0px"><span>OBJ File</span></div>
        let divider = this.createNode('div', { 'class': "divider", style: "padding: 10px 0px 15px 0px" }, htmlf.createTextNode('span', null, title));
        return divider;
    },

    /**
     * fields=[ 
     *         {id:'fileinput1', type:'label', value:'Enter data' },

        {id:'fileinput1', type:'file' },
        {id:'fileinput1', type:'button' , 'action':send()}
     ]
     * @param {*} divID 
     * @param {*} fields 
     * @param {*} sendAction 
     * @returns 
     */
    createSendForm: function (divID, fields) {
        /*
                <div id="obj_load"></div>
                <form id="jsonFile" name="jsonFile" enctype="multipart/form-data" method="post">
                    Load OBJ files...<br>
                    <fieldset>
                            <input type='file' id='fileinput' ><br>
                            <input type='file' id='fileinputMtl' ><br>
                            <input type='button' id='btnLoad' value='Load' onclick='loadFile();'>
                    </fieldset>
                </form>
                */
        console.log(fields)
        console.log('********************');

        let fieldset = htmlf.createNode('fieldset', null, null);

        for (let i = 0; i < fields.length; i++) {
            let field = fields[i];
            console.log(field.type)
            if (field.type == 'file') {
                console.log('FILE')
                console.log(field)
                fieldset.appendChild(
                    htmlf.createNode('input', { type: field.type, id: field.id })
                );
                continue;
            }
            if (field.type == 'button') {
                console.log('FILE')
                console.log(field)
                fieldset.appendChild(
                    htmlf.createNode('input', { type: 'button', id: field.id, "onclick": field.action, value: field.text })
                );
                continue;

            }


            if (field.type == 'label') {
                console.log('FILE')
                console.log(field)
                fieldset.appendChild(
                    htmlf.createTextNode('label', { type: field.type, id: field.id }, field.text));
                continue;

            }

            if (field.type == 'text') {
                console.log('text')
                console.log(field)
                fieldset.appendChild(
                    htmlf.createNode('input', { type: 'text', id: field.id, value: field.text }));
                continue;
            }


        }

        let form = htmlf.createNode('form', { 'id': "divider", name: '', enctype: "multipart/form-data", method: "post" });
        form.appendChild(fieldset);
        return form;
    }



};



let menu = document.getElementById('potree_menu')
let header = htmlf.createNode('h3', { 'id': 'menu_obj2' });
let span = htmlf.createNode('span', { "data-i18n": "tb.obj_opt" });
span.append(menuName)
header.appendChild(span);
menu.appendChild(header);

let content1 = htmlf.createNode('div', { 'class': 'pv-menu-list' });
menu.appendChild(content1);

//let div=htmlf.createNode('div',{id:idMenuName});

content1.appendChild(htmlf.createDivider('Division 1'))



function sendFunction(e) {
    console.log(e);
}
fields = [
    { id: 'label1', type: 'label', text: 'Seleccinoe el OBJ' },
    { id: 'fileinput1', type: 'file' },
    { id: 'buttoninput1', type: 'button', 'action': "sendFunction()", text: 'Load' }
]
content1.appendChild(htmlf.createSendForm('form1', fields));

content1.appendChild(htmlf.createDivider('Offset Parameters '));
let fieldsOffset = [
    { id: '', type: 'label', text: 'Offset X' },
    { id: 'offset_y', type: 'text', text: '0.0' },
    { id: '', type: 'label', text: 'Offset X' },
    { id: 'offset_y', type: 'text', text: '0.0' },
    { id: '', type: 'label', text: 'Offset X' },
    { id: 'offset_z', type: 'text', text: '0.0' }
];

content1.appendChild(htmlf.createSendForm('form2', fieldsOffset));
