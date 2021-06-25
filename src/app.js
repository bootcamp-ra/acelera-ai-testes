import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

import connection from './database.js';

const app = express();
app.use(express.json());
app.use(cors());

app.post("/sign-up", async (req, res) => {
	try {
		const { name, password, email } = req.body;
		const hashedPassword = bcrypt.hashSync(password, 10);

    const existingUserResult = await connection.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    const existingUser = existingUserResult.rows[0];

    if (!existingUser) {
      await connection.query(
        `INSERT INTO users (name, password, email) VALUES ($1,$2,$3)`,
        [name, hashedPassword, email]
      );
  
      res.sendStatus(201);
    } else {
      res.sendStatus(409);
    }
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.post("/sign-in", async (req, res) => {
	try {
		const { email, password } = req.body;

		const result = await connection.query(
			`SELECT * FROM users WHERE users.email = $1`,
			[email]
		);

		const user = result.rows[0];

		if (user && bcrypt.compareSync(password, user.password)) {
			const token = uuid();

			await connection.query(
				`INSERT INTO sessions ("userId", token) VALUES ($1, $2)`,
				[user.id, token]
			);

			res.send({ token });
		} else {
			res.sendStatus(401);
		}
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.post("/songs", async (req, res) => {
	try {
		const { title, plays } = req.body;

		const authorization = req.headers["authorization"];
		const token = authorization.replace("Bearer ", "");

    const user = await connection.query(
			`
				SELECT * FROM sessions 
				JOIN users ON users.id = sessions."userId"
				WHERE sessions.token = $1
			`,
			[token]
		);

    if (user.rows[0]) {
			await connection.query(
        `INSERT INTO songs (title, plays) VALUES ($1,$2)`,
        [title, plays]
      );

			res.sendStatus(201);
		} else {
			res.sendStatus(401);
		}
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.get("/songs", async (req, res) => {
	try {
    const result = await connection.query(`SELECT * FROM songs`);
    res.send(result.rows);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

// usuario marca musica como favorita
app.post("/songs/:songId/bookmark", async (req, res) => {
	try {
		const { songId } = req.params;

		const music = await connection.query(
			`SELECT * FROM songs WHERE id = $1`,
			[songId]
		);

		if (!music.rows[0]) {
			return res.sendStatus(404);
		}

    const authorization = req.headers["authorization"];
		const token = authorization.replace("Bearer ", "");

    const user = await connection.query(
			`
				SELECT * FROM sessions 
				JOIN users ON users.id = sessions."userId"
				WHERE sessions.token = $1
			`,
			[token]
		);

    if (user.rows[0]) {
      const userId = user.rows[0].id;

      await connection.query(
        `INSERT INTO "songsUsers" ("userId", "songId") VALUES ($1, $2)`,
        [userId, songId]
      );
  
      res.sendStatus(201);
    } else {
      res.sendStatus(401);
    }
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

// pega os usuarios e suas musicas favoritas.
app.get("/users/songs", async (req, res) => {
	try {
		const result = await connection.query(`
			SELECT users.*, songs.title AS "songName" FROM users
			JOIN "songsUsers" ON users.id = "songsUsers"."userId"
			JOIN songs ON songs.id = "songsUsers"."songId"   
		`);

		res.send(result.rows);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

// pega as musicas favoritas de um usuario
app.get("/users/:userId/songs", async (req, res) => {
	try {
		const { userId } = req.params;

    const existingUser = await connection.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (!existingUser.rows[0]) {
      res.sendStatus(404);
    } else {
      const result = await connection.query(
        `
          SELECT songs.title AS "songName" FROM users
          JOIN "songsUsers" ON users.id = "songsUsers"."userId"
          JOIN songs ON songs.id = "songsUsers"."songId"
          WHERE users.id = $1
        `,
        [userId]
      );

      res.send(result.rows);
    }
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

export default app;
