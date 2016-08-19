"use strict";

var jsns = (function () {
    var loaded = {};
    var unloaded = {};
    var runners = [];

    function isModuleLoaded(name) {
        return loaded[name] !== undefined;
    }

    function isModuleLoadable(name) {
        return unloaded[name] !== undefined;
    }

    function loadModule(name){
        var loaded = checkLib(unloaded[name]);
        if (loaded) {
            delete unloaded[name];
        }
        return loaded;
    }

    function Module() {
        this.exports = {};
    }

    function checkLib(library) {
        var dependencies = library.dependencies;
        var fullyLoaded = true;

        //Check to see if depenedencies are loaded and if they aren't and can be, load them
        for (var i = 0; i < dependencies.length; ++i) {
            var dep = dependencies[i];
            dep.loaded = isModuleLoaded(dep.name);
            if (!dep.loaded && isModuleLoadable(dep.name)) {
                dep.loaded = loadModule(dep.name);
            }
            fullyLoaded = fullyLoaded && dep.loaded;
        }

        //If all dependencies are loaded, load this library
        if (fullyLoaded) {
            var module = new Module();
            if (library.name) {
                loaded[library.name] = module;
            }
            var args = [module.exports, module];

            //Inject dependency arguments
            for (var i = 0; i < dependencies.length; ++i) {
                var dep = dependencies[i];
                args.push(loaded[dep.name].exports);
            }

            library.factory.apply(module, args);
        }

        return fullyLoaded;
    }

    function Library(name, depNames, factory) {
        this.name = name;
        this.factory = factory;
        this.dependencies = [];

        if (depNames) {
            for (var i = 0; i < depNames.length; ++i) {
                var depName = depNames[i];
                this.dependencies.push({
                    name: depName,
                    loaded: isModuleLoaded(depName)
                });
            }
        }
    }

    function loadRunners() {
        for (var i = 0; i < runners.length; ++i) {
            var runner = runners[i];
            if (checkLib(runner)) {
                runners.splice(i--, 1);
            }
        }
    }

    return {
        run: function (dependencies, factory) {
            runners.push(new Library(null, dependencies, factory));
            loadRunners();
        },

        define: function (name, dependencies, factory) {
            unloaded[name] = new Library(name, dependencies, factory);
            loadRunners();
        },

        debug: function () {
            if (runners.length > 0) {
                for (var i = 0; i < runners.length; ++i) {
                    var runner = runners[i];
                    console.log("Runner waiting " + runner);
                    for (var j = 0; j < runner.dependencies.length; ++j) {
                        var dependency = runner.dependencies[j];
                        if (!isModuleLoaded(dependency.name)) {
                            console.log("  dependency " + dependency.name);
                        }
                    }
                }
            }
            else {
                console.log("No runners remaining.");
            }
        }
    }
})();
(function () {
    //Startswith polyfill
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (searchString, position) {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
        };
    }

    //Polyfill for matches
    //https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
    if (!Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function (s) {
                var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                    i = matches.length;
                while (--i >= 0 && matches.item(i) !== this) { }
                return i > -1;
            };
    }

    //Polyfill for promise
    //https://raw.githubusercontent.com/taylorhakes/promise-polyfill/master/promise.js
    function promiseFill(root) {

        // Store setTimeout reference so promise-polyfill will be unaffected by
        // other code modifying setTimeout (like sinon.useFakeTimers())
        var setTimeoutFunc = setTimeout;

        function noop() { }

        // Polyfill for Function.prototype.bind
        function bind(fn, thisArg) {
            return function () {
                fn.apply(thisArg, arguments);
            };
        }

        function Promise(fn) {
            if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
            if (typeof fn !== 'function') throw new TypeError('not a function');
            this._state = 0;
            this._handled = false;
            this._value = undefined;
            this._deferreds = [];

            doResolve(fn, this);
        }

        function handle(self, deferred) {
            while (self._state === 3) {
                self = self._value;
            }
            if (self._state === 0) {
                self._deferreds.push(deferred);
                return;
            }
            self._handled = true;
            Promise._immediateFn(function () {
                var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
                if (cb === null) {
                    (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
                    return;
                }
                var ret;
                try {
                    ret = cb(self._value);
                } catch (e) {
                    reject(deferred.promise, e);
                    return;
                }
                resolve(deferred.promise, ret);
            });
        }

        function resolve(self, newValue) {
            try {
                // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
                if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
                if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                    var then = newValue.then;
                    if (newValue instanceof Promise) {
                        self._state = 3;
                        self._value = newValue;
                        finale(self);
                        return;
                    } else if (typeof then === 'function') {
                        doResolve(bind(then, newValue), self);
                        return;
                    }
                }
                self._state = 1;
                self._value = newValue;
                finale(self);
            } catch (e) {
                reject(self, e);
            }
        }

        function reject(self, newValue) {
            self._state = 2;
            self._value = newValue;
            finale(self);
        }

        function finale(self) {
            if (self._state === 2 && self._deferreds.length === 0) {
                Promise._immediateFn(function () {
                    if (!self._handled) {
                        Promise._unhandledRejectionFn(self._value);
                    }
                });
            }

            for (var i = 0, len = self._deferreds.length; i < len; i++) {
                handle(self, self._deferreds[i]);
            }
            self._deferreds = null;
        }

        function Handler(onFulfilled, onRejected, promise) {
            this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
            this.onRejected = typeof onRejected === 'function' ? onRejected : null;
            this.promise = promise;
        }

        /**
         * Take a potentially misbehaving resolver function and make sure
         * onFulfilled and onRejected are only called once.
         *
         * Makes no guarantees about asynchrony.
         */
        function doResolve(fn, self) {
            var done = false;
            try {
                fn(function (value) {
                    if (done) return;
                    done = true;
                    resolve(self, value);
                }, function (reason) {
                    if (done) return;
                    done = true;
                    reject(self, reason);
                });
            } catch (ex) {
                if (done) return;
                done = true;
                reject(self, ex);
            }
        }

        Promise.prototype['catch'] = function (onRejected) {
            return this.then(null, onRejected);
        };

        Promise.prototype.then = function (onFulfilled, onRejected) {
            var prom = new (this.constructor)(noop);

            handle(this, new Handler(onFulfilled, onRejected, prom));
            return prom;
        };

        Promise.all = function (arr) {
            var args = Array.prototype.slice.call(arr);

            return new Promise(function (resolve, reject) {
                if (args.length === 0) return resolve([]);
                var remaining = args.length;

                function res(i, val) {
                    try {
                        if (val && (typeof val === 'object' || typeof val === 'function')) {
                            var then = val.then;
                            if (typeof then === 'function') {
                                then.call(val, function (val) {
                                    res(i, val);
                                }, reject);
                                return;
                            }
                        }
                        args[i] = val;
                        if (--remaining === 0) {
                            resolve(args);
                        }
                    } catch (ex) {
                        reject(ex);
                    }
                }

                for (var i = 0; i < args.length; i++) {
                    res(i, args[i]);
                }
            });
        };

        Promise.resolve = function (value) {
            if (value && typeof value === 'object' && value.constructor === Promise) {
                return value;
            }

            return new Promise(function (resolve) {
                resolve(value);
            });
        };

        Promise.reject = function (value) {
            return new Promise(function (resolve, reject) {
                reject(value);
            });
        };

        Promise.race = function (values) {
            return new Promise(function (resolve, reject) {
                for (var i = 0, len = values.length; i < len; i++) {
                    values[i].then(resolve, reject);
                }
            });
        };

        // Use polyfill for setImmediate for performance gains
        Promise._immediateFn = (typeof setImmediate === 'function' && function (fn) { setImmediate(fn); }) ||
          function (fn) {
              setTimeoutFunc(fn, 0);
          };

        Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
            if (typeof console !== 'undefined' && console) {
                console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
            }
        };

        /**
         * Set the immediate function to execute callbacks
         * @param fn {function} Function to execute
         * @deprecated
         */
        Promise._setImmediateFn = function _setImmediateFn(fn) {
            Promise._immediateFn = fn;
        };

        /**
         * Change the function to execute on unhandled rejection
         * @param {function} fn Function to execute on unhandled rejection
         * @deprecated
         */
        Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
            Promise._unhandledRejectionFn = fn;
        };

        root.Promise = Promise;

    };

    if (typeof (window.Promise) === 'undefined') {
        promiseFill(window);
    }
})();
"use strict";

