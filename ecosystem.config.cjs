module.exports = {
  apps: [
    {
      name: 'managarr-backend',
      cwd: './server',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'managarr-frontend',
      cwd: './client',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
