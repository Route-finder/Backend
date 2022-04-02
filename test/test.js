const assert = require("assert");
const request = require("supertest");
const app = require("../app");

describe("Unit testing the Backend API", function () {
  it("Basic API Route Returns JSON", function (done) {
    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it("Returns the Booklist as JSON", function (done) {
    request(app)
      // include query parameter in request URL
      .get('/api/books?name=Isaac')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
/*
  it("Search route returns JSON", function (done) {
    this.timeout(3500);
    request(app)
      .post('/api/search')
      .send({isbn: '9780380807345', name: 'Isaac'})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
  */
});

describe("Unit testing the Express.js Routes", function () {
  it("Homepage Returns a successful response", function (done) {
    request(app)
      .get('/')
      .expect(200, done);
  });

  it("Search Page Returns a successful response", function (done) {
    request(app)
      .get('/add')
      .expect(200, done);
  });

  it("Route Page Returns a successful response", function (done) {
    request(app)
      .get('/route')
      .expect(200, done);
  });
});
