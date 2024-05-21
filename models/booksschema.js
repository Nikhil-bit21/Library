const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = new Schema({
  id: Number,
  name: String,
  type: String,
  author: String,
  description: String,
  cover: String,
  available: {
    type: Boolean,
    default: true
  }
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
