import supertest from 'supertest';

import app from '../src/app.js';
import connection from '../src/database.js';

import { login } from './utils.js';

describe("POST /songs", () => {
  it("should respond with status 401 when token is invalid", async () => {
    const token = "token_invalido";

    const response = await supertest(app).post("/songs").set('Authorization', `Bearer ${token}`);

    expect(response.status).toEqual(401);
  });

  it("should respond with status 201 when token is valid", async () => {
    const token = await login();

    const body = {
      title: 'Música',
      plays: 10
    };

    const response = await supertest(app).post("/songs").send(body).set('Authorization', `Bearer ${token}`);

    expect(response.status).toEqual(201);
  });
});

describe("GET /songs", () => {
  it("should respond with status 200", async () => {
    const response = await supertest(app).get("/songs");
    expect(response.status).toEqual(200);
  });
});

beforeEach(async () => {
  await connection.query(`DELETE FROM users`);
  await connection.query(`DELETE FROM songs`);
});

afterAll(() => {
  connection.end();
});
