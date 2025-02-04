import 'dotenv/config';
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path'; // Import path module
import { pool } from './db';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { initializeAuth} from './auth';
import fs from 'fs';
import yaml from 'js-yaml';

const SECRET_KEY: string | undefined = process.env.JWT_SECRET 
if (SECRET_KEY === null) {
  console.error('JWT_SECRET is not set in the environment');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(initializeAuth());

// Port and Host
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Swagger options with absolute path and glob pattern
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library API',
      version: '1.0.0',
      description: 'API documentation',
    },
    servers: [
      {
        url: `http://${HOST}:${PORT}`,
      },
    ],
  },
  apis: [path.join(__dirname, '**/*.ts')], // Adjust based on your project structure
};

// Generate Swagger Spec
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Debug: Log the Swagger Spec to verify
console.log('Generated Swagger Specification:', JSON.stringify(swaggerSpec, null, 2));

const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8')) as object;
// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

interface BooksResultRow {
  book_id: number,
  title: string,
  author: string,
  is_available: boolean
};

interface BooksGetParam {
  book_id?: number,
  title?: string,
  author?: string
}

interface BooksResponseItem {
  title: string,
  author: string,
  is_available: boolean
};

interface BooksGetResponse extends Array<BooksResponseItem>{};

/**
 * Basic SQL Grammar (PostgreSQL):
 * 
 * -- Select all columns from the "books" table
 * SELECT * FROM books;
 * 
 * -- Select specific columns from the "books" table
 * SELECT title, author FROM books;
 * 
 * -- Filtering results using WHERE clause
 * SELECT * FROM books WHERE author = 'George Orwell';
 * 
 * -- Partial matching with LIKE (case-sensitive) or ILIKE (case-insensitive)
 * SELECT * FROM books WHERE title ILIKE '%1984%';
 * 
 * -- Combining multiple conditions with AND/OR
 * SELECT * FROM books WHERE author = 'George Orwell' AND is_available = true;
 * 
 * -- Ordering results
 * SELECT * FROM books ORDER BY title ASC;
 * 
 * -- Limiting and offsetting results (for pagination)
 * SELECT * FROM books LIMIT 10 OFFSET 20;
 */
function getBooksSQLQuery(params: BooksGetParam | null) : string {
  if (!params) {
    return 'SELECT * FROM books';
  } else {
    const {book_id, title, author} = params;
    const conditions: string[] = [];
    if (book_id != null) {
      conditions.push(`book_id = ${book_id}`);
    }
    if (title != null) {
      conditions.push(`title ILIKE '%${title}%'`);
    }
    if (author != null) {
      conditions.push(`author ILIKE '%${author}%'`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}`: '';
    return `SELECT * FROM books ${whereClause}`;
  }
}

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get books
 *     description: Returns an array of books. Supports optional filtering by book_id, title, and author.
 *     parameters:
 *       - in: query
 *         name: book_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: (Optional) Filter books by their unique ID.
 *       - in: query
 *         name: title
 *         required: false
 *         schema:
 *           type: string
 *         description: (Optional) Filter books by title (partial match).
 *       - in: query
 *         name: author
 *         required: false
 *         schema:
 *           type: string
 *         description: (Optional) Filter books by author (partial match).
 *     responses:
 *       200:
 *         description: Books successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *                   is_available:
 *                     type: boolean
 *       404:
 *         description: No books found matching the criteria.
 *       500:
 *         description: Error retrieving database.
 */
app.get('/api/books', async (req: Request, res: Response): Promise<any> => {
  try {
    const params: BooksGetParam | null = req.query;
    const sql_query: string = getBooksSQLQuery(params);
    console.log(sql_query);
    const result = await pool.query(sql_query);
    if (result.rows.length === 0) {
      return res.status(404).send({error: 'No book exists!'});
    }
    const rows: Array<BooksResultRow> = result.rows;
/*

    const booksResultRows: BooksResultRow[] = [
      { book_id: 1, title: "The Great Gatsby", author: "F. Scott Fitzgerald", is_available: true },
      { book_id: 2, title: "1984", author: "George Orwell", is_available: false },
      { book_id: 3, title: "To Kill a Mockingbird", author: "Harper Lee", is_available: true },
      { book_id: 4, title: "Pride and Prejudice", author: "Jane Austen", is_available: true },
      { book_id: 5, title: "Moby-Dick", author: "Herman Melville", is_available: false }
    ];

    // Dummy data for BooksResponseItem
    const booksResponseItems: BooksResponseItem[] = [
      { title: "The Great Gatsby", author: "F. Scott Fitzgerald", is_available: true },
      { title: "1984", author: "George Orwell", is_available: false },
      { title: "To Kill a Mockingbird", author: "Harper Lee", is_available: true },
      { title: "Pride and Prejudice", author: "Jane Austen", is_available: true },
      { title: "Moby-Dick", author: "Herman Melville", is_available: false }
    ];
 
*/
    const response: BooksGetResponse= rows.map((row) => {
      const item: BooksResponseItem = {title: row.title, author: row.author, is_available:row.is_available};
      return item;
    });
    return res.status(201).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({error: 'Error retrieving database'});
  }
});

app.post('/users/signup', (req, res, next) => {
  interface SignupUser {
    user_id: number;
    email: string;
    username: string;
  }

  interface AuthInfo {
    message?: string;
  }

  passport.authenticate(
    'signup',
    { session: false },
    async (
      err: Error | null,
      user: SignupUser | false | undefined,
      info: AuthInfo | undefined
    ): Promise<any> => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // If signup fails (e.g., validation error), send a 400 response.
        return res.status(400).json({ message: info?.message || 'Signup failed' });
      }

      // Prepare the payload for the JWT.
      // Make sure the property names (like user_id, email, username) match your database schema.
      const payload: SignupUser = {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      };

      // Sign the token using your JWT secret. Ensure that process.env.JWT_SECRET is defined.
      const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });

      // Respond with the newly created token
      return res.status(201).json({ token });
    }
  )(req, res, next);
});

/**
 * Payload for user login.
 * 
 * @remarks
 * This object represents the data required to log in a user.
 * 
 * @property {string} email - User's email address.
 * @property {string} password - User's password.
 * 
 * @swagger
 * components:
 *  schemas:
 *   LoginUser:
 *    type: object
 *   properties:
 *   email:
 *   type: string
 *  description: User's email address.
 *  password:
 *  type: string
 * description: User's password.
 * required:
 * - email
 * - password
 */

app.post('/users/login', (req, res, next) => {
  passport.authenticate(
    'signin',
    { session: false },
    async (
      err: Error | null,
      user: any,
      info: { message?: string } | undefined
    ): Promise<any> => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // If login fails (e.g., incorrect password), send a 400 response.
        return res.status(400).json({ message: info?.message || 'Login failed' });
      }

      // Prepare the payload for the JWT.
      // Make sure the property names (like user_id, email, username) match your database schema.
      const payload = {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      };

      // Sign the token using your JWT secret. Ensure that process.env.JWT_SECRET is defined.
      const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });

      // Respond with the newly created token
      return res.status(200).json({ token });
    }
  )(req, res, next);
});

// return only if the user is authenticated
app.get('/protected/hello', passport.authenticate('jwt', { session: false }), (req, res) => {
  const user = req.user as { username: string };
  res.send(`Hello, ${user.username}!`);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`Swagger docs available at http://${HOST}:${PORT}/api-docs`);
});
