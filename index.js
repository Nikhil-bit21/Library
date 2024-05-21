const express = require('express');
const app = express();
const fs = require('fs');
const PORT = 3000;
const session = require('express-session');
const parser = require('cookie-parser');
const mongoose = require('mongoose');
const client = require('mongodb').MongoClient;
const bcrypt = require('bcryptjs');
const User = require('./models/userschema');
const Book = require('./models/booksschema');
const data = require('./JSON/data.json');

app.use(session({
    secret: "a7ph@_5022",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000*60*60*24
    }
}))

app.use(parser());

let masterName;;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");

// mongodb+srv://aditay:<password>@cluster0.1zkxt4u.mongodb.net/?retryWrites=true&w=majority
//mongodb+srv://aditay:aditay2003@cluster0.1zkxt4u.mongodb.net/${db}?retryWrites=true&w=majority
// let dbinstance;
let db = "library";
const url = `mongodb+srv://swaminikhil21:Harshit2112@cluster0.neqtuxx.mongodb.net/${db}?retryWrites=true&w=majority`;

// client.connect(url).then(database =>{
//     dbinstance = database.db("library");
//     dbinstance.collection("users");
//     console.log("Connected to MongoDb. Yeah!!!");
// })
// .catch(err =>{
//     throw err;
// })

// const coneectionParams = {
//     useUnifiedTopology: true
// }

mongoose.connect(url)
.then(result =>{
    console.log("Connected to MongoDb. Yeah!!!");
})
.catch(err =>{
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
    // throw err;
})

app.get('/', async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).render("index", { books: books, name: masterName });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/login',(req,res)=>{
    if(req.session.userId!=null) {
        res.status(200).redirect('/');
    }
    else {
        res.render("login",{msg:"Please login first"});
    }
})

app.post('/login', async(req,res)=>{
     const uname = req.body.uname;
     const upass = req.body.upass;
     masterName = uname;

     if(uname === 'admin'){
        try {
            const user = await User.findOne({username: uname});
            if(user) {
                const Userpassword = await bcrypt.compare(upass, user.password);
                if(Userpassword) {
                    req.session.userId = user._id.toString();
                    //res.status(200).render("admin",{books:data,name: masterName});
                    res.redirect('/');
                }
            }
            else {
                masterName = "";
                res.render("login",{msg: "Username or password does not match"});
            }
        }
        catch(err) {
            console.error(err);
            res.status(500).send("Error during Login");
        }
     }
     else {
        try {
            const user = await User.findOne({username: uname});
            if(user) {
                const isPasswordMatch = await bcrypt.compare(upass,user.password);
                if(isPasswordMatch) {
                    //req.session.userId = uname;
                    req.session.userId = user._id.toString();
                    //console.log(req.session.userId);
                    res.status(200).redirect('/');
                }
                else {
                    masterName = "";
                    res.render('login',{msg: "Username or password does not match"});
                }
            }
            else {
                res.render('login',{msg: "Unable to find user with this username"});
            }
            
            }
            catch(err) {
                console.log(err);
                res.status(500).send("Error during Login");
            }
     }
})

app.get('/admin',(req,res)=>{
    res.status(200).render('admin',{books:data,name: masterName});
})

app.get('/signup',(req,res)=>{
    res.status(200).render("signup",{msg:""});
})

app.post('/signup',async(req,res)=>{
    const name = req.body.Pname;
    const username = req.body.Puname;
    const password = req.body.upass;

    try {
        const hashedPassword = await bcrypt.hash(password,10);
        const userObj = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await userObj.save();
        res.render("signup",{msg:"User Created Successfully"});
    }
    catch (err) {
        if(err.code===11000) {
            res.render("signup",{msg:"Username already taken"})
        }
        else if (err.code!=11000) {
            res.render("signup",{msg:"There was an error creating new user"});
        }
        else {
            res.render("signup",{msg:"User created successfully"});
        }
    }
})


