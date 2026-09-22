# IM - Interactive Branching Movie Creator (v2)

IM is an interactive branching-narrative movie creator. Users can upload Live Photo videos or regular clips, build story graphs, publish playable branches, and ship a single server bundle that serves both the API and the built frontend.

## Features

- **Media Handling**: Upload Live Photos (HEIC/MOV) or standard videos (MP4)
- **Node-Based Editor**: Visual drag-and-drop canvas for creating story branches
- **Choice Overlays**: Configure when choices appear during video playback with custom colors and branching logic
- **Seamless Playback**: Pre-load next clips for zero-buffering transitions
- **Public Feed & Playback**: Mobile-ready swipeable feed and direct movie view
- **Analytics Dashboard**: Track viewer sessions, completion rates, and choice popularity
- **Single-Server Deployment**: Production bundle serves API, WebSocket, static assets, and the SPA frontend from a single process

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, WebSocket (`ws`)
- **Frontend**: Vue.js 3, Pinia, TypeScript, Vite
- **Media Processing**: FFmpeg
- **Storage**: Local filesystem storage (default) or AWS S3

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- FFmpeg (for video transcoding and thumbnail generation)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Run database migrations
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

Create a `.env` file in the `backend/` directory:

```env
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/branching_movie_creator
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173

# AWS S3 (optional, defaults to local storage in storage/)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=your-bucket
```

## Single-Server Deployment

Build both frontend and backend, then run the backend. It automatically detects and serves the built frontend from `frontend-dist` or `../frontend/dist`:

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Build backend
cd backend
npm run build
node dist/index.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user profile

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project with full graph
- `PUT /api/projects/:id` - Update project details
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/publish` - Publish project
- `POST /api/projects/:id/unpublish` - Unpublish project

### Nodes
- `POST /api/nodes` - Create node
- `GET /api/nodes/:id` - Get node details with outgoing edges
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node

### Edges
- `POST /api/edges` - Create choice / edge
- `GET /api/edges/:id` - Get edge details
- `PUT /api/edges/:id` - Update edge
- `DELETE /api/edges/:id` - Delete edge

### Media
- `POST /api/media/upload` - Upload video or Live Photo pair
- `GET /api/media/:id` - Get media clip info
- `GET /api/media/:id/stream` - Get streaming URL
- `GET /api/media/:id/status` - Get processing progress
- `POST /api/media/:id/thumbnail` - Capture thumbnail at timestamp
- `POST /api/media/:id/reprocess` - Reprocess video clip
- `DELETE /api/media/:id` - Delete clip

### Public
- `GET /api/public/projects` - List published projects
- `GET /api/public/projects/:id` - Get published project graph

### Analytics
- `POST /api/analytics/sessions` - Create viewer session
- `GET /api/analytics/sessions/:id` - Get session details
- `PUT /api/analytics/sessions/:id` - Update session progress
- `POST /api/analytics/sessions/:id/events` - Track interaction events
- `GET /api/analytics/projects/:id` - Get project analytics and popular choice paths

## Database Schema

Migrations in `schema/` are managed automatically by `npm run db:migrate`:
- `schema/001_initial_schema.sql` - Core tables (users, projects, media_clips, nodes, edges, viewer_sessions, analytics_events)
- `schema/002_edge_features.sql` - Extended choice styling and conditional branching
- `schema/003_merged_features.sql` - Project themes and audio options

## License

MIT
