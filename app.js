require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
// cookies shit
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const e = require("express");

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: "Toto potom treba dat do .env",
    resave: false,
    saveUninitialized: false // Toto potom checkni neviem teraz
}));

app.use(passport.initialize());
app.use(passport.session());

const uri = "mongodb+srv://admin-yanshiro:" + process.env.DATABASE_PASSWORD + "@cluster0.bwelaio.mongodb.net/eshopDB"
mongoose.connect(uri);

const productSchema = new mongoose.Schema({
    name: String,
    category: Number,
    desc: String,
    stock: Number,
    rating: {
        type: Number,
        min: 0,
        max: 5
    },
    price: Number,
    img: String
})

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    isAdmin: { type: Boolean, default: false }
})

userSchema.plugin(passportLocalMongoose);

const Product = mongoose.model("Product", productSchema);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




// ROUTES

app.get("/", (req, res) => {
    products = [];
    Product.find({category: { $lt: 9 }}, (err, foundProducts) => {
    //Product.find({_id: "637eaca243130301784871b9"}, (err, foundProducts) => {
        if(!err){
            foundProducts.forEach(foundProduct => products.push(foundProduct))
            res.render("home", {products: products, user: req.user})
        } else {
            console.log(err);
        }
    })
})

app.get("/categories/:category", (req, res) => {
    let category = req.params.category;
    Product.find({category: category}, (err, foundProducts) => {
        if(err){
            console.log(err);
        } else {
            res.render("home", {products: foundProducts, user: req.user});
        }
    })
})


    // ADDING A NEW PRODUCT
app.get("/newprod", (req, res) => {
    if (req.isAuthenticated()){
        if (req.user.isAdmin) {
            res.render("newprod", {user: req.user});
        } else {
            res.redirect("/");
            console.log("FORBIDDEN: NOT AN ADMIN");
        }
    } else {
        res.redirect("/login");
        console.log("FORBIDDEN: NOT LOGGED IN");
    }
})

    // LOGIN AND REGISTER PAGE
app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.get("/profile", (req, res) => {
    if (req.isAuthenticated()){
        res.render("profile", {user: req.user})
    } else {
        res.redirect("/login");
    }
})

app.post("/register", (req, res) => {
    User.register({username: req.body.username, email: req.body.email}, req.body.password, (err, newUser) => {
        if(!err){
            passport.authenticate("local")(req, res, () => {
                // console.log(req.user);
                res.redirect("/profile")
            })
        } else {
            console.log(err);
            res.redirect("/register")
        }
    })
})

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if(!err) {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/profile");
            })
        } else {
            console.log(err);
        }
    })
})

app.post('/logout', function(req, res){
    req.logout(function(err) {
        if(!err){
            res.redirect('/');
        } else {
            console.log(err);
        }
        
    });
  });


app.post("/newprod", (req, res) => {
    const newProd = new Product({
        name: req.body.newProdName,
        category: req.body.newProdCategory,
        desc: req.body.newProdDescription,
        stock: req.body.newProdStock,
        rating: req.body.newProdRating,
        price: req.body.newProdPrice,
        img: req.body.newProdImg
    });
    newProd.save((err) => {
        if(!err){
            res.redirect("/");
            console.log("Added a new product");
        } else {
            console.log(err);
        }
    });
})



app.listen(3000, () => {
    console.log("Server running at port 3000");
});