app.get('/profile', async (req, res) => {
    if (req.session.userId != null) {
      try {
        const user = await User.findById(req.session.userId);
        res.render('profile', {borrowedBooks: user.borrowedBooks,name: masterName});
      } catch (error) {
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('login', { msg: 'Please login first' });
    }
  });
  

//ADD and remove books form array of user.

app.get('/add/:id',async (req,res)=>{
    if(req.session.userId!=null) {
        const bookId = parseInt(req.params.id);
        const book = await Book.findOne({id: bookId});

        if(book) {
            const user = await User.findById(req.session.userId);
            const bookIndex = user.borrowedBooks.findIndex((item) => item.id === parseInt(bookId));
            if (bookIndex !== -1) {
                res.status(409).send('Book already borrowed');
            }
            const bookToAdd = {
                id: book.id,
                name: book.name,
                type: book.type,
                author: book.author,
                description: book.description,
                cover: book.cover,
                available: book.available
            };
            user.borrowedBooks.push(bookToAdd);
            book.available = false;
            await user.save();
            await book.save();
            res.redirect('/');
        }
        else {
            res.status(404).send('Book not found');
        }
    }
    else {
        res.render("login", { msg: "Please login first" });
    }
})

app.get('/remove/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.render("login", { msg: "Please login first" });
        }

        const bookId = parseInt(req.params.id);
        console.log(typeof(bookId));
        console.log(bookId);
        const book = await Book.findOne({ id: bookId });

        if (!book) {
            return res.status(404).send('Book not found');
        }

        const user = await User.findById(req.session.userId);

        const bookIndex = user.borrowedBooks.findIndex((item) => item.id === bookId);

        if (bookIndex === -1) {
            return res.status(404).send('Book not borrowed by the current user');
        }

        user.borrowedBooks.splice(bookIndex, 1);
        book.available = true;

        await user.save();
        await book.save();

        return res.redirect('/');
    } catch (error) {
        console.error('Error removing book:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.get('/addbook',(req,res)=>{
    if(req.session.userId!=null && masterName==='admin') {
        res.status(200).render('admin',{name: masterName});
    }
})

app.post('/addbook',async(req,res)=>{
    const name = req.body.Bname;
    const type = req.body.Btype;
    const author = req.body.Bauthor;
    const description = req.body.Bdescription;
    const cover = req.body.Bcover;

    try {
        const lastBook = await Book.findOne().sort({id: -1});
        const newBook = new Book({
            id: lastBook ? lastBook.id+1 : 1,
            name: name,
            type: type,
            author: author,
            description: description,
            cover: cover,
            available: true
        })
        await newBook.save();
        res.redirect('/');
    }
    catch(err) {
        console.log("Error in adding new Book");
        response.status(500).send("Error adding new Book");
    }
})

app.get('/return/:id',async (req,res)=>{
    if(req.session.userId!=null) {
        const bookId = parseInt(req.params.id);
        const book = await Book.findOne({id: bookId});

        if(book) {
            const user = await User.findById(req.session.userId);
            const bookIndex = user.borrowedBooks.findIndex((item) => item.id === parseInt(bookId));
            if (bookIndex !== -1) {
                user.borrowedBooks.splice(bookIndex, 1);
                book.available = true;
                await user.save();
                await book.save();
                res.redirect('/profile');
            } else {
                res.status(404).send('Book not found in the user\'s borrowed books');
            }
        }
        else {
            res.status(404).send('Book not found');
        }
    }
    else {
        res.render("login", { msg: "Please login first" });
    }
})

app.get('/logout',(req,res)=>{
    req.session.destroy();
    masterName="";
    res.redirect('/');
})

//Code to BulkSave all books from local to mongoDB
// app.get('/insert',(req,res)=>{
//     fs.readFile('./JSON/data.json', 'utf8', (err, data) => {
//         if (err) {
//           console.error('Failed to read data.json:', err);
//           return;
//         }
      
//         const books = JSON.parse(data);
      
//         Book.insertMany(books)
//           .then(() => {
//             console.log('Books inserted into MongoDB');
//           })
//           .catch((error) => {
//             console.error('Failed to insert books into MongoDB:', error);
//           });
//       });
// })

app.listen(PORT, (err)=>{
    if(err) {
        throw err;
    }
    console.log(`listening on port ${PORT}`);
})