const assert = require("assert");
const request = require("supertest");
// This pulls the whole server, but we really just want the "app" component
// Consider how to separate out the "app" from the rest of the server
const app = require("../app");

// TODO: Learn how to test Express.js routes
describe("Unit testing the books API route", function () {
  it("Should return a 200 success value", function () {
    return 0;
  });
});
