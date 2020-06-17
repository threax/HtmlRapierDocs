///<amd-module name="hr.escape"/>
define("hr.escape", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Escape text to prevent html characters from being output. Helps prevent xss, called automatically
     * by formatText. If you manually write user data consider using this function to escape it, but it is
     * not needed using other HtmlRapier functions like repeat, createComponent or formatText.
     * @param {string} text - the text to escape.
     * @returns {type} - The escaped version of text.
     */
    function escape(text) {
        text = String(text);
        var status = {
            textStart: 0,
            bracketStart: 0,
            output: ""
        };
        for (var i = 0; i < text.length; ++i) {
            switch (text[i]) {
                case '<':
                    outputEncoded(i, text, status, '&lt;');
                    break;
                case '>':
                    outputEncoded(i, text, status, '&gt;');
                    break;
                case '"':
                    outputEncoded(i, text, status, '&quot;');
                    break;
                case '\'':
                    outputEncoded(i, text, status, '&#39;');
                    break;
                default:
                    break;
            }
        }
        if (status.textStart < text.length) {
            status.output += text.substring(status.textStart, text.length);
        }
        return status.output;
    }
    exports.escape = escape;
    //Helper function for escaping
    function outputEncoded(i, text, status, replacement) {
        status.bracketStart = i;
        status.output += text.substring(status.textStart, status.bracketStart) + replacement;
        status.textStart = i + 1;
    }
});
///<amd-module name="hr.typeidentifiers"/>
define("hr.typeidentifiers", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Determine if a variable is an array.
     * @param test - The object to test
     * @returns {boolean} - True if the object is an array
     */
    function isArray(test) {
        return Array.isArray(test);
    }
    exports.isArray = isArray;
    /**
     * Determine if a variable is a string.
     * @param test - The object to test
     * @returns {boolean} - True if a string, false if not
     */
    function isString(test) {
        return typeof (test) === 'string';
    }
    exports.isString = isString;
    /**
     * Determine if a variable is a function.
     * @param test - The object to test
     * @returns {boolean} - True if a function, false if not
     */
    function isFunction(test) {
        return typeof (test) === 'function';
    }
    exports.isFunction = isFunction;
    /**
     * Determine if a variable is an object.
     * @param test - The object to test
     * @returns {boolean} - True if an object, false if not
     */
    function isObject(test) {
        return typeof test === 'object';
    }
    exports.isObject = isObject;
    function isForEachable(test) {
        return test && isFunction(test['forEach']);
    }
    exports.isForEachable = isForEachable;
});
///<amd-module name="hr.domquery"/>
define("hr.domquery", ["require", "exports", "hr.typeidentifiers"], function (require, exports, typeId) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Derive the plain javascript element from a passed element
     * @param {string|Node} element - the element to detect
     * @returns {Node} - The located html element.
     */
    function first(element, context) {
        if (typeof element === 'string') {
            if (context !== undefined) {
                if (matches(context, element)) {
                    return context;
                }
                else {
                    return context.querySelector(element);
                }
            }
            else {
                return document.querySelector(element);
            }
        }
        if (element instanceof Node) {
            return element;
        }
    }
    exports.first = first;
    ;
    /**
     * Query all passed javascript elements
     * @param {string|HTMLElement} element - the element to detect
     * @param {HTMLElement} element - the context to search
     * @returns {array[HTMLElement]} - The results array to append to.
     * @returns {array[HTMLElement]} - The located html element. Will be the results array if one is passed otherwise a new one.
     */
    function all(element, context, results) {
        if (typeof element === 'string') {
            if (results === undefined) {
                results = [];
            }
            if (context !== undefined) {
                //Be sure to include the main element if it matches the selector.
                if (matches(context, element)) {
                    results.push(context);
                }
                //This will add all child elements that match the selector.
                nodesToArray(context.querySelectorAll(element), results);
            }
            else {
                nodesToArray(document.querySelectorAll(element), results);
            }
        }
        else if (element instanceof HTMLElement) {
            if (results === undefined) {
                results = [element];
            }
            else {
                results.push(element);
            }
        }
        else {
            if (results === undefined) {
                results = element;
            }
            else {
                for (var i = 0; i < element.length; ++i) {
                    results.push(element[i]);
                }
            }
        }
        return results;
    }
    exports.all = all;
    ;
    /**
     * Query all passed javascript elements
     * @param {string|HTMLElement} element - the element to detect
     * @param {HTMLElement} element - the context to search
     * @param cb - Called with each htmlelement that is found
     */
    function iterate(element, context, cb) {
        if (typeId.isString(element)) {
            if (context) {
                if (matches(context, element)) {
                    cb(context);
                }
                else {
                    iterateQuery(context.querySelectorAll(element), cb);
                }
            }
            else {
                iterateQuery(document.querySelectorAll(element), cb);
            }
        }
        else if (element instanceof HTMLElement) {
            cb(element);
        }
        else if (Array.isArray(element)) {
            for (var i = 0; i < element.length; ++i) {
                cb(element[i]);
            }
        }
    }
    exports.iterate = iterate;
    ;
    function alwaysTrue(node) {
        return true;
    }
    /**
     * Iterate a node collection using createNodeIterator. There is no query for this version
     * as it iterates everything and allows you to extract what is needed.
     * @param  element - The root element
     * @param {NodeFilter} whatToShow - see createNodeIterator, defaults to SHOW_ALL
     * @param  cb - The function called for each item iterated
     */
    function iterateNodes(node, whatToShow, cb) {
        var iter = document.createNodeIterator(node, whatToShow, alwaysTrue, false);
        var resultNode;
        while (resultNode = iter.nextNode()) {
            cb(resultNode);
        }
    }
    exports.iterateNodes = iterateNodes;
    /**
     * Determine if an element matches the given selector.
     * @param {type} element
     * @param {type} selector
     * @returns {type}
     */
    function matches(element, selector) {
        return element.matches(selector);
    }
    exports.matches = matches;
    function nodesToArray(nodes, arr) {
        for (var i = 0; i < nodes.length; ++i) {
            arr.push(nodes[i]);
        }
    }
    function iterateQuery(nodes, cb) {
        for (var i = 0; i < nodes.length; ++i) {
            cb(nodes[i]);
        }
    }
});
///<amd-module name="hr.textstream"/>
define("hr.textstream", ["require", "exports", "hr.escape", "hr.typeidentifiers"], function (require, exports, hr_escape_1, typeId) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TextNode = (function () {
        function TextNode(str) {
            this.str = str;
        }
        TextNode.prototype.writeObject = function (data) {
            return this.str;
        };
        TextNode.prototype.writeFunction = function (data) {
            return this.writeObject(data);
        };
        return TextNode;
    }());
    var VariableNode = (function () {
        function VariableNode(variable) {
            this.variable = variable;
        }
        VariableNode.prototype.writeObject = function (data) {
            return hr_escape_1.escape(data[this.variable]);
        };
        VariableNode.prototype.writeFunction = function (data) {
            return hr_escape_1.escape(data(this.variable));
        };
        return VariableNode;
    }());
    var ThisVariableNode = (function () {
        function ThisVariableNode() {
        }
        ThisVariableNode.prototype.writeObject = function (data) {
            return hr_escape_1.escape(data);
        };
        ThisVariableNode.prototype.writeFunction = function (data) {
            return hr_escape_1.escape(data('this'));
        };
        return ThisVariableNode;
    }());
    function format(data, streamNodes) {
        if (data === null || data === undefined) {
            data = {};
        }
        var text = "";
        if (typeId.isFunction(data)) {
            for (var i = 0; i < streamNodes.length; ++i) {
                text += streamNodes[i].writeFunction(data);
            }
        }
        else {
            for (var i = 0; i < streamNodes.length; ++i) {
                text += streamNodes[i].writeObject(data);
            }
        }
        return text;
    }
    /**
     * Create a text stream that when called with data will output
     * the original string with new data filled out. If the text contains
     * no variables no stream will be created.
     * @param {type} text
     * @returns {type}
     */
    var TextStream = (function () {
        function TextStream(text, open, close) {
            this.streamNodes = [];
            this.variablesFound = false;
            if (open === undefined) {
                open = '{';
            }
            if (close === undefined) {
                close = '}';
            }
            var textStart = 0;
            var bracketStart = 0;
            var bracketEnd = 0;
            var bracketCount = 0;
            var bracketCheck = 0;
            var leadingText;
            var variable;
            var bracketVariable;
            //This holds text we have not created a TextNode for as we parse, this way we can combine output variables with surrounding text for the stream itself
            var skippedTextBuffer = "";
            for (var i = 0; i < text.length; ++i) {
                if (text[i] == open) {
                    //Count up opening brackets
                    bracketStart = i;
                    bracketCount = 1;
                    while (++i < text.length && text[i] == open) {
                        ++bracketCount;
                    }
                    //Find closing bracket chain, ignore if mismatched or whitespace
                    bracketCheck = bracketCount;
                    while (++i < text.length) {
                        if ((text[i] == close && --bracketCheck == 0) || /\s/.test(text[i])) {
                            break;
                        }
                    }
                    //If the check got back to 0 we found a variable
                    if (bracketCheck == 0) {
                        leadingText = text.substring(textStart, bracketStart);
                        bracketEnd = i;
                        bracketVariable = text.substring(bracketStart, bracketEnd + 1);
                        switch (bracketCount) {
                            case 1:
                                //1 bracket, add to buffer
                                skippedTextBuffer += leadingText + bracketVariable;
                                break;
                            case 2:
                                this.streamNodes.push(new TextNode(skippedTextBuffer + leadingText));
                                skippedTextBuffer = ""; //This is reset every time we actually output something
                                variable = bracketVariable.substring(2, bracketVariable.length - 2);
                                if (variable === "this") {
                                    this.streamNodes.push(new ThisVariableNode());
                                }
                                else {
                                    this.streamNodes.push(new VariableNode(variable));
                                }
                                break;
                            default:
                                //Multiple brackets, escape by removing one and add to buffer
                                skippedTextBuffer += leadingText + bracketVariable.substring(1, bracketVariable.length - 1);
                                break;
                        }
                        textStart = i + 1;
                        this.variablesFound = true;
                    }
                }
            }
            if (textStart < text.length) {
                this.streamNodes.push(new TextNode(skippedTextBuffer + text.substring(textStart, text.length)));
            }
        }
        TextStream.prototype.format = function (data) {
            return format(data, this.streamNodes);
        };
        TextStream.prototype.foundVariable = function () {
            return this.variablesFound;
        };
        return TextStream;
    }());
    exports.TextStream = TextStream;
});
///<amd-module name="hr.eventdispatcher"/>
define("hr.eventdispatcher", ["require", "exports", "hr.typeidentifiers"], function (require, exports, typeId) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * This event dispatcher does not handle event listeners returning values.
     */
    var ActionEventDispatcher = (function () {
        function ActionEventDispatcher() {
            this.listeners = [];
        }
        ActionEventDispatcher.prototype.add = function (listener) {
            if (!typeId.isFunction(listener)) {
                throw new Error("Listener must be a function, instead got " + typeof (listener));
            }
            this.listeners.push(listener);
        };
        ActionEventDispatcher.prototype.remove = function (listener) {
            for (var i = 0; i < this.listeners.length; ++i) {
                if (this.listeners[i] === listener) {
                    this.listeners.splice(i--, 1);
                }
            }
        };
        Object.defineProperty(ActionEventDispatcher.prototype, "modifier", {
            get: function () {
                return this;
            },
            enumerable: true,
            configurable: true
        });
        ActionEventDispatcher.prototype.fire = function (arg) {
            for (var i = 0; i < this.listeners.length; ++i) {
                this.listeners[i](arg);
            }
        };
        return ActionEventDispatcher;
    }());
    exports.ActionEventDispatcher = ActionEventDispatcher;
    /**
     * This is class is for events that return a value.
     */
    var FuncEventDispatcher = (function () {
        function FuncEventDispatcher() {
            this.listeners = [];
        }
        FuncEventDispatcher.prototype.add = function (listener) {
            if (!typeId.isFunction(listener)) {
                throw new Error("Listener must be a function, instead got " + typeof (listener));
            }
            this.listeners.push(listener);
        };
        FuncEventDispatcher.prototype.remove = function (listener) {
            for (var i = 0; i < this.listeners.length; ++i) {
                if (this.listeners[i] === listener) {
                    this.listeners.splice(i--, 1);
                }
            }
        };
        Object.defineProperty(FuncEventDispatcher.prototype, "modifier", {
            get: function () {
                return this;
            },
            enumerable: true,
            configurable: true
        });
        FuncEventDispatcher.prototype.fire = function (arg) {
            var result = undefined;
            var nextResult;
            for (var i = 0; i < this.listeners.length; ++i) {
                var listener = this.listeners[i];
                nextResult = listener(arg);
                if (nextResult !== undefined) {
                    if (result === undefined) {
                        result = [];
                    }
                    result.push(nextResult);
                }
            }
            return result;
        };
        return FuncEventDispatcher;
    }());
    exports.FuncEventDispatcher = FuncEventDispatcher;
    /**
     * This event dispatcher will return a promise that will resolve when all events
     * are finished running. Allows async work to stay in the event flow.
     */
    var PromiseEventDispatcher = (function () {
        function PromiseEventDispatcher() {
            this.listeners = [];
        }
        PromiseEventDispatcher.prototype.add = function (listener) {
            if (!typeId.isFunction(listener)) {
                throw new Error("Listener must be a function, instead got " + typeof (listener));
            }
            this.listeners.push(listener);
        };
        PromiseEventDispatcher.prototype.remove = function (listener) {
            for (var i = 0; i < this.listeners.length; ++i) {
                if (this.listeners[i] === listener) {
                    this.listeners.splice(i--, 1);
                }
            }
        };
        Object.defineProperty(PromiseEventDispatcher.prototype, "modifier", {
            get: function () {
                return this;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Fire the event. The listeners can return values, if they do the values will be added
         * to an array that is returned by the promise returned by this function.
         * @returns {Promise} a promise that will resolve when all fired events resolve.
         */
        PromiseEventDispatcher.prototype.fire = function (arg) {
            var result;
            var promises = [];
            for (var i = 0; i < this.listeners.length; ++i) {
                var listener = this.listeners[i];
                promises.push(new Promise(function (resovle, reject) {
                    resovle(listener(arg));
                })
                    .then(function (data) {
                    if (data !== undefined) {
                        if (result === undefined) {
                            result = [];
                        }
                        result.push(data);
                    }
                }));
            }
            return Promise.all(promises)
                .then(function (data) {
                return result;
            });
        };
        return PromiseEventDispatcher;
    }());
    exports.PromiseEventDispatcher = PromiseEventDispatcher;
});
///<amd-module name="hr.toggles"/>
define("hr.toggles", ["require", "exports", "tslib", "hr.typeidentifiers", "hr.eventdispatcher"], function (require, exports, tslib_1, typeId, evts) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var defaultStates = ['on', 'off']; //Reusuable states, so we don't end up creating tons of these arrays
    var togglePlugins = [];
    /**
     * Interface for typed toggles, provides a way to get the states as a string,
     * you should provide the names of all your functions here.
     */
    var TypedToggle = (function () {
        function TypedToggle() {
            this.events = {};
        }
        /**
         * Get the states this toggle can activate.
         */
        TypedToggle.prototype.getPossibleStates = function () {
            return [];
        };
        /**
         * Set the toggle states used by this strong toggle, should not be called outside of
         * the toggle build function.
         */
        TypedToggle.prototype.setStates = function (states) {
            this.states = states;
            this.states.setToggle(this);
        };
        TypedToggle.prototype.applyState = function (name) {
            if (this._currentState !== name) {
                this._currentState = name;
                if (this.states.applyState(name)) {
                    this.fireStateChange(name);
                }
            }
        };
        TypedToggle.prototype.isUsable = function () {
            return !(typeId.isObject(this.states) && this.states.constructor.prototype == NullStates.prototype);
        };
        Object.defineProperty(TypedToggle.prototype, "currentState", {
            get: function () {
                return this._currentState;
            },
            enumerable: true,
            configurable: true
        });
        TypedToggle.prototype.fireStateChange = function (name) {
            this._currentState = name; //This only should happen as the result of an applystate call or the state being changed externally to the library
            //The event will only fire on the current state, so it is safe to set the current state here.
            if (this.events[name] !== undefined) {
                this.events[name].fire(this);
            }
        };
        TypedToggle.prototype.getStateEvent = function (name) {
            if (this.events[name] === undefined) {
                this.events[name] = new evts.ActionEventDispatcher();
            }
            return this.events[name];
        };
        return TypedToggle;
    }());
    exports.TypedToggle = TypedToggle;
    /**
     * A toggle that is on and off.
     */
    var OnOffToggle = (function (_super) {
        tslib_1.__extends(OnOffToggle, _super);
        function OnOffToggle() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        OnOffToggle.prototype.on = function () {
            this.applyState("on");
        };
        OnOffToggle.prototype.off = function () {
            this.applyState("off");
        };
        Object.defineProperty(OnOffToggle.prototype, "onEvent", {
            get: function () {
                return this.getStateEvent('on').modifier;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OnOffToggle.prototype, "offEvent", {
            get: function () {
                return this.getStateEvent('off').modifier;
            },
            enumerable: true,
            configurable: true
        });
        OnOffToggle.prototype.getPossibleStates = function () {
            return OnOffToggle.states;
        };
        OnOffToggle.prototype.toggle = function () {
            if (this.mode) {
                this.off();
            }
            else {
                this.on();
            }
        };
        Object.defineProperty(OnOffToggle.prototype, "mode", {
            get: function () {
                return this.currentState === "on";
            },
            set: function (value) {
                var currentOn = this.mode;
                if (currentOn && !value) {
                    this.off();
                }
                else if (!currentOn && value) {
                    this.on();
                }
            },
            enumerable: true,
            configurable: true
        });
        OnOffToggle.states = ['on', 'off'];
        return OnOffToggle;
    }(TypedToggle));
    exports.OnOffToggle = OnOffToggle;
    /**
     * The Group defines a collection of toggles that can be manipulated together.
     */
    var Group = (function () {
        function Group() {
            var toggles = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                toggles[_i] = arguments[_i];
            }
            this.toggles = toggles;
        }
        /**
         * Add a toggle to the group.
         * @param toggle - The toggle to add.
         */
        Group.prototype.add = function (toggle) {
            this.toggles.push(toggle);
        };
        /**
         * This function will set all toggles in the group (including the passed one if its in the group)
         * to the hideState and then will set the passed toggle to showState.
         * @param toggle - The toggle to set.
         * @param {string} [showState] - The state to set the passed toggle to.
         * @param {string} [hideState] - The state to set all other toggles to.
         */
        Group.prototype.activate = function (toggle, showState, hideState) {
            if (showState === undefined) {
                showState = 'on';
            }
            if (hideState === undefined) {
                hideState = 'off';
            }
            for (var i = 0; i < this.toggles.length; ++i) {
                this.toggles[i].applyState(hideState);
            }
            toggle.applyState(showState);
        };
        return Group;
    }());
    exports.Group = Group;
    /**
     * Add a toggle plugin that can create additional items on the toggle chain.
     * @param {type} plugin
     */
    function addTogglePlugin(plugin) {
        togglePlugins.push(plugin);
    }
    exports.addTogglePlugin = addTogglePlugin;
    /**
     * Base class for toggle state collections. Implemented as a chain.
     * @param {ToggleStates} next
     */
    var ToggleStates = (function () {
        function ToggleStates(next) {
            this.states = {};
            this.next = next;
        }
        ToggleStates.prototype.addState = function (name, value) {
            this.states[name] = value;
        };
        ToggleStates.prototype.applyState = function (name) {
            var state = this.states[name];
            var fireEvent = this.activateState(state);
            if (this.next) {
                fireEvent = this.next.applyState(name) || fireEvent;
            }
            return fireEvent;
        };
        ToggleStates.prototype.setToggle = function (toggle) {
            this.toggle = toggle;
        };
        ToggleStates.prototype.fireStateChange = function (name) {
            if (this.toggle) {
                this.toggle.fireStateChange(name);
            }
        };
        return ToggleStates;
    }());
    exports.ToggleStates = ToggleStates;
    /**
     * This class holds multiple toggle states as a group. This handles multiple toggles
     * with the same name by bunding them up turning them on and off together.
     * @param {ToggleStates} next
     */
    var MultiToggleStates = (function () {
        function MultiToggleStates(childStates) {
            this.childStates = childStates;
        }
        MultiToggleStates.prototype.addState = function (name, value) {
            for (var i = 0; i < this.childStates.length; ++i) {
                this.childStates[i].addState(name, value);
            }
        };
        MultiToggleStates.prototype.applyState = function (name) {
            var fireEvent = true;
            for (var i = 0; i < this.childStates.length; ++i) {
                fireEvent = this.childStates[i].applyState(name) || fireEvent; //Fire event first so we always fire all the items in the chain
            }
            return fireEvent;
        };
        MultiToggleStates.prototype.setToggle = function (toggle) {
            for (var i = 0; i < this.childStates.length; ++i) {
                this.childStates[i].setToggle(toggle);
            }
        };
        return MultiToggleStates;
    }());
    exports.MultiToggleStates = MultiToggleStates;
    /**
     * A simple toggle state that does nothing. Used to shim correctly if no toggles are defined for a toggle element.
     */
    var NullStates = (function (_super) {
        tslib_1.__extends(NullStates, _super);
        function NullStates(next) {
            return _super.call(this, next) || this;
        }
        NullStates.prototype.activateState = function (value) {
            return true;
        };
        return NullStates;
    }(ToggleStates));
    /**
     * A toggler that toggles style for an element
     */
    var StyleStates = (function (_super) {
        tslib_1.__extends(StyleStates, _super);
        function StyleStates(element, next) {
            var _this = _super.call(this, next) || this;
            _this.element = element;
            _this.originalStyles = element.style.cssText || "";
            return _this;
        }
        StyleStates.prototype.activateState = function (style) {
            if (style) {
                this.element.style.cssText = this.originalStyles + style;
            }
            else {
                this.element.style.cssText = this.originalStyles;
            }
            return true;
        };
        return StyleStates;
    }(ToggleStates));
    /**
    * A toggler that toggles classes for an element. Supports animations using an
    * idle attribute (data-hr-class-idle) that if present will have its classes
    * applied to the element when any animations have completed.
    */
    var ClassStates = (function (_super) {
        tslib_1.__extends(ClassStates, _super);
        function ClassStates(element, next) {
            var _this = _super.call(this, next) || this;
            _this.element = element;
            _this.originalClasses = element.getAttribute("class") || "";
            _this.idleClass = element.getAttribute('data-hr-class-idle');
            _this.stopAnimationCb = function () { _this.stopAnimation(); };
            return _this;
        }
        ClassStates.prototype.activateState = function (classes) {
            if (classes) {
                this.element.setAttribute("class", this.originalClasses + ' ' + classes);
            }
            else {
                this.element.setAttribute("class", this.originalClasses);
            }
            this.startAnimation();
            return true;
        };
        ClassStates.prototype.startAnimation = function () {
            if (this.idleClass) {
                this.element.classList.remove(this.idleClass);
                this.element.removeEventListener('transitionend', this.stopAnimationCb);
                this.element.removeEventListener('animationend', this.stopAnimationCb);
                this.element.addEventListener('transitionend', this.stopAnimationCb);
                this.element.addEventListener('animationend', this.stopAnimationCb);
            }
        };
        ClassStates.prototype.stopAnimation = function () {
            this.element.removeEventListener('transitionend', this.stopAnimationCb);
            this.element.removeEventListener('animationend', this.stopAnimationCb);
            this.element.classList.add(this.idleClass);
        };
        return ClassStates;
    }(ToggleStates));
    /**
     * Extract all the states from a given element to build a single toggle in the chain.
     * You pass in the prefix and states you want to extract as well as the constructor
     * to use to create new states.
     * @param {type} element - The element to extract toggles from
     * @param {type} states - The states to look for
     * @param {type} attrPrefix - The prefix for the attribute that defines the state. Will be concated with each state to form the lookup attribute.
     * @param {type} toggleConstructor - The constructor to use if a toggle is created.
     * @param {type} nextToggle - The next toggle to use in the chain
     * @returns {type} The toggle that should be the next element in the chain, will be the new toggle if one was created or nextToggle if nothing was created.
     */
    function extractStates(element, states, attrPrefix, toggleConstructor, nextToggle) {
        var toggleStates = null;
        for (var i = 0; i < states.length; ++i) {
            var name = states[i];
            var attr = attrPrefix + name;
            if (element.hasAttribute(attr)) {
                var value = element.getAttribute(attr);
                if (toggleStates === null) {
                    toggleStates = new toggleConstructor(element, nextToggle);
                }
                toggleStates.addState(name, value);
            }
        }
        if (toggleStates) {
            return toggleStates;
        }
        return nextToggle;
    }
    function getStartState(element) {
        var attr = "data-hr-state";
        if (element.hasAttribute(attr)) {
            var value = element.getAttribute(attr);
            return value;
        }
        return null;
    }
    exports.getStartState = getStartState;
    /**
     * Build a toggle chain from the given element
     * @param {string} element - The element to build toggles for
     * @param {string[]} [stateNames] - The states the toggle needs, will create functions on
     * the toggle for each one. If this is undefined will default to "on" and "off".
     * @returns A new ToggleChain with the defined states as functions
     */
    function build(element, stateNames) {
        if (stateNames === undefined) {
            stateNames = defaultStates;
        }
        var toggle = null;
        if (element !== null) {
            toggle = extractStates(element, stateNames, 'data-hr-style-', StyleStates, toggle);
            toggle = extractStates(element, stateNames, 'data-hr-class-', ClassStates, toggle);
            //Now toggle plugin chain
            for (var i = 0; i < togglePlugins.length; ++i) {
                toggle = togglePlugins[i](element, stateNames, toggle);
            }
        }
        //If we get all the way here with no toggle, use the null toggle.
        if (toggle === null) {
            toggle = new NullStates(toggle);
        }
        return toggle;
    }
    exports.build = build;
});
///<amd-module name="hr.schema"/>
define("hr.schema", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Find the ref and return it for node if it exists.
     * @param node The node to expand
     */
    function resolveRef(node, schema) {
        if (node.$ref !== undefined) {
            var walker = schema;
            var refs = node.$ref.split('/');
            for (var i = 1; i < refs.length; ++i) {
                walker = walker[refs[i]];
                if (walker === undefined) {
                    throw new Error("Cannot find ref '" + node.$ref + "' in schema.");
                }
            }
            return walker;
        }
        return node;
    }
    exports.resolveRef = resolveRef;
});
///<amd-module name="hr.error"/>
define("hr.error", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
    function isValidationError(test) {
        return test.getValidationError !== undefined
            && test.getValidationErrors !== undefined
            && test.hasValidationError !== undefined
            && test.hasValidationErrors !== undefined;
    }
    exports.isValidationError = isValidationError;
    function isFormErrors(test) {
        return isValidationError(test)
            && test.addKey !== undefined
            && test.addIndex !== undefined;
    }
    exports.isFormErrors = isFormErrors;
});
///<amd-module name="hr.formhelper"/>
define("hr.formhelper", ["require", "exports", "hr.domquery", "hr.typeidentifiers"], function (require, exports, domQuery, typeIds) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function IsFormElement(element) {
        return element && (element.nodeName === 'FORM' || element.nodeName == 'INPUT' || element.nodeName == 'TEXTAREA');
    }
    exports.IsFormElement = IsFormElement;
    function addValue(q, name, value, level) {
        name = extractLevelName(level, name);
        if (q[name] === undefined) {
            q[name] = value;
        }
        else if (!typeIds.isArray(q[name])) {
            var tmp = q[name];
            q[name] = [tmp, value];
        }
        else {
            q[name].push(value);
        }
    }
    function allowWrite(element, level) {
        return level === undefined || element.getAttribute('data-hr-form-level') === level;
    }
    /**
     * Serialze a form to a javascript object
     * @param form - A selector or form element for the form to serialize.
     * @returns - The object that represents the form contents as an object.
     */
    function serialize(form, proto, level) {
        //This is from https://code.google.com/archive/p/form-serialize/downloads
        //Modified to return an object instead of a query string
        var formElements;
        if (IsFormElement(form)) {
            formElements = form.elements;
        }
        else {
            formElements = domQuery.all("[name]", form); //All elements with a name, they will be filtered by what is supported below
        }
        var i, j, q = Object.create(proto || null);
        var elementsLength = formElements.length;
        for (i = 0; i < elementsLength; ++i) {
            var element = formElements[i];
            if (element.name === "" || !allowWrite(element, level)) {
                continue;
            }
            switch (element.nodeName) {
                case 'INPUT':
                    switch (element.type) {
                        case 'file':
                            addValue(q, element.name, element.files, level);
                            break;
                        case 'checkbox':
                        case 'radio':
                            if (element.checked) {
                                addValue(q, element.name, element.value, level);
                            }
                            break;
                        default:
                            addValue(q, element.name, element.value, level);
                            break;
                    }
                    break;
                case 'TEXTAREA':
                    addValue(q, element.name, element.value, level);
                    break;
                case 'SELECT':
                    switch (element.type) {
                        case 'select-one':
                            addValue(q, element.name, element.value, level);
                            break;
                        case 'select-multiple':
                            var selected = [];
                            for (j = element.options.length - 1; j >= 0; j = j - 1) {
                                if (element.options[j].selected) {
                                    selected.push(element.options[j].value);
                                }
                            }
                            addValue(q, element.name, selected, level);
                            break;
                    }
                    break;
                case 'BUTTON':
                    switch (element.type) {
                        case 'reset':
                        case 'submit':
                        case 'button':
                            addValue(q, element.name, element.value, level);
                            break;
                    }
                    break;
            }
        }
        return q;
    }
    exports.serialize = serialize;
    var DataType;
    (function (DataType) {
        DataType[DataType["Object"] = 0] = "Object";
        DataType[DataType["Function"] = 1] = "Function";
    })(DataType = exports.DataType || (exports.DataType = {}));
    function containsCoerced(items, search) {
        for (var i = 0; i < items.length; ++i) {
            if (items[i] == search) {
                return true;
            }
        }
        return false;
    }
    function extractLevelName(level, name) {
        if (level !== undefined && level !== null && level.length > 0) {
            name = name.substring(level.length + 1); //Account for delimiter, but we don't care what it is
        }
        return name;
    }
    function getDataType(data) {
        if (typeIds.isObject(data)) {
            return DataType.Object;
        }
        else if (typeIds.isFunction(data)) {
            return DataType.Function;
        }
    }
    exports.getDataType = getDataType;
    /**
     * Populate a form with data.
     * @param form - The form to populate or a query string for the form.
     * @param data - The data to bind to the form, form name attributes will be mapped to the keys in the object.
     */
    function populate(form, data, level) {
        var formElement = domQuery.first(form);
        var nameAttrs = domQuery.all('[name]', formElement);
        var dataType = getDataType(data);
        for (var i = 0; i < nameAttrs.length; ++i) {
            var element = nameAttrs[i];
            if (allowWrite(element, level)) {
                var itemData;
                var dataName = extractLevelName(level, element.getAttribute('name'));
                switch (dataType) {
                    case DataType.Object:
                        itemData = data[dataName];
                        break;
                    case DataType.Function:
                        itemData = data(dataName);
                        break;
                }
                if (itemData === undefined) {
                    itemData = "";
                }
                switch (element.type) {
                    case 'checkbox':
                        element.checked = itemData;
                        break;
                    case 'select-multiple':
                        var options = element.options;
                        for (var j = options.length - 1; j >= 0; j = j - 1) {
                            options[j].selected = containsCoerced(itemData, options[j].value);
                        }
                        break;
                    default:
                        element.value = itemData;
                        break;
                }
            }
        }
    }
    exports.populate = populate;
    var FormSerializer = (function () {
        function FormSerializer(form) {
            this.form = form;
        }
        FormSerializer.prototype.serialize = function (level) {
            return serialize(this.form, undefined, level);
        };
        FormSerializer.prototype.populate = function (data, level) {
            populate(this.form, data, level);
        };
        return FormSerializer;
    }());
    exports.FormSerializer = FormSerializer;
    var buildFormCb;
    function setBuildFormFunc(buildForm) {
        buildFormCb = buildForm;
    }
    exports.setBuildFormFunc = setBuildFormFunc;
    function buildForm(componentName, schema, parentElement) {
        return buildFormCb(componentName, schema, parentElement);
    }
    exports.buildForm = buildForm;
    var ClearingValidator = (function () {
        function ClearingValidator() {
            this.message = "";
        }
        /**
         * Get the validation error named name.
         */
        ClearingValidator.prototype.getValidationError = function (name) {
            return undefined;
        };
        /**
         * Check to see if a named validation error exists.
         */
        ClearingValidator.prototype.hasValidationError = function (name) {
            return false;
        };
        /**
         * Get all validation errors.
         */
        ClearingValidator.prototype.getValidationErrors = function () {
            return {};
        };
        /**
         * Determine if there are any validation errors.
         */
        ClearingValidator.prototype.hasValidationErrors = function () {
            return true;
        };
        ClearingValidator.prototype.addKey = function (baseName, key) {
            return "";
        };
        ClearingValidator.prototype.addIndex = function (baseName, key, index) {
            return "";
        };
        return ClearingValidator;
    }());
    var sharedClearingValidator = new ClearingValidator();
    /**
     * Get a shared instance of a validator that will clear all data passed in.
     */
    function getSharedClearingValidator() {
        return sharedClearingValidator;
    }
    exports.getSharedClearingValidator = getSharedClearingValidator;
});
///<amd-module name="hr.form"/>
define("hr.form", ["require", "exports", "hr.formhelper"], function (require, exports, formHelper) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * This form decorator will ensure that a schema is loaded before any data is added to the
     * form. You can call setData and setSchema in any order you want, but the data will not
     * be set until the schema is loaded. Just wrap your real IForm in this decorator to get this
     * feature.
     */
    var NeedsSchemaForm = (function () {
        function NeedsSchemaForm(wrapped) {
            this.wrapped = wrapped;
            this.loadedSchema = false;
        }
        NeedsSchemaForm.prototype.setError = function (err) {
            this.wrapped.setError(err);
        };
        NeedsSchemaForm.prototype.clearError = function () {
            this.wrapped.clearError();
        };
        /**
          * Set the data on the form.
          * @param data The data to set.
          */
        NeedsSchemaForm.prototype.setData = function (data) {
            if (this.loadedSchema) {
                this.wrapped.setData(data);
            }
            else {
                this.waitingData = data;
            }
        };
        /**
         * Remove all data from the form.
         */
        NeedsSchemaForm.prototype.clear = function () {
            this.wrapped.clear();
        };
        /**
         * Get the data on the form. If you set a prototype
         * it will be used as the prototype of the returned
         * object.
         */
        NeedsSchemaForm.prototype.getData = function () {
            return this.wrapped.getData();
        };
        /**
         * Set the prototype object to use when getting the
         * form data with getData.
         * @param proto The prototype object.
         */
        NeedsSchemaForm.prototype.setPrototype = function (proto) {
            this.wrapped.setPrototype(proto);
        };
        /**
         * Set the schema for this form. This will add any properties found in the
         * schema that you did not already define on the form. It will match the form
         * property names to the name attribute on the elements. If you had a blank form
         * this would generate the whole thing for you from the schema.
         */
        NeedsSchemaForm.prototype.setSchema = function (schema, componentName) {
            this.wrapped.setSchema(schema, componentName);
            if (this.waitingData !== undefined) {
                this.wrapped.setData(this.waitingData);
                this.waitingData = undefined;
            }
            this.loadedSchema = true;
        };
        return NeedsSchemaForm;
    }());
    exports.NeedsSchemaForm = NeedsSchemaForm;
    var Form = (function () {
        function Form(form) {
            this.form = form;
            this.baseLevel = undefined;
        }
        Form.prototype.setError = function (err) {
            if (this.formValues) {
                this.formValues.setError(err);
            }
        };
        Form.prototype.clearError = function () {
            if (this.formValues) {
                this.formValues.setError(formHelper.getSharedClearingValidator());
            }
        };
        Form.prototype.setData = function (data) {
            formHelper.populate(this.form, data, this.baseLevel);
            if (this.formValues) {
                this.formValues.setData(data, this.formSerializer);
            }
        };
        Form.prototype.clear = function () {
            this.clearError();
            formHelper.populate(this.form, sharedClearer);
            if (this.formValues) {
                this.formValues.setData(sharedClearer, this.formSerializer);
            }
        };
        Form.prototype.getData = function () {
            var data = formHelper.serialize(this.form, this.proto, this.baseLevel);
            if (this.formValues) {
                this.formValues.recoverData(data, this.formSerializer);
            }
            for (var key in data) {
                return data;
            }
            return null; //Return null if the data returned has no keys in it, which means it is empty.
        };
        Form.prototype.setPrototype = function (proto) {
            this.proto = proto;
        };
        Form.prototype.setSchema = function (schema, componentName) {
            if (componentName === undefined) {
                componentName = "hr.defaultform";
            }
            this.clear();
            if (this.formValues) {
                this.formValues.changeSchema(componentName, schema, this.form);
            }
            else {
                this.formValues = formHelper.buildForm(componentName, schema, this.form);
                this.baseLevel = "";
                this.formSerializer = new formHelper.FormSerializer(this.form);
            }
        };
        return Form;
    }());
    var NullForm = (function () {
        function NullForm() {
        }
        NullForm.prototype.setError = function (err) {
        };
        NullForm.prototype.clearError = function () {
        };
        NullForm.prototype.setData = function (data) {
        };
        NullForm.prototype.clear = function () {
        };
        NullForm.prototype.getData = function () {
            return null;
        };
        NullForm.prototype.setPrototype = function (proto) {
        };
        NullForm.prototype.setSchema = function (schema, componentName) {
        };
        return NullForm;
    }());
    /**
     * Create a new form element.
     * @param element
     */
    function build(element) {
        if (formHelper.IsFormElement(element)) {
            return new Form(element);
        }
        return new NullForm();
    }
    exports.build = build;
    function sharedClearer(i) {
        return "";
    }
});
///<amd-module name="hr.components"/>
define("hr.components", ["require", "exports", "hr.typeidentifiers", "hr.domquery"], function (require, exports, typeId, domquery) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var factory = {};
    /**
     * Register a function with the component system.
     * @param name - The name of the component
     * @param createFunc - The function that creates the new component.
     */
    function register(name, createFunc) {
        factory[name] = createFunc;
    }
    exports.register = register;
    function isDefined(name) {
        return factory[name] !== undefined;
    }
    exports.isDefined = isDefined;
    /**
     * Get the default vaule if variant is undefined.
     * @returns variant default value (null)
     */
    function getDefaultVariant(item) {
        return null;
    }
    /**
     * Create a single component.
     */
    function one(name, data, parentComponent, insertBeforeSibling, createdCallback, variantFinder) {
        var variant;
        if (variantFinder === undefined) {
            variantFinder = getDefaultVariant(data);
        }
        else if (typeId.isFunction(variantFinder)) {
            variant = variantFinder(data);
        }
        return doCreateComponent(name, data, parentComponent, insertBeforeSibling, variant, createdCallback);
    }
    exports.one = one;
    /**
     * Create a component for each element in data using that element as the data for the component.
     * @param {string} name - The name of the component to create.
     * @param {HTMLElement} parentComponent - The html element to attach the component to.
     * @param {array|object} data - The data to repeat and bind, must be an array or object with a forEach method to be iterated.
     * If it is a function return the data and then return null to stop iteration.
     * @param {exports.createComponent~callback} createdCallback
     */
    function many(name, data, parentComponent, insertBeforeSibling, createdCallback, variantFinder) {
        if (variantFinder === undefined) {
            variantFinder = getDefaultVariant;
        }
        //Look for an insertion point
        var insertBefore = parentComponent.firstElementChild;
        var variant;
        while (insertBefore != null && !insertBefore.hasAttribute('data-hr-insert')) {
            insertBefore = insertBefore.nextElementSibling;
        }
        var fragmentParent = document.createDocumentFragment();
        //Output
        if (typeId.isArray(data)) {
            //An array, read it as fast as possible
            var arrData = data;
            for (var i = 0; i < arrData.length; ++i) {
                variant = variantFinder(arrData[i]);
                doCreateComponent(name, arrData[i], fragmentParent, null, variant, createdCallback);
            }
        }
        else if (typeId.isForEachable(data)) {
            //Data supports a 'foreach' method, use this to iterate it
            data.forEach(function (item) {
                variant = variantFinder(item);
                doCreateComponent(name, item, fragmentParent, null, variant, createdCallback);
            });
        }
        parentComponent.insertBefore(fragmentParent, insertBefore);
    }
    exports.many = many;
    /**
     * Remove all children from an html element
     */
    function empty(parentComponent) {
        var parent = domquery.first(parentComponent);
        var currentNode = parent.firstChild;
        var nextNode = null;
        //Walk the nodes and remove any non keepers
        while (currentNode != null) {
            nextNode = currentNode.nextSibling;
            if (currentNode.nodeType !== 1 || !(currentNode instanceof HTMLElement && currentNode.hasAttribute('data-hr-keep'))) {
                parent.removeChild(currentNode);
            }
            currentNode = nextNode;
        }
    }
    exports.empty = empty;
    function doCreateComponent(name, data, parentComponent, insertBeforeSibling, variant, createdCallback) {
        parentComponent = domquery.first(parentComponent);
        if (factory.hasOwnProperty(name)) {
            var created = factory[name](data, parentComponent, insertBeforeSibling, variant);
            if (createdCallback !== undefined && createdCallback !== null) {
                createdCallback(created, data);
            }
            return created;
        }
        else {
            console.log("Failed to create component '" + name + "', cannot find factory, did you forget to define it on the page?");
        }
    }
});
///<amd-module name="hr.iterable"/>
define("hr.iterable", ["require", "exports", "tslib", "hr.typeidentifiers"], function (require, exports, tslib_2, typeId) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Query = (function () {
        function Query() {
            this.chain = [];
        }
        /**
         * Push an item, queries are derived backward (lifo).
         */
        Query.prototype.push = function (c) {
            this.chain.push(c);
        };
        /**
         * Derive the query lifo order from how they were pushed.
         */
        Query.prototype.derive = function (item) {
            var result = item;
            for (var i = this.chain.length - 1; i >= 0 && result !== undefined; --i) {
                result = this.chain[i](result);
            }
            return result;
        };
        return Query;
    }());
    var defaultQuery = new Query(); //Empty query to use as default
    var IterateResult = (function () {
        function IterateResult(done, value) {
            this.done = done;
            this.value = value;
        }
        return IterateResult;
    }());
    function _iterate(items, query) {
        var i;
        if (typeId.isArray(items)) {
            i = 0;
            return {
                next: function () {
                    var result = undefined;
                    while (result === undefined && i < items.length) {
                        var item = items[i++];
                        result = query.derive(item);
                    }
                    if (result === undefined) {
                        return new IterateResult(true);
                    }
                    else {
                        return new IterateResult(false, result);
                    }
                }
            };
        }
        else if (typeId.isFunction(items)) {
            return {
                next: function () {
                    var result = undefined;
                    while (result === undefined) {
                        var item = items();
                        if (item !== undefined) {
                            result = query.derive(item);
                        }
                        else {
                            break;
                        }
                    }
                    if (result === undefined) {
                        return new IterateResult(true);
                    }
                    else {
                        return new IterateResult(false, result);
                    }
                }
            };
        }
    }
    function _forEach(items, query, cb) {
        var i;
        if (typeId.isArray(items)) {
            for (i = 0; i < items.length; ++i) {
                var item = items[i];
                var transformed = query.derive(item);
                if (transformed !== undefined) {
                    cb(transformed);
                }
            }
        }
        else if (typeId.isFunction(items)) {
            var item = items();
            while (item !== undefined) {
                item = query.derive(item);
                cb(item);
                item = items();
            }
        }
    }
    var IteratorBase = (function () {
        function IteratorBase() {
        }
        IteratorBase.prototype.select = function (s) {
            return new Selector(s, this);
        };
        IteratorBase.prototype.where = function (w) {
            return new Conditional(w, this);
        };
        IteratorBase.prototype.forEach = function (cb) {
            this.build(new Query()).forEach(cb);
        };
        IteratorBase.prototype.iterator = function () {
            return this.build(new Query()).iterator();
        };
        return IteratorBase;
    }());
    var Selector = (function (_super) {
        tslib_2.__extends(Selector, _super);
        function Selector(selectCb, previous) {
            var _this = _super.call(this) || this;
            _this.selectCb = selectCb;
            _this.previous = previous;
            return _this;
        }
        Selector.prototype.build = function (query) {
            var _this = this;
            query.push(function (i) { return _this.selectCb(i); });
            return this.previous.build(query);
        };
        return Selector;
    }(IteratorBase));
    var Conditional = (function (_super) {
        tslib_2.__extends(Conditional, _super);
        function Conditional(whereCb, previous) {
            var _this = _super.call(this) || this;
            _this.whereCb = whereCb;
            _this.previous = previous;
            return _this;
        }
        Conditional.prototype.build = function (query) {
            var _this = this;
            query.push(function (i) { return _this.get(i); });
            return this.previous.build(query);
        };
        Conditional.prototype.get = function (item) {
            if (this.whereCb(item)) {
                return item;
            }
        };
        return Conditional;
    }(IteratorBase));
    var Iterable = (function (_super) {
        tslib_2.__extends(Iterable, _super);
        function Iterable(items) {
            var _this = _super.call(this) || this;
            _this.items = items;
            return _this;
        }
        Iterable.prototype.build = function (query) {
            return new BuiltQuery(this.items, query);
        };
        return Iterable;
    }(IteratorBase));
    exports.Iterable = Iterable;
    var BuiltQuery = (function () {
        function BuiltQuery(items, query) {
            this.items = items;
            this.query = query;
        }
        BuiltQuery.prototype.forEach = function (cb) {
            _forEach(this.items, this.query, cb);
        };
        BuiltQuery.prototype.iterator = function () {
            return _iterate(this.items, this.query);
        };
        return BuiltQuery;
    }());
});
///<amd-module name="hr.view"/>
define("hr.view", ["require", "exports", "hr.textstream", "hr.components", "hr.typeidentifiers", "hr.domquery"], function (require, exports, hr_textstream_1, components, typeId, domQuery) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ComponentView = (function () {
        function ComponentView(element, component) {
            this.element = element;
            this.component = component;
        }
        ComponentView.prototype.setData = function (data, createdCallback, variantFinderCallback) {
            components.empty(this.element);
            this.insertData(data, null, createdCallback, variantFinderCallback);
        };
        ComponentView.prototype.appendData = function (data, createdCallback, variantFinderCallback) {
            this.insertData(data, null, createdCallback, variantFinderCallback);
        };
        ComponentView.prototype.insertData = function (data, insertBeforeSibling, createdCallback, variantFinderCallback) {
            if (typeId.isArray(data) || typeId.isForEachable(data)) {
                components.many(this.component, data, this.element, insertBeforeSibling, createdCallback, variantFinderCallback);
            }
            else if (data !== undefined && data !== null) {
                components.one(this.component, data, this.element, insertBeforeSibling, createdCallback, variantFinderCallback);
            }
        };
        ComponentView.prototype.clear = function () {
            components.empty(this.element);
        };
        return ComponentView;
    }());
    var TextNodeView = (function () {
        function TextNodeView(element) {
            this.element = element;
            this.dataTextElements = undefined;
        }
        TextNodeView.prototype.setData = function (data) {
            this.dataTextElements = bindData(data, this.element, this.dataTextElements);
        };
        TextNodeView.prototype.appendData = function (data) {
            this.dataTextElements = bindData(data, this.element, this.dataTextElements);
        };
        TextNodeView.prototype.insertData = function (data) {
            this.dataTextElements = bindData(data, this.element, this.dataTextElements);
        };
        TextNodeView.prototype.clear = function () {
            this.dataTextElements = bindData(sharedClearer, this.element, this.dataTextElements);
        };
        return TextNodeView;
    }());
    var NullView = (function () {
        function NullView() {
        }
        NullView.prototype.setData = function () {
        };
        NullView.prototype.appendData = function () {
        };
        NullView.prototype.insertData = function () {
        };
        NullView.prototype.clear = function () {
        };
        return NullView;
    }());
    function IsHTMLElement(element) {
        //Just check a couple functions, no need to go overboard, only comparing to node anyway
        return element && element.nodeType == 1;
    }
    function build(element) {
        if (IsHTMLElement(element)) {
            var component;
            if (element.hasAttribute('data-hr-view-component')) {
                component = element.getAttribute('data-hr-view-component');
            }
            else if (element.hasAttribute('data-hr-model-component')) {
                component = element.getAttribute('data-hr-model-component');
            }
            if (component) {
                return new ComponentView(element, component);
            }
            else {
                return new TextNodeView(element);
            }
        }
        return new NullView();
    }
    exports.build = build;
    function bindData(data, element, dataTextElements) {
        //No found elements, iterate everything.
        if (dataTextElements === undefined) {
            dataTextElements = [];
            domQuery.iterateNodes(element, NodeFilter.SHOW_TEXT, function (node) {
                var textStream = new hr_textstream_1.TextStream(node.textContent);
                if (textStream.foundVariable()) {
                    node.textContent = textStream.format(data);
                    dataTextElements.push({
                        node: node,
                        stream: textStream
                    });
                }
            });
        }
        else {
            for (var i = 0; i < dataTextElements.length; ++i) {
                var node = dataTextElements[i];
                node.node.textContent = node.stream.format(data);
            }
        }
        return dataTextElements;
    }
    function sharedClearer(i) {
        return "";
    }
});
///<amd-module name="hr.models"/>
define("hr.models", ["require", "exports", "hr.form", "hr.view"], function (require, exports, forms, views) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function build(element) {
        var src = element.getAttribute('data-hr-model-src');
        if (element.nodeName === 'FORM' || element.nodeName == 'INPUT' || element.nodeName == 'TEXTAREA') {
            var shim = forms.build(element);
            shim.appendData = function (data) {
                shim.setData(data);
            };
            shim.getSrc = function () {
                return src;
            };
            return shim;
        }
        else {
            var shim2 = views.build(element);
            shim2.getData = function () {
                return {};
            };
            shim2.getSrc = function () {
                return src;
            };
            return shim2;
        }
    }
    exports.build = build;
    var NullModel = (function () {
        function NullModel() {
        }
        NullModel.prototype.setData = function (data) {
        };
        NullModel.prototype.appendData = function (data) {
        };
        NullModel.prototype.clear = function () {
        };
        NullModel.prototype.getData = function () {
            return {};
        };
        NullModel.prototype.getSrc = function () {
            return "";
        };
        NullModel.prototype.setPrototype = function (proto) { };
        return NullModel;
    }());
    exports.NullModel = NullModel;
    /**
     * This class is a model that enforces its type.
     */
    var StrongTypedModel = (function () {
        function StrongTypedModel(childModel, strongConstructor) {
            this.childModel = childModel;
            this.strongConstructor = strongConstructor;
        }
        StrongTypedModel.prototype.setData = function (data) {
            this.childModel.setData(data);
        };
        StrongTypedModel.prototype.appendData = function (data) {
            this.childModel.appendData(data);
        };
        StrongTypedModel.prototype.clear = function () {
            this.childModel.clear();
        };
        StrongTypedModel.prototype.getData = function () {
            return new this.strongConstructor(this.childModel.getData());
        };
        StrongTypedModel.prototype.getSrc = function () {
            return this.childModel.getSrc();
        };
        StrongTypedModel.prototype.setPrototype = function (proto) {
            this.childModel.setPrototype(proto);
        };
        return StrongTypedModel;
    }());
    exports.StrongTypedModel = StrongTypedModel;
});
///<amd-module name="hr.bindingcollection"/>
define("hr.bindingcollection", ["require", "exports", "hr.domquery", "hr.toggles", "hr.models", "hr.form", "hr.view"], function (require, exports, domQuery, toggles, models, form, view) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function EventRunner(name, listener) {
        this.execute = function (evt) {
            var cb = listener[name];
            if (cb) {
                cb.call(listener, evt);
            }
        };
    }
    function bindEvents(elements, listener) {
        for (var eIx = 0; eIx < elements.length; ++eIx) {
            var element = elements[eIx];
            domQuery.iterateNodes(element, NodeFilter.SHOW_ELEMENT, function (node) {
                //Look for attribute
                for (var i = 0; i < node.attributes.length; i++) {
                    var attribute = node.attributes[i];
                    if (attribute.name.startsWith('data-hr-on-')) {
                        var eventFunc = attribute.value;
                        if (listener[eventFunc]) {
                            var runner = new EventRunner(eventFunc, listener);
                            node.addEventListener(attribute.name.substr(11), runner.execute);
                        }
                    }
                }
            });
        }
    }
    function getToggle(name, elements, typedToggle) {
        var states = typedToggle.getPossibleStates();
        var toggleArray = [];
        var query = '[data-hr-toggle=' + name + ']';
        var startState = null;
        //Find all the toggles in the collection with the given name
        for (var eIx = 0; eIx < elements.length; ++eIx) {
            var element = elements[eIx];
            var toggleElements = domQuery.all(query, element);
            for (var i = 0; i < toggleElements.length; ++i) {
                toggleArray.push(toggles.build(toggleElements[i], states));
                startState = startState ? startState : toggles.getStartState(toggleElements[i]);
            }
        }
        if (toggleArray.length === 0) {
            //Nothing, null toggle
            typedToggle.setStates(toggles.build(null, states));
        }
        else if (toggleArray.length === 1) {
            //One thing, use toggle state directly
            typedToggle.setStates(toggleArray[0]);
        }
        else {
            //Multiple things, create a multi state and use that
            typedToggle.setStates(new toggles.MultiToggleStates(toggleArray));
        }
        if (startState != null) {
            typedToggle.applyState(startState);
        }
    }
    function getModel(name, elements) {
        var model;
        var query = '[data-hr-model=' + name + ']';
        for (var eIx = 0; eIx < elements.length; ++eIx) {
            var element = elements[eIx];
            var targetElement = domQuery.first(query, element);
            if (targetElement) {
                model = models.build(targetElement);
                return model; //Found it, need to break element loop, done here if found
            }
            else {
                model = null;
            }
        }
        if (model === null) {
            model = (new models.NullModel());
        }
        return model;
    }
    function getHandle(name, elements) {
        var model;
        var query = '[data-hr-handle=' + name + ']';
        for (var eIx = 0; eIx < elements.length; ++eIx) {
            var element = elements[eIx];
            var targetElement = domQuery.first(query, element);
            if (targetElement && targetElement instanceof HTMLElement) {
                return targetElement;
            }
        }
        return null;
    }
    function getConfig(elements) {
        var data = {};
        for (var eIx = 0; eIx < elements.length; ++eIx) {
            var element = elements[eIx];
            domQuery.iterateNodes(element, NodeFilter.SHOW_ELEMENT, function (node) {
                //Look for attribute
                for (var i = 0; i < node.attributes.length; i++) {
                    var attribute = node.attributes[i];
                    if (attribute.name.startsWith('data-hr-config-')) {
                        data[attribute.name.substr(15)] = attribute.value;
                    }
                }
            });
        }
        return data;
    }
    function iterateControllers(name, elements, cb) {
        for (var eIx = 0; eIx < elements.length; ++eIx) {
            var element = elements[eIx];
            domQuery.iterate('[data-hr-controller="' + name + '"]', element, cb);
        }
    }
    var PooledBindings = (function () {
        function PooledBindings(docFrag, parent) {
            this.docFrag = docFrag;
            this.parent = parent;
        }
        PooledBindings.prototype.restore = function (insertBefore) {
            this.parent.insertBefore(this.docFrag, insertBefore);
        };
        return PooledBindings;
    }());
    exports.PooledBindings = PooledBindings;
    /**
     * The BindingCollection class allows you to get access to the HtmlElements defined on your
     * page with objects that help manipulate them. You won't get the elements directly and you
     * should not need to, using the interfaces should be enough.
     */
    var BindingCollection = (function () {
        function BindingCollection(elements) {
            this.elements = domQuery.all(elements);
        }
        /**
         * Set the listener for this binding collection. This listener will have its functions
         * fired when a matching event is fired.
         * @param {type} listener
         */
        BindingCollection.prototype.setListener = function (listener) {
            bindEvents(this.elements, listener);
        };
        /**
         * Get a named toggle, this will always be an on off toggle.
         */
        BindingCollection.prototype.getToggle = function (name) {
            var toggle = new toggles.OnOffToggle();
            getToggle(name, this.elements, toggle);
            return toggle;
        };
        /**
         * Get a named toggle, this will use the passed in custom toggle instance. Using this you can define
         * states other than on and off.
         */
        BindingCollection.prototype.getCustomToggle = function (name, toggle) {
            getToggle(name, this.elements, toggle);
            return toggle;
        };
        /**
         * @deprecated
         * THIS IS DEPRECATED use getForm and getView instead.
         * Get a named model. Can also provide a StrongTypeConstructor that will be called with new to create
         * the instance of the data pulled from the model. If you don't provide this the objects will be plain
         * javascript objects.
         */
        BindingCollection.prototype.getModel = function (name, strongConstructor) {
            var model = getModel(name, this.elements);
            if (strongConstructor !== undefined) {
                model = new models.StrongTypedModel(model, strongConstructor);
            }
            return model;
        };
        /**
         * Get the config for this binding collection.
         */
        BindingCollection.prototype.getConfig = function () {
            return getConfig(this.elements);
        };
        /**
         * Get a handle element. These are direct references to html elements for passing to third party libraries
         * that need them. Don't use these directly if you can help it.
         */
        BindingCollection.prototype.getHandle = function (name) {
            return getHandle(name, this.elements);
        };
        /**
         * Iterate over all the controllers in the BindingCollection.
         */
        BindingCollection.prototype.iterateControllers = function (name, cb) {
            iterateControllers(name, this.elements, cb);
        };
        /**
         * Get a named form, will return a valid IForm object no matter what, but that object
         * might not actually be a rea form on the document if name does not exist.
         * @param name The name of the form to lookup.
         */
        BindingCollection.prototype.getForm = function (name) {
            var query = '[data-hr-form=' + name + ']';
            var targetElement = this.findElement(query);
            //Backward compatibility with model
            if (targetElement === null) {
                query = '[data-hr-model=' + name + ']';
                targetElement = this.findElement(query);
            }
            return form.build(targetElement);
        };
        /**
         * Get a named view, will return a valid IView object no matter what, but that object
         * might not actually be a real view on the document if name does not exist.
         * @param name The name of the view to lookup
         */
        BindingCollection.prototype.getView = function (name) {
            var query = '[data-hr-view=' + name + ']';
            var targetElement = this.findElement(query);
            //Backward compatibility with model
            if (targetElement === null) {
                query = '[data-hr-model=' + name + ']';
                targetElement = this.findElement(query);
            }
            return view.build(targetElement);
        };
        BindingCollection.prototype.findElement = function (query) {
            for (var eIx = 0; eIx < this.elements.length; ++eIx) {
                var element = this.elements[eIx];
                var targetElement = domQuery.first(query, element);
                if (targetElement) {
                    //Found it, return now
                    return targetElement;
                }
            }
            return null; //Not found, return null
        };
        Object.defineProperty(BindingCollection.prototype, "rootElement", {
            /**
             * Return the "root" html element for this binding collection. If there is more
             * than one element, the first one will be returned and null will be returned if
             * there is no root element. Ideally you would not use this directly, but it is
             * useful to insert nodes before a set of bound elements.
             */
            get: function () {
                return this.elements.length > 0 ? this.elements[0] : null;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Remove all contained elements from the document. Be sure to use this to
         * remove the collection so all elements are properly removed.
         */
        BindingCollection.prototype.remove = function () {
            for (var eIx = 0; eIx < this.elements.length; ++eIx) {
                this.elements[eIx].remove();
            }
        };
        /**
         * Pool the elements into a document fragment. Will return a pooled bindings
         * class that can be used to restore the pooled elements to the document.
         */
        BindingCollection.prototype.pool = function () {
            var parent = this.elements[0].parentElement;
            var docFrag = document.createDocumentFragment();
            for (var eIx = 0; eIx < this.elements.length; ++eIx) {
                docFrag.appendChild(this.elements[eIx]);
            }
            return new PooledBindings(docFrag, parent);
        };
        return BindingCollection;
    }());
    exports.BindingCollection = BindingCollection;
    ;
});
///<amd-module name="hr.ignored"/>
define("hr.ignored", ["require", "exports", "hr.domquery"], function (require, exports, domQuery) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //This module defines html nodes that are ignored and a way to check to see if a node is ignored or the
    //child of an ignored node. Ignored nodes are defined with the data-hr-ignored attribute.
    var ignoredNodes = domQuery.all('[data-hr-ignored]');
    function isIgnored(node) {
        for (var i = 0; i < ignoredNodes.length; ++i) {
            if (ignoredNodes[i].contains(node)) {
                return true;
            }
        }
        return false;
    }
    exports.isIgnored = isIgnored;
});
///<amd-module name="hr.di"/>
define("hr.di", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function IsInjectableConstructor(test) {
        return test["InjectorArgs"] !== undefined;
    }
    var DiIdProperty = "__diId";
    var Scopes;
    (function (Scopes) {
        Scopes[Scopes["Singleton"] = 0] = "Singleton";
        Scopes[Scopes["Transient"] = 1] = "Transient";
    })(Scopes || (Scopes = {}));
    /**
     * A collection of services for injection into other classes.
     * Currently this can only accept non generic typescript classes to inject.
     * It works by creating a hierarchy of service collections, which can then have scopes
     * created with additional servics defined if needed. Servics can be shared or transient.
     * If they are shared a single instance will be created when requested and stored at the
     * level in the instance resolver that it was defined on. If any child scopes attempt to
     * create a shared service they will get the shared instance. Note that this is not quite a
     * singleton because you can have multiple service stacks. Transient services are not shared
     * and a new instance will be created each time an instance is requested.
     * @returns
     */
    var ServiceCollection = (function () {
        function ServiceCollection() {
            this.resolvers = {};
        }
        /**
         * Add a shared service to the collection, shared services are created the first time they are requested
         * and persist across child scopes.
         * @param {function} typeHandle The constructor function for the type that represents this injected object.
         * @param {ResolverFunction<T>} resolver The resolver function for the object, can return promises.
         * @returns
         */
        ServiceCollection.prototype.addShared = function (typeHandle, resolver) {
            if (IsInjectableConstructor(resolver)) {
                return this.add(typeHandle, Scopes.Singleton, this.createConstructorResolver(resolver));
            }
            else {
                return this.add(typeHandle, Scopes.Singleton, resolver);
            }
        };
        /**
         * Add a shared service to the collection if it does not exist in the collection already. Note that the ServiceCollections do not
         * have parents or any concept of parents, so services added this way to a ServiceCollection that is a child of another service
         * collection will override the service in the child collection as if you added it with add, since it has no way to check parents
         * for the existance of a service.
         * @param {DiFunction<T>} typeHandle
         * @param {InjectableConstructor<T> | T} resolver
         * @returns
         */
        ServiceCollection.prototype.tryAddShared = function (typeHandle, resolver) {
            if (!this.hasTypeHandle(typeHandle)) {
                this.addShared(typeHandle, resolver);
            }
            return this;
        };
        /**
         * Add a transient service to the collection, transient services are created each time they are asked for.
         * @param {function} typeHandle The constructor function for the type that represents this injected object.
         * @param {ResolverFunction<T>} resolver The resolver function for the object, can return promises.
         * @returns
         */
        ServiceCollection.prototype.addTransient = function (typeHandle, resolver) {
            if (IsInjectableConstructor(resolver)) {
                return this.add(typeHandle, Scopes.Transient, this.createConstructorResolver(resolver));
            }
            else {
                return this.add(typeHandle, Scopes.Transient, resolver);
            }
        };
        /**
         * Add a transient service to the collection if it does not exist in the collection already. Note that the ServiceCollections do not
         * have parents or any concept of parents, so services added this way to a ServiceCollection that is a child of another service
         * collection will override the service in the child collection as if you added it with add, since it has no way to check parents
         * for the existance of a service.
         * @param {DiFunction<T>} typeHandle
         * @param {InjectableConstructor<T> | T} resolver
         * @returns
         */
        ServiceCollection.prototype.tryAddTransient = function (typeHandle, resolver) {
            if (!this.hasTypeHandle(typeHandle)) {
                this.addTransient(typeHandle, resolver);
            }
            return this;
        };
        /**
         * Add an existing object instance as a singleton to this injector. Existing instances can only be added
         * as singletons.
         * @param {function} typeHandle The constructor function for the type that represents this injected object.
         * @param {ResolverFunction<T>} resolver The resolver function for the object, can return promises.
         * @returns
         */
        ServiceCollection.prototype.addSharedInstance = function (typeHandle, instance) {
            return this.add(typeHandle, Scopes.Singleton, function (s) { return instance; });
        };
        /**
         * Add a singleton service to the collection if it does not exist in the collection already. Note that the ServiceCollections do not
         * have parents or any concept of parents, so services added this way to a ServiceCollection that is a child of another service
         * collection will override the service in the child collection as if you added it with add, since it has no way to check parents
         * for the existance of a service.
         * @param {DiFunction<T>} typeHandle
         * @param {InjectableConstructor<T> | T} resolver
         * @returns
         */
        ServiceCollection.prototype.tryAddSharedInstance = function (typeHandle, instance) {
            if (!this.hasTypeHandle(typeHandle)) {
                this.addSharedInstance(typeHandle, instance);
            }
            return this;
        };
        /**
         * Add a service to this service collection.
         * @param {function} typeHandle The constructor function for the type that represents this injected object.
         * @param {ResolverFunction<T>} resolver The resolver function for the object, can return promises.
         */
        ServiceCollection.prototype.add = function (typeHandle, scope, resolver) {
            if (!typeHandle.prototype.hasOwnProperty(DiIdProperty)) {
                typeHandle.prototype[DiIdProperty] = ServiceCollection.idIndex++;
            }
            this.resolvers[typeHandle.prototype[DiIdProperty]] = {
                resolver: resolver,
                scope: scope
            };
            return this;
        };
        /**
         * Determine if this service collection already has a resolver for the given type handle.
         * @param {DiFunction<T>} typeHandle The type handle to lookup
         * @returns True if there is a resolver, and false if there is not.
         */
        ServiceCollection.prototype.hasTypeHandle = function (typeHandle) {
            if (typeHandle.prototype.hasOwnProperty(DiIdProperty)) {
                var typeId = typeHandle.prototype[DiIdProperty];
                return this.resolvers[typeId] !== undefined;
            }
            return false;
        };
        /**
         * Helper function to create a resolver that constructs objects from constructor functions, it will di
         * the arguments to the function.
         * @param {InjectableConstructor} resolver
         * @returns
         */
        ServiceCollection.prototype.createConstructorResolver = function (constructor) {
            return function (s) {
                var argTypes = constructor.InjectorArgs;
                var args = [];
                for (var i = 0; i < argTypes.length; ++i) {
                    args[i] = s.getRequiredService(argTypes[i]);
                }
                var controllerObj = Object.create(constructor.prototype);
                constructor.apply(controllerObj, args);
                return controllerObj;
            };
        };
        /**
         * Resolve a service, note that every time this is called the service will be instantiated,
         * the scopes will hold the instances. Don't call this directly, but instead use the scopes
         * created by calling createScope.
         * @param {function} typeHandle
         * @param {Scope} scope
         * @internal
         * @returns
         */
        ServiceCollection.prototype.__resolveService = function (typeHandle, scope) {
            var id = typeHandle.prototype[DiIdProperty];
            if (this.resolvers[id] !== undefined) {
                //Instantiate service, have scope handle instances
                var info = this.resolvers[id];
                var instance = info.resolver(scope);
                return {
                    instance: instance,
                    scope: info.scope
                };
            }
            return undefined;
        };
        /**
         * Create a scope to hold instantiated variables.
         * @returns The new scope.
         */
        ServiceCollection.prototype.createScope = function () {
            return new Scope(this);
        };
        ServiceCollection.idIndex = 0;
        return ServiceCollection;
    }());
    exports.ServiceCollection = ServiceCollection;
    /**
     * A scope for dependency injection.
     * @param {ServiceCollection} services
     * @param {Scope} parentScope?
     * @returns
     */
    var Scope = (function () {
        function Scope(services, parentScope) {
            this.singletons = {};
            this.services = services;
            this.parentScope = parentScope;
        }
        /**
         * Get a service defined by the given constructor function.
         * @param {function} typeHandle
         * @returns
         */
        Scope.prototype.getService = function (typeHandle) {
            var typeId = typeHandle.prototype[DiIdProperty];
            var instance = this.findInstance(typeHandle);
            //If the service is not found, resolve from our service collection
            if (instance === undefined) {
                var result = this.resolveService(typeHandle, this);
                //Add scoped results to the scope instances if one was returned
                if (result !== undefined) {
                    instance = result.instance;
                }
            }
            return instance;
        };
        /**
         * Get a service defined by the given constructor function. If the service does not exist an error is thrown.
         * @param {function} typeHandle
         * @returns
         */
        Scope.prototype.getRequiredService = function (typeHandle) {
            var instance = this.getService(typeHandle);
            if (instance === undefined) {
                var funcNameRegex = /^function\s+([\w\$]+)\s*\(/;
                var typeResult = funcNameRegex.exec(typeHandle.prototype.constructor.toString());
                var typeName = typeResult ? typeResult[1] : "anonymous";
                throw new Error("Cannot find required service for function " + typeName + ". Did you forget to inject it?");
            }
            return instance;
        };
        /**
         * Create a child scope that shares service definitions and singleton instances.
         * @returns
         */
        Scope.prototype.createChildScope = function (serviceCollection) {
            if (serviceCollection === undefined) {
                serviceCollection = new ServiceCollection();
            }
            return new Scope(serviceCollection, this);
        };
        /**
         * Helper funciton to find existing instances, will look for shared instances at the current level
         * and then walk up the tree looking for shared instances if there is no match. If nothing is found
         * a new instance is created.
         * @param {DiFunction<T>} typeHandle
         * @returns
         */
        Scope.prototype.findInstance = function (typeHandle) {
            var typeId = typeHandle.prototype[DiIdProperty];
            var instance = this.bubbleFindSingletonInstance(typeHandle);
            return instance;
        };
        /**
         * Walk up the tree looking for singletons, if one is found return it otherwise undefined is returned.
         * @param {DiFunction<T>} typeHandle
         * @returns
         */
        Scope.prototype.bubbleFindSingletonInstance = function (typeHandle) {
            var typeId = typeHandle.prototype[DiIdProperty];
            var instance = this.singletons[typeId];
            if (instance === undefined && this.parentScope !== undefined) {
                instance = this.parentScope.bubbleFindSingletonInstance(typeHandle);
            }
            return instance;
        };
        /**
         * Helper to resolve services, only looks at the service collection, walks entire tree to create a service.
         * @param {DiFunction<T>} typeHandle
         * @returns
         */
        Scope.prototype.resolveService = function (typeHandle, scope) {
            var result = this.services.__resolveService(typeHandle, scope);
            if (result === undefined) {
                //Cannot find service at this level, search parent services.
                if (this.parentScope) {
                    result = this.parentScope.resolveService(typeHandle, scope);
                }
            }
            else if (result.scope === Scopes.Singleton) {
                //If we found an instance and its a singleton, add it to this scope's list of singletons.
                //Do it here so its stored on the level that resolved it.
                var typeId = typeHandle.prototype[DiIdProperty];
                this.singletons[typeId] = result.instance;
            }
            return result;
        };
        return Scope;
    }());
    exports.Scope = Scope;
});
///<amd-module name="hr.controller"/>
define("hr.controller", ["require", "exports", "hr.bindingcollection", "hr.bindingcollection", "hr.toggles", "hr.domquery", "hr.ignored", "hr.eventdispatcher", "hr.di", "hr.di"], function (require, exports, hr_bindingcollection_1, hr_bindingcollection_2, hr_toggles_1, domQuery, ignoredNodes, hr_eventdispatcher_1, di, hr_di_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BindingCollection = hr_bindingcollection_2.BindingCollection;
    exports.OnOffToggle = hr_toggles_1.OnOffToggle;
    exports.TypedToggle = hr_toggles_1.TypedToggle;
    exports.ServiceCollection = hr_di_1.ServiceCollection;
    /**
     * This class provides a way to get a handle to the data provided by the
     * createOnCallback data argument. Return this type from your InjectorArgs
     * where you take the row data argument, and the appropriate data object
     * will be returned. There is only a need for one of these, since controllers
     * can only accept one piece of callback data.
     */
    var InjectControllerData = (function () {
        function InjectControllerData() {
        }
        return InjectControllerData;
    }());
    exports.InjectControllerData = InjectControllerData;
    /**
     * This class builds controllers using dependency injection.
     * Controllers are pretty much normal dependency injected classes, they have no superclass and don't
     * have any constructor requirements, however, you might want to take controller.BindingCollection at a minimum.
     * In addition to this your controller can define a function called postBind that will be called after the
     * controller's constructor and setting the controller as the binding collection listener. This is the best
     * place to create additional neseted controllers without messing up the binding collection.
     *
     * The way to handle a controller is as follows:
     * 1. Create the controller class with any InjectorArgs defined that need to be injected, likely at a minimnum this is controller.BindingCollection
     * 2. Implement the constructor for the controller taking in arguments for everything you need injected.
     *    In the controller read anything you will need out of the BindingCollection, do not store it for later or read it later, it will change as the page
     *    changes, so if you have nested controllers they can potentially end up seeing each others elements.
     * 3. Implement protected postBind() to do any work that should happen after bindings are complete. This will fire after the constructor has run and after
     *    the new controller instance has bound its functions to the dom. Ideally this method is protected so subclasses can call it but nothing else in typescript
     *    can see it.
     */
    var InjectedControllerBuilder = (function () {
        /**
         * Create a new ControllerBuilder, can reference a parent controller by passing it.
         * @param controllerConstructor
         * @param scope The scope to use for dependency injection into the controller
         */
        function InjectedControllerBuilder(scope) {
            this.controllerCreatedEvent = new hr_eventdispatcher_1.ActionEventDispatcher();
            this.serviceCollection = new di.ServiceCollection();
            if (scope) {
                this.baseScope = scope.createChildScope(this.serviceCollection);
            }
            else {
                this.baseScope = new di.Scope(this.serviceCollection);
            }
        }
        Object.defineProperty(InjectedControllerBuilder.prototype, "Services", {
            /**
             * Get the service collection to define services for this builder. Don't create scopes with this
             * use createUnbound if you need to make an instance of something in the service collection, this
             * will prevent your scopes from getting messed up.
             */
            get: function () {
                return this.serviceCollection;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(InjectedControllerBuilder.prototype, "controllerCreated", {
            /**
             * This event is fired when this builder creates a controller.
             */
            get: function () {
                return this.controllerCreatedEvent.modifier;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Create a child builder from this controller builder, this allows you to add
         * shared instances to the child that will not be present in the parent.
         */
        InjectedControllerBuilder.prototype.createChildBuilder = function () {
            return new InjectedControllerBuilder(this.baseScope.createChildScope(new di.ServiceCollection()));
        };
        /**
         * Create a new controller instance on the named nodes in the document.
         * @param name The name of the data-hr-controller nodes to lookup.
         * @param controllerConstructor The controller to create when a node is found.
         * @param parentBindings The parent bindings to restrict the controller search.
         */
        InjectedControllerBuilder.prototype.create = function (name, controllerConstructor, parentBindings) {
            var _this = this;
            var createdControllers = [];
            var foundElement = function (element) {
                if (!ignoredNodes.isIgnored(element)) {
                    var services = new di.ServiceCollection();
                    var scope = _this.baseScope.createChildScope(services);
                    var bindings = new hr_bindingcollection_1.BindingCollection(element);
                    services.addTransient(hr_bindingcollection_1.BindingCollection, function (s) { return bindings; });
                    element.removeAttribute('data-hr-controller');
                    var controller = _this.createController(controllerConstructor, services, scope, bindings);
                    createdControllers.push(controller);
                }
            };
            if (parentBindings) {
                parentBindings.iterateControllers(name, foundElement);
            }
            else {
                domQuery.iterate('[data-hr-controller="' + name + '"]', null, foundElement);
            }
            return createdControllers;
        };
        /**
         * This will create a single instance of the service that resolves to constructorFunc
         * without looking for html elements, it will not have a binding collection.
         * This can be used to create any kind of object, not just controllers. Do this for anything
         * you want to use from the service scope for this controller.
         */
        InjectedControllerBuilder.prototype.createUnbound = function (constructorFunc) {
            var services = new di.ServiceCollection();
            var scope = this.baseScope.createChildScope(services);
            services.addTransient(InjectedControllerBuilder, function (s) { return new InjectedControllerBuilder(scope); });
            var controller = scope.getRequiredService(constructorFunc);
            if (controller.postBind !== undefined) {
                controller.postBind();
            }
            this.controllerCreatedEvent.fire(controller);
            return controller;
        };
        /**
         * This will create a callback function that will create a new controller when it is called.
         * @returns
         */
        InjectedControllerBuilder.prototype.createOnCallback = function (controllerConstructor) {
            var _this = this;
            return function (bindings, data) {
                var services = new di.ServiceCollection();
                var scope = _this.baseScope.createChildScope(services);
                services.addTransient(hr_bindingcollection_1.BindingCollection, function (s) { return bindings; });
                //If some data was provided, use it as our InjectControllerData service
                //for the newly created scope.
                if (data !== undefined) {
                    services.addTransient(InjectControllerData, function (s) { return data; });
                }
                return _this.createController(controllerConstructor, services, scope, bindings);
            };
        };
        InjectedControllerBuilder.prototype.createController = function (controllerConstructor, services, scope, bindings) {
            services.addTransient(InjectedControllerBuilder, function (s) { return new InjectedControllerBuilder(scope); });
            var controller = scope.getRequiredService(controllerConstructor);
            bindings.setListener(controller);
            if (controller.postBind !== undefined) {
                controller.postBind();
            }
            this.controllerCreatedEvent.fire(controller);
            return controller;
        };
        return InjectedControllerBuilder;
    }());
    exports.InjectedControllerBuilder = InjectedControllerBuilder;
});
/// This line gives our module a predictable name
///<amd-module name="form-demo"/>
define("form-demo", ["require", "exports", "hr.controller"], function (require, exports, controller) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FakeErrors = (function () {
        function FakeErrors() {
            this.message = "OMG Something is wrong!";
            this.errors = {
                first: "You call that a first name?",
                middle: "You call that a middle name?",
                address: "You call that an address?",
                enumTest: "Not a valid value.",
                multiChoice: "Not a valid multi choice.",
                "complexArray[0].First": "You must include a first name",
                "complexArray[1].Middle": "You must include a middle name"
            };
        }
        /**
         * Get the validation error named name.
         */
        FakeErrors.prototype.getValidationError = function (name) {
            return this.errors[name];
        };
        /**
         * Check to see if a named validation error exists.
         */
        FakeErrors.prototype.hasValidationError = function (name) {
            //console.log("Checked for " + name); //Helps with debugging.
            return this.getValidationError(name) !== undefined;
        };
        /**
         * Get all validation errors.
         */
        FakeErrors.prototype.getValidationErrors = function () {
            return this.errors;
        };
        /**
         * Determine if there are any validation errors.
         */
        FakeErrors.prototype.hasValidationErrors = function () {
            return true;
        };
        FakeErrors.prototype.addKey = function (baseName, key) {
            if (baseName !== "") {
                //Make key 1st letter uppercase to match error from server
                return baseName + "." + key[0].toUpperCase() + key.substr(1);
            }
            return key;
        };
        FakeErrors.prototype.addIndex = function (baseName, key, index) {
            return baseName + key + '[' + index + ']';
            ;
        };
        return FakeErrors;
    }());
    var FormDemoController = (function () {
        function FormDemoController(bindings) {
            this.form = bindings.getForm("form");
            this.form.setSchema(createTestSchema());
        }
        Object.defineProperty(FormDemoController, "InjectorArgs", {
            get: function () {
                return [controller.BindingCollection];
            },
            enumerable: true,
            configurable: true
        });
        FormDemoController.prototype.submit = function (evt) {
            evt.preventDefault();
            var data = this.form.getData();
            console.log(JSON.stringify(data));
        };
        FormDemoController.prototype.setData1 = function (evt) {
            evt.preventDefault();
            this.form.setData(this.createData());
        };
        FormDemoController.prototype.setData2 = function (evt) {
            evt.preventDefault();
            var data = this.createData();
            data.stringArray = null;
            this.form.setData(data);
        };
        FormDemoController.prototype.showErrors = function (evt) {
            evt.preventDefault();
            this.form.setError(new FakeErrors());
        };
        FormDemoController.prototype.clearErrors = function (evt) {
            evt.preventDefault();
            this.form.clearError();
        };
        FormDemoController.prototype.clear = function (evt) {
            evt.preventDefault();
            this.form.clear();
        };
        FormDemoController.prototype.setSchema1 = function (evt) {
            evt.preventDefault();
            this.form.setSchema(createTestSchema());
        };
        FormDemoController.prototype.setSchema2 = function (evt) {
            evt.preventDefault();
            var schema = createTestSchema();
            var props = schema.properties;
            delete props.middle;
            delete props.address;
            delete props.city;
            delete props.state;
            delete props.zipcode;
            this.form.setSchema(schema);
        };
        FormDemoController.prototype.setSchema3 = function (evt) {
            evt.preventDefault();
            var schema = createTestSchema();
            var props = schema.properties;
            delete props.complexArray;
            delete props.stringArray;
            delete props.middle;
            delete props.address;
            delete props.city;
            delete props.state;
            delete props.zipcode;
            this.form.setSchema(schema);
        };
        FormDemoController.prototype.createData = function () {
            return {
                first: "Test First",
                middle: "Test Middle",
                last: "Test Last",
                comboTest: "two",
                multiChoice: [2],
                stringArray: ["first", "second", "thrid", "fourth"],
                complexArray: [{
                        first: "first 1",
                        middle: "middle 1",
                        last: "last 1"
                    },
                    {
                        first: "first 2",
                        middle: "middle 2",
                        last: "last 2"
                    }]
            };
        };
        return FormDemoController;
    }());
    var builder = new controller.InjectedControllerBuilder();
    builder.Services.addTransient(FormDemoController, FormDemoController);
    builder.create("formDemo", FormDemoController);
    function createTestSchema() {
        return {
            "title": "Title of Input",
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "first": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 18
                },
                "middle": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 21
                },
                "last": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 24
                },
                "stringArray": {
                    "type": ["array", "null"],
                    "items": { "type": "string" },
                    "x-ui-order": 1,
                },
                "complexArray": {
                    "type": ["array", "null"],
                    "items": { "type": "object",
                        "properties": {
                            "first": {
                                "type": [
                                    "null",
                                    "string"
                                ],
                                "x-ui-order": 18
                            },
                            "middle": {
                                "type": [
                                    "null",
                                    "string"
                                ],
                                "x-ui-order": 21
                            },
                            "last": {
                                "type": [
                                    "null",
                                    "string"
                                ],
                                "x-ui-order": 24
                            }
                        }
                    },
                    "x-ui-order": 2,
                },
                "multiChoice": {
                    "title": "Multi Choice",
                    "type": [
                        "array",
                        "null"
                    ],
                    "items": {
                        "type": "integer",
                        "format": "int32"
                    },
                    "x-ui-type": "select",
                    "x-ui-order": 1,
                    "x-values": [
                        {
                            "label": "Choice 1",
                            "value": 1
                        },
                        {
                            "label": "Choice 2",
                            "value": 2
                        }
                    ]
                },
                "checktest": {
                    "type": [
                        "boolean"
                    ],
                    "x-ui-order": 24
                },
                "comboTest": {
                    "title": "Site",
                    "type": "integer",
                    "format": "int32",
                    "x-ui-order": 27,
                    "x-values": [
                        {
                            "label": "Choice 1",
                            "value": "one"
                        },
                        {
                            "label": "Choice 2",
                            "value": "two"
                        }
                    ]
                },
                "enumTest": {
                    "type": "string",
                    "description": "",
                    "x-enumNames": [
                        "Name 1",
                        "Name 2",
                        "Name 3"
                    ],
                    "enum": [
                        "Name1",
                        "Name2",
                        "Name3"
                    ],
                    "x-ui-order": 38
                },
                "dateTest": {
                    "type": "date",
                    "format": "date-time",
                    "x-ui-order": 50
                },
                "address": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 53
                },
                "city": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 56
                },
                "state": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 59
                },
                "zipcode": {
                    "type": [
                        "null",
                        "string"
                    ],
                    "x-ui-order": 62
                }
            },
            "x-is-array": false
        };
    }
});
/// This line gives our module a predictable name
///<amd-module name="hello-world-demo"/>
define("hello-world-demo", ["require", "exports", "hr.controller"], function (require, exports, controller) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //Define a class to hold our controller, no base class, these are pojos.
    var HelloWorldController = (function () {
        function HelloWorldController(bindings) {
            //Extract the view from the binding collection.
            this.view = bindings.getView("hello");
            //Set the data on the view.
            this.view.setData({
                message: "World"
            });
        }
        Object.defineProperty(HelloWorldController, "InjectorArgs", {
            //This is the arguments for the dependency injector, you return the constructor
            //functions for the types you want to inject into the constructor.
            //The return items here and the arguments to the constructor must match.
            get: function () {
                return [controller.BindingCollection];
            },
            enumerable: true,
            configurable: true
        });
        return HelloWorldController;
    }());
    //Create a controller builder.
    var builder = new controller.InjectedControllerBuilder();
    //Add our new class to the dependency injector as a transient (create every time) instance.
    builder.Services.addTransient(HelloWorldController, HelloWorldController);
    //Finally create an instance of the controller for each apperance of a 
    //data-hr-controller attribute on an element with the value "helloWorldDemo"
    builder.create("helloWorldDemo", HelloWorldController);
});
///<amd-module name="simple-form-input-demo"/>
define("simple-form-input-demo", ["require", "exports", "hr.controller"], function (require, exports, controller) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FormDemoController = (function () {
        function FormDemoController(bindings) {
            //Get the form for the input
            this.input = bindings.getForm("input");
            //Get the view
            this.output = bindings.getView("output");
        }
        Object.defineProperty(FormDemoController, "InjectorArgs", {
            get: function () {
                return [controller.BindingCollection];
            },
            enumerable: true,
            configurable: true
        });
        //This function will be bound to the event labeled data-hr-event-submit="outputInfo"
        //It should be written as if you were adding it to addEventListener.
        FormDemoController.prototype.outputInfo = function (evt) {
            evt.preventDefault();
            var data = this.input.getData();
            this.output.setData(data);
        };
        return FormDemoController;
    }());
    var builder = new controller.InjectedControllerBuilder();
    builder.Services.addTransient(FormDemoController, FormDemoController);
    builder.create("inputDemo", FormDemoController);
});
///<amd-module name="todo-demo"/>
define("todo-demo", ["require", "exports", "hr.controller"], function (require, exports, controller) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TodoDemoController = (function () {
        function TodoDemoController(bindings, builder) {
            this.builder = builder;
            this.todoItems = [];
            this.addModel = bindings.getForm('add');
            this.itemsModel = bindings.getView('items');
            this.itemsModel.clear();
        }
        Object.defineProperty(TodoDemoController, "InjectorArgs", {
            get: function () {
                return [controller.BindingCollection, controller.InjectedControllerBuilder];
            },
            enumerable: true,
            configurable: true
        });
        TodoDemoController.prototype.findItemVariant = function (item) {
            if (item.important === "on") {
                return "important";
            }
        };
        TodoDemoController.prototype.addItem = function (evt) {
            var _this = this;
            evt.preventDefault();
            var item = this.addModel.getData();
            this.itemsModel.appendData(item, this.builder.createOnCallback(TodoItemController), function (item) { return _this.findItemVariant(item); });
            this.todoItems.push(item);
            this.addModel.clear();
        };
        TodoDemoController.prototype.removeItem = function (item) {
            var index = this.todoItems.indexOf(item);
            if (index != -1) {
                this.todoItems.splice(index, 1);
                this.rebuildList();
            }
        };
        TodoDemoController.prototype.rebuildList = function () {
            var _this = this;
            this.itemsModel.setData(this.todoItems, this.builder.createOnCallback(TodoItemController), function (item) { return _this.findItemVariant(item); });
        };
        return TodoDemoController;
    }());
    var TodoItemController = (function () {
        function TodoItemController(bindings, todoDemoController, itemData) {
            this.todoDemoController = todoDemoController;
            this.itemData = itemData;
        }
        Object.defineProperty(TodoItemController, "InjectorArgs", {
            get: function () {
                return [controller.BindingCollection,
                    TodoDemoController,
                    //This last line is a special placeholder injector that injects whatever the controller has bound as its "data" this can vary from the type used in the constructor itself
                    controller.InjectControllerData];
            },
            enumerable: true,
            configurable: true
        });
        TodoItemController.prototype.edit = function (evt) {
            evt.preventDefault();
            //This is a silly way to edit, but trying to keep it short.
            this.itemData.text = window.prompt("Edit Todo Item", this.itemData.text);
            this.todoDemoController.rebuildList();
        };
        TodoItemController.prototype.deleteItem = function (evt) {
            evt.preventDefault();
            //Silly to use confirm, but done for size
            if (window.confirm("Do you want to delete " + this.itemData.text + "?")) {
                this.todoDemoController.removeItem(this.itemData);
            }
        };
        return TodoItemController;
    }());
    var builder = new controller.InjectedControllerBuilder();
    //Inject the TodoDemoController as a shared instance so all the TodoItemController instances can see the same one.
    builder.Services.addShared(TodoDemoController, TodoDemoController);
    //Inject the TodoItemController as a transient instance since we want a new one for each row.
    builder.Services.addTransient(TodoItemController, TodoItemController);
    builder.create("todo", TodoDemoController);
});
///<amd-module name="toggle-demo"/>
define("toggle-demo", ["require", "exports", "hr.controller"], function (require, exports, controller) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ToggleDemoController = (function () {
        function ToggleDemoController(bindings) {
            this.on = false;
            this.toggle = bindings.getToggle('color');
        }
        Object.defineProperty(ToggleDemoController, "InjectorArgs", {
            get: function () {
                return [controller.BindingCollection];
            },
            enumerable: true,
            configurable: true
        });
        ToggleDemoController.prototype.toggleColors = function (evt) {
            this.on = !this.on;
            if (this.on) {
                this.toggle.on();
            }
            else {
                this.toggle.off();
            }
        };
        return ToggleDemoController;
    }());
    var builder = new controller.InjectedControllerBuilder();
    builder.Services.addTransient(ToggleDemoController, ToggleDemoController);
    builder.create("toggleDemo", ToggleDemoController);
});
//# sourceMappingURL=demos.js.map