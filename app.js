const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {useNewUrlParser: true});

//Creating a Schema for default / route 
const itemsSchema = {
  name: String
}

//Creating collection for Items db
const Item = mongoose.model("Item", itemsSchema);

//Creating new documents based on the itemsSchema and within the items collection
const item1 = new Item({
  name: "Welcome to your TDL"
});

const item2 = new Item({
  name: "Hit the + button to add a new item"
});

const item3 = new Item({
  name: "<-- Hit this button to delete an item"
});

const defaultItems = [item1, item2, item3];

//**/New list Schema to make custom param lists with, so every new to do list page we make it will have an array and an array of item documents
const listSchema = {
  name: String,
  items: [itemsSchema]
}

//**Doing this allows us to store whatever gets created with the listSchema but store it IN OUR DATABASE as lists database
const List = mongoose.model("list", listSchema);

//App.get method for the root route, fetching the defaultItems declared above and inserting the default items into the browser if foundItems.length===0, if not then just rendering current newListItems in list.ejs to be foundItems  which is what shows up on the browser and on the database
app.get("/", function(req, res) {

  //foundItems taps into the database and produces an array of each document entered so far in the item collection, and then newListItems.name in the list.ejs file accesses the name value
  Item.find({}, function(err, foundItems){

    if (foundItems.length === 0) {
      //Inserting defaultItems into items collection
      Item.insertMany(defaultItems, function(error, docs) {});
      res.redirect("/");
   } else {
    //Rendering from list.ejs and making the newListItems equal to the foundItems which represents the entries in the database 
    res.render("list", {listTitle: "Today", newListItems: foundItems});
   }
  });

});

//CREATING a new item and UPDATING it in the database, light green is for creating new items for the custom lists:
app.post("/", function(req, res){

  const itemName = req.body.newItem;
  //** This is for the custom lists we make, and this data comes via the button submit name="list" on list.ejs*/
  const listName = req.body.list;

  //Making the item according to item schema
  const item = new Item({
    name: itemName
  });

  //** The button's value is equal to listTitle and it checks if it's the default root which is "Today", vs the listTitle:requestedTitle and the list.findOne here finds us the listTitle's document and updates it accordingly to the user's input upon each button submit */

  if (listName === "Today"){
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName); //*IMPORTANT: THIS TAKES US BACK TO OUR EXPRESS ROUTE PARAMETER GET METHOD
    });
  }
});

//DELETING an Item that gets checkbox clicked from screen and database, light green is for deleting custom items: 
app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  //** Using hidden input with name="listName" in for each loop in list.ejs */
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
      if (!err){
        console.log("Successfully deleted checked item");
        res.redirect("/");
      }
    });
  } else { //** For DELETING CUSTOM LIST ITEMS:
    //**listName is the current document we want to update, $pull lets us remove from the array (this case items which is IN THE LIST SCHEMA) any documents specified, we know which one to delete because of checkedItemId */
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    })
  }


});

//**Express Route Parameter get method to add in new Lists and a document for the custom list
app.get("/:requestedList", function(req, res){
  const requestedList = _.capitalize(req.params.requestedList);

  //**Checking if list document exists by using List.findOne and then the built in argument foundList represents iterating over the value being each document in the array of collections 
  List.findOne({name: requestedList}, function(err, foundList){
      if (!err) {
        if (!foundList){
          //**Create a new list here if there is no foundList

          //**Using the listSchema, can set h1 name of the page as the requested name and add in the default items
          const list = new List({
            name: requestedList,
            items: defaultItems
          });

          list.save();
          //**Redirecting users to the new requested list */
          res.redirect("/" + requestedList);

        } else {
          //**Render the existing list page into the browser 
          res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
        }
      }
  })
});


app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
