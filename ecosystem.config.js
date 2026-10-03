module.exports = {
  apps: [
    {
      name: 'api',
      script: './server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    {
      name: 'web',
      script: 'npm',
      args: 'run start',
      cwd: './apps/web',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'admin',
      script: 'npm',
      args: 'run start',
      cwd: './apps/admin',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'manager',
      script: 'npm',
      args: 'run start',
      cwd: './apps/manager',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
  ],
};
