#!/bin/bash
set -e

echo "======================================"
echo "Running database migrations..."
echo "======================================"

npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "======================================"
  echo "Migrations completed successfully!"
  echo "Starting application..."
  echo "======================================"
  npm run start
else
  echo "======================================"
  echo "Migration failed! Exiting..."
  echo "======================================"
  exit 1
fi
