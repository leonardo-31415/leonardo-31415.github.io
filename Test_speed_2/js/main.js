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

function addLightSphereController(){

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
            intensity: {type: 'float', needsUpdate: true, size: 1, value: 2.0},
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

function main() {
	
        let layer_slow = new OpenLIME.Layer({
            type: 'neural',
            url: 'data/Slow_1000_1000/info.json',
            layout: 'image',
            zindex: 0,
            label: 'SLOW'
        });
        lime.canvas.addLayer('neural_slow', layer_slow);
        let layer_fast = new OpenLIME.Layer({
            type: 'neural',
            url: 'data/Fast_1000_1000/info.json',
            layout: 'image',
            zindex: 0,
            label: 'FAST'
        });
        lime.canvas.addLayer('neural_fast', layer_fast);

        // let layer_slow_dz = new OpenLIME.Layer({
        //     type: 'neural',
        //     url: 'data/Lamina_Slow_deepzoom/info.json',
        //     layout: 'tarzoom',
        //     zindex: 0,
        //     label: 'SLOW Deepzoom'
        // });
        // lime.canvas.addLayer('neural_slow_dz', layer_slow_dz);
        // let layer_fast_dz = new OpenLIME.Layer({
        //     type: 'neural',
        //     url: 'data/Lamina_Fast_deepzoom/info.json',
        //     layout: 'tarzoom',
        //     zindex: 0,
        //     label: 'FAST Deepzoom'
        // });
        // lime.canvas.addLayer('neural_fast_dz', layer_fast_dz);

        let lsc = addLightSphereController();
        let ui = new OpenLIME.UIBasic(lime, { skin: 'skin/skin.svg', showLightDirections: true, lightSphereController: lsc,});
    
        ui.actions.light.active = true;
        ui.actions.layers.display = true;
        ui.actions.zoomin.display = true;
        ui.actions.zoomout.display = true;
        ui.actions.rotate.display = true;

            // γ-C
        let filter = new ColorBrightness({label: 'Gamma', parameters: []});

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