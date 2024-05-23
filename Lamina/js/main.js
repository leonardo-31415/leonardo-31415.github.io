// import { Viewer } from './Viewer.js'
// import { Layer } from './Layer.js'
// import { LayoutTiles } from './LayoutTiles.js'
// import { LayerImage } from './LayerImage.js'
// import { LayerDstretch } from './LayerDstretch.js'
// import { LayerCombiner } from './LayerCombiner.js'
// import { ShaderCombiner } from './ShaderCombiner.js'
// import { ControllerPanZoom } from './ControllerPanZoom.js'
// import { UIBasic, UIDialog } from './UIBasic.js'
// import { LayerLens } from './LayerLens.js'
// import { Skin } from './Skin.js'
// import { LayerAnnotation } from './LayerAnnotation.js'
// import { LayerSvgAnnotation } from './LayerSvgAnnotation.js'
// import { EditorSvgAnnotation } from './EditorSvgAnnotation.js'
// import { LayerRTI } from './LayerRTI.js'
// import { LayerNeuralRTI } from './LayerNeuralRTI.js'
// import { ShaderFilter } from './ShaderFilter.js'
// import { AnnotationEditor } from './AnnotationEditor.js'

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
            // mat3 unsharp_M = mat3(0.0, -1.0, 0.0, -1.0, 5.0, -1.0, 0.0, -1.0, 0.0);

            mat3 unsharp_M = mat3(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0) +
                      (mat3(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0) - 
                      mat3(0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0)/5.0)*unsharp;
            float dx = 1.0/tileSize.x;
            float dy = 1.0/tileSize.y;

            vec3 unsharp_col = unsharp_M[0][0]*data(vec2(v_texcoord.x-dx,v_texcoord.y-dy)).rgb + 
                        unsharp_M[0][1]*data(vec2(v_texcoord.x-dx,v_texcoord.y)).rgb +
                        unsharp_M[0][2]*data(vec2(v_texcoord.x-dx,v_texcoord.y+dy)).rgb +
                        unsharp_M[1][0]*data(vec2(v_texcoord.x,v_texcoord.y-dy)).rgb +
                        unsharp_M[1][1]*col.rgb +
                        unsharp_M[1][2]*data(vec2(v_texcoord.x,v_texcoord.y+dy)).rgb +
                        unsharp_M[2][0]*data(vec2(v_texcoord.x+dx,v_texcoord.y-dy)).rgb +
                        unsharp_M[2][1]*data(vec2(v_texcoord.x+dx,v_texcoord.y)).rgb +
                        unsharp_M[2][2]*data(vec2(v_texcoord.x+dx,v_texcoord.y+dy)).rgb;
            // return vec4((col.rgb - blur) * unsharp, 1.0);
            return vec4(unsharp_col,1.0);
        }`;
    }
}

// CLASS FOR MULTI LIGHT BUTTONS

class MultiLightButton {
    constructor(options) {
        this.modes = {
            'Mirror light': false,
            'Azimuth light': false,
            'Smart light': false,
        };
        this.viewer = null;
        this.ui = null;
        this.buttons = [];

        Object.assign(this, options);

        for (let mode of Object.keys(this.modes)) {
            this.createButton(mode)
        }
    }

    clickAction(mode, active) {
        for (let layer of Object.values(this.viewer.canvas.layers)){
        
            if (!layer.shader)
                continue;
            
            let shader = layer.neuralShader ? layer.neuralShader : layer.shader;
            shader[mode] = active;
            shader.needsUpdate = true;
            if (layer.neuralShader)
                layer.forceRelight();
            layer.emit('update');
        }
        // this.ui.updateMenu(this.ui.menu.layer); // Update menu (run status() callback)
    }

    createButton(mode) {
        let active = this.modes[mode];
        let button = {
            button: mode,
            label: 'light',
            onclick: () => { 
                for (let mode of Object.keys(this.modes))
                    this.clickAction(mode,false);
                active = !active;
                this.clickAction(mode, active);
                this.ui.updateMenu(this.ui.menu.layer); // Update menu (run status() callback)
            },
            status: () => {
                return active ? 'active' : '';
            }
        }
        this.buttons.push(button);
        this.ui.menu.layer.list.push(button);
    }
}

// ---------------------------------------------------------------------------------

let lime = new OpenLIME.Viewer('.openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });
lime.camera.bounded = false;

main();

function main(){

    const urlParams = new URLSearchParams(window.location.search);
    const editorEnable = urlParams.has('editor');

    OpenLIME.Skin.setUrl('skin/skin.svg');

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
            mask: 'data/mappe/mask.tzi',
            // stress: 'data/brdf/stress.tzi',
        }
    });
    layerPTM.type = 'rti';
    lime.addLayer('layerPTM', layerPTM);
    console.log(layerPTM);

    const layerNeural = new OpenLIME.Layer({
        type: 'neural',
        url: 'data/neural/info.json',
        layout: 'tarzoom',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'NeuralRTI',
        overlay: false,
        section: "Layers",
        shaderOptions: {
            albedo: 'data/mappe/albedo.tzi',
            normals: false,
            mask: 'data/mappe/mask.tzi',
        }
    });
    layerNeural.type = 'neural';
    lime.addLayer('layerNeural', layerNeural);
    // console.log(layerNeural);

    const layerBRDF = new OpenLIME.Layer({
        type: 'brdf_ikehata',
        url: 'data/brdf/base.tzi',
        // mask: 'data/mappe/mask.tzi',
        // stress: 'data/mappe/stress.tzi',
        layout: 'tarzoom',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'BRDF',
        overlay: false,
        section: "Layers",
        shaderOptions: {
            mask: 'data/mappe/mask.tzi',
        }
    });
    layerNeural.type = 'brdf_ikehata';
    lime.addLayer('layerBRDF', layerBRDF);
    // console.log(layerBRDF);

    // const layerPS = new OpenLIME.Layer({
    //     type: 'ps',
    //     url: 'data/mappe/albedo.tzi',
    //     mask: 'data/mappe/mask.tzi',
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
    //     // }
    // });
    // layerPS.type = 'ps';
    // lime.addLayer('layerPS', layerPS);


    // user interface configuration
    // the "section" attribute can be omitted. This way, a single section called "Layers"
    // will be created. Otherwise, an array of strings must be given

    // Define annotation parameters
    // let annotationServer = 'https://SERVERNAME';

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

    let ui = new OpenLIME.UIBasic(lime, { skin: 'skin/skin.svg', showLightDirections: true});

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
    ui.actions.help.html = `
    <h3>Toolbar (bottom right corner)</h3>
    <p>
    Home: set the view (rotation, pan and zoom) to default
    Full screen: activate/deactivate full screen mode
    Layers: open the overlay menu for layers
    Options: open the overlay menu for options
    Annotations: open the overlay menu for annotations 
    Zoom +: zoom in
    Zoom -: zoom out
    Rotation: rotate the image of 45°
    Screenshot: download a screenshot of the viewer as png image
    Help: open an overlay message with tips
    Light: activated (yellow) change the light direction, deactivate (black) you can drag the image
    </p>
    ————————————————————
    
    <h3>Annotation editor (top right corner)</h3>
    <p>
    Name: set name for current annotation
    Class: choose a predefined color for the current annotation
    Color: choose a specific color for the current annotation (stroke)
    Description: open/close a text area for writing a description for the current annotation
    File Picker: load the file “annotation.json” to load previous annotations
    
    Pin icon: set a pin (an indicator on the image) for the current annotation
    Pen icon: choose the pen tool
    Rubber: choose the rubber (not working)
    Undo: remove the last annotation action
    Redo: cancel the effect of undo
    Trash: delete the current annotation
    Download: download all current annotations
    Add: add a new annotation
    </p>
    ————————————————————
    
    
    <h3>Layers overlay menu</h3>
    <p>
    PTM: classic algorithm for RTI, the used one is Polynomial Texture Map (PTM),
    presents 4 sub-modes
     - light: rgb rendering of relighted image
     - normals: normal map calculated from PTM coefficients
     - diffuse: enhancement of diffuse component of relighted image
     - specular: artificial enhancement of specular component of relighted image
       (the whole image is made specular, based on normal map)
    
    NeuralRTI: neural based rendering of the relighted image, slower than a classical one,
    still interactive relighting is available as the image resolution is decreased when the
    light is moving
    
    Static Maps PS: set of images computed using Photometric Stereo
    - albedo:
    - cavity
    - curvature
    - him
    - normals
    - outlim
    - residual
    - shim
    </p>
    ————————————————————
    
    <h3>Options overlay menu</h3>
    <p>
    Gamma: apply gamma correction to the image, a slider appears to change gamma factor
    Unsharp: apply unsharp masking to the image, a slider appears to change the unsharp effect
    Second Light: add a second light superimposed to the first, placed in the opposite direction
    (currently, works only on layer PTM)
    </p>
    ————————————————————
    
    <h3>Annotations overlay menu</h3>
    <p>
    Each time a new annotation is added, a new entry is created. Select the entry to select the
    annotation (you can select the annotation directly from the image, too).
    To hide a single annotation, click on the eye on the right of the annotation entry.
    To hide all annotations, click on “Annotations” button on top of the list.
    Current bug: if you move the light when annotations are all hidden, they will be visible again.
    </p>
    ————————————————————
    
    <h3>General info</h3>
    <p>
    The viewer is still in development.
    
    Annotations are lost if the page is reloaded or internet connection is lost. To save them,
    use the download button. To restore them, upload the “annotation.json” file using the file picker.
    Current annotations are not deleted when uploading old annotations.
    To delete all of them, reload the page.
    
    Drawing tools have some issues. To select a drawing tool, click on the icon.
    To deselect, click again on the icon or press “esc”.
    
    The pen can be used in two ways: as a normal pen, or clicking points of interest.
    In the second case a line will connect the two points. Notice that currently the first
    point is not visible, so the line will appear when the second point is clicked on the image.
    </p>
    `;
    ui.actions.snapshot.display = true;
    lime.camera.maxFixedZoom = 1;
    window.lime = lime;

    // console.log(ui);

    let filter;
    // gamma filter
    filter = new GammaFilter({label: 'Gamma correction', uniform: 'gamma', value: 2.2, min: 0, max: 3, step: 0.1});
    addFilter(ui, ui.menu.option, filter);
    // unsharp filter
    filter = new UnsharpFilter({label: 'Unsharp masking', uniform: 'unsharp', value: 10.0, min: 0, max: 20, step: 1});
    addFilter(ui, ui.menu.option, filter);

    ui.menu.layer.list.push({section:"Stress (BRDF)"});
    addButton(ui, ui.menu.layer, 'stress_color', 'Color');
    addButton(ui, ui.menu.layer, 'stress_normals', 'Normals');
    
    ui.menu.layer.list.push({section:"Multi light"});
    addButton(ui, ui.menu.layer, 'Mirror light', 'Mirro light');
    addButton(ui, ui.menu.layer, 'Azimuth light', 'Azimuth light');
    addButton(ui, ui.menu.layer, 'Smart light', 'Smart light');

    // console.log(layerAnnotation);
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

function addButton(ui, menu, value, name){
    let active = false;
    const button = {
        button: name,
        onclick: () => { 
            active = !active;
            for (let layer of Object.values(lime.canvas.layers)){
        
                if (!layer.shader)
                    continue;
                
                let shader = layer.neuralShader ? layer.neuralShader : layer.shader;
                shader[value] = active;
                shader.needsUpdate = true;
                if (layer.neuralShader)
                    layer.forceRelight();
                layer.emit('update');
            }
            ui.updateMenu(menu); // Update menu (run status() callback)
        },
        status: () => {
            return active ? 'active' : '';
        }
    };
    menu.list.push(button);
}

// ------------------------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------------------------------------------------------
