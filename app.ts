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

// Session Cookie Management
const cookieParser = require('cookie-parser');
app.use(cookieParser());

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
 * @param newItem: book
 */
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
app.get('/', (req: any, res: any) => {
  console.log("Cookies:", req.cookies);
  res.render('pages/index');
});

// Route Information
app.get('/route', async (req: any, res: any) => {
  console.log("Current User:", req.cookies.name);
  try {
    const client = await pool.connect();

    const text = "SELECT * FROM booklist WHERE username = $1";
    const values = [req.cookies.name];
    const result = await client.query(text, values);
    const results = { 'results': (result) ? result.rows : null};
    
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
  console.log("Cookies:", req.cookies);
  let result = null;
  res.render('pages/add', {result: result});
});

/**
 * Add page POST route
 */
app.post('/add', async (req: any, res: any) => {
  console.log("Cookies:", req.cookies);
  // Submit request to OCLC with ISBN
  if (req.body.isbn) {
    let isbnSearch = ISBN.parse(req.body.isbn);
    
    if (isbnSearch) {
      let item = {
        isbn: isbnSearch.asIsbn13(),
        title: "",
        author: "",
        call_no: ""
      };

      console.log(`Item: ${item.isbn}`);
    
      // Call classify method with request_type, identifier[], and callback()
      classify.classify("isbn", [item.isbn], async function (data: any) {
        console.log(data);
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
  console.log("Cookies:", req.cookies);
  res.json({ "message": "Hello from the backend!" });
});

/**
 * @description
 * Provides list of books from database
 */
app.get('/api/books', async (req: any, res: any) => {
  // API will use HTTP header parameters to specify users
  console.log("Current User:", req.query.name.length);
  try {
    const client = await pool.connect();

    let text = "";
    let values: string[] = [];

    if (req.query.name.length > 0) {
      console.log("Name found");
      text = "SELECT * FROM booklist WHERE username = $1";
      values = [req.query.name];
    }
    // Fallback for no-user session, "login" should be enforced in future update
    else {
      console.log("Name NOT found");
      text = "SELECT * FROM booklist WHERE username=$1";
      values = ["NULL"]
    }

    const result = await client.query(text, values);
    console.log(result.rows);
    const results = { 'results': (result) ? result.rows : null};

    res.json(results);
    client.release();
    
    // Sort the results according to LCC call number
    // results = results.sort((a: any, b: any) => {
    //   return lc.lt(a.call_no, b.call_no);
    // });
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
  console.log("Cookies:", req.cookies);
  // Submit request to OCLC with ISBN
  if (req.body.isbn) {
    let isbnSearch = ISBN.parse(req.body.isbn);
    
    if (isbnSearch) {
      let item = {
        isbn: isbnSearch.asIsbn13(),
        title: "",
        author: "",
        call_no: ""
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

/**
 * @description
 * Provides a route via which to remove an item from the database
 * 
 * @param
 * {json} req - provides the request body, requires req.body.isbn be populated
 */
app.post('/api/remove', async (req: any, res: any) => {
  console.log("Cookies:", req.cookies);
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
