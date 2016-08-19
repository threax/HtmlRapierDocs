"use strict";

jsns.run([
    "hr.controller"
], function (exports, module, controller) {
    function InputController(bindings) {
        var inputModel = bindings.getModel("input");
        var outputModel = bindings.getModel("output");

        function outputInfo(evt) {
            evt.preventDefault();
            var data = inputModel.getData();
            outputModel.setData(data);
        }
        this.outputInfo = outputInfo;
    }

    controller.create("inputDemo", InputController);
});