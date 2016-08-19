"use strict";

jsns.run([
    "hr.controller"
], function (exports, module, controller) {
    function ToggleDemoController(bindings) {
        var toggle = bindings.getToggle('color');
        var on = false;
        
        function toggleColors(evt) {
            on = !on;
            if (on) {
                toggle.on();
            }
            else {
                toggle.off();                
            }
        }
        this.toggleColors = toggleColors;
    }

    controller.create("toggleDemo", ToggleDemoController);
});