const app = require("./app");

// Hosted port
const PORT = process.env.PORT || 3100;

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
app.use((req, res) => res.status(404).render('pages/404'));