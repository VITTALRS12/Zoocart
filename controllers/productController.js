const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.send({
      success: true,
      data: products
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ success: false, message: 'Product not found' });
    }
    res.send({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;
    
    const newProduct = new Product({
      name,
      description,
      price,
      image,
      category,
      stock
    });

    await newProduct.save();
    res.send({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) {
      return res.status(404).send({ success: false, message: 'Product not found' });
    }

    res.send({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).send({ success: false, message: 'Product not found' });
    }

    res.send({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};