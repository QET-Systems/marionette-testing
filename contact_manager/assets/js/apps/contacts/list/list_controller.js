ContactManager.module("ContactsApp.List", function(List, ContactManager, Backbone, Marionette, $, _){
  List.Controller = {
    _configurePanel: function(contacts, criterion){
      if(criterion){
        this.collection.filter(criterion);
        this.once("show", function(){
          this.triggerMethod("set:filter:criterion", criterion);
        });
      }

      this.on("contacts:filter", function(filterCriterion){
        this.collection.filter(filterCriterion);
        ContactManager.trigger("contacts:filter", filterCriterion);
      });

      this.on("contact:new", function(){
        var nextId = 1;
        if(contacts.length > 0){
          nextId = contacts.max(function(c){ return c.id; }).get("id") + 1;
        }
        var newContact = new ContactManager.Entities.Contact({ id: nextId });

        var view = new List.NewModal({
          model: newContact
        });

        this.listenTo(view, "contact:created", function(newContact){
          this.trigger("contact:created", newContact);
        });

        ContactManager.regions.dialog.show(view);
      });
    },

    listContacts: function(criterion){
      var loadingView = new ContactManager.Common.Views.Loading();
      ContactManager.regions.main.show(loadingView);

      var fetchingContacts = ContactManager.request("contact:entities");

      $.when(fetchingContacts).done(function(contacts){
        var filteredContacts = ContactManager.Entities.FilteredCollection({
          collection: contacts,
          filterFunction: function(filterCriterion){
            var criterion = filterCriterion.toLowerCase();
            return function(contact){
              if(contact.get("firstName").toLowerCase().indexOf(criterion) !== -1
                || contact.get("lastName").toLowerCase().indexOf(criterion) !== -1
                || contact.get("phoneNumber").toLowerCase().indexOf(criterion) !== -1){
                  return contact;
              }
            };
          }
        });

        var contactsListPanel = new List.Panel({
          collection: filteredContacts
        });
        List.Controller._configurePanel.call(contactsListPanel, contacts, criterion);

        var contactsListView = new List.Contacts({
          collection: filteredContacts
        });

        contactsListPanel.on("contact:created", function(newContact){
          contacts.add(newContact);
          var newContactView = contactsListView.children.findByModel(newContact);
          // check whether the new contact view is displayed (it could be
          // invisible due to the current filter criterion)
          if(newContactView){
            newContactView.flash("success");
          }
        });

        contactsListView.on("childview:contact:show", function(childView, args){
          ContactManager.trigger("contact:show", args.model.get("id"));
        });

        contactsListView.on("childview:contact:edit", function(childView, args){
          var model = args.model;
          var view = new ContactManager.ContactsApp.Edit.Contact({
            model: model
          });

          view.on("form:submit", function(data){
            if(model.save(data)){
              childView.render();
              view.trigger("dialog:close");
              childView.flash("success");
            }
            else{
              view.triggerMethod("form:data:invalid", model.validationError);
            }
          });

          ContactManager.regions.dialog.show(view);
        });

        contactsListView.on("childview:contact:delete", function(childView, args){
          args.model.destroy();
        });

        var contactsListLayout = new List.Layout({
          panelView: contactsListPanel,
          contactsView: contactsListView
        });

        ContactManager.regions.main.show(contactsListLayout);
      });
    }
  }
});
