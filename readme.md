# Challenge Engine

This provides a challenge definition system that allows developers to define challenges as a series of steps and validations for their own product.

## Challenges

A challenge is a series of steps containing a validation definition that will, upon reception of an event move to the next step or not depending on the validation and the details of that event.

Example:

```json
{
    "validation": {
        "button-click": true
    }
}
```

If the event `button-click` is triggered, the challenge will move on to the next step

Each step can also contain custom data with a key and a value. The key can be used to define a behavior specific to this step

## API

### Kano.Challenge.Definition

A challenge needs to have its steps behaviors and shorthands defined before the steps are processed, this is why, the steps are only expanded when the challenge starts

#### `Definition#start`

Expand the steps, start the challenge with the first step. Before starting, the challenge is in an idle state.

#### `Definition#nextStep`

Moves to the next step.

#### `Definition#defineBehavior`

Defines a callback that will run every time a custom property in a step changes. This can be used to display UI hints to the user.

```js
def.defineBehavior('banner', data => {
    // data will be the contents of the `banner` property
    // You can use this to customise your UI
    myBannerEl.textContent = data.text;
});
```

#### `Definition#defineShorthand`

Some parts of the challenges will be very similar, you can define shorthands for groups of steps in your challenges that will be expanded by the engine before running the challenge.

```json
{
    "type": "button-and-dialog",
    "buttonCopy": "Click on the button",
    "dialogCopy": "open the dialog"
}
```

```js
// This would define a shortcut with static validations but flexible copies
def.defineShorthand('button-and-dialog', data => {
    //data: { type: 'button-and-dialog', buttonCopy: 'Click on the button', dialogCopy: 'open the dialog' }
    return [{
        banner: buttonCopy,
        validation: {/* ... */}
    }, {
        banner: dialogCopy,
        validation: {/* ... */}
    }]
});
```

#### `Definition#triggerEvent`

Notifies the engine of an event. This will make the engine checks for the current validation

```js
def.triggerEvent('button-tapped', { rightClick: true });
```

#### `Definition#addValidation`

Adds a validation for a specific event. When this event is triggered, the engine will run the function
to know if the event matches the validation.

```js
def.addValidation('button-tapped', (validation, event) => {
    // validation is the validation object defined in the JSON challenge
    // event is the details of the event matching the type

    // The function returns a boolean to indicate if the event matches completely the validation
    return event.aProperty === 'aValue';
});

```

#### `Definition#addMatchFallback`

If the event was triggered, but didn't pass the validation, the match fallback will run.
This allows you to define UI actions to help the user get back on track if needed

```js
def.addMatchFallback('button-tapped', (validation, event) => {
    if (validation.requiredValue === 'red' && event.value === 'blue') {
        displayUIHelp('Try a different colour');
    }
});

```

#### `Definition#addOppositeAction`

When waiting for an event, but a different one is triggered some actions can be performed using `addOppositeAction`

```js
def.addOppositeAction('button-tapped', 'dialog-opened', (validation, event) => {
    // We expected the user to tap the button, but instead they opened the dialog
    // we can use this to display some indications
    displayUIHelp(`Do not open the dialog right now, we'll need that later, but for now, it's all about tapping that button`);
});
```

#### `Definition#addToStore`

Adds data to a store, use this to create handles to runtime data of your projects that needs to be accessed later on.

```js
def.addToStore('blockIds', 'block_0', block.id);
```

#### `Definition#getFromStore`

Retrieves the data stored earlier.

```js
def.getFromStore('blockIds', 'block_0');
```

### Kano.Challenge.ElementsRegistry

#### `ElementsRegistry#add`

Adds an element to the regitry with an id.

```js
// This would make the element available globally from the id `next-button`
reg.add('next-button', document.getElementById('nxt-btn'));
```

#### `ElementsRegistry#get`

Get an element from the regitry.

```js
// In a step behavior for example
def.defineBehavior('bouncing-arrow', data => {
    // Get the element defined in the step
    const target = reg.get(data.target);
    // Create a bouncing arrow to show the user where to click
    const arrow = new BouncingArrow();
    // Set the target of the arrow to the element
    arrow.setTarget(target);
    // Bounce
    arrow.bounce();
});
```

### API style

```js

// Can extend class for challenge abstraction and resusability
// Here we only define behaviors and validations spcific to blockly challenges
class BlocklyChallenge extends Challenge {
    constructor (elementsRegistry) {
        super();
        this.reg = elementsRegistry
        this.defineBehavior('phantom_block', data => {
            this.displayPhantomBlock(data);
        });
    }
    // ...
}

// A Kano Code challenge would be an extension of a blockly challenge as it also contains its own UI
class KanoCodeChallenge extends BlocklyChallenge {
    constructor (elementsRegistry) {
        super(elementsRegistry);
        this.beacon = document.createElement('kano-beacon');
        this.defineBehavior('beacon', data => {
            this.beacon.target = this.elementsRegistry.get(data.target);
        });
    }
}
```