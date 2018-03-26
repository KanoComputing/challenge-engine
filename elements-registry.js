class ElementsRegistry {
    constructor() {
        this._registry = {};
    }
    add(name, el) {
        this._registry[name] = el;
    }
    get(name) {
        return this._registry[name];
    }
}

export default ElementsRegistry;
