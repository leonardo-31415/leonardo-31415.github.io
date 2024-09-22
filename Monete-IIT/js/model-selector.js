export default class ModelSelector {
    constructor(parent, config, options) {
        options = Object.assign({
        }, options);
        Object.assign(this, options);
        this.parent = parent;
        if (typeof (this.parent) == 'string')
            this.parent = document.querySelector(this.parent);
        this.dialog = null;
        this.config = config;
        this.createDialog();
    }

    reset() {
        this.parent.appendChild(this.dialog);
    }

    getDialog() {
        return this.dialog;
    }

    findName(name) {
        const found = this.config.find(e => e.name == name);
        return found;
    }

    getValue(coin, side, range){

        let c, s, r;

        c = coin;

        if (range.toLowerCase() == 'visible')
            r = 'VIS';
        else if (range.toLowerCase() == 'infrared')
            r = 'IR'
        else
            r = 'UV'

        if (side.toLowerCase() == 'front')
            s = '';
        else
            s = 'B';

        return `${c}${r}${s}`
    }

    createDialog() {
        this.dialog = document.createElement('dialog');
        this.dialog.id = 'modelselector';
        const form = document.createElement('form');
        form.style.width = '180px';
        const label_coin = document.createElement('label');
        label_coin.innerHTML = 'Coin:';
        const select_coin = document.createElement('select');
        select_coin.style.width = '100%';
        const label_side = document.createElement('label');
        label_side.innerHTML = 'Side:';
        const select_side = document.createElement('select');
        select_side.style.width = '100%';
        const label_range = document.createElement('label');
        label_range.innerHTML = 'Range:';
        const select_range = document.createElement('select');
        select_range.style.width = '100%';
        // select coin
        for (const m of this.config) {
            const option = document.createElement('option');
            option.innerHTML = m.coin;
            select_coin.appendChild(option);
        }
        // select side
        for (const m of ['Front', 'Back']) {
            const option = document.createElement('option');
            option.innerHTML = m;
            select_side.appendChild(option);
        }
        // select range
        for (const m of ['Visible', 'Infrared', 'Ultraviolet']) {
            const option = document.createElement('option');
            option.innerHTML = m;
            select_range.appendChild(option);
        }

        const divBtn = document.createElement('div');
        divBtn.style.marginTop = '10px';
        const btnCancel = document.createElement('button');
        btnCancel.value = 'cancel';
        btnCancel.formMethod = 'dialog';
        btnCancel.innerHTML = 'Cancel';
        const btnConfirm = document.createElement('button');
        btnConfirm.id = 'btnConfirm';
        btnConfirm.value = this.getValue(select_coin.value, select_side.value, select_range.value);
        btnConfirm.innerHTML = 'Confirm';
        divBtn.appendChild(btnCancel);
        divBtn.appendChild(btnConfirm);

        this.dialog.appendChild(form);
        form.appendChild(label_coin);
        label_coin.appendChild(select_coin);
        form.appendChild(label_side);
        label_side.appendChild(select_side);
        form.appendChild(label_range);
        label_range.appendChild(select_range);
        form.appendChild(divBtn);

        this.parent.appendChild(this.dialog);

        select_coin.addEventListener('change', (e) => {
            btnConfirm.value = this.getValue(select_coin.value, select_side.value, select_range.value);
        });

        select_side.addEventListener('change', (e) => {
            btnConfirm.value = this.getValue(select_coin.value, select_side.value, select_range.value);
        });

        select_range.addEventListener('change', (e) => {
            btnConfirm.value = this.getValue(select_coin.value, select_side.value, select_range.value);
        });

        btnConfirm.addEventListener('click', (event) => {
            event.preventDefault(); // We don't want to submit this fake form
            this.dialog.close(this.getValue(select_coin.value, select_side.value, select_range.value)); // Have to send the select box value here.
        });
    }
}