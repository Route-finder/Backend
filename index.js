/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Node Module Imports (Using CommonJS syntax)
 */

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
app.get('/', (req, res) => res.render('pages/index'));
app.get('/cool', (req, res) => res.send(cool()));

// DB Information - From "Hello World" presentation
app.get('/db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM test_table');
    const results = { 'results': (result) ? result.rows : null};
    console.log(results);
    res.render('pages/db', results );
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Route Information
app.get('/route', async (req, res) => {
  try {
    const client = await pool.connect();
                                                  // Use table name
    const result = await client.query('SELECT * FROM booklist ORDER BY call_no');
    const results = { 'results': (result) ? result.rows : null};
    console.log(results);
    res.render('pages/route', results );
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Adding Books
app.get('/add', (req, res) => {
  let result = null;
  res.render('pages/add', {result: result});
});
app.post('/add', async (req, res) => {
  // Submit request to OCLC with ISBN
  let book = {
    isbn: req.body.isbn,
    title: "",
    author: "",
    call_no: ""
  };

  // Treat the callback as a ".then()" sort of function
  classify.classify(req.body.isbn, "isbn", async function (data) {
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
    } catch (err) {
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
app.get('/api', (req, res) => {
  res.json({ "message": "Hello from the backend!" });
});

// Provides list of books from database, no parameters needed
app.get('/api/books', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM booklist ORDER BY call_no'); // ORDER BY call_no
    const results = { 'results': (result) ? result.rows : null};

    // Sort the results according to LCC call number
    results.results.sort((a, b) => {
      return lc.lt(a.call_no, b.call_no);
    });

    res.json(results);
    client.release();
  } catch (err) {
    console.error(err);
    res.json({"Error": err});
  }
});

app.post('/api/search', async (req, res) => {
  console.log("Request Body: ", req.body);
  
  if (req.body.isbn) {
    let book = {
      isbn: req.body.isbn,
      title: "",
      author: "",
      call_no: ""
    };
  
    // Treat the callback as a ".then()" sort of function
    classify.classify(req.body.isbn, "isbn", async function (data) {
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
      } catch (err) {
        console.log(err.stack)
      }

      res.json({"Status": "Success", "book": book});
    });
  }

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

/**
 * Listen on PORT for requests, start the server
 */ 
app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});

// Define a 404 Route
app.use((req, res) => res.status(404).render('pages/404'));

/**
 * Auxilary Functions
 * - skip_shelves
 */

// path: Array of (upper bound (LOC code), distance)
// initial: LOC code
function skip_shelves(path, initial) {
    for (let i in skip_shelves) {
	let [upper, dist] = path[i];
    }
}
