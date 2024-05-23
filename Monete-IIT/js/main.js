// CLASS TO CREATE FILTERS

class GammaFilter extends OpenLIME.ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            gamma: {type: 'float', needsUpdate: true, size: 1, value: 2.2},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            float igamma = 1.0/gamma;
            return vec4(pow(col.r, igamma), pow(col.g, igamma), pow(col.b, igamma), col.a);
        }`;
    }
}

class UnsharpFilter extends OpenLIME.ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            unsharp: {type: 'float', needsUpdate: true, size: 1, value: 10.0},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            mat3 unsharp_M = mat3(0.0, -1.0, 0.0, -1.0, 5.0, -1.0, 0.0, -1.0, 0.0);

            unsharp_M = mat3(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0) +
                      (mat3(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0) - 
                      mat3(0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0)/5.0)*unsharp;

            // unsharp_M = mat3(0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0)/5.0;

            vec3 blur = unsharp_M[0][0]*data(vec2(v_texcoord.x-1.0/tileSize.x,v_texcoord.y-1.0/tileSize.y)).rgb + 
                        unsharp_M[0][1]*data(vec2(v_texcoord.x-1.0/tileSize.x,v_texcoord.y)).rgb +
                        unsharp_M[0][2]*data(vec2(v_texcoord.x-1.0/tileSize.x,v_texcoord.y+1.0/tileSize.y)).rgb +
                        unsharp_M[1][0]*data(vec2(v_texcoord.x,v_texcoord.y-1.0/tileSize.y)).rgb +
                        unsharp_M[1][1]*col.rgb +
                        unsharp_M[1][2]*data(vec2(v_texcoord.x,v_texcoord.y+1.0/tileSize.y)).rgb +
                        unsharp_M[2][0]*data(vec2(v_texcoord.x+1.0/tileSize.x,v_texcoord.y-1.0/tileSize.y)).rgb +
                        unsharp_M[2][1]*data(vec2(v_texcoord.x+1.0/tileSize.x,v_texcoord.y)).rgb +
                        unsharp_M[2][2]*data(vec2(v_texcoord.x+1.0/tileSize.x,v_texcoord.y+1.0/tileSize.y)).rgb;
            // return vec4((col.rgb - blur) * unsharp, 1.0);
            return vec4(blur,1.0);
        }`;
    }
}

