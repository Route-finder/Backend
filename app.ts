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
  call_no: string,
  username: string
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

// Session Cookie Management
const cookieParser = require('cookie-parser');
app.use(cookieParser());

/**
 * Application Set-up and configuration
 */

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
 * @param newItem: book
 */
async function addToDatabase(newItem: book) {
  // Add book info (from OCLC response) to Database
  const client = await pool.connect();
  const text = "INSERT INTO booklist(isbn, author, title, call_no, username) VALUES($1, $2, $3, $4, $5) RETURNING *"
  const values = [newItem.isbn, newItem.author, newItem.title, newItem.call_no, newItem.username];

  try {
    const res = await client.query(text, values);
  } catch (err: any) {
    const res = err.stack;
  }
}

/**
 * @function
 * build_db - (re)build tables
 * 
 * @description
 * Rebuild PostgreSQL tables on restart
 */
async function build_db() {
  const client = await pool.connect();
  const text = "CREATE TABLE IF NOT EXISTS booklist (VALUES($1, $2, $3, $4, $5))"
  const values = [
    "isbn VARCHAR(16) PRIMARY KEY",
    "author VARCHAR(50)",
    "title VARCHAR(150)",
    "call_no VARCHAR(40)",
    "username VARCHAR(64)"
  ];
  
  try {
    const res = await client.query(text, values);
  } catch (err: any) {
    const res = err.stack;
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
app.get('/', (req: any, res: any) => {
  res.render('pages/index');
});

// Route Information
app.get('/route', async (req: any, res: any) => {
  try {
    const client = await pool.connect();

    const text = "SELECT * FROM booklist WHERE username = $1";
    const values = [req.cookies.name];
    const result = await client.query(text, values);
    const results = { 'results': (result) ? result.rows : null};
    
    res.render('pages/route', results );
    client.release();
  } catch (err: any) {
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
    
    if (isbnSearch) {
      let item = {
        isbn: isbnSearch.asIsbn13(),
        title: "",
        author: "",
        call_no: "",
        username: req.cookies.name
      };
    
      // Call classify method with request_type, identifier[], and callback()
      classify.classify("isbn", [item.isbn], async function (data: any) {
        item.title = data.title;
        // Handle OCLC's grouping of authors, translators, etc.
        item.author = data.author.split("|")[0];
        item.call_no = data.congress;

        if (item.title != "") {
          await addToDatabase(item);
        }

        else {
          console.log("status: failure", "error:", data);
        }

        // Print a message
        res.render('pages/add', {result: item});
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
  // API will use HTTP header parameters to specify users
  try {
    const client = await pool.connect();

    let text = "SELECT * FROM booklist WHERE username = $1";
    let values: string[] = [req.query.name];

    const result = await client.query(text, values);
    const results = { 'results': (result) ? result.rows : null};

    if (req.query.name.length > 0) {
      res.json(results);
    }
    // Enforce username requirement
    else {
      res.json({'error': 'No Username Provided'});
    }

    client.release();
    
    // Sort the results according to LCC call number
    // results = results.sort((a: any, b: any) => {
    //   return lc.lt(a.call_no, b.call_no);
    // });
  } catch (err: any) {
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
  // Submit request to OCLC with ISBN
  if (req.body.isbn && req.body.name) {
    let isbnSearch = ISBN.parse(req.body.isbn);
    
    if (isbnSearch) {
      let item = {
        isbn: isbnSearch.asIsbn13(),
        title: "",
        author: "",
        call_no: "",
        username: req.body.name
      };
    
      // Call classify method with request_type, identifier[], and callback()
      classify.classify("isbn", [req.body.isbn], async function (data: any) {
        item.title = data.title;
        // Handle OCLC's grouping of authors, translators, etc.
        item.author = data.author.split("|")[0];
        item.call_no = data.congress;

        if (item.title != "") {
          await addToDatabase(item);
          res.json({"status": "success", "book": item});
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

  // Account for title and author search
  else if (req.body.title || req.body.author) {
    let values = [req.body.title, req.body.author];

    classify.classify("title-author", values, async function (data: any) {
      if (data) {
        res.json({"status": "success", "results": data});
      }

      else {
        res.json({"status": "failure", "error": data})
      }
    })
  }

  else if (req.body.wi && req.body.name) {
    try {
      let item = {
        isbn: "",
        title: "",
        author: "",
        call_no: "",
        username: req.body.name
      };
    
      // Call classify method with request_type, identifier[], and callback()
      classify.classify("wi", [req.body.wi], async function (data: any) {
        item.title = data.title;
        // Handle OCLC's grouping of authors, translators, etc.
        item.author = data.author.split("|")[0];
        item.call_no = data.congress;

        if (item.title != "") {
          await addToDatabase(item);
          res.json({"status": "success", "book": item});
        }
        
        else {
          res.json({"status": "failure", "error": data})
        }
      });
    }

    catch (err: any) {
      res.json({"status": "failure", "error": err});
    }
  }

  // Account for no information entered
  else {
    res.json({"status": "failure", "error": "No Values Provided"});
  }
});

/**
 * @description
 * Provides a route via which to remove all items associated with a given user
 * from the database
 * 
 * @param
 * {json} req - provides the request body, requires req.body.isbn be populated
 */
app.post('/api/remove', async (req: any, res: any) => {
  // Submit a query to remove the book
  if (req.body.name) {
    try {
      // Connect to the DB
      const client = await pool.connect();

      // Define Parameters
      const text = "DELETE FROM booklist WHERE username = $1";
      const values: string[] = [req.body.name];

      console.log(values);

      // Submit query
      const results = await client.query(text, values);

      console.log(results);

      // Return JSON if success
      res.json({"Status": "Success"});
    } catch (err: any) {
      res.json({"Status": "Failure", "Error": err})
    }

  }
});

module.exports = app;
