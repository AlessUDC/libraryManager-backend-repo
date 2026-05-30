#!/bin/sh
# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Starting Library Manager Backend Boot ==="

# Wait for the database connection to be ready by attempting prisma db push
max_attempts=30
attempt=1

echo "Verifying database connection and pushing schema..."
until npx prisma db push --accept-data-loss || [ $attempt -eq $max_attempts ]; do
  echo "Database not ready yet (attempt $attempt/$max_attempts). Retrying in 2 seconds..."
  attempt=$((attempt + 1))
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Error: Database connection could not be established after $max_attempts attempts."
  exit 1
fi

echo "=== Database schema pushed successfully ==="

# Run database seed
echo "Seeding database tables..."
npm run seed:structured || echo "Seeding script execution encountered an issue (it might have run already), continuing..."

echo "=== Seeding finished ==="

# Start production build of the NestJS application
echo "Starting NestJS production server..."
npm run start:prod
