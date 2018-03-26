
const VALIDATION_KEY = 'validation';

class Definition {
    constructor() {
        this._behaviors = {};
        this._shorthands = {};
        this._validations = {};
        this._matchFallbacks = {};
        this._oppositeActions = {};
        this._changeCounts = {};
        this._stepProcessors = {};
        this._stores = {};
        this._emitter = document.createElement('div');
    }
    trigger(name, data) {
        this._emitter.dispatchEvent(new CustomEvent(name, { detail: data }));
    }
    addEventListener(name, callback) {
        this._emitter.addEventListener(name, callback);
    }
    removeEventListener(name, callback) {
        this._emitter.removeEventListener(name, callback);
    }
    createStore(name) {
        this._stores[name] = {};
        return this._stores[name];
    }
    addToStore(storeName, name, value) {
        let store = this._stores[storeName];
        if (!store) {
            store = this.createStore(storeName);
        }
        store[name] = value;
    }
    getFromStore(storeName, name) {
        const store = this._stores[storeName];
        if (!store) {
            return null;
        }
        return store[name];
    }
    setSteps(steps) {
        this._steps = steps;
    }
    definePropertyProcessor(paths, processor) {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        pathArray.forEach((path) => {
            this._stepProcessors[path] = processor;
        });
    }
    defineBehavior(name, enters, leaves) {
        this._behaviors[name] = { enters, leaves };
    }
    defineShorthand(name, processor) {
        this._shorthands[name] = processor;
    }
    static ensureProperty(step, propName) {
        const propIsDefined = (propName in step)
                                && typeof step[propName] !== 'undefined'
                                && step[propName] !== null;
        if (!propIsDefined) {
            throw new Error(`Property '${propName}' must be defined`);
        }
    }
    triggerEvent(name, data) {
        if (!this.step) {
            return;
        }
        this._checkEvent(this.step.validation, { type: name, data });
    }
    _checkEvent(validation, event) {
        if (!validation) {
            return;
        }
        Object.keys(validation).forEach((type) => {
            // Type mismatch, check the opposite actions
            if (type !== event.type) {
                this._isOppositeAction(validation[type], type, event);
            } else if (this._validateEvent(validation[type], type, event)) {
                if (!validation[type].skipSteps) {
                    this.nextStep();
                } else {
                    this._goToStep(this.step + validation[type].skipSteps + 1);
                }
            // The matching event didn't pass the checks, find a fallback
            } else {
                this._validateMatchFallback(validation[type], type, event);
            }
        });
    }
    _validateMatchFallback(validation, type, detail) {
        const method = this._matchFallbacks[type];
        if (!method) {
            return false;
        }
        return method.call(this, validation, detail);
    }
    /**
    * Check whether the received event matches the validation
    */
    _validateEvent(validation, type, detail) {
        // Simple presence validation
        if (validation === true || (validation.value && validation.value === true)) {
            return true;
        }
        // Record changes for `count` type validations
        this._changeCounts[this.stepIndex] = this._changeCounts[this.stepIndex] + 1 || 1;
        // Run the validator if exists
        if (this._validations[type] && this._validations[type].call(this, validation, detail)) {
            return true;
        }
        return false;
    }
    _getOppositeAction(expected, real) {
        if (this._oppositeActions[expected] && this._oppositeActions[expected][real]) {
            return this._oppositeActions[expected][real];
        }
        return false;
    }
    /**
    * Lookup the actions tables and check if the current event goes against the action required
    */
    _isOppositeAction(validation, type, detail) {
        const oppositeAction = this._getOppositeAction(type, detail.type);
        if (!oppositeAction) {
            return false;
        }
        return oppositeAction.call(this, validation, detail);
    }
    addValidation(name, check) {
        this._validations[name] = check;
    }
    addMatchFallback(name, check) {
        this._matchFallbacks[name] = check;
    }
    addOppositeAction(name, oppositeType, checkMethod) {
        this._oppositeActions[name] = this._oppositeActions[name] || {};
        this._oppositeActions[name][oppositeType] = checkMethod;
    }
    _runBehavior(name, type, step) {
        if (!this._behaviors[name] || !this._behaviors[name][type]) {
            return;
        }
        this._behaviors[name][type](step[name]);
    }
    _expandSteps() {
        // Create a new Array of steps with the expanded shorthands
        return this._steps.reduce((acc, step) => {
            if (step.type && this._shorthands[step.type]) {
                // A shorthand exist, use the processor to get all the steps
                return acc.concat(this._shorthands[step.type](step));
            }
            // No, shorthands, return the original step
            return acc.concat(step);
        }, []);
    }
    _processStep(step, path) {
        path = path || [];
        const stringPath = path.join('.');
        if (this._stepProcessors[stringPath]) {
            step = this._stepProcessors[stringPath](step);
        }
        if (Array.isArray(step)) {
            return step.map((val) => this._processStep(val, path.concat('*')));
        } else if (step !== null && typeof step === 'object') {
            return Object.keys(step).reduce((acc, key) => {
                acc[key] = this._processStep(step[key], path.concat(key));
                return acc;
            }, {});
        }
        return step;
    }
    _updateStep() {
        const oldStep = this.step;
        // Out of bond stepIndex happens at the end of a challenge. Set the step to null
        // Also deep copy the step, to apply the processing to a copy.
        // A step can be selected more than once,
        // But only the original definition must be processed
        this.step = this.steps[this._stepIndex] ? this._processStep(JSON.parse(JSON.stringify(this.steps[this._stepIndex]))) : null;
        if (oldStep) {
            Object.keys(oldStep).forEach((key) => {
                if (key === VALIDATION_KEY) {
                    return;
                }
                this._runBehavior(key, 'leaves', oldStep);
            });
        }
        if (this.step) {
            Object.keys(this.step).forEach((key) => {
                if (key === VALIDATION_KEY) {
                    return;
                }
                this._runBehavior(key, 'enters', this.step);
            });
        }
    }
    start() {
        this.steps = this._expandSteps();
        this.stepIndex = 0;
    }
    set stepIndex(n) {
        this._stepIndex = n;
        this._updateStep();
        if (this.done) {
            this.trigger('done');
        }
    }
    get stepIndex() {
        return this._stepIndex;
    }
    nextStep() {
        // Let it go just over the max to indicate a `done` state
        if (this.stepIndex < this.steps.length) {
            this.stepIndex += 1;
        }
    }
    get done() {
        return this.stepIndex === this.steps.length;
    }
}

export default Definition;
