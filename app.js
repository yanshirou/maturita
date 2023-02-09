require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
// cookies shit
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(session({
    secret: "Toto potom treba dat do .env",
    resave: false,
    saveUninitialized: false // Toto potom checkni neviem teraz
}));

//nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.zoznam.sk',
    port: 587,
    auth: {
        user: 'postavpc@zoznam.sk',
        pass: 'HesloHesiel1234',
    },
});
transporter.verify((err, success) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Transporter verified');
    }
})


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
    img: String,
    reviews: [{
        userID: mongoose.ObjectId,
        stars: Number,
        comment: String
    }]
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
    res.send(req.cookies);

})
//temp
app.get("/clearcookies", (req, res) => {
    res.clearCookie('cookiePreference');
    res.clearCookie('cart');
    res.redirect("/cookies")
})
//temp
app.get("/sendmail", (req, res) => {
    let mailOptions = {
        from: 'postavpc@zoznam.sk',
        to: 'peter.michalik230@gmail.com',
        subject: 'Vitaj na PostavPC',
        text: 'Bol si uspesne zaregistrovany ty vandrak'
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.redirect("/");
})

app.get("/", (req, res) => {
    if (req.cookies.cart === undefined) {
        res.cookie('cart', []);
    }

    products = [];
    Product.find({ category: { $lt: 9 } }, (err, foundProducts) => {
        //Product.find({_id: "637eaca243130301784871b9"}, (err, foundProducts) => {
        if (!err) {
            foundProducts.forEach(foundProduct => products.push(foundProduct))
            res.render("home", { products: products.reverse(), user: req.user, cookiePopup: req.cookies.cookiePreference })
        } else {
            console.log(err);
        }
    })
})

app.get("/categories/:category", (req, res) => {
    let category = req.params.category;
    Product.find({ category: category }, (err, foundProducts) => {
        if (err) {
            console.log(err);
        } else {
            res.render("home", { products: foundProducts.reverse(), user: req.user, cookiePopup: req.cookies.cookiePreference });
        }
    })
})


// ADDING A NEW PRODUCT
app.get("/newprod", (req, res) => {
    if (req.isAuthenticated()) {
        if (req.user.isAdmin) {
            res.render("newprod", { user: req.user });
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
    if (req.isAuthenticated()) {
        res.render("profile", { user: req.user })
    } else {
        res.redirect("/login");
    }
})

//PRODUKTOVA STRANKA
app.get("/product/:id", async (req, res) => {
    let productID = req.params.id;


    let foundProduct = await Product.findById(productID);


    for (let i = 0; i < foundProduct.reviews.length; i++) {

        let foundUser = await User.findById(foundProduct.reviews[i].userID);
        //console.log(foundProduct.reviews[i]);

        //foundProduct.reviews[i].authorUsername = foundUser.username;
        foundProduct.reviews[i].user = foundUser;

    }


    //console.log(foundProduct);
    for (review of foundProduct.reviews) {
        console.log(review.user);
    }

    res.render("product", { user: req.user, product: foundProduct });

})

//KOSIK
app.get("/cart", (req, res) => {
    if (req.user) {
        User.findById(req.user._id, (err, foundUser) => {
            if (!err) {
                let itemIDs = foundUser.cart;


                Product.find().where('_id').in(itemIDs).exec((err, foundItems) => {
                    if (!err) {
                        res.render("cart", { user: req.user, products: foundItems });
                    } else {
                        console.log(err);
                    }

                });


            } else {
                console.log(err);
            }
        })
    }

    if (!req.user) {
        let itemIDs = req.cookies.cart
        Product.find().where('_id').in(itemIDs).exec((err, foundItems) => {
            if (!err) {
                res.render("cart", { user: req.user, products: foundItems });
            } else {
                console.log(err);
            }
        })
    }

})

app.get("/search", (req, res) => {
    let query = req.query.q;

    Product.find({ $or: [{ name: { $regex: query } }, { desc: { $regex: query } }] }, (err, foundProducts) => {
        if (!err) {
            console.log(foundProducts);
            res.render("home", { products: foundProducts, user: req.user, cookiePopup: req.cookies.cookiePreference })
        } else {
            console.log(err);
        }
    });

})

app.post("/cookiePreference", (req, res) => {
    res.cookie('cookiePreference', req.body.cookiePreference);
    res.redirect('/');
})

app.post("/register", (req, res) => {
    User.register({ username: req.body.username, email: req.body.email }, req.body.password, (err, newUser) => {
        if (!err) {
            passport.authenticate("local")(req, res, () => {

                let mailOptions = {
                    from: 'postavpc@zoznam.sk',
                    to: req.body.email,
                    subject: 'Vitaj na PostavPC!',
                    text: 'Registrácia prebehla úspešne, prajeme šťastné nakupovanie!'
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
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
        if (!err) {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/profile");
            })
        } else {
            console.log(err);
        }
    })
})

app.post('/logout', function (req, res) {
    req.logout(function (err) {
        if (!err) {
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
        if (!err) {
            console.log(newProd);
            res.redirect("/product/" + newProd._id);
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
                if (!err) {
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

app.post("/addtocart/:id", (req, res) => {


    if (!req.user) {

        let id = req.params.id;
        let cart = req.cookies.cart
        //console.log(cart);

        cart.push(id);
        res.cookie('cart', cart)
        res.redirect('/cart');
    }

    if (req.user) {
        let id = req.params.id;
        userId = req.user._id;

        User.findByIdAndUpdate(userId, { $push: { cart: id } }, (err, foundUser) => {
            if (!err) {
                console.log("Added item to cart | " + foundUser.username);
                res.redirect("/cart");
            } else {
                console.log(err);
            }
        })
    }

})

app.post("/removefromcart/:id", (req, res) => {
    if (!req.user) {

        let id = req.params.id;
        let cart = req.cookies.cart
        //console.log(cart);

        
        const index = cart.indexOf(id)
        //console.log(index);
        if(index > -1) {
            cart.splice(index, 1);
            console.log("Removed item from cart | no-acc");
            
        }
        console.log(cart);
        res.cookie("cart", cart);
        res.redirect('/cart');
    }

    if (req.user) {
        let id = req.params.id;
        userId = req.user._id;

        User.findByIdAndUpdate(userId, { $pull: { cart: id } }, (err, foundUser) => {
            if (!err) {
                console.log("Removed item from cart | " + foundUser.username);
                res.redirect("/cart");
            } else {
                console.log(err);
            }
        })
    }
})


app.post("/review/:id", (req, res) => {
    if (req.isAuthenticated()) {
        let productId = req.params.id;


        let objReview = {
            userID: req.user._id,
            stars: req.body.stars,
            comment: req.body.comment
        }

        Product.findByIdAndUpdate(productId, { $push: { reviews: objReview } }, (err, foundProduct) => {
            if (!err) {
                console.log("Added a review: " + foundProduct);
            } else {
                console.log(err);
            }
        })
        //console.log(foundProduct);
        res.redirect("/product/" + productId);
    } else {
        res.redirect("/login");
        console.log("FORBIDDEN: NOT LOGGED IN");
    }

})





app.listen(process.env.PORT, () => {
    console.log("Server running at port " + process.env.PORT);
});