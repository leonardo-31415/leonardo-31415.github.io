export default class LightSphereController {
    constructor(parent, options) {
        options = Object.assign({
            width: 128,
            height: 128,
            top: 60,
            right: 0,
            thetaMin: 0,
            sphere_color: 'black',
            invert_x: false,
            invert_y: false,
        }, options);
        Object.assign(this, options);
        this.parent = parent;
        this.layers = [];
        if (typeof (this.parent) == 'string')
            this.parent = document.querySelector(this.parent);

        this.lightDir = [0, 0];

        this.div = document.createElement('div');
        this.div.style = `padding: 0; position: absolute; width: ${this.width}px; height: ${this.height}px; top:${this.top}px; right:${this.right}px; z-index: 200; touch-action: none; visibility: visible;`;

        const sd = (this.width * 0.5) * (1 - 0.8);
        this.handle = document.createElement('div');
        this.handle.style = `border-radius: 4px; background-color: rgba(240, 240, 240, 0.7); position: absolute; padding: 0; left: 0px; top:0px; width: ${sd}px; height: ${sd}px;`;
        this.div.appendChild(this.handle);
        this.dlCanvas = document.createElement('canvas');
        this.dlCanvas.width = this.width;
        this.dlCanvas.height = this.height;
        this.dlCanvas.classList.add('lightspherecontroller');
        // this.dlCanvas.style = ''
        this.dlCanvasCtx = this.dlCanvas.getContext("2d");
        this.dlGradient = '';
        this.div.appendChild(this.dlCanvas);
        this.parent.appendChild(this.div);

        this.dragEvents();

        this.r = this.width * 0.5;
        this.thetaMinRad = this.thetaMin / 180.0 * Math.PI;
        this.rmax = this.r * Math.cos(this.thetaMinRad);

        this.interactLightDir(this.width * 0.5, this.height * 0.5);

        this.pointerDown = false;
        this.dlCanvas.addEventListener("pointerdown", (e) => {
            this.pointerDown = true;
            const rect = this.dlCanvas.getBoundingClientRect();
            let clickPosX =
                (this.dlCanvas.width * (e.clientX - rect.left)) /
                rect.width;
            let clickPosY =
                (this.dlCanvas.height * (e.clientY - rect.top)) /
                rect.height;
            this.interactLightDir(clickPosX, clickPosY);
            e.preventDefault();
        });

        this.dlCanvas.addEventListener("pointermove", (e) => {
            if (this.pointerDown) {
                const rect = this.dlCanvas.getBoundingClientRect();
                let clickPosX =
                    (this.dlCanvas.width * (e.clientX - rect.left)) /
                    rect.width;
                let clickPosY =
                    (this.dlCanvas.height * (e.clientY - rect.top)) /
                    rect.height;
                this.interactLightDir(clickPosX, clickPosY);
                e.preventDefault();
            }
        });

        this.dlCanvas.addEventListener("pointerup", (e) => {
            this.pointerDown = false;
        });

        this.dlCanvas.addEventListener("pointerout", (e) => {
            this.pointerDown = false;
        });

    }

    dragEvents() {

        let offsetX, offsetY;
        const self = this;

        this.handle.addEventListener("pointerdown", dragStart);
        document.addEventListener("pointerup", dragEnd);

        function dragStart(e) {
            e.preventDefault();
            offsetX = e.clientX - self.div.offsetLeft;
            offsetY = e.clientY - self.div.offsetTop;
            document.addEventListener("pointermove", drag);
        }

        function drag(e) {
            e.preventDefault();
            self.div.style.left = e.clientX - offsetX + "px";
            self.div.style.top = e.clientY - offsetY + "px";
        }

        function dragEnd() {
            document.removeEventListener("pointermove", drag);
        }
    }

    addLayer(l) {
        this.layers.push(l);
    }

    show() {
        return this.div.style.visibility = 'visible';
    }

    hide() {
        return this.div.style.visibility = 'hidden';
    }

    computeGradient() {
        const x = (this.lightDir[0] + 1.0) * this.dlCanvas.width * 0.5;
        const y = (-this.lightDir[1] + 1.0) * this.dlCanvas.height * 0.5;
        this.dlGradient = this.dlCanvasCtx.createRadialGradient(
            x, y, this.dlCanvas.height / 8.0,
            x, y, this.dlCanvas.width / 1.2
        );
        this.dlGradient.addColorStop(0, "white");
        this.dlGradient.addColorStop(1, this.sphere_color);
    }

    interactLightDir(x, y) {
        let xc = x - this.r;
        let yc = this.r - y;
        const phy = Math.atan2(yc, xc);
        let l = Math.sqrt(xc * xc + yc * yc);
        l = l > this.rmax ? this.rmax : l;
        xc = l * Math.cos(this.thetaMinRad) * Math.cos(phy);
        yc = l * Math.cos(this.thetaMinRad) * Math.sin(phy);
        x = xc + this.r;
        y = this.r - yc;
        this.lightDir[0] = 2 * (x / this.dlCanvas.width - 0.5);
        this.lightDir[1] = 2 * (1 - y / this.dlCanvas.height - 0.5);

        // invert x and y light coordinates if needed
        if (this.invert_x)
            this.lightDir[0] = -this.lightDir[0]
        if (this.invert_y)
            this.lightDir[1] = -this.lightDir[1]

        // console.log('LD ', this.lightDir);
        for (const l of this.layers) {
            if (l.controls.light) l.setControl('light', this.lightDir, 5);
        }
        this.computeGradient();
        this.drawLightSelector(x, y);
    }

    drawLightSelector(x, y) {
        this.dlCanvasCtx.clearRect(0, 0, this.dlCanvas.width, this.dlCanvas.height);
        this.dlCanvasCtx.beginPath();

        this.dlCanvasCtx.arc(
            this.dlCanvas.width / 2,
            this.dlCanvas.height / 2,
            this.dlCanvas.width / 2,
            0,
            2 * Math.PI
        );
        this.dlCanvasCtx.fillStyle = this.dlGradient;
        this.dlCanvasCtx.fill();

        this.dlCanvasCtx.beginPath();
        this.dlCanvasCtx.arc(x, y, this.dlCanvas.width / 30, 0, 2 * Math.PI);
        this.dlCanvasCtx.strokeStyle = "red";
        this.dlCanvasCtx.lineWidth = 2;
        this.dlCanvasCtx.stroke();
    }
}