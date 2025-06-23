# DART - Dreamshot Annotation & Ranking Tool

A comprehensive tool for annotating and ranking dreamshots, built with modern web technologies and Domain Driven Design principles.

## Architecture

- **Backend**: Node.js with Express, following Domain Driven Design
- **Frontend**: Next.js with React
- **Database**: MongoDB Atlas
- **Development**: mise + orbstack
- **Architecture**: Domain Driven Design (DDD)

## Project Structure

```
dart/
├── backend/           # Node.js backend with DDD structure
│   ├── src/
│   │   ├── domain/    # Domain entities, value objects, repositories
│   │   ├── application/ # Use cases, services
│   │   ├── infrastructure/ # Database, external APIs
│   │   └── presentation/ # Controllers, routes
│   └── package.json
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/ # Reusable components
│   │   └── lib/       # Utilities and configurations
│   └── package.json
├── mise.toml          # Development environment configuration
└── README.md
```

## 🚀 Quick Start

The DART application uses [mise](https://mise.jdx.dev/) for unified development environment management.

### Prerequisites

- [mise](https://mise.jdx.dev/) installed
- [orbstack](https://orbstack.dev/) (optional, for enhanced Docker performance)

### One-Command Setup

```bash
# Trust the mise configuration
mise trust

# Install dependencies
mise run install

# Start development servers
mise run dev
```

This will start:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

### Development Features

- **Hot Reload**: Both backend and frontend automatically reload on changes
- **Unified Environment**: All configuration managed through `mise.toml`
- **Simple Commands**: Just `mise run dev` to start everything

### Available Commands

```bash
# Install all dependencies
mise run install

# Start development servers
mise run dev

# Clean project (remove node_modules, build files)
mise run clean

# Clean and reinstall everything
mise run reset
```

## 🌍 Environment Configuration

All environment variables are managed through `mise.toml`. The setup automatically creates:

- `backend/.env` - Backend configuration
- `frontend/.env.local` - Frontend configuration

Key environment variables (configured in `mise.toml`):

- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment mode
- `FRONTEND_URL` - Frontend URL for CORS
- `NEXT_PUBLIC_API_URL` - API URL for frontend

## 🔧 API Endpoints

- `GET /api/health` - API health check
- `GET /api/v1/dreamshots` - Get all dreamshots
- `GET /api/v1/dreamshots/:id` - Get dreamshot by ID
- `POST /api/v1/dreamshots` - Create new dreamshot
- `PUT /api/v1/dreamshots/:id` - Update dreamshot
- `DELETE /api/v1/dreamshots/:id` - Delete dreamshot
- `POST /api/v1/dreamshots/:id/annotations` - Add annotation
- `PUT /api/v1/dreamshots/:id/ranking` - Update ranking

## 🗂️ Database Schema

The application uses MongoDB with the following main collection:

### Dreamshots Collection

```javascript
{
  title: String,
  description: String,
  imageUrl: String,
  author: String,
  annotations: [{
    id: String,
    text: String,
    author: String,
    timestamp: Date,
    coordinates: { x: Number, y: Number }
  }],
  ranking: {
    score: Number,
    votes: Number,
    averageRating: Number
  },
  tags: [String],
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Features

- **Smart Annotation**: Add precise annotations with coordinate-based tagging
- **Advanced Ranking**: Sophisticated scoring system with community voting
- **Real-time Collaboration**: Work together with your team in real-time
- **Domain Driven Design**: Clean, maintainable architecture
- **MongoDB Integration**: Flexible document-based storage
- **TypeScript**: Full type safety across the stack
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with Next.js, Node.js, and MongoDB
- Styled with Tailwind CSS
- Icons by Lucide React
- Development environment powered by mise
