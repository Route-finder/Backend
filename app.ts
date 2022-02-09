/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Node Module Imports (Using CommonJS syntax)
 */

// @ts-check

// Express routing app
const express = require('express');
const app = express();

// Temporary CORS enablement
const cors = require("cors");
app.use(cors());

// Form validation
const multer = require('multer');
const upload = multer();
const { body, validationResult } = require('express-validator');

// const cool = require('cool-ascii-faces');
// Routing
const path = require('path');

// Classification and LOC sorting
const classify = require('classify2_api');
const lc = require('lc_call_number_compare');


/**
 * Application Set-up and configuration
 */

// Hosted port
const PORT = process.env.PORT || 3100;

// Response parsers for json, xwww-form-urlencoded, multipart/form-data
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));
app.use(upload.array());

app.use(express.static('public'));

// Set the path for web page source files and ejs engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Initialize connection to PostgreSQL database
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Define the application routes
 *  - Homepage (/)
 *  - Database (/db)
 *  - Route and Book List (/route)
 *  - Adding Books (/add) GET and POST
 *  - React Client API (/api)
 */

// Homepage
app.get('/', (req: any, res: any) => res.render('pages/index'));

// DB Information - From "Hello World" presentation
app.get('/db', async (req: any, res: any) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM test_table');
    const results = { 'results': (result) ? result.rows : null};
    console.log(results);
    res.render('pages/db', results );
    client.release();
  } catch (err: any) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Route Information
app.get('/route', async (req: any, res: any) => {
  try {
    const client = await pool.connect();
                                                  // Use table name
    const result = await client.query('SELECT * FROM booklist ORDER BY call_no');
    const results = { 'results': (result) ? result.rows : null};
    console.log(results);
    res.render('pages/route', results );
    client.release();
  } catch (err: any) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Adding Books
app.get('/add', (req: any, res: any) => {
  let result = null;
  res.render('pages/add', {result: result});
});
app.post('/add', async (req: any, res: any) => {
  // Submit request to OCLC with ISBN
  let book = {
    isbn: req.body.isbn,
    title: "",
    author: "",
    call_no: ""
  };

  // Treat the callback as a ".then()" sort of function
  classify.classify(req.body.isbn, "isbn", async function (data: any) {
    book.title = data.title;
    book.author = data.author;
    book.call_no = data.congress;
    console.log("book:", book);

    // Add book info (from OCLC response) to Database
    const client = await pool.connect();
    const text = "INSERT INTO booklist(isbn, author, title, call_no) VALUES($1, $2, $3, $4) RETURNING *"
    const values = [book.isbn, book.author, book.title, book.call_no];
  
    try {
      const res = await client.query(text, values)
      console.log(res.rows[0])
    } catch (err: any) {
      console.log(err.stack)
    }
  
    // Placeholder: Print a message
    const result = book;
    res.render('pages/add', {result: result});
  });
});

/**
 * API for React client frontend
 */

// Generic "hello world!" api route
app.get('/api', (req: any, res: any) => {
  res.json({ "message": "Hello from the backend!" });
});

// Provides list of books from database, no parameters needed
app.get('/api/books', async (req: any, res: any) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM booklist'); // ORDER BY call_no
    const results = { 'results': (result) ? result.rows : null};

    // Sort the results according to LCC call number
    results.results.sort((a: any, b: any) => {
      return lc.lt(a.call_no, b.call_no);
    });

    res.json(results);
    client.release();
  } catch (err: any) {
    console.error(err);
    res.json({"Error": err});
  }
});

app.post('/api/search', async (req: any, res: any) => {
  console.log("Request Body: ", req.body);
  
  if (req.body.isbn) {
    let book = {
      isbn: req.body.isbn,
      title: "",
      author: "",
      call_no: ""
    };
  
    // Treat the callback as a ".then()" sort of function
    classify.classify(req.body.isbn, "isbn", async function (data: any) {
      book.title = data.title;
      book.author = data.author;
      book.call_no = data.congress;
      console.log("book:", book);
  
      // Add book info (from OCLC response) to Database
      const client = await pool.connect();
      const text = "INSERT INTO booklist(isbn, author, title, call_no) VALUES($1, $2, $3, $4) RETURNING *"
      const values = [book.isbn, book.author, book.title, book.call_no];
    
      try {
        const res = await client.query(text, values)
        console.log(res.rows[0])
      } catch (err: any) {
        console.log(err.stack)
      }

      res.json({"Status": "Success", "book": book});
    });
  }

  // TODO: Account for title and author search
  else if (req.body.title) {
  	console.log(req.body.title);
  }
  else if (req.body.author) {
  	console.log(req.body.author)
  }
  
  else {
  	console.log("Nothing entered");
    res.json("No Values Provided");
  }
});

app.post('/api/remove', async (req: any, res: any) => {
  if (req.body.isbn) {
    // Submit a query to remove the book
    console.log(`Remove book with ISBN ${req.body.isbn} from the list`);

    // Add book info (from OCLC response) to Database
    const client = await pool.connect();
    const text = "DELETE FROM booklist WHERE isbn=VALUES($1)"
    const values = [req.body.isbn];
  
    try {
      const res = await client.query(text, values)
    } catch (err: any) {
      console.log(err.stack)
    }

    res.json({"Status": "Success"});
  }
});

/**
 * Listen on PORT for requests, start the server
 */ 
app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});

// Define a 404 Route
app.use((req: any, res: any) => res.status(404).render('pages/404'));
