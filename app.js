const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/notesDB");


const notesSchema = new mongoose.Schema({
    title: String,
    content: String
})
const Note = mongoose.model("Note", notesSchema)


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    notes: [notesSchema]
})
userSchema.plugin(passportLocalMongoose)

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req,res){
    if(req.isAuthenticated()){
        res.redirect("mynotes");
    }
    else{
        res.render("home");
    }
})

app.get("/register", function(req,res){
    if(req.isAuthenticated()){
        res.redirect("mynotes");
    }
    else{
        res.render("register");
    }
})

app.get("/login", function(req,res){
    if(req.isAuthenticated()){
        res.redirect("mynotes");
    }
    else{
        res.render("login");
    }
})

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
})

app.get("/mynotes", function(req,res){
    if(req.isAuthenticated()){
        const notes = req.user.notes;

        res.render("mynotes", {
            notes: notes
        })
    }
    else{
        res.render("login");
    }
})

app.get("/edit/:noteId",function(req, res){
    if(req.isAuthenticated()){

        const requestedNoteId = req.params.noteId;
        const notes = req.user.notes;
        
        const noteId = requestedNoteId
        let title;
        let content;

        notes.forEach(function(note){
            if(note._id == requestedNoteId){
                title = note.title;
                content = note.content;
            }
        })

        res.render("edit",{
            noteId: noteId,
            title: title,
            content: content
        })
    }
    else{
        res.render("login");
    }
})


app.post("/register", function(req, res){
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/mynotes")
            })
        }
    })

})

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/mynotes")
            })
        }
    })
    
})

app.post("/mynotes", function(req, res){
    const title = req.body.title;
    const content = req.body.content;
    
    const note = new Note({
        title: title,
        content: content
    })

    const userId = req.user.id;
    User.findById(userId, function(err, foundUser){
        if(!err){
            foundUser.notes.push(note);
            foundUser.save();
            res.redirect("/mynotes")

        }
    })
    
    // note.save(function(err){
    //     if(!err){
    //     }
    // });
    
})

app.post("/delete", function(req,res){
    const noteId = req.body.noteId;
    const userId = req.user.id;

    User.findOneAndUpdate({_id: userId},{ $pull:{notes: {_id: noteId}}}, function(err, updatedUser){
            if(err){
                console.log(err);
            }
            else{
                console.log("reached");
                res.redirect("/mynotes");
            }
    })

    // Note.findByIdAndDelete(noteId, function(err, deletedNote){
    //     if(!err){
    //         console.log("item deleted");
    //         res.redirect("/mynotes");
    //     }
    // })
})

app.post("/edit/:noteId", function(req, res){
    const updatedNoteId = req.params.noteId;
    const newTitle = req.body.title;
    const newContent = req.body.content;

    const notes = req.user.notes;

    notes.forEach(function(note){
        if(note._id == updatedNoteId){
            note.title = newTitle;
            note.content = newContent;
            req.user.save();
            res.redirect("/mynotes");
        }
    })

    // Note.findByIdAndUpdate(updatedNoteId, {title: newTitle, content: newContent}, function(err, updatedNote){
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //         res.redirect("/mynotes");
    //     }
    // })
})



app.listen(3000, function () {
    console.log("Server started");
})