require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
// cookies shit
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const e = require("express");
const cookieParser = require('cookie-parser');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
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
    isAdmin: { type: Boolean, default: false },
    cart: [String]
})

userSchema.plugin(passportLocalMongoose);

const Product = mongoose.model("Product", productSchema);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




// ROUTES


//temp
app.get("/cookies", (req, res) => {
    if (req.isAuthenticated()){
        if (req.user.isAdmin) {
            res.send(req.cookies);
        } else {
            res.redirect("/");
            console.log("FORBIDDEN: NOT AN ADMIN");
        }
    } else {
        res.redirect("/login");
        console.log("FORBIDDEN: NOT LOGGED IN");
    }
})
//temp
app.get("/clearcookies", (req, res) => {
    res.clearCookie('cookiesAccepted');
    res.clearCookie('cookiePreference');
    res.redirect("/cookies")
})


app.get("/", (req, res) => {
    

    products = [];
    Product.find({category: { $lt: 9 }}, (err, foundProducts) => {
    //Product.find({_id: "637eaca243130301784871b9"}, (err, foundProducts) => {
        if(!err){
            foundProducts.forEach(foundProduct => products.push(foundProduct))
            res.render("home", {products: products, user: req.user, cookiePopup: req.cookies.cookiePreference})
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
            res.render("home", {products: foundProducts, user: req.user, cookiePopup: req.cookies.cookiePreference});
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


app.get("/product/:id", (req, res) => {
    let id = req.params.id;
    Product.findById(id, (err, foundProduct) => {
        if(!err){
            res.render("product", {user: req.user, product: foundProduct});
        } else {
            console.log(err);
        }
    })
    
})

app.get("/cart", (req, res) => {
    if(req.user) {
        User.findById(req.user._id, (err, foundUser) => {
            if(!err) {
                let itemIDs = foundUser.cart;
    
    
                Product.find().where('_id').in(itemIDs).exec((err, foundItems) => {
                    if(!err) {
                        res.render("cart", {user: req.user, products: foundItems});
                    } else {
                        console.log(err);
                    }
                    
                });
            
                
            } else {
                console.log(err);
            }
        })
    }
    
    if(!req.user) {
        let itemIDs = req.cookies.cart
        Product.find().where('_id').in(itemIDs).exec((err, foundItems) => {
            if(!err) {
                res.render("cart", {user: req.user, products: foundItems});
            } else {
                console.log(err);
            }
        })
    }

})

app.get("/cookiePreference", (req, res) => {
    //console.log(req.query.cookiePreference);
    res.cookie('cookiePreference', req.query.cookiePreference);
    res.redirect('/');
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
});

app.post("/deleteproduct/:id", (req, res) => {
    //console.log(req.params.findById);
    let id = req.params.id;
    
    if (req.isAuthenticated()) {
        if (req.user.isAdmin) {
            Product.findByIdAndDelete(id, (err, deletedItem) => {
                if(!err) {
                    console.log("Deleted product: " + id);
                    res.redirect("/")
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect("/");
            console.log("FORBIDDEN: NOT AN ADMIN");
        }
    } else {
        res.redirect("/login");
        console.log("FORBIDDEN: NOT LOGGED IN");
    }
});

app.post("/buyproduct/:id", (req, res) => {
    if(req.cookies.cart === undefined) {
        res.cookie('cart', []);
    }

    if(!req.user) {

        let id = req.params.id;
        let cart = req.cookies.cart;
        //console.log(cart);
        
        cart.push(id);
        res.cookie('cart', cart)
        res.redirect('/cart');
    }

    if(req.user) {
        let id = req.params.id;
        userId = req.user._id;
    
        User.findByIdAndUpdate(userId, {$push: { cart: id }}, (err, foundUser) => {
            if(!err) {
                console.log("Added item to cart");
                res.redirect("/cart");
            } else {
                console.log(err);
            }
        })
    }
    
})

app.listen(3000, () => {
    console.log("Server running at port 3000");
});