/**
 * @callback hr_bindingcollection_eventcallback
 */

/**
 * @callback hr_iter
 * @param {array} items - the items to iterate
 * @param {hr_iter_cb} - the function to transform each object
 * @returns the transformed item and null when all items are iterated
 */

/**
 * @typedef {object} hr_bindingcollection
 */

jsns.define("hr.bindingcollection", [
    "hr.escape",
    "hr.typeidentifiers",
    "hr.domquery",
    "hr.textstream",
    "hr.toggles",
    "hr.models"
],
function (exports, module, escape, typeId, domQuery, TextStream, toggles, models) {
    function EventRunner(name, listener) {
        this.execute = function (evt) {
            var cb = listener[name];
            if (cb) {
                cb.call(this, evt);
            }
        }
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

    function getToggle(name, elements, states, toggleCollection) {
        var toggle = toggleCollection[name];
        if (toggle === undefined) {
            var query = '[data-hr-toggle=' + name + ']';
            for (var eIx = 0; eIx < elements.length; ++eIx) {
                var element = elements[eIx];
                var toggleElement = domQuery.first(query, element);
                if (toggleElement) {
                    toggle = toggles.build(toggleElement, states);
                    toggleCollection[name] = toggle;
                    return toggle; //Found it, need to break element loop, done here if found
                }
                else {
                    toggle = null;
                }
            }
        }

        if (toggle === null) {
            toggle = toggles.build(null, states);
        }

        return toggle;
    }

    function getModel(name, elements, modelCollection) {
        var model = modelCollection[name];
        if (model === undefined) {
            var query = '[data-hr-model=' + name + ']';
            for (var eIx = 0; eIx < elements.length; ++eIx) {
                var element = elements[eIx];
                var targetElement = domQuery.first(query, element);
                if (targetElement) {
                    model = models.build(targetElement);
                    modelCollection[name] = model;
                    return model; //Found it, need to break element loop, done here if found
                }
                else {
                    model = null;
                }
            }
        }

        if (model === null) {
            model = new models.NullModel();
        }

        return model;
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
            domQuery.iterate('[data-hr-controller="' + name + '"]', element, function (cntrlElement) {
                cb(cntrlElement);
            });
        }
    }

    /**
     * 
     * @param {HtmlElement} elements
     */
    function BindingCollection(elements) {
        elements = domQuery.all(elements);
        var dataTextElements = undefined;
        var toggleCollection = undefined;
        var modelCollection = undefined;

        /**
         * Set the listener for this binding collection. This listener will have its functions
         * fired when a matching event is fired.
         * @param {type} listener
         */
        this.setListener = function (listener) {
            bindEvents(elements, listener);
        }

        /**
         * Set the data for this binding collection. Will run a format text on all text nodes
         * inside the collection. These nodes must have variables in them.
         * @param {type} data
         */
        this.setData = function (data) {
            dataTextElements = bindData(data, elements, dataTextElements);
        }

        this.getToggle = function (name, states) {
            if (toggleCollection === undefined) {
                toggleCollection = {};
            }
            return getToggle(name, elements, states, toggleCollection);
        }

        this.getModel = function (name) {
            if (modelCollection === undefined) {
                modelCollection = {};
            }
            return getModel(name, elements, modelCollection);
        }

        this.getConfig = function () {
            return getConfig(elements);
        }

        this.iterateControllers = function (name, cb) {
            iterateControllers(name, elements, cb);
        }
    };

    module.exports = BindingCollection;
});
"use strict";

//Auto find components on the page and build them as components
jsns.run([
    "hr.domquery",
    "hr.bindingcollection",
    "hr.textstream",
    "hr.components",
    "hr.ignored",
    "hr.iterable"
],
function (exports, module, domquery, BindingCollection, TextStream, components, ignoredNodes, Iterable) {
    var browserSupportsTemplates = 'content' in document.createElement('template');
    var anonTemplateIndex = 0;

    //Component creation function
    function createItem(data, componentStringStream, parentComponent, insertBeforeSibling) {
        var itemMarkup = componentStringStream.format(data);
        var newItems = str2DOMElement(itemMarkup);
        var arrayedItems = [];

        for (var i = 0; i < newItems.length; ++i) {
            var newItem = newItems[i];
            parentComponent.insertBefore(newItem, insertBeforeSibling);
            arrayedItems.push(newItem);
        }

        return new BindingCollection(arrayedItems);
    }

    function VariantBuilder(componentString) {
        var tokenizedString;
        var currentBuildFunc = tokenize;

        function tokenize(data, parentComponent, insertBeforeSibling) {
            tokenizedString = new TextStream(componentString);
            currentBuildFunc = build;
            return build(data, parentComponent, insertBeforeSibling);
        }

        function build(data, parentComponent, insertBeforeSibling) {
            return createItem(data, tokenizedString, parentComponent, insertBeforeSibling);
        }

        function create(data, parentComponent, insertBeforeSibling) {
            return currentBuildFunc(data, parentComponent, insertBeforeSibling);
        }
        this.create = create;
    }

    function ComponentBuilder(componentString) {
        var variants = {};
        var tokenizedString;
        var currentBuildFunc = tokenize;

        function tokenize(data, parentComponent, insertBeforeSibling) {
            tokenizedString = new TextStream(componentString);
            currentBuildFunc = build;
            return build(data, parentComponent, insertBeforeSibling);
        }

        function build(data, parentComponent, insertBeforeSibling) {
            return createItem(data, tokenizedString, parentComponent, insertBeforeSibling);
        }

        function create(data, parentComponent, insertBeforeSibling, variant) {
            if (variant !== null && variants.hasOwnProperty(variant)) {
                return variants[variant].create(data, parentComponent, insertBeforeSibling);
            }
            return currentBuildFunc(data, parentComponent, insertBeforeSibling);
        }
        this.create = create;

        function addVariant(name, variantBuilder) {
            variants[name] = variantBuilder;
        }
        this.addVariant = addVariant;
    }

    var extractedBuilders = {};

    var templateElements = new Iterable(Array.prototype.slice.call(document.getElementsByTagName("TEMPLATE"))).iterator();
    var currentTemplate = templateElements.next();
    while (!currentTemplate.done) {
        var currentBuilder = extractTemplate(currentTemplate.value, currentBuilder);
        //The iterator is incremented below where the comment says INC HERE
    }

    //Extract templates off the page
    function extractTemplate(element, currentBuilder) {
        //INC HERE - This is where currentTemplate is incremented to its next value
        //This single iter is shared for all levels of the gatherer
        currentTemplate = templateElements.next();

        //Check to see if this is an ignored element, and quickly exit if it is
        if (ignoredNodes.isIgnored(element)) {
            return currentBuilder;
        }

        //If the browser supports templates, need to create one to read it properly
        var templateElement = element;
        if (browserSupportsTemplates) {
            var templateElement = document.createElement('div');
            templateElement.appendChild(document.importNode(element.content, true));
        }

        //Look for nested child templates, do this before taking inner html so children are removed
        while (!currentTemplate.done && element.contains(currentTemplate.value)) {
            var currentBuilder = extractTemplate(currentTemplate.value, currentBuilder);
        }

        var componentString = templateElement.innerHTML.trim();

        //Special case for tables in ie, cannot create templates without a surrounding table element, this will eliminate that unless requested otherwise
        if (templateElement.childElementCount === 1 && templateElement.firstElementChild.tagName === 'TABLE' && !element.hasAttribute('data-hr-keep-table'))
        {
            var tableElement = templateElement.firstElementChild;
            if (tableElement.childElementCount > 0 && tableElement.firstElementChild.tagName === 'TBODY') {
                componentString = tableElement.firstElementChild.innerHTML.trim();
            }
            else {
                componentString = tableElement.innerHTML.trim();
            }
        }

        var elementParent = element.parentNode;
        elementParent.removeChild(element);

        var variantName = element.getAttribute("data-hr-variant");
        var componentName = element.getAttribute("data-hr-component");
        if (variantName === null) {
            //Check to see if this is an anonymous template, if so adjust the parent element and
            //name the template
            if (componentName === null) {
                componentName = 'AnonTemplate_' + anonTemplateIndex++;
                elementParent.setAttribute("data-hr-model-component", componentName);
            }

            var builder = new ComponentBuilder(componentString);
            extractedBuilders[componentName] = builder;
            components.register(componentName, builder.create);
            return builder;
        }
        else {
            if (componentName === null) {
                if (currentBuilder !== undefined) {
                    currentBuilder.addVariant(variantName, new VariantBuilder(componentString));
                }
                else {
                    console.log('Attempted to create a variant named "' + variantName + '" with no default component in the chain. Please start your template element chain with a data-hr-component or a anonymous template. This template has been ignored.');
                }
            }
            else {
                extractedBuilders[componentName].addVariant(variantName, new VariantBuilder(componentString));
            }
            return currentBuilder;
        }
    }

    //Actual creation function
    var str2DOMElement = function (html) {
        //From j Query and the discussion on http://krasimirtsonev.com/blog/article/Revealing-the-magic-how-to-properly-convert-HTML-string-to-a-DOM-element
        //Modified, does not support body tags and returns collections of children

        var wrapMap = {
            option: [1, "<select multiple='multiple'>", "</select>"],
            legend: [1, "<fieldset>", "</fieldset>"],
            area: [1, "<map>", "</map>"],
            param: [1, "<object>", "</object>"],
            thead: [1, "<table>", "</table>"],
            tr: [2, "<table><tbody>", "</tbody></table>"],
            col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
            td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
            body: [0, "", ""],
            _default: [1, "<div>", "</div>"]
        };
        wrapMap.optgroup = wrapMap.option;
        wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
        wrapMap.th = wrapMap.td;
        var match = /<\s*\w.*?>/g.exec(html);
        var element = document.createElement('div');
        if (match != null) {
            var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0];
            var map = wrapMap[tag] || wrapMap._default, element;
            html = map[1] + html + map[2];
            element.innerHTML = html;
            // Descend through wrappers to the right content
            var j = map[0];
            while (j--) {
                element = element.lastChild;
            }
        } else {
            element.innerHTML = html;
        }

        return element.childNodes;
    }
});
"use strict";

