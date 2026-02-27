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

function addLightSphereController(layer_name, options){

    // add a button for the sphere light controller
    let lsc = new LightSphereController('.openlime', options); // Marlie controller
    lsc.addLayer(lime.canvas.layers[layer_name]);
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

    // const layer_back_light_off = new OpenLIME.Layer({
    //     type: 'neural',
    //     url: 'data/bead1/neural/back_light_off/info.json',
    //     layout: 'image',
    //     transform: { x: 0, y: 0, z: 1, a: 0 },
    //     zindex: 0,
    //     label: 'OFF',
    //     overlay: false,
    //     section: "Layers",
    // });
    // lime.addLayer('layer_back_light_off', layer_back_light_off);

    // const layer_back_light_on = new OpenLIME.Layer({
    //     type: 'neural',
    //     url: 'data/bead1/neural/back_light_on/info.json',
    //     layout: 'image',
    //     transform: { x: 0, y: 0, z: 1, a: 0 },
    //     zindex: 0,
    //     label: 'ON',
    //     overlay: false,
    //     section: "Layers",
    // });
    // lime.addLayer('layer_back_light_on', layer_back_light_on);


    const layer_front = new OpenLIME.Layer({
        type: 'neural',
        url: 'data/beads/front/info.json',
        layout: 'tarzoom',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'FRONT',
        overlay: false,
        section: "Layers",
    });
    lime.addLayer('layer_front', layer_front);

    const layer_back = new OpenLIME.Layer({
        type: 'neural',
        url: 'data/beads/back/info.json',
        layout: 'tarzoom',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'BACK',
        overlay: false,
        section: "Layers",
    });
    lime.addLayer('layer_back', layer_back);



    let combiner = new OpenLIME.LayerCombiner({
		layers: [layer_front, layer_back]
	});
	let shader = new OpenLIME.ShaderCombiner();
	shader.mode = 'mean';
	combiner.shaders = {'standard': shader };
	combiner.setShader('standard'); 

	let panzoom = new OpenLIME.ControllerPanZoom(lime.camera, { priority: -1000 });
	lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch
	lime.canvas.addLayer('COMBINER', combiner);

    let lsc_options = {
        sphere_color: 'yellow',
        invert_x: false,
        invert_y: false,
    };
    let lsc = addLightSphereController('layer_front', lsc_options);
    lsc_options = {
        sphere_color: 'blue',
        invert_x: true,
        invert_y: false,
        top: 60+148,
    };
    let lsc2 = addLightSphereController('layer_back', lsc_options);
    let ui = new OpenLIME.UIBasic(lime, { skin: 'skin/skin.svg', showLightDirections: true, lightSphereController: lsc,});

    // Add image attribution 
    ui.attribution = `<a href="https://github.com/cnr-isti-vclab/openlime" target="_blank">OpenLIME</a> (Open Layered IMage Explorer)`;



    
    ui.actions.light.active = true;
    ui.actions.layers.display = true;
    ui.actions.zoomin.display = true;
    ui.actions.zoomout.display = true;
    ui.actions.rotate.display = true;
    // ui.actions.ruler.display = true;
    ui.actions.help.display = true;
    ui.actions.help.html = `
    🐱
    `;
    ui.actions.snapshot.display = true;
    lime.camera.maxFixedZoom = 1;
    window.lime = lime;
    
    ui.menu.push({section:"Enhancements"});

    // NUM
    let filter_NUM = new UnsharpNormals({label: 'Surface', parameters: [
        {label: 'k', value: 1.0, min: 1.0, max: 20.0, step: 1.0},
        {label: 'ka', value: 0.0, min: 0.0, max: 2.0, step: 0.1},
    ]});
    // addFilter(ui, filter_NUM);

    // CB
    let filter_CB = new ColorBrightness({label: 'Intensity', parameters: [
        {label: 'intensity', value: 1.0, min: 1.0, max: 3.0, step: 0.05},
    ]});
    addFilter(ui, filter_CB);

    // CT
    let filter_CT = new ContrastStitching({label: 'Contrast', parameters: [
        {label: 'left', value: 0.0, min: 0.0, max: 1.0, step: 0.05},
        {label: 'right', value: 1.0, min: 0.0, max: 1.0, step: 0.05},
    ]});
    addFilter(ui, filter_CT);

    // γ-C
    let filter_GAMMA = new GammaCorrection({label: 'Gamma', parameters: []});
    addFilter(ui, filter_GAMMA);

    
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
function addFilter(ui, filter){

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
                        else {
                            layer.shader.addFilter(filter);
                            for (let uniform of filter.parameters)
                                layer.shader.setUniform(uniform.label, uniform.value);
                        }
                    }
                }
                else{
                    for (let layer of Object.values(lime.canvas.layers)){
                        if (layer.type == 'svg_annotations')
                            continue;
                        else
                            layer.shader.removeFilter(filter.name);
                    }
                }
            ui.updateMenu(); // Update menu (run status() callback)
        },
        status: () => {
            return filter_active ? 'active' : '';
        }
    };
    ui.menu.push(button);

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
        ui.menu.push(slider);
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------------------------------------------------------
