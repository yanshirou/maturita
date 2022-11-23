//require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/eshopDB");

const productSchema = new mongoose.Schema({
    name: String,
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

const Product = mongoose.model("Product", productSchema);

const gpu = new Product({
    name: "MSI GeForce RTX 3080 VENTUS 3X PLUS 10G OC LHR",
    desc: "Graphics Card - 10GB GDDR6X (19000MHz), NVIDIA GeForce Ampere (GA102, 1440 MHz), Boost 1740 MHz, PCI Express x16 4.0 , 320Bit, DisplayPort 1.4a and HDMI 2.1, LHR (Low Hash Rate)",
    stock: 4,
    rating: 5,
    price: 896.90,
    img: "/images/MSI GeForce RTX 3080 VENTUS 3X PLUS 10G OC LHR.jfif"
});

//gpu.save();



app.get("/", (req, res) => {
    products = [];
    Product.find({}, (err, foundProducts) => {
        if(!err){
            foundProducts.forEach(foundProduct => products.push(foundProduct))
            res.render("home", {products: products})
        } else {
            console.log(err);
        }
    })
})



app.listen(3000, () => {
    console.log("Server running at port 3000");
});