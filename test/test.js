const assert = require("assert");
const request = require("supertest");
const app = require("../app");

describe("Unit testing the Backend API", function () {
  it("Returns the Booklist as JSON", function (done) {
    request(app)
      // include query parameter in request URL
      .get('/api/books?name=Isaac')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
