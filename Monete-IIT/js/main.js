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

// imports
import LightSphereController from './lightspherecontroller.js'
import ModelSelector from './model-selector.js'

function addLightSphereController(lime){

    // add a button for the sphere light controller
    let lsc = new LightSphereController('.openlime', { thetaMin: 15 }); // Marlie controller
    for (let layer of Object.keys(lime.canvas.layers)){
        lsc.addLayer(lime.canvas.layers[layer]);
    }
    return lsc;
}

// CLASS TO CREATE FILTERS

class GammaCorrection extends OpenLIME.ShaderFilter {
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

class UnsharpNormals extends OpenLIME.ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            k: {type: 'float', needsUpdate: true, size: 1, value: 0.0},
            ka: {type: 'float', needsUpdate: true, size: 1, value: 0.0},
        };
    }

    fragDataSrc(gl) {
        let gl2 = !(gl instanceof WebGLRenderingContext);
        return `
        vec4 ${this.functionName()}(vec4 col){
            vec3 n = texture${gl2?'':'2D'}(normals, v_texcoord).xyz * 2.0 - 1.0;
            vec3 nb = texture${gl2?'':'2D'}(normals_blur, v_texcoord).xyz * 2.0 - 1.0;
            vec3 ne = n + k * (n - nb);
            return vec4((max(dot(ne,light), 0.0) + ka) * col.rgb, col.a);
        }`;
    }
}

class ColorBrightness extends OpenLIME.ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = {
            intensity: {type: 'float', needsUpdate: true, size: 1, value: 0.0},
        }
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            return vec4(col.rgb * intensity, col.a);
        }`;
    }
}

class ContrastStitching extends OpenLIME.ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = {
            left: {type: 'float', needsUpdate: true, size: 1, value: 0.0},
            right: {type: 'float', needsUpdate: true, size: 1, value: 1.0}
        }
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            return vec4((col.rgb - left) / (right - left), col.a);
        }`;
    }
}


// ---------------------------------------------------------------------------------

main();

