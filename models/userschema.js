const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = new Schema({
    id: Number,
    name: String,
    type: String,
    author: String,
    description: String,
    cover: String,
    available: Boolean
});

const usersSchema = new Schema({
    name: {
        type: String,
    },
    username: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    borrowedBooks: [bookSchema]
});

const User = mongoose.model('User', usersSchema);
module.exports = User;
