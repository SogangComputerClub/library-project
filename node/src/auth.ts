import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions as JwtStrategyOptions } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { pool } from './db';
import bcrypt from 'bcryptjs';

passport.use('signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
}, async (req, email, password, done) => {
    try {
        const client = await pool.connect();
        const { username } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await client.query('INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING *', [email, hashedPassword, username]);
        const user = rows[0];
        client.release();
        return done(null, user);
    } catch (err) {
        console.error(err);
        return done(err);
    }
}));

// signin returns the user if the email and password are correct, otherwise it returns false
passport.use('signin', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];
        if (!user) {
            return done(null, false, { message: 'User not found' });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return done(null, false, { message: 'Incorrect password' });
        }
        return done(null, user);
    } catch (err) {
        console.error(err);
        return done(err);
    } finally {
        client.release();
    }
}));

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in the environment');
  process.exit(1);
}

/**
 * JWT strategy options configuration.
 *
 * @remarks
 * This configuration object specifies how to extract and verify JWTs from incoming requests.
 *
 * @property jwtFromRequest - A function that extracts the JWT from the request header, using the Bearer token scheme.
 * @property secretOrKey - The secret key used for verifying the integrity and authenticity of the JWT.
 */
const opts: JwtStrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET!,
};

passport.use("jwt", new JwtStrategy(opts, async (jwtPayload, done) => {
  try {
      const client = await pool.connect();
      const { rows } = await client.query('SELECT * FROM users WHERE user_id = $1', [jwtPayload.user_id]);
      const user = rows[0];
      client.release();
      if (user) {
          return done(null, user);
      } else {
          return done(null, false);
      }
  } catch (err) {
      console.error(err);
      return done(err);
  }
}));

export const initializeAuth = () => passport.initialize();

export { passport };