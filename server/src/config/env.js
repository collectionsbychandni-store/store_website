import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'collections_by_chandni_jwt_dev_secret_key_2026_super_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
};
