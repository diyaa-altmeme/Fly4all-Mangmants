

import type { ServiceAccount } from 'firebase-admin/app';

// This is the service account object for the Firebase Admin SDK.
// It is constructed from environment variables for security.
// Fallbacks to undefined are important for build steps where env vars may not be present.
export const serviceAccount: ServiceAccount = {
  "projectId": "fly4all-78277122-3cbd0",
  "privateKey": (process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC62eIaOJqkBGL/\nIvxqOzN8/etbwsVKx8vNMRXVQ4RbS2/jB2JBJhonNWHf0Lll36QFnnfM0v1sGzz3\nck3eCAxT4snkbI0nb71u6tLff1YSur7p7GmCOeq1LKsc6uI5sFC3G0PJLZFYj2hG\n0djgQobNoVmLFfi9m1DhReDSFvk1PpJt1hxMhKKq11KR9ER90IUE2L6vuDR0Fa1Z\n9Y72htITxAq7Wd9zAlwlt7vcK5cQAbLBYrQVqPDrrmwNS5JPyDLhiEY6fbGeyiFE\nXdFNhktEsazoFN6w/V5NQ/aJH04fn3V36lBdc9sO7+wRufWRBaeoBs1FurPhpY1q\nxKorBLllAgMBAAECggEAFjzZrby4XNZf0NUhXOREVbcjpHVbBTIfpYFWw52oOjRR\ncd/eV/oYqTtvdVNySTdTXk7Um7YtrojUWe/K6CaljvNCC3NG3l9sWG/OnoZZYFvE\n3nLCQNszPZI+IDAtMefzx0MRr3cCohtZMfqGGPSZ9g2iqky4YJqERvdJ0T8mNCmU\n8GB6+qoKUGMt2O5DzVO250CGgIcgfqFd1dqvC+8PD3S2FL1dqwEgxpHeXhg+7NUU\n78+SmNRxcCTdqlgx5V9ihqgGaajVHWmGEMfDS+XatG+BAoc+Fi/ubOHPXH9Iniwd\njJcJ9CaSyZPFz0N+sY5uFB/wk2cYIKCdjzHTrJPzmQKBgQDgm8UI7Q3GScdbv29p\nQX++BOzqJKMiO7d0nOsW/7AobFVsSpXTsU0RovAkCtYY+P67qxQDwK3RSDs36YQE\nUyRwJhHnzJOKf5zj2nVFKgHgSSJdZEolMTM1KVicESDer6knsT7EN8M+iVGXl0JO\nz277bJ5hhNMkPnB1e7dOh6zq+QKBgQDU9zLg30dvNXNwSHv0QDZqADomi9U9nkZ+\nJhgJDmi+VMUxWfb61U0W/azewShL7YIsOHdTLensrAPBj5xzuB2OftKnEuaO3Nsv\nzJeQ3jOM5wXnqHpl9EXYVvlJTzM7tCyRJuiDFyhBmezCxikLjsjxWjwlcEGhc84Z\n+7E1IAUQzQKBgBVL78TG5VV1zWdPoXqzcS9NPEF/M9CdJOnzrv7BQ6yxiO/5qncm\nCo6vimGAfYhko5KbyAwLCvAbDzJf+9qFH6FamrwF07+AFhosro3eS8s+Y/nC9pzM\nK3TQ9Mvne9xhf4J59d+ZAfQ+BPSArRLX7Ef+po3MkFCRcwxQrLLPfn/RAoGBAL1f\nuBF42sfMSwOsoPTYaMqnuw3tyEhLxzmD3FmpQ4EEVnmFG3d/V1a7aw6FyrSB1gBG\nke0YZew8JfboImJQdY/xvJYu23Bsekgt8RU0UbjY8kpGadjhd35iELicwd00YXEN\nnTJ81CJJotysY3FQneTorZVJFkNgfARk6PZpq7d9AoGBAJVxFwblg6SQ+QZMUqaU\n5dXAESNOHv08DkYd0o/LmwfX1/odY9VwkR0unwMY3NncAWVSNh7u/C3DjLciaHzJ\nJr2o/GSZ2p1HxUsUa0aqN/q4BFTkO7ryFeCFcN3AO6hfgzKnoFUFYBD4iSHPkgX/\nfrErRvbecpYKP5V4y0awUggt\n-----END PRIVATE KEY-----\n").replace(/\\n/g, '\n'),
  "clientEmail": process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@fly4all-78277122-3cbd0.iam.gserviceaccount.com"
};
