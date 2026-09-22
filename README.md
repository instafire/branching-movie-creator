# Branching Movie Creator

An interactive branching-narrative movie creator using Apple Live Photos. Users can upload Live Photos, extract the video component, and create interactive movies with choice-based branching.

## Features

- **Media Handling**: Upload Live Photos (HEIC/MOV) or standard videos (MP4)
- **Node-Based Editor**: Visual drag-and-drop canvas for creating story branches
- **Choice Overlays**: Configure when choices appear during video playback
- **Seamless Playback**: Pre-load next clips for zero-buffering transitions
- **Analytics**: Track viewer sessions and choice popularity

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: Vue.js 3, Pinia, TypeScript
- **Media Processing**: FFmpeg
- **Storage**: AWS S3 (or compatible)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- FFmpeg (optional, for media processing)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Edit .env with your configuration

# Run migrations (after setting up PostgreSQL)
npm run db:migrate

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the backend directory:

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/branching_movie_creator
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173

# AWS S3 (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=your-bucket
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project with graph
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Nodes
- `POST /api/nodes` - Create node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node

### Edges
- `POST /api/edges` - Create edge
- `PUT /api/edges/:id` - Update edge
- `DELETE /api/edges/:id` - Delete edge

### Media
- `POST /api/media/upload` - Upload media
- `GET /api/media/:id/stream` - Get streaming URL

### Analytics
- `POST /api/analytics/sessions` - Create viewer session
- `POST /api/analytics/sessions/:id/events` - Track event

## Database Schema

See `schema/001_initial_schema.sql` for the complete database schema.

## License

MIT
