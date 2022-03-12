/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Node Module Imports (Using CommonJS syntax)
 */

// @ts-check

/**
 * Define types for TypeScript
 */
type book = {
  isbn: string,
  title: string,
  author: string,
  call_no: string
}

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

// ISBN Validation
const ISBN = require('isbn').ISBN;

// Routing
const path = require('path');

// Classification and LOC sorting
const classify = require('classify2_api');
const lc = require('lc_call_number_compare');

//here's a comment

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
 * @function
 * build_db - (re)build tables
 * 
 * @description
 * Rebuild PostgreSQL tables on restart
 */
async function build_db() {
  const client = await pool.connect();
  const text = "CREATE TABLE IF NOT EXISTS booklist (VALUES($1, $2, $3, $4))"
  const values = [
    "isbn VARCHAR(16) PRIMARY KEY",
    "author VARCHAR(50)",
    "title VARCHAR(150)",
    "call_no VARCHAR(40)"
  ];
  
  try {
    const res = await client.query(text, values)
    console.log(res.rows[0])
  } catch (err: any) {
    console.log(err.stack)
  }
}

build_db();

/**
 * @description
 * Define the application routes
 *  - Homepage (/)
 *  - Route and Book List (/route)
 *  - Adding Books (/add) GET and POST
 *  - React Client API (/api)
 */

/**
 * Homepage GET route
 */
app.get('/', (req: any, res: any) => res.render('pages/index'));

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

/**
 * Add page GET route
 */
app.get('/add', (req: any, res: any) => {
  let result = null;
  res.render('pages/add', {result: result});
});

/**
 * Add page POST route
 */
app.post('/add', async (req: any, res: any) => {
  // Submit request to OCLC with ISBN
  if (req.body.isbn) {
    let isbnSearch = ISBN.parse(req.body.isbn);
    console.log(isbnSearch);
    
    if (isbnSearch.isIsbn10() || isbnSearch.isIsbn13()) {
      let book = {
        isbn: req.body.isbn,
        title: "",
        author: "",
        call_no: ""
      };
    
      // Call classify method with request_type, identifier[], and callback()
      classify.classify("isbn", [req.body.isbn], async function (data: any) {
        book.title = data.title;
        book.author = data.author;
        book.call_no = data.congress;
        
        if (book.title != "") {
          addToDatabase(book);
        }

        else {
          console.log("status: failure", "error:", data);
        }

        // Print a message
        res.render('pages/add', {result: book});
      });
    }

    else {
      res.render('pages/add', {result: "failure: Invalid ISBN"});
    }
  }
});

/**
 * @description
 * API for React client frontend
 */

/**
 * @description
 * Generic "hello world!" api route
 */
app.get('/api', (req: any, res: any) => {
  res.json({ "message": "Hello from the backend!" });
});

/**
 * @description
 * Provides list of books from database
 */
app.get('/api/books', async (req: any, res: any) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM booklist'); // ORDER BY call_no
    const results = { 'results': (result) ? result.rows : null};

    // Sort the results according to LCC call number
    // results = results.sort((a: any, b: any) => {
    //   return lc.lt(a.call_no, b.call_no);
    // });

    res.json(results);
    client.release();
  } catch (err: any) {
    console.error(err);
    res.json({"Error": err});
  }
});

/**
 * @description
 * Provides a single item result from the OCLC API via the classify2_api
 * Node module
 * 
 * @param
 * {json} req - provides the request body, search uses the isbn attribute 
 */
app.post('/api/search', async (req: any, res: any) => {
  console.log("Request Body: ", req.body);
  
  if (req.body.isbn) {
    let isbnSearch = ISBN.parse(req.body.isbn);
    
    if (isbnSearch.isIsbn10() || isbnSearch.isIsbn13()) {
      let book = {
        isbn: req.body.isbn,
        title: "",
        author: "",
        call_no: ""
      };
    
      // Call classify method with request_type, identifier[], and callback()
      classify.classify("isbn", [req.body.isbn], async function (data: any) {
        if (data.title) {
          book.title = data.title;
          book.author = data.author;
          book.call_no = data.congress;

          addToDatabase(book);
      
          res.json({"status": "success", "book": book});
        }
        else {
          res.json({"status": "failure", "error": data})
        }
      });
    }

    else {
      res.json({"status": "failure", "error": "Invalid ISBN"});
    }
  }

  // TODO: Account for title and author search
  else if (req.body.title || req.body.author) {
    let values = [req.body.title, req.body.author];

    console.log(values);
  }

  // Account for no information entered
  else {
    console.log("Nothing entered");
    res.json({"status": "failure", "error": "No Values Provided"});
  }
});

async function addToDatabase(newItem: book) {
  // Add book info (from OCLC response) to Database
  const client = await pool.connect();
  const text = "INSERT INTO booklist(isbn, author, title, call_no) VALUES($1, $2, $3, $4) RETURNING *"
  const values = [newItem.isbn, newItem.author, newItem.title, newItem.call_no];

  try {
    const res = await client.query(text, values)
    console.log(res.rows[0])
  } catch (err: any) {
    console.log(err.stack)
  }
}

/**
 * @description
 * Provides a route via which to remove an item from the database
 * 
 * @param
 * {json} req - provides the request body, requires req.body.isbn be populated
 */
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
 * @function
 * 
 * @description
 * Listen on PORT for requests, start the server
 */ 
app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});

/**
 * @description
 * Define a 404 Route
 */
app.use((req: any, res: any) => res.status(404).render('pages/404'));
