# Backend Implementation - NELSON CRM

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will automatically run `prisma generate` via the postinstall script.

### 2. Configure Database

#### Option A: Vercel Postgres (Recommended for Production)

1. Go to your Vercel dashboard
2. Select your project → Storage → Create Database → Postgres
3. Copy the `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
4. Add them to your `.env` file or Vercel Environment Variables

#### Option B: Local Development with PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb nelson_crm`
3. Update `.env`:
```
POSTGRES_PRISMA_URL="postgresql://postgres:password@localhost:5432/nelson_crm"
POSTGRES_URL_NON_POOLING="postgresql://postgres:password@localhost:5432/nelson_crm"
```

### 3. Push Database Schema

```bash
npm run db:push
```

This creates the tables in your database based on the Prisma schema.

### 4. Test API Locally

```bash
npm run dev
```

API endpoints available at:
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a project
- `GET /api/projects/:id` - Get a project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### 5. Deploy to Vercel

```bash
git add -A
git commit -m "feat: add backend API with Prisma"
git push
```

Vercel will automatically deploy your API routes.

### 6. Migrate LocalStorage Data (Optional)

A migration script will be created to transfer existing localStorage projects to the database.

## Database Management

### View Data with Prisma Studio

```bash
npm run db:studio
```

Opens a web interface at `http://localhost:5555` to view and edit data.

### Reset Database

```bash
npx prisma db push --force-reset
```

⚠️ **Warning**: This will delete all data!

## API Documentation

### Create Project
```javascript
POST /api/projects
Content-Type: application/json

{
  "name": "Dupont",
  "firstName": "Jean",
  "email": "jean@example.com",
  "phone": "0612345678",
  "address": "123 rue Example",
  "zip": "33000",
  "city": "Bordeaux",
  "type": "Construction",
  "status": "Nouveau",
  "projectSize": "150m²"
}
```

### Update Project
```javascript
PUT /api/projects/:id
Content-Type: application/json

{
  "status": "En cours",
  "comments": "Projet validé"
}
```

## Environment Variables

Required for production:
- `POSTGRES_PRISMA_URL` - Connection pooling URL
- `POSTGRES_URL_NON_POOLING` - Direct connection URL

Optional:
- `VITE_API_URL` - API base URL (default: `/api`)

## Troubleshooting

### Error: "Can't reach database server"
- Check your DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database credentials

### Error: "prisma not found"
- Run `npm install` again
- Ensure `prisma` is in devDependencies

### API returns 404
- Ensure you're accessing `/api/projects` not `/projects`
- Check Vercel deployment logs
- Verify `vercel.json` configuration