//Components is a bit trickier, we want part of it to run right away
//First define the module
jsns.define("hr.components", [
    "hr.typeidentifiers",
    "hr.domquery"
],
function (exports, module, typeId, domquery) {
    var factory = {};

    /**
     * This callback is called when a component is created
     * @callback exports.createComponent~callback
     * @param {exports.component.BindingCollection} created
     * @param {object} data
     */

    /**
     * This callback is called when a component is about to be created and we want its variant.
     * @callback exports.createComponent~callback
     * @param {object} data - The data to identify a variant for.
     * @return {string} the name of the variant to use or null to use the original.
     */

    /**
     * This callback is used to create components when they are requested.
     * @callback exports.registerComponent~callback
     * @param {exports.component.BindingCollection} created
     * @param {object} data
     * @returns {exports.component.BindingCollection} 
     */

    /**
     * Register a function with the component system.
     * @param {string} name - The name of the component
     * @param {exports.registerComponent~callback} createFunc - The function that creates the new component.
     */
    function register(name, createFunc) {
        factory[name] = createFunc;
    }
    exports.register = register;

    /**
     * Get the default vaule if variant is undefined.
     * @returns variant default value (null)
     */
    function getDefaultVariant() {
        return null;
    }

    /**
     * Create a new component specified by name with the data in data attached to parentComponent. You can also
     * get a callback whenever a component is created by passing a createdCallback.
     * @param {string} name - The name of the component to create.
     * @param {object} data - The data to bind to the component.
     * @param {HTMLElement} parentComponent - The html element to attach the component to.
     * @param {exports.createComponent~callback} createdCallback - The callback called when the component is created.
     * @returns {exports.component.BindingCollection} 
     */
    function single(name, parentComponent, data, createdCallback, variant) {
        if (variant === undefined) {
            variant = getDefaultVariant();
        }
        else if (typeId.isFunction(variant)) {
            variant = variant(data);
        }
        return doCreateComponent(name, data, parentComponent, null, variant, createdCallback);
    }
    exports.single = single;

    /**
     * Create a component for each element in data using that element as the data for the component.
     * @param {string} name - The name of the component to create.
     * @param {HTMLElement} parentComponent - The html element to attach the component to.
     * @param {array|object} data - The data to repeat and bind, must be an array or object with a forEach method to be iterated.
     * If it is a function return the data and then return null to stop iteration.
     * @param {exports.createComponent~callback} createdCallback
     */
    function repeat(name, parentComponent, data, createdCallback, variantFinderCallback) {
        if (variantFinderCallback === undefined) {
            variantFinderCallback = getDefaultVariant;
        }
        //Look for an insertion point
        var insertBefore = null;
        var insertBefore = parentComponent.firstElementChild;
        var variant;
        while (insertBefore != null && !insertBefore.hasAttribute('data-hr-insert')) {
            insertBefore = insertBefore.nextElementSibling;
        }

        var fragmentParent = document.createDocumentFragment();

        //Output
        if (typeId.isArray(data)) {
            //An array, read it as fast as possible
            for (var i = 0; i < data.length; ++i) {
                variant = variantFinderCallback(data[i]);
                doCreateComponent(name, data[i], fragmentParent, null, variant, createdCallback);
            }
        }
        else if (typeId.isForEachable(data)) {
            //Data supports a 'foreach' method, use this to iterate it
            data.forEach(function (item) {
                variant = variantFinderCallback(item);
                doCreateComponent(name, item, fragmentParent, null, variant, createdCallback);
            })
        }

        parentComponent.insertBefore(fragmentParent, insertBefore);
    }
    exports.repeat = repeat;

    /**
     * Remove all children from an html element.
     * @param {HTMLElement} parentComponent - The component to remove all children from
     */
    function empty(parentComponent) {
        parentComponent = domquery.first(parentComponent);
        var currentNode = parentComponent.firstChild;
        var nextNode = null;

        //Walk the nodes and remove any non keepers
        while (currentNode != null) {
            nextNode = currentNode.nextSibling;
            if (currentNode.nodeType !== 1 || !currentNode.hasAttribute('data-hr-keep')) {
                parentComponent.removeChild(currentNode);
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
            console.log("Failed to create component '" + name + "', cannot find factory, did you forget to define it on the page?")
        }
    }
});
"use strict";

jsns.define("hr.controller", [
    "hr.bindingcollection",
    "hr.domquery",
    "hr.ignored",
],
function (exports, module, BindingCollection, domQuery, ignoredNodes) {
    /**
     * Create controller instances for all controllers named name using the given controllerConstructor function.
     * The created controllers will automatically be assigned as a listener to the bindings. This way the object
     * you create with your constructor funciton can define the main functions for the controller.
     * @param {type} name
     * @param {type} controllerConstructor
     */
    function create(name, controllerConstructor, context, parentBindings) {
        function foundElement(element) {
            if (!ignoredNodes.isIgnored(element)) {
                var bindings = new BindingCollection(element);
                var controller = new controllerConstructor(bindings, context, null);
                bindings.setListener(controller);
                element.removeAttribute('data-hr-controller');
            }
        }

        if (parentBindings) {
            parentBindings.iterateControllers(name, foundElement);
        }
        else {
            domQuery.iterate('[data-hr-controller="' + name + '"]', null, foundElement);
        }
    }

    exports.create = create;

    /**
     * This function will return a function that will create a controller when called with a BindingCollection inside.
     * This can be used in the callbacks for setData in model and when creating components.
     * @param {type} controllerConstructor
     */
    function createOnCallback(controllerConstructor, context) {
        return function (bindings, data) {
            var controller = new controllerConstructor(bindings, context, data);
            bindings.setListener(controller);
        }
    }

    exports.createOnCallback = createOnCallback;
});
"use strict";

jsns.define("hr.domquery", [
    "hr.typeidentifiers"
],
function(exports, module, typeId){
    /**
     * Derive the plain javascript element from a passed element
     * @param {string|HTMLElement} element - the element to detect
     * @returns {HTMLElement} - The located html element.
     */
    function first(element, context) {
        if (typeId.isString(element)) {
            if (context !== undefined) {
                if (this.matches(context, element)) {
                    element = context;
                }
                else {
                    element = context.querySelector(element);
                }
            }
            else {
                element = document.querySelector(element);
            }
        }
        return element;
    };
    exports.first = first;

    /**
     * Query all passed javascript elements
     * @param {string|HTMLElement} element - the element to detect
     * @param {HTMLElement} element - the context to search
     * @returns {array[HTMLElement]} - The results array to append to.
     * @returns {array[HTMLElement]} - The located html element. Will be the results array if one is passed otherwise a new one.
     */
    function all(element, context, results) {
        if (typeId.isString(element)) {
            if (results === undefined) {
                results = [];
            }

            if (context !== undefined) {
                if (this.matches(context, element)) {
                    results.push(context);
                }
                else {
                    nodesToArray(context.querySelectorAll(element), results);
                }
            }
            else {
                nodesToArray(document.querySelectorAll(element), results);
            }
        }
        else if (!typeId.isArray(element)) {
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
    };
    exports.all = all;

    /**
     * Query all passed javascript elements
     * @param {string|HTMLElement} element - the element to detect
     * @param {HTMLElement} element - the context to search
     * @param cb - Called with each htmlelement that is found
     */
    function iterate(element, context, cb) {
        if (typeId.isString(element)) {
            if (context) {
                if (this.matches(context, element)) {
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
        else if (!typeId.isArray(element)) {
            cb(element);
        }
        else {
            for (var i = 0; i < element.length; ++i) {
                cb(element[i]);
            }
        }
    };
    exports.iterate = iterate;

    function alwaysTrue(node) {
        return true;
    }

    /**
     * Iterate a node collection using createNodeIterator. There is no query for this version
     * as it iterates everything and allows you to extract what is needed.
     * @param  element - The root element
     * @param  cb - The function called for each item iterated
     * @param {NodeFilter} whatToShow - see createNodeIterator, defaults to SHOW_ALL
     */
    function iterateNodes(element, whatToShow, cb) {
        var iter = document.createNodeIterator(element, whatToShow, alwaysTrue, false);
        var node;
        while (node = iter.nextNode()) {
            cb(node);
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
"use strict";

jsns.define("hr.escape", null,
function(exports, module){
    /**
     * Escape text to prevent html characters from being output. Helps prevent xss, called automatically
     * by formatText. If you manually write user data consider using this function to escape it, but it is
     * not needed using other HtmlRapier functions like repeat, createComponent or formatText.
     * @param {string} text - the text to escape.
     * @returns {type} - The escaped version of text.
     */
    function escape(text) {
        text = String(text);

        var status =
        {
            textStart: 0,
            bracketStart: 0,
            output: ""
        }
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
    module.exports = escape;

    //Helper function for escaping
    function outputEncoded(i, text, status, replacement) {
        status.bracketStart = i;
        status.output += text.substring(status.textStart, status.bracketStart) + replacement;
        status.textStart = i + 1;
    }
});
"use strict";

jsns.define("hr.eventhandler", null,
function (exports, module) {

    /**
     * This class provides a reusable way to fire events to multiple listeners.
     */
    function EventHandler() {
        var handlers = [];

        function add(context, handler) {
            if (context === undefined) {
                throw "context cannot be undefined";
            }
            if (handler === undefined) {
                throw "handler cannot be undefined";
            }
            handlers.push({
                handler: handler,
                context: context
            });
        }

        function remove(context, handler) {
            for (var i = 0; i < handlers.length; ++i) {
                if (handlers[i].handler === handler && handlers[i].context === context) {
                    handlers.splice(i--, 1);
                }
            }
        }

        this.modifier = {
            add: add,
            remove: remove
        }

        /**
         * Fire the event. The listeners can return values, if they do the values will be added
         * to an array that is returned by this fuction.
         * @returns {array|undefined} an array of all the values returned by the listeners or undefiend if
         * no values are returned.
         */
        function fire() {
            var result;
            var nextResult;
            for (var i = 0; i < handlers.length; ++i) {
                var handlerObj = handlers[i];
                nextResult = handlerObj.handler.apply(handlerObj.context, arguments);
                if (nextResult !== undefined) {
                    if (result === undefined) {
                        result = [];
                    }
                    result.push(nextResult);
                }
            }
            return result;
        }
        this.fire = fire;
    }

    module.exports = EventHandler;
});

jsns.define("hr.lateboundeventhandler", [
    "hr.eventhandler"
],
function (exports, module, HrEventHandler) {

    /**
     * This class will queue up the events that fire through it until
     * an event handler is added, at that point it will function as a normal
     * event handler. Only the first bound event gets the queued events.
     */
    function LateBoundEventHandler() {
        var eventHandler = new HrEventHandler();
        var queuedEvents = [];
        var currentFire = queuedFire;

        function add(context, handler) {
            eventHandler.modifier.add(context, handler);
            if (queuedEvents !== null) {
                currentFire = eventFire;
                for (var i = 0; i < queuedEvents.length; ++i) {
                    fire.apply(this, queuedEvents[i]);
                }
                queuedEvents = null;
            }
        }

        function remove(context, handler) {
            eventHandler.modifier.remove(context, handler);
        }

        this.modifier = {
            add: add,
            remove: remove
        }

        function queuedFire() {
            queuedEvents.push(arguments);
        }

        function eventFire() {
            eventHandler.fire.apply(eventHandler, arguments);
        }

        function fire() {
            return currentFire.apply(this, arguments);
        }
        this.fire = fire;
    }

    module.exports = LateBoundEventHandler;
});

jsns.define("hr.promiseeventhandler", null,
function (exports, module) {

    /**
     * This class provides a reusable way to fire events to multiple listeners and wait for them using
     * promises.
     */
    function PromiseEventHandler() {
        var handlers = [];

        function add(context, handler) {
            if (context === undefined) {
                throw "context cannot be undefined";
            }
            if (handler === undefined) {
                throw "handler cannot be undefined";
            }
            handlers.push({
                handler: handler,
                context: context
            });
        }

        function remove(context, handler) {
            for (var i = 0; i < handlers.length; ++i) {
                if (handlers[i].handler === handler && handlers[i].context === context) {
                    handlers.splice(i--, 1);
                }
            }
        }

        this.modifier = {
            add: add,
            remove: remove
        }

        /**
         * Fire the event. The listeners can return values, if they do the values will be added
         * to an array that is returned by the promise returned by this function.
         * @returns {Promise} a promise that will resolve when all fired events resolve.
         */
        function fire() {
            var result;
            var promises = [];
            for (var i = 0; i < handlers.length; ++i) {
                var handlerObj = handlers[i];
                promises.push(new Promise(function(resovle, reject){
                    resovle(handlerObj.handler.apply(handlerObj.context, arguments));
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
        }
        this.fire = fire;
    }

    module.exports = PromiseEventHandler;
});
"use strict";

jsns.define("hr.form", [
    "hr.domquery",
    "hr.typeidentifiers"
],
function(exports, module, domQuery, typeIds){
    /**
     * Serialze a form to a javascript object
     * @param {HTMLElement|string} form - A selector or form element for the form to serialize.
     * @returns {object} - The object that represents the form contents as an object.
     */
    function serialize(form) {
        //This is from https://code.google.com/archive/p/form-serialize/downloads
        //Modified to return an object instead of a query string
        form = domQuery.first(form);

        if (!form || form.nodeName !== "FORM") {
            return;
        }
        var i, j, q = {};
        for (i = form.elements.length - 1; i >= 0; i = i - 1) {
            if (form.elements[i].name === "") {
                continue;
            }
            switch (form.elements[i].nodeName) {
                case 'INPUT':
                    switch (form.elements[i].type) {
                        case 'text':
                        case 'hidden':
                        case 'password':
                        case 'button':
                        case 'reset':
                        case 'submit':
                        case 'file':
                            q[form.elements[i].name] = form.elements[i].value;
                            break;
                        case 'checkbox':
                        case 'radio':
                            if (form.elements[i].checked) {
                                q[form.elements[i].name] = form.elements[i].value;
                            }
                            break;
                    }
                    break;
                case 'TEXTAREA':
                    q[form.elements[i].name] = form.elements[i].value;
                    break;
                case 'SELECT':
                    switch (form.elements[i].type) {
                        case 'select-one':
                            q[form.elements[i].name] = form.elements[i].value;
                            break;
                        case 'select-multiple':
                            for (j = form.elements[i].options.length - 1; j >= 0; j = j - 1) {
                                if (form.elements[i].options[j].selected) {
                                    q[form.elements[i].name] = form.elements[i].options[j].value;
                                }
                            }
                            break;
                    }
                    break;
                case 'BUTTON':
                    switch (form.elements[i].type) {
                        case 'reset':
                        case 'submit':
                        case 'button':
                            q[form.elements[i].name] = form.elements[i].value;
                            break;
                    }
                    break;
            }
        }
        return q;
    }
    exports.serialize = serialize;

    /**
     * Populate a form with data.
     * @param {HTMLElement|string} form - The form to populate or a query string for the form.
     * @param {object} data - The data to bind to the form, form name attributes will be mapped to the keys in the object.
     */
    function populate(form, data) {
        form = domQuery.first(form);
        var nameAttrs = domQuery.all('[name]', form);
        if (typeIds.isObject(data)) {
            for (var i = 0; i < nameAttrs.length; ++i) {
                var element = nameAttrs[i];
                element.value = data[element.getAttribute('name')];
            }
        }
        else if (typeIds.isFunction(data)){
            for (var i = 0; i < nameAttrs.length; ++i) {
                var element = nameAttrs[i];
                switch (element.type) {
                    case 'checkbox':
                        element.checked = data(element.getAttribute('name')) === element.value;
                        break;
                    default:
                        element.value = data(element.getAttribute('name'));
                        break;
                }
            }
        }
    }
    exports.populate = populate;
});
"use strict";

jsns.define("hr.formlifecycle", [
    "hr.toggles",
    "hr.rest"
],
function(exports, module, toggles, rest){

    /**
     * Create a simple ajax lifecyle for the form. This will show a loading screen
     * when fetching data and provides provisions to handle a data connection failure.
     * If your html uses the default bindings you don't need to pass settings.
     * @constructor
     * @param {hr.component.BindingCollection} bindings - The bindings to use to lookup elements
     * @param {hr.form.AjaxLifecycleSettings} [settings] - The settings for the form, optional
     */
    function FormLifecycle(bindings) {
        var tryAgainFunc = null;
        var self = this;

        bindings.setListener({
            submit: function (evt) {
                evt.preventDefault();
                self.submit();
            },
            tryAgain: function (evt) {
                evt.preventDefault();
                tryAgainFunc();
            }
        });

        var load = bindings.getToggle('load');
        var main = bindings.getToggle('main');
        var fail = bindings.getToggle('fail');
        var formToggler = new toggles.Group(load, main, fail);

        var settingsModel = bindings.getModel('settings');

        this.populate = function () {
            formToggler.show(load);
            rest.get(settingsModel.getSrc(),
                function (successData) {
                    settingsModel.setData(successData);
                    formToggler.show(main);
                },
                function (failData) {
                    tryAgainFunc = self.populate;
                    formToggler.show(fail);
                });
        }

        this.submit = function() {
            formToggler.show(load);
            var data = settingsModel.getData();
            rest.post(settingsModel.getSrc(), data,
                function (successData) {
                    formToggler.show(main);
                },
                function (failData) {
                    tryAgainFunc = self.submit;
                    formToggler.show(fail);
                });
        }
    }
    module.exports = FormLifecycle;
});
"use strict";

//This module defines html nodes that are ignored and a way to check to see if a node is ignored or the
//child of an ignored node. Ignored nodes are defined with the data-hr-ignored attribute.
jsns.define("hr.ignored", [
    "hr.domquery"
],
function (exports, module, domQuery) {
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
"use strict";

jsns.define("hr.iterable", [
    "hr.typeidentifiers"
],
function (exports, module, typeId) {

    function Selector(selectCb) {
        function get(item) {
            return selectCb(item);
        }
        this.get = get;
    }

    function Conditional(whereCb) {
        function get(item) {
            if (whereCb(item)) {
                return item;
            }
        }
        this.get = get;
    }

    function Query() {
        var chain = [];

        function push(c) {
            chain.push(c);
        }
        this.push = push;

        function derive(item) {
            var result = item;
            for (var i = 0; i < chain.length; ++i) {
                result = chain[i].get(result);
            }
            return result;
        }
        this.derive = derive;
    }

    var defaultQuery = new Query(); //Empty query to use as default

    function iterate(items, query) {
        var i;
        if (typeId.isArray(items)) {
            i = 0;
            return {
                next: function(){
                    var result = undefined;
                    while(result === undefined && i < items.length){
                        var item = items[i++];
                        result = query.derive(item);
                    }
                    if(result === undefined){
                        return { done: true };
                    }
                    else{
                        return {done: false, value: item};
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
    }

    function Iterable(items) {
        var query = defaultQuery;

        function ensureQuery() {
            if (query === defaultQuery) {
                query = new Query();
            }
        }

        function where(w) {
            ensureQuery();
            query.push(new Conditional(w));
            return this;
        }
        this.where = where;

        function select(s) {
            ensureQuery();
            query.push(new Selector(s));
            return this;
        }
        this.select = select;

        function iterator() {
            return iterate(items, query);
        }
        this.iterator = iterator;

        function forEach(cb) {
            _forEach(items, query, cb);
        }
        this.forEach = forEach;
    }

    module.exports = Iterable;
});
"use strict";

jsns.define("hr.models", [
    "hr.form",
    "hr.textstream",
    "hr.components",
    "hr.typeidentifiers",
    "hr.domquery"
],
function(exports, module, forms, TextStream, components, typeId, domQuery){

    function sharedClearer(i) {
        return "";
    }

    function FormModel(form, src) {
        this.setData = function (data) {
            forms.populate(form, data);
        }

        this.appendData = this.setData;

        function clear() {
            forms.populate(form, sharedClearer);
        }
        this.clear = clear;

        this.getData = function () {
            return forms.serialize(form);
        }

        this.getSrc = function () {
            return src;
        }
    }

    function ComponentModel(element, src, component) {
        this.setData = function (data, createdCallback, variantFinderCallback) {
            components.empty(element);
            this.appendData(data, createdCallback, variantFinderCallback);
        }

        this.appendData = function (data, createdCallback, variantFinderCallback) {
            if (typeId.isArray(data) || typeId.isForEachable(data)) {
                components.repeat(component, element, data, createdCallback, variantFinderCallback);
            }
            else if (data) {
                components.single(component, element, data, createdCallback, variantFinderCallback);
            }
        }

        function clear() {
            components.empty(element);
        }
        this.clear = clear;

        this.getData = function () {
            return {};
        }

        this.getSrc = function () {
            return src;
        }
    }

    function TextNodeModel(element, src) {
        var dataTextElements = undefined;

        this.setData = function (data) {
            dataTextElements = bindData(data, element, dataTextElements);
        }

        function clear() {
            dataTextElements = bindData(sharedClearer, element, dataTextElements);
        }
        this.clear = clear;

        this.appendData = this.setData;

        this.getData = function () {
            return {};
        }

        this.getSrc = function () {
            return src;
        }
    }

    function bindData(data, element, dataTextElements) {
        //No found elements, iterate everything.
        if (dataTextElements === undefined) {
            dataTextElements = [];
            domQuery.iterateNodes(element, NodeFilter.SHOW_TEXT, function (node) {
                var textStream = new TextStream(node.textContent);
                if (textStream.foundVariable()) {
                    node.textContent = textStream.format(data);
                    dataTextElements.push({
                        node: node,
                        stream: textStream
                    });
                }
            });
        }
        //Already found the text elements, output those.
        else {
            for (var i = 0; i < dataTextElements.length; ++i) {
                var node = dataTextElements[i];
                node.node.textContent = node.stream.format(data);
            }
        }

        return dataTextElements;
    }

    function build(element) {
        var src = element.getAttribute('data-hr-model-src');
        if (element.nodeName === 'FORM' || element.nodeName == 'INPUT' || element.nodeName == 'TEXTAREA') {
            return new FormModel(element, src);
        }
        else {
            var component = element.getAttribute('data-hr-model-component');
            if (component) {
                return new ComponentModel(element, src, component);
            }
            else {
                return new TextNodeModel(element, src);
            }
        }
    }
    exports.build = build;

    function NullModel() {
        this.setData = function (data) {

        }

        this.appendData = this.setData;

        this.getData = function () {
            return {};
        }

        this.getSrc = function () {
            return "";
        }
    }
    exports.NullModel = NullModel;
});
"use strict";

jsns.define("hr.rest", null,
function (exports, module) {

    function extractData(xhr) {
        var data;
        var contentType = xhr.getResponseHeader('content-type');
        if (contentType && contentType.search(/application\/json/) !== -1) {
            try {
                data = JSON.parse(xhr.response);
            }
            catch (err) {
                data = xhr.response;
            }
        }
        else {
            data = xhr.response;
        }
        return data;
    }

    //Helper function to handle results
    function handleResult(xhr, success, fail) {
        if (xhr.status === 200) {
            if (success !== undefined) {
                success(extractData(xhr));
            }
        }
        else {
            if (fail !== undefined) {
                fail(extractData(xhr));
            }
        }
    }

    /**
     * This callback is called when server communication has occured.
     * @callback exports~resultCallback
     * @param {object} data - The data result from the server.
     */

    /**
     * Post data to a url. Success and fail called depending on result
     * @param {string} url - The url to post to
     * @param {object} data - The data to post
     * @param {exports~resultCallback} success - Called if the operation is successful
     * @param {exports~resultCallback} [fail] - Called if the operation fails, if not provided will call success for this.
     */
    function post(url, data, success, fail) {
        ajax(url, 'POST', data, success, fail);
    }
    exports.post = post;

    /**
     * Perform a post request and get a promise to the results. This is similar to using plain post, but
     * success and fail are handled by the promise returned.
     * @param {string} url - The url to post to
     * @param {object} data - The data to post
     * @returns {Promise} A promise to the response.
     */
    function postPromise(url, data) {
        return new Promise(function (resolve, reject) {
            post(url, data, resolve, reject);
        });
    }
    exports.postPromise = postPromise;

    /**
     * Put data to a url. Success and fail called depending on result
     * @param {string} url - The url to put to
     * @param {object} data - The data to put
     * @param {exports~resultCallback} success - Called if the operation is successful
     * @param {exports~resultCallback} [fail] - Called if the operation fails, if not provided will call success for this.
     */
    function put(url, data, success, fail) {
        ajax(url, 'PUT', data, success, fail);
    }
    exports.put = put;

    /**
     * Perform a put request and get a promise to the results. This is similar to using plain put, but
     * success and fail are handled by the promise returned.
     * @param {string} url - The url to put to
     * @param {object} data - The data to put
     * @returns {Promise} A promise to the response.
     */
    function putPromise(url, data) {
        return new Promise(function (resolve, reject) {
            put(url, data, resolve, reject);
        });
    }
    exports.putPromise = putPromise;

    /**
     * Delete data at a url. Success and fail called depending on result
     * @param {string} url - The url to delete to
     * @param {object} data - Data to include
     * @param {exports~resultCallback} success - Called if the operation is successful
     * @param {exports~resultCallback} [fail] - Called if the operation fails, if not provided will call success for this.
     */
    function del(url, data, success, fail) {
        ajax(url, 'DELETE', data, success, fail);
    }
    exports.delete = del;

    /**
     * Perform a delete request and get a promise to the results. This is similar to using plain delete, but
     * success and fail are handled by the promise returned.
     * @param {string} url - The url to delete to
     * @param {object} data - Data to include
     * @returns {Promise} A promise to the response.
     */
    function delPromise(url, data) {
        return new Promise(function (resolve, reject) {
            del(url, data, resolve, reject);
        });
    }
    exports.delPromise = delPromise;

    /**
     * Get data from a url. Success and fail called depending on result
     * @param {string} url - The url to get data from
     * @param {exports~resultCallback} success - Called if the operation is successful
     * @param {exports~resultCallback} [fail] - Called if the operation fails, if not provided will call success for this.
     * @param {type} [cache=false] - True to use cached results, false to always get, default false.
     */
    function get(url, success, fail, cache) {
        if (fail === undefined) {
            fail = success;
        }
        if (cache === undefined || cache === false) {
            if (url.indexOf('?') > -1) {
                url += '&';
            }
            else {
                url += '?';
            }
            url += 'noCache=' + new Date().getTime();
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = function () {
            handleResult(xhr, success, fail);
        };
        xhr.send();
    }
    exports.get = get;

    /**
     * Perform a get request and get a promise to the results. This is similar to using plain get, but
     * success and fail are handled by the promise returned.
     * @param {type} url - The url to get data from
     * @param {type} cache - True to use cached results, false to always get, default false.
     * @returns {Promise} A promise to the response.
     */
    function getPromise(url, cache) {
        return new Promise(function (resolve, reject) {
            get(url, resolve, reject, cache);
        });
    }
    exports.getPromise = getPromise;

    /**
     * A more raw ajax call if needed.
     * @param {string} url - The url to call
     * @param {string} method - The method to use
     * @param {object} data - The data to send
     * @param {exports~resultCallback} success - Called if the operation is successful
     * @param {exports~resultCallback} [fail] - Called if the operation fails, if not provided will call success for this.
     */
    function ajax(url, method, data, success, fail) {
        if (fail === undefined) {
            fail = success;
        }

        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
            handleResult(xhr, success, fail);
        };
        xhr.send(JSON.stringify(data));
    }
    exports.ajax = ajax;

    /**
     * Perform an ajax request and get a promise to the results. This is similar to using plain ajax, but
     * success and fail are handled by the promise returned.
     * @param {string} url - The url to call
     * @param {string} method - The method to use
     * @param {object} data - The data to send
     * @returns {Promise} A promise to the response.
     */
    function ajaxPromise(url, method, data) {
        return new Promise(function (resolve, reject) {
            ajax(url, method, data, resolve, reject);
        });
    }
    exports.ajaxPromise = ajaxPromise;

    /**
     * Upload a file to a url
     * @param {string} url - The url to upload to
     * @param {object|FormData} data - The data to upload, if this is already form data it will be used directly, otherwise
     * data will be sent directly as a file.
     * @param {exports~resultCallback} success - Called if the operation is successful
     * @param {exports~resultCallback} [fail] - Called if the operation fails, if not provided will call success for this.
     */
    function upload(url, data, success, fail) {
        if (fail === undefined) {
            fail = success;
        }

        var formData = null;

        if (data instanceof FormData) {
            formData = data;
        }
        else {
            formData = new FormData();
            formData.append('file', data);
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.onload = function () {
            handleResult(xhr, success, fail);
        };
        xhr.send(formData);
    }
    exports.upload = upload;

    /**
     * Perform an upload request and get a promise to the results. This is similar to using plain upload, but
     * success and fail are handled by the promise returned.
     * @param {string} url - The url to call
     * @param {object} data - The data to send
     * @returns {Promise} A promise to the response.
     */
    function uploadPromise(url, data) {
        return new Promise(function (resolve, reject) {
            upload(url, data, resolve, reject);
        });
    }
    exports.uploadPromise = uploadPromise;
});
"use strict";

jsns.define("hr.storage", null,
function(exports, module){
    //The instance storage, 
    var instanceStorage = {};

    /**
    * @description Get the sesssion data, can specify a default value.
    * @param {string} name The name of the data to recover
    * @param {object} defaultValue, if not supplied is null
    * @return {object} The recovered object
    */
    function getSessionJson(name, defaultValue) {
        if (defaultValue === undefined) {
            defaultValue = null;
        }

        var recovered = sessionStorage.getItem(name);
        if (recovered !== null) {
            recovered = JSON.parse(recovered);
        }
        else {
            recovered = defaultValue;
        }
        return recovered;
    }
    exports.getSessionJson = getSessionJson;

    /**
    * @description Get the sesssion data, can specify a default value.
    * @param {string} name The name of the data to store
    * @param {object} value, if not supplied is null
    */
    function storeJsonInSession(name, value) {
        sessionStorage.setItem(name, JSON.stringify(value));
    }
    exports.storeJsonInSession = storeJsonInSession;
});
"use strict";

jsns.define("hr.textstream", [
    "hr.escape",
    "hr.typeidentifiers"
],
function (exports, module, escape, typeId) {

    function TextNode(str) {
        this.writeObject = function (data) {
            return str;
        }

        this.writeFunction = this.writeObject;
    }

    function VariableNode(variable) {
        this.writeObject = function (data) {
            return escape(data[variable]);
        }

        this.writeFunction = function (data) {
            return escape(data(variable));
        }
    }

    function ThisVariableNode() {
        this.writeObject = function (data) {
            return escape(data);
        }

        this.writeFunction = function (data) {
            return escape(data('this'));
        }
    }

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
     * @param {type} alwaysCreate
     * @returns {type} 
     */
    function TextStream(text) {
        var streamNodes = [];
        var foundVariable = false;

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

            if (text[i] == '{') {
                //Count up opening brackets
                bracketStart = i;
                bracketCount = 1;
                while (++i < text.length && text[i] == '{') {
                    ++bracketCount;
                }

                //Find closing bracket chain, ignore if mismatched or whitespace
                bracketCheck = bracketCount;
                while (++i < text.length) {
                    if ((text[i] == '}' && --bracketCheck == 0) || /\s/.test(text[i])) {
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
                            streamNodes.push(new TextNode(skippedTextBuffer + leadingText));
                            skippedTextBuffer = ""; //This is reset every time we actually output something
                            variable = bracketVariable.substring(2, bracketVariable.length - 2);
                            if (variable === "this") {
                                streamNodes.push(new ThisVariableNode());
                            }
                            else {
                                streamNodes.push(new VariableNode(variable));
                            }
                            break;
                        default:
                            //Multiple brackets, escape by removing one and add to buffer
                            skippedTextBuffer += leadingText + bracketVariable.substring(1, bracketVariable.length - 1);
                            break;
                    }

                    textStart = i + 1;
                    foundVariable = true;
                }
            }
        }

        if (textStart < text.length) {
            streamNodes.push(new TextNode(skippedTextBuffer + text.substring(textStart, text.length)));
        }

        this.format = function (data) {
            return format(data, streamNodes);
        }

        this.foundVariable = function () {
            return foundVariable;
        }
    }
    module.exports = TextStream;
});
"use strict";

jsns.define("hr.timedtrigger", [
    "hr.eventhandler"
],
function (exports, module, EventHandler) {
    function TimedTrigger(delay) {
        if (delay === undefined) {
            delay = 400;
        }
        
        var _delay = delay;
        var holder;
        var handler = new EventHandler();
        var args;
        
        this.handler = handler.modifier;

        function setDelay(delay) {
            _delay = delay;
        }
        this.setDelay = setDelay;

        function cancel() {
            clearTimeout(holder);
            args = undefined;
        }
        this.cancel = cancel;

        function fire() {
            cancel();
            holder = window.setTimeout(fireHandler, _delay);
            args = arguments;
        }
        this.fire = fire;

        function addListener(context, listener) {
            handler.modifier.add(context, listener);
        }
        this.addListener = addListener;

        function removeListener(context, listener) {
            handler.modifier.remove(context, listener);
        }
        this.removeListener = removeListener;

        function fireHandler() {
            handler.fire.apply(handler, args);
        }

    }

    module.exports = TimedTrigger;
});
"use strict";

jsns.define("hr.toggles", [
    "hr.typeidentifiers"
],
function(exports, module, typeId){
    var defaultStates = ['on', 'off']; //Reusuable states, so we don't end up creating tons of these arrays
    var togglePlugins = [];

    /**
     * Add a toggle plugin that can create additional items on the toggle chain.
     * @param {type} plugin
     */
    function addTogglePlugin(plugin) {
        togglePlugins.push(plugin);
    }
    exports.addTogglePlugin = addTogglePlugin;

    /**
     * This function will apply a state on a toggle in a safe manner while maintaining
     * the chain.
     * @param {type} toggle - The toggle to activate, can be null, which does nothing
     * @param {type} name - The name of the state to activate, toggle does not need to define
     * this state and the apply funciton for that toggle will be called with null for its value
     * in this case.
     */
    function safeApplyState(toggle, name) {
        if (toggle) {
            var func = toggle[name];
            if (func) {
                func();
            }
            else {
                var next = toggle.applyState(null);
                safeApplyState(next, name);
            }
        }
    }

    /**
     * Create a toggle function on the toggle.
     * @param {type} name - The name of the state.
     * @param {type} value - The value to apply for the state
     * @param {type} toggle - The toggle this state applies to.
     */
    function createToggleState(name, value, toggle) {
        function activate() {
            var next = toggle.applyState(value);
            safeApplyState(next, name);
        }

        toggle[name] = activate;
    }

    /**
     * A simple toggler that does nothing. Used to shim correctly if no toggles are defined for a toggle element.
     */
    function NullToggle(next) {
        function applyState(value) {
            return next;
        }
        this.applyState = applyState;
    }

    /**
     * A toggler that toggles style for an element
     */
    function StyleToggle(element, next) {
        var originalStyles = element.style.cssText || "";

        function applyState(style) {
            if (style) {
                element.style.cssText = originalStyles + style;
            }
            else {
                element.style.cssText = originalStyles;
            }
            return next;
        }
        this.applyState = applyState;
    }

    /**
    * A toggler that toggles classes for an element. Supports animations using an 
    * idle attribute (data-hr-class-idle) that if present will have its classes
    * applied to the element when any animations have completed.
    */
    function ClassToggle(element, next) {
        var originalClasses = element.getAttribute("class") || "";
        var idleClass = element.getAttribute('data-hr-class-idle');

        function applyState(classes) {
            if (classes) {
                element.setAttribute("class", originalClasses + ' ' + classes);
            }
            else {
                element.setAttribute("class", originalClasses);
            }
            startAnimation();
            return next;
        }
        this.applyState = applyState;

        function startAnimation() {
            if (idleClass) {
                element.classList.remove(idleClass);
                element.removeEventListener('transitionend', stopAnimation);
                element.removeEventListener('animationend', stopAnimation);
                element.addEventListener('transitionend', stopAnimation);
                element.addEventListener('animationend', stopAnimation);
            }
        }

        function stopAnimation() {
            element.removeEventListener('transitionend', stopAnimation);
            element.removeEventListener('animationend', stopAnimation);
            element.classList.add(idleClass);
        }
    }

    /**
     * The Group defines a collection of toggles that can be manipulated together.
     */
    function Group() {
        var toggles = [];

        for (var i = 0; i < arguments.length; ++i) {
            toggles.push(arguments[i]);
        }

        /**
         * Add a toggle to the group.
         * @param toggle - The toggle to add.
         */
        function add(toggle) {
            toggles.push(toggle);
        }
        this.add = add;

        /**
         * This function will set all toggles in the group (including the passed one if its in the group) 
         * to the hideState and then will set the passed toggle to showState.
         * @param toggle - The toggle to set.
         * @param {string} [showState] - The state to set the passed toggle to.
         * @param {string} [hideState] - The state to set all other toggles to.
         */
        function activate(toggle, showState, hideState) {
            if (showState === undefined) {
                showState = 'on';
            }

            if (hideState === undefined) {
                hideState = 'off';
            }

            for (var i = 0; i < toggles.length; ++i) {
                safeApplyState(toggles[i], hideState);
            }
            safeApplyState(toggle, showState);
        }
        this.activate = activate;
        this.show = activate; //Deprecated version
    }
    exports.Group = Group;

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
        var toggle = null;
        for (var i = 0; i < states.length; ++i) {
            var name = states[i];
            var attr = attrPrefix + name;
            if (element.hasAttribute(attr)) {
                var value = element.getAttribute(attr);
                if (toggle === null) {
                    toggle = new toggleConstructor(element, nextToggle);
                }
                createToggleState(name, value, toggle);
            }
        }
        if (toggle) {
            return toggle;
        }
        return nextToggle;
    }

    /**
     * Build a toggle chain from the given element
     * @param {string} element - The element to build toggles for
     * @param {string[]} [states] - The states the toggle needs, will create functions on 
     * the toggle for each one. If this is undefined will default to "on" and "off".
     * @returns A new ToggleChain with the defined states as functions
     */
    function build(element, states) {
        if (states === undefined) {
            states = defaultStates;
        }
        var toggle = null;

        if (element !== null) {
            toggle = extractStates(element, states, 'data-hr-style-', StyleToggle, toggle);
            toggle = extractStates(element, states, 'data-hr-class-', ClassToggle, toggle);

            //Now toggle plugin chain
            for (var i = 0; i < togglePlugins.length; ++i) {
                toggle = togglePlugins[i](element, states, toggle);
            }
        }

        //If we get all the way here with no toggle, use the null toggle.
        if (toggle === null) {
            toggle = new NullToggle(toggle);
        }

        //Make sure the top level toggle defines all the required funcitons
        //This trashes any properties that are not functions that are also state
        //names, or creates them if they don't exist. This allows the user to just
        //call function names for their states without worrying if they are defined.
        for (i = 0; i < states.length; ++i) {
            var state = states[i];
            if (!typeId.isFunction(toggle[state])) {
                createToggleState(state, null, toggle);
            }
        }

        return toggle;
    }
    exports.build = build;

    /**
     * Determine if a given toggle is a null toggle.
     * @param toggle - the toggle to check
     * @returns {type} - True if toggle is a NullToggle
     */
    function isNullToggle(toggle) {
        return typeId.isObject(toggle) && toggle.constructor.prototype == NullToggle.prototype;
    }
    exports.isNullToggle = isNullToggle;
});
"use strict";

jsns.define("hr.typeidentifiers", null,
function(exports, module){
    //only implement if no native implementation is available
    if (typeof Array.isArray === 'undefined') {
        Array.isArray = function (obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }
    };

    /**
     * Determine if a variable is an array.
     * @param test - The object to test
     * @returns {boolean} - True if the object is an array
     */
    function isArray(test){
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


"use strict";

jsns.run([
    "hr.toggles"
],
function(exports, module, toggles){

    function ModalToggle(element, next) {
        var modal = new Modal(element);

        function on() {
            modal.open();
            return next;
        }
        this.on = on;

        function off() {
            modal.close();
            return next;
        }
        this.off = off;

        function applyState(style) {
            return next;
        }
        this.applyState = applyState;
    }

    toggles.addTogglePlugin(function (element, states, toggle) {
        if (element.classList.contains('modal')) {
            toggle = new ModalToggle(element, toggle);
        }

        return toggle;
    });
});
"use strict";

jsns.define("hr.widgets.navmenu", [
    "hr.eventhandler",
    "hr.controller"
],
function (exports, module, EventHandler, controller) {
    var navMenus = {};

    function NavMenu() {
        var menuItems = [];

        var itemAdded = new EventHandler();
        this.itemAdded = itemAdded.modifier;

        function add(name, controllerConstructor) {
            if (controllerConstructor !== undefined) {
                controllerConstructor = controller.createOnCallback(controllerConstructor);
            }
            var item = {
                name: name,
                created: controllerConstructor
            };
            menuItems.push(item);
            itemAdded.fire(item);
        }
        this.add = add;

        function getItems() {
            return menuItems;
        }
        this.getItems = getItems;
    }

    function getNavMenu(name) {
        var menu = navMenus[name];
        if (menu === undefined) {
            navMenus[name] = menu = new NavMenu();
        }
        return menu;
    }
    exports.getNavMenu = getNavMenu;
});
jsns.define("hr.widgets.pagenumbers", [
    "hr.toggles",
    "hr.eventhandler"
],
function (exports, module, toggles, EventHandler) {

    function PageNumbers(model, toggleProvider) {
        var pageToggles = [];
        var totalPages = 0;
        var buttonGroup = new toggles.Group();
        findToggles();
        var numButtons = pageToggles.length;
        var halfButton = Math.floor(numButtons / 2);
        var pageChangeRequested = new EventHandler();
        this.pageChangeRequested = pageChangeRequested.modifier;
        var lowestDisplayedPage = 0;
        var self = this;

        this.currentPage = 0;
        this.totalResults = 0;
        this.resultsPerPage = 0;

        function moveToPage(newPageNum) {
            pageChangeRequested.fire(newPageNum);
        }

        function pageNumberLink(index) {
            return function () {
                moveToPage(lowestDisplayedPage + index);
            }
        }

        function next() {
            var page = self.currentPage + 1;
            if (page < totalPages) {
                moveToPage(page)
            }
        }

        function previous() {
            var page = self.currentPage - 1;
            if (page >= 0) {
                moveToPage(page)
            }
        }

        function findToggles() {
            var bindings = {
                previousPage: function (evt) {
                    evt.preventDefault();
                    previous();
                },
                nextPage: function (evt) {
                    evt.preventDefault();
                    next();
                }
            };
            var states = ["on", "off", "active"];
            var t = 0;
            var currentPage = 'page' + t;
            var toggle = toggleProvider.getToggle(currentPage, states);
            while (!toggles.isNullToggle(toggle)) {
                pageToggles.push(toggle);
                buttonGroup.add(toggle);
                bindings[currentPage] = pageNumberLink(t);
                currentPage = 'page' + ++t;
                toggle = toggleProvider.getToggle(currentPage, states);
            }
            toggleProvider.setListener(bindings);
        }

        function updatePages() {
            totalPages = Math.floor(this.totalResults / this.resultsPerPage);
            if (this.totalResults % this.resultsPerPage !== 0) {
                ++totalPages;
            }

            var j = 0;
            var i;

            if (this.currentPage + halfButton > totalPages) {
                i = totalPages - numButtons;
            }
            else {
                i = this.currentPage - halfButton;
            }
            if (i < 0) {
                i = 0;
            }
            lowestDisplayedPage = i;
            model.setData(function (page) {
                if (i === self.currentPage) {
                    buttonGroup.activate(pageToggles[j], 'active', 'on');
                }
                if (i >= totalPages) {
                    pageToggles[j].off();
                }
                ++j;
                return i++ + 1;
            });
        }
        this.updatePages = updatePages;
    }

    module.exports = PageNumbers;
});
jsns.define("hr.data.paged", [
    "hr.rest",
    "hr.eventhandler"
],
function (exports, module, rest, EventHandler) {

    function PagedData(src, resultsPerPage) {
        var updating = new EventHandler();
        this.updating = updating.modifier;

        var updated = new EventHandler();
        this.updated = updated.modifier;

        var error = new EventHandler();
        this.error = error.modifier;

        this.resultsPerPage = resultsPerPage;
        this.currentPage = 0;

        function updateData() {
            updating.fire();
            var url = src + '?page=' + this.currentPage + '&count=' + this.resultsPerPage;
            rest.get(url,
                function (data) {
                    updated.fire(data);
                },
                function (data) {
                    error.fire(data);
                });
        }
        this.updateData = updateData;
    }

    module.exports = PagedData;
});
//# sourceMappingURL=HtmlRapier.js.map
