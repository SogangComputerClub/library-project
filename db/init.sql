CREATE TABLE IF NOT EXISTS books (
  book_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  is_available BOOLEAN NOT NULL
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

INSERT INTO books (title, author, is_available)
VALUES
  ('The Great Gatsby', 'F. Scott Fitzgerald', TRUE),
  ('To Kill a Mockingbird', 'Harper Lee', TRUE),
  ('1984', 'George Orwell', FALSE),
  ('Pride and Prejudice', 'Jane Austen', TRUE),
  ('Moby-Dick', 'Herman Melville', FALSE);