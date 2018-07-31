(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.Kano = global.Kano || {}, global.Kano.Challenge = global.Kano.Challenge || {}, global.Kano.Challenge.ElementsRegistry = factory());
}(this, (function () { 'use strict';

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

    return ElementsRegistry;

})));