async function main() {

    const response = await fetch('./data/config.json');
    const config = await response.json();
    const modelSelector = new ModelSelector('.openlime', config);
    const dialog = modelSelector.getDialog();

    const urlParams = new URLSearchParams(window.location.search);
    const editorEnable = urlParams.has('editor');
    
    async function visualize(){

        // openlime canvas creation
        const model = dialog.returnValue;

        let lime = new OpenLIME.Viewer('.openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });
        lime.camera.bounded = false;

        OpenLIME.Skin.setUrl('skin/skin.svg');

        let openlime = document.querySelector('.openlime');
        let infoDialog = new OpenLIME.UIDialog(openlime, { modal: true });
        infoDialog.hide();

        // const layerPTM = new OpenLIME.Layer({
        //     type: 'rti',
        //     url: 'data/lptm/info.json',
        //     layout: 'tarzoom',
        //     transform: { x: 0, y: 0, z: 1, a: 0 },
        //     zindex: 0,
        //     label: 'PTM',
        //     overlay: false,
        //     section: "Layers",
        //     shaderOptions: {
        //         normals: true,
        //         mask: false,
        //         stress: true,
        //     }
        // });
        // layerPTM.type = 'rti';
        // lime.addLayer('layerPTM', layerPTM);
        // console.log(layerPTM);

        console.log(`data/bln/${model}/info.json`);
        console.log( typeof `data/bln/${model}/info.json`);

        let layer_bln = new OpenLIME.Layer({
            type: 'rti',
            url: `data/bln/${model}/info.json`,
            layout: 'image',
            zindex: 0,
            label: 'RTI (BLN)'
        });
        lime.canvas.addLayer('bln', layer_bln);

        // const layerBRDF = new OpenLIME.Layer({
        //     type: 'brdf_ikehata',
        //     url: 'data/brdf/base.tzi',
        //     layout: 'tarzoom',
        //     transform: { x: 0, y: 0, z: 1, a: 0 },
        //     zindex: 0,
        //     label: 'BRDF',
        //     overlay: false,
        //     section: "Layers",
        //     shaderOptions: {
        //         mask: false,
        //         normals: true,
        //         stress: true,
        //     }
        // });
        // layerBRDF.type = 'brdf_ikehata';
        // lime.addLayer('layerBRDF', layerBRDF);
        // console.log(layerBRDF);


        // user interface configuration
        // the "section" attribute can be omitted. This way, a single section called "Layers"
        // will be created. Otherwise, an array of strings must be given

        // Define annotation parameters
        // let annotationServer = './crud.php';

        let aOptions = {
            label: 'Annotations',
            layout: layer_bln.layout,
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

        let lsc = addLightSphereController(lime);
        let ui = new OpenLIME.UIBasic(lime, { skin: 'skin/skin.svg', showLightDirections: true, lightSphereController: lsc,});

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
            anno.dataset = 'lamina';
            anno.action = action;
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
        New: add a new annotation
        </p>
        ————————————————————
        
        
        <h3>Layers overlay menu</h3>
        <p>
        --- Layers section --- <br>
        There are three different rendering algorithms: <br>
        - PTM <br>
        - RBF <br>
        - BRDF <br>
        Different algorithms can render differently reflections on the surface. <br>
        Every algorithm has three options: <br>
        - color <br>
        - stress <br>
        - monochormatic geometry map (specular or monochrome) <br>
        Color is the rgb rendering. Stress is an enhanced version of the rgb rendering. The third option
        is a monochromatic rendering of the surface geometry. "Specular" has also a slider to tune the amount
        of "fake reflection" to show. <br> <br>

        --- Enhancements section --- <br>
        - Superficie: <br>
        Esegue l' "unsharp masking" delle normali della superficie. Pensato per migliorare la visualizzazione della geometria superficiale.
        Il primo slider controlla l'intensità del fattore di "unsharp" della mappa di normali. Il secondo slider è una costanta che serve ad attenuare
        artefatti visivi che possono crearsi, risutando in un incremento della luminosità. <br>
        - Luminosità: <br>
        Moltiplica il colore per un fattore, simulando un aumento di luminosità. <br>
        - Contrasto: <br>
        Usa due valori (slider) per riscalare il colore renderizzato in un certo range, seguendo la formula c_out = (c_in - left) / (right - left)
        dove c_out è il colore in output, c_in il colore in input, left il primo slider, right il secondo slider. <br>
        - Gamma: <br>
        Esegue la correzione di gamma dell'intera immagine, seguendo la formula c_out = c_in ^ (1/2.2)
        dove c_out è il colore in output, c_in il colore in input <br>
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

        // let filter;
        // // gamma filter
        // filter = new GammaCorrection({label: 'Gamma', uniform: 'gamma', value: 2.2, min: 0, max: 3, step: 0.1});
        // addFilter(ui, ui.menu.option, filter);
        // // unsharp filter
        // filter = new UnsharpFilter({label: 'Unsharp', uniform: 'unsharp', value: 10.0, min: 0, max: 20, step: 1});
        // addFilter(ui, ui.menu.option, filter);

        // ui.menu.option.list.push({ slider: '', value: 3, min: 3, max: 15, step: 2, oninput: (e) => {
        //     layerBRDF.shader.unsharp_radius = e.target.value;
        //     layerBRDF.shader.needsUpdate = true;
        //     layerBRDF.emit('update');
        // }});
        // ui.menu.option.list.push({ slider: '', value: 1, min: 1, max: 10, step: 1, oninput: (e) => {
        //     layerBRDF.shader.unsharp_factor = e.target.value;
        //     layerBRDF.shader.needsUpdate = true;
        //     layerBRDF.emit('update');
        // }});
        // ui.menu.option.list.push({ slider: '', value: 0.5, min: 0.05, max: 1, step: 0.05, oninput: (e) => {
        //     layerBRDF.shader.unsharp_sigma = e.target.value;
        //     layerBRDF.shader.needsUpdate = true;
        //     layerBRDF.emit('update');
        // }});
        // ui.menu.option.list.push({ slider: '', value: 0.5, min: 0.05, max: 1, step: 0.05, oninput: (e) => {
        //     layerBRDF.shader.sigmoid = e.target.value;
        //     layerBRDF.shader.needsUpdate = true;
        //     layerBRDF.emit('update');
        // }});
        
        ui.menu.layer.list.push({section:"Enhancements"});

        // NUM
        let filter_NUM = new UnsharpNormals({label: 'Superficie', parameters: [
            {label: 'k', value: 1.0, min: 1.0, max: 20.0, step: 1.0},
            {label: 'ka', value: 0.0, min: 0.0, max: 2.0, step: 0.1},
        ]});
        addFilter(ui, ui.menu.layer, filter_NUM);

        // CB
        let filter_CB = new ColorBrightness({label: 'Luminosità', parameters: [
            {label: 'intensity', value: 1.0, min: 1.0, max: 3.0, step: 0.05},
        ]});
        addFilter(ui, ui.menu.layer, filter_CB);

        // CT
        let filter_CT = new ContrastStitching({label: 'Contrasto', parameters: [
            {label: 'left', value: 0.0, min: 0.0, max: 1.0, step: 0.05},
            {label: 'right', value: 1.0, min: 0.0, max: 1.0, step: 0.05},
        ]});
        addFilter(ui, ui.menu.layer, filter_CT);

        // γ-C
        let filter_GAMMA = new GammaCorrection({label: 'Gamma', parameters: []});
        addFilter(ui, ui.menu.layer, filter_GAMMA);

        
    }

    dialog.addEventListener('close', (e) => {
        visualize();
    });

    dialog.showModal();

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
                            for (let uniform of filter.parameters)
                                layer.shader.setUniform(uniform.label, uniform.value);
                        }
                        else {
                            layer.imageShader.addFilter(filter);
                            if (filter.uniform)
                                layer.imageShader.setUniform(filter.uniform, filter.value);
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

    for (let uniform of filter.parameters) {
        const slider = {
            html: `<input id="${uniform.label}Slider" type="range" min="${uniform.min}" max="${uniform.max}" value=${uniform.value} step="${uniform.step}">
                <output id="${uniform.label}SliderOutput">${uniform.value}</output>`,

            onchange: () => {
                uniform.value = document.querySelector(`#${uniform.label}Slider`).value;
                document.querySelector(`#${uniform.label}SliderOutput`).textContent = uniform.value;
                if (filter_active){
                    for (let layer of Object.values(lime.canvas.layers)){
                        layer.shader.setUniform(uniform.label, uniform.value);
                    }
                }
            }
        };
        menu.list.push(slider);
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------------------------------------------------------
