import jwt from 'jsonwebtoken';

// Use dev AUTH_SECRET (change to production secret if testing against production)
const jwtSecret = 'dev-secret-for-testing-only-change-in-production';

// Generate access token with same structure as device poll endpoint
const access_token = jwt.sign(
  {
    userId: '161384451518103552', // Your Discord ID
    type: 'uploader',
    roles: ['1386739785283928124'], // Your role ID
  },
  jwtSecret,
  { expiresIn: '1h' }
);

console.log('Generated access token:');
console.log(access_token);
console.log('\nToken details:');
console.log(jwt.decode(access_token));
