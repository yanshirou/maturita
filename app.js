//require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-yanshiro:CreatureoftheDatabase23@cluster0.bwelaio.mongodb.net/eshopDB");

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

const Product = mongoose.model("Product", productSchema);

const newProd = new Product({
    name: "Kingston FURY 16 GB KIT DDR4 3200 MHz CL16 Beast Black",
    category: 3,
    desc: "Operačná pamäť - 2x8GB, PC4-25600, CL16-18-18, napätie 1.35V, pasívny chladič, XMP 2.0 a Single Rank",
    stock: 30,
    rating: 5,
    price: 57.90,
    img: "https://cdn.alza.sk/ImgW.ashx?fd=f16&cd=DEb16b32b2"
});

//newProd.save();



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