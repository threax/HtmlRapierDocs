"use strict";

jsns.run([
    "hr.controller"
], function (exports, module, controller) {
    function TodoDemoController(bindings) {
        var addModel = bindings.getModel('add');
        var itemsModel = bindings.getModel('items');
        itemsModel.clear();
        var todoItems = [];
        var self = this;

        function findItemVariant(item){
            if (item.important === "on") {
                return "important";
            }
        }

        function addItem(evt) {
            evt.preventDefault();
            var item = addModel.getData();
            itemsModel.appendData(item, controller.createOnCallback(TodoItemController, self), findItemVariant);
            todoItems.push(item);
            addModel.clear();
        }
        this.addItem = addItem;

        function removeItem(item) {
            var index = todoItems.indexOf(item);
            if (index != -1) {
                todoItems.splice(index, 1);
                rebuildList();
            }
        }
        this.removeItem = removeItem;

        function rebuildList() {
            itemsModel.setData(todoItems, controller.createOnCallback(TodoItemController, self), findItemVariant);
        }
        this.rebuildList = rebuildList;
    }

    function TodoItemController(bindings, context, itemData) {
        var todoDemoController = context;

        function edit(evt) {
            evt.preventDefault();
            //This is a silly way to edit, but trying to keep it short.
            itemData.text = window.prompt("Edit Todo Item", itemData.text);
            todoDemoController.rebuildList();
        }
        this.edit = edit;

        function deleteItem(evt) {
            evt.preventDefault();
            //Silly to use confirm, but done for size
            if (window.confirm("Do you want to delete " + itemData.text + "?")) {
                todoDemoController.removeItem(itemData);
            }
        }
        this.deleteItem = deleteItem;
    }

    controller.create("todo", TodoDemoController);
});