let lime = new OpenLIME.Viewer('.openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });
lime.camera.bounded = false;

main();
console.log(lime);

function main(){

    const urlParams = new URLSearchParams(window.location.search);
    const editorEnable = urlParams.has('editor');

    OpenLIME.Skin.setUrl('../skin/skin.svg');

    let openlime = document.querySelector('.openlime');
    let infoDialog = new OpenLIME.UIDialog(openlime, { modal: true });
    infoDialog.hide();

    const layerPTM = new OpenLIME.Layer({
        type: 'rti',
        url: 'data/ptm/info.json',
        layout: 'tarzoom',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'PTM',
        overlay: false,
        section: "Layers",
        shaderOptions: {
            albedo: false,
            normals: false,
            mask: false,
            secondLight: false,
            // secondLight: {
            //     intensity: [1.0, 1.0],
            //     weight: 0.5}
        }
    });
    layerPTM.type = 'rti';
    lime.addLayer('layerPTM', layerPTM);

    // console.log(layerPTM);

    // const layerNeural = new OpenLIME.Layer({
    //     type: 'neural',
    //     url: 'data/neural/info.json',
    //     layout: 'tarzoom',
    //     transform: { x: 0, y: 0, z: 1, a: 0 },
    //     zindex: 0,
    //     label: 'NeuralRTI',
    //     overlay: false,
    //     section: "Layers",
    //     shaderOptions: {
    //         albedo: 'data/mappe/albedo.tzi',
    //         normals: false,
    //         mask: 'data/mask/mask.tzi',
    //         secondLight: false,
    //         // secondLight: {
    //         //     intensity: [1.0, 1.0],
    //         //     weight: 0.5}
    //     }
    // });
    // layerNeural.type = 'neural';
    // lime.addLayer('layerNeural', layerNeural);
    // console.log(layerNeural);

    // const layerPS = new OpenLIME.Layer({
    //     type: 'ps',
    //     url: 'data/mappe/albedo.tzi',
    //     mask: 'data/mask/mask.tzi',
    //     layout: 'tarzoom',
    //     transform: { x: 0, y: 0, z: 1, a: 0 },
    //     zindex: 0,
    //     label: 'Static Map PS',
    //     overlay: false,
    //     section: "Layers",
    //     // shaderOptions: {
    //     //     albedo: false,
    //     //     // normals: 'data/normals/normals.tzi',
    //     //     // mask: 'data/mask/mask.tzi',
    //     //     secondLight: false,
    //     // }
    // });
    // layerPS.type = 'ps';
    // lime.addLayer('layerPS', layerPS);


    // user interface configuration
    // the "section" attribute can be omitted. This way, a single section called "Layers"
    // will be created. Otherwise, an array of strings must be given

    // Define annotation parameters
    let annotationServer = 'http://localhost:3000/ol';
    let annotationFile = 'assets/annotations/annotations.json'
    
    const classParam = {
        '': { style: { stroke: '#000' }, label: '' },
        'class1': { style: { stroke: '#770' }, label: 'A' },
        'class2': { style: { stroke: '#707' }, label: 'B' },
        'class3': { style: { stroke: '#777' }, label: 'C' },
        'class4': { style: { stroke: '#070' }, label: 'D' },
        'class5': { style: { stroke: '#007' }, label: 'E' },
        'class6': { style: { stroke: '#077' }, label: 'F' },
    };

    let aOptions = {
        label: 'Annotations',
        layout: layerPTM.layout,
        type: 'svg_annotations',
        style: ` 
        .openlime-annotation { pointer-events:stroke; opacity: 0.7; }
        .openlime-annotation:hover { cursor:pointer; opacity: 1.0; }

        :focus { fill:yellow; }
        path { fill:none; stroke-width:2; stroke:#000; vector-effect:non-scaling-stroke; pointer-events:all; }
        path:hover { cursor:pointer; stroke:#f00; }
        .selected { stroke-width:3; }
        `,
        // annotations: annotationServer,
        // annotations: annotationFile,
        annotations: [],
        overlay: true,
    }

    if (!editorEnable) {
        aOptions = {
            ...aOptions,
            onClick: (anno) => {
                infoDialog.setContent(`<h4>${anno.label}</h4><p>${anno.description}</p>`);
                infoDialog.show();
            },
            // classes: classParam
        }
    }

    // Create an annotation layer and add it to the canvans
    const layerAnnotation = new OpenLIME.LayerAnnotation(aOptions);
    layerAnnotation.type = 'svg_annotations';
    lime.addLayer('layerAnnotation', layerAnnotation);

    // If editorEnable, create a SVG annotation Editor
    // if (editorEnable) {
    //     const editor = new EditorSvgAnnotation(lime, layerAnnotation, {
    //         classes: classParam
    //     });
    //     editor.createCallback = (anno) => { console.log("Created annotation: ", anno); processRequest(anno, 'create'); return true; };
    //     editor.deleteCallback = (anno) => { console.log("Deleted annotation: ", anno); processRequest(anno, 'delete'); return true; };
    //     editor.updateCallback = (anno) => { console.log("Updated annotation: ", anno); processRequest(anno, 'update'); return true; };
    // }

    let ui = new OpenLIME.UIBasic(lime, { skin: '../skin/skin.svg', showLightDirections: true});

    
    const editor = new OpenLIME.AnnotationEditor(lime, layerAnnotation, {
        // classes: classParam
    });
    editor.createCallback = (anno) => { console.log("Created annotation: ", anno); processRequest(anno, 'create'); return true; };
    editor.deleteCallback = (anno) => { console.log("Deleted annotation: ", anno); processRequest(anno, 'delete'); return true; };
    editor.updateCallback = (anno) => { console.log("Updated annotation: ", anno); processRequest(anno, 'update'); return true; };

    // Add image attribution 
    ui.attribution = `<a href="https://github.com/cnr-isti-vclab/openlime" target="_blank">OpenLIME</a> (Open Layered IMage Explorer)`;

    // Calback function to send http requests to the Annotation server
    async function processRequest(anno, action) {
        let method = "GET";
        let url = `${annotationServer}`;
        let body = "";
        switch (action) {
            case "create":
                method = "POST";
                url = `${annotationServer}`;
                body = JSON.stringify(anno);
                break;
            case "update":
                method = "PUT";
                url = `${annotationServer}/${anno.id}`;
                body = JSON.stringify(anno);
                break;
            case "delete":
                method = "DELETE";
                url = `${annotationServer}/${anno.id}`;
                body = "";
                break;
            default:
                break;
        }
        const response = await fetch(url, {
            method: method,
            mode: 'cors', // this cannot be 'no-cors'
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: body
        });
        if (!response.ok) {
            const message = `An error has occured: ${response.status} ${response.statusText} `;
            alert(message);
            throw new Error(message);
        }
        let json = await response.json();
        if (json.status == 'error')
            alert(json.msg);
    }



    
    ui.actions.light.active = true;
    ui.actions.layers.display = true;
    ui.actions.zoomin.display = true;
    ui.actions.zoomout.display = true;
    ui.actions.rotate.display = true;
    // ui.actions.ruler.display = true;
    ui.actions.help.display = true;
    ui.actions.help.html = '<p>Description:<br>Claudius II. Antoninianus. Siscia (268-70 CE). RIC V.1, p. 227, nº 193. Obv: [IMP CLAV]DIVS AVG. Radiate cuirassed, bearded bust of the emperor, r. – Rev: [VBERITAS AVG]. Uberitas standing l. holding purse and cornucopiae</p><p>Notes:<br>Foreseeable improvements in the reading of legends and iconographic types</p>';
    ui.actions.snapshot.display = true;
    lime.camera.maxFixedZoom = 1;
    window.lime = lime;

    // console.log(ui);

    let filter;
    // gamma filter
    filter = new GammaFilter({label: 'Gamma', uniform: 'gamma', value: 2.2, min: 0, max: 3, step: 0.1});
    addFilter(ui, ui.menu.option, filter);
    // unsharp filter
    filter = new UnsharpFilter({label: 'Unsharp', uniform: 'unsharp', value: 10.0, min: 0, max: 20, step: 1});
    addFilter(ui, ui.menu.option, filter);
    addSecondLight(ui);


    console.log(layerAnnotation);


    // ui.menu.push({ section: "Filters" });
    // let filter;
    // // gamma filter
    // filter = new GammaFilter({label: 'Gamma', uniform: 'gamma', value: 2.2, min: 0, max: 3, step: 0.1});
    // addFilter(ui, filter);
    // // unsharp filter
    // filter = new UnsharpFilter({label: 'Unsharp', uniform: 'unsharp', value: 10.0, min: 0, max: 20, step: 1});
    // addFilter(ui, filter);

    // ui.menu.push({ section: "Options" });
    // addSecondLight(ui);
}

//autodetect type ------------------------------------------------------------------
async function autodetect(data_path) {
    let response = await fetch(data_path + '/plane_0.tzi');
    if(response.status == 200)
        return 'tarzoom';

    response = await fetch(data_path + '/plane_0.dzi');
    if(response.status == 200)
        return 'deepzoom';

    response = await fetch(data_path + '/planes.tzi');
    if(response.status == 200)
        return 'tarzoom';

    response = await fetch(data_path + '/plane_0.jpg');
    if(response.status == 200)
        return 'image';

    return false;
}

/*
filter = {
    object: ...,
    name: ...,
    uniform: ...,
    value: ...,
    min: ...,
    max: ...,
    step: ...
}
*/
function addFilter(ui, menu, filter){

    if (!filter){
        return;
    }
 
    let filter_active = false;
    let filter_value = filter.value; 

    const button = {
        button: filter.label,
        onclick: () => { 
            filter_active = !filter_active;

            if (filter_active){
                for (let layer of Object.values(lime.canvas.layers)){
                    if (layer.type == 'svg_annotations')
                        continue;
                    if (layer.type != 'neural') {
                        layer.shader.addFilter(filter);
                        layer.shader.setUniform(filter.uniform, filter_value);
                    }
                    else {
                        layer.imageShader.addFilter(filter);
                        layer.imageShader.setUniform(filter.uniform, filter_value);
                    }
                }
            }
            else{
                for (let layer of Object.values(lime.canvas.layers)){
                    if (layer.type == 'svg_annotations')
                        continue;
                    if (layer.type != 'neural')
                        layer.shader.removeFilter(filter.name);
                    else
                        layer.imageShader.removeFilter(filter.name);
                }
            }
            ui.updateMenu(menu); // Update menu (run status() callback)
        },
        status: () => {
            return filter_active ? 'active' : '';
        }
    };
    menu.list.push(button);

    const slider = {
        html: `<input id="${filter.label}Slider" type="range" min="${filter.min}" max="${filter.max}" value=${filter_value} step="${filter.step}">
            <output id="${filter.label}SliderOutput">${filter_value}</output>`,

        onchange: () => {
            filter_value = document.querySelector(`#${filter.label}Slider`).value;
            document.querySelector(`#${filter.label}SliderOutput`).textContent = filter_value;
            if (filter_active){
                for (let layer of Object.values(lime.canvas.layers)){
                    layer.shader.setUniform(filter.uniform, filter_value);
                }
            }
        }
    };
    menu.list.push(slider);
}

function addSecondLight(ui){
    let secondLight = false;
    const button = {
        button: "Second Light",
        onclick: () => { 
            secondLight = !secondLight;
            for (let layer of Object.values(lime.canvas.layers)){
                if (layer.type == 'rti'){
                    layer.shader.secondLight = secondLight;
                    layer.shader.needsUpdate = true;
                    layer.shader.emit('update');
                }
                if (layer.type == 'neural'){
                    layer.neuralShader.secondLight = secondLight;
                    for (let [id, tile] of layer.tiles)
                        tile.neuralUpdated = false;
                    layer.neuralShader.needsUpdate = true;
                    layer.neuralShader.emit('update');
                    // layer.imageShader.needsUpdate = true;
                    // layer.imageShader.emit('update');
                    // layer.emit('update');
                }
            }
            ui.updateMenu(ui.menu.option); // Update menu (run status() callback)
        },
        status: () => {
            return secondLight ? 'active' : '';
        }
    };
    ui.menu.option.list.push(button);
}

// ------------------------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------------------------------------------------------
