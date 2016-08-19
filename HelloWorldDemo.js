"use strict";

jsns.run([
    "hr.controller"
], function (exports, module, controller) {
    function HelloWorldController(bindings) {
        var model = bindings.getModel('hello');

        model.setData({
            message: "World"
        });
    }

    controller.create("helloWorldDemo", HelloWorldController);
});