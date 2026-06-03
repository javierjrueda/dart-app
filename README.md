# 🎯 DART - AI Image Ranking Arena

<div align="center">

### Battle-test your AI-generated images. Let ELO decide which generation parameters actually win.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Built by Dreamshot.io](https://img.shields.io/badge/Built_by-Dreamshot.io-blue?style=for-the-badge)](https://dreamshot.io)

</div>

## 💡 Why

When you generate thousands of AI images sweeping LoRAs, samplers, schedulers and denoise strengths, "which settings are best" stops being answerable by eyeballing folders. DART turns it into a tournament: upload batches, run pairwise battles, and let an ELO rating surface the parameter combinations that consistently win. Self-hosted, your images never leave your infrastructure.

## 🌟 Features

- ⚔️ **Battle Arena**: pairwise image comparisons, one click per duel
- 📈 **ELO Ranking**: ratings converge on the truly best outputs (configurable K-factor)
- 🧪 **Parameter Insights**: attach generation metadata (LoRA, sampler, scheduler, denoise) and see which settings climb the ladder
- 🖼️ **Bulk Upload**: drag in image batches with or without JSON metadata
- 🗳️ **Smart Annotation**: coordinate-based tagging on any image
- 📤 **Export Winners**: dump top-ranked image filenames to txt for training pipelines
- 🏠 **Self-hosted**: Node + Next.js + MongoDB, images on your own S3-compatible storage
- 🧱 **DDD Architecture**: clean domain/application/infrastructure/presentation layering, full TypeScript

## 🚀 Quick Start

DART uses [mise](https://mise.jdx.dev/) for one-command setup.

```bash
mise trust          # trust the mise configuration
mise run install    # install all dependencies
mise run dev        # start everything
```

That's it:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

Other commands: `mise run clean` (remove node_modules/builds) and `mise run reset` (clean + reinstall).

## 🏗️ Project Structure

```
dart/
├── backend/             # Node.js + Express, DDD layout
│   └── src/
│       ├── domain/          # Entities, value objects, repositories
│       ├── application/     # Use cases, services
│       ├── infrastructure/  # MongoDB, storage, external APIs
│       └── presentation/    # Controllers, routes
├── frontend/            # Next.js (App Router) + Tailwind
│   └── src/
│       ├── app/             # Pages
│       ├── components/      # Reusable components
│       └── lib/             # Utilities
└── mise.toml            # Unified dev environment + env vars
```

## 🌍 Environment

All variables are managed through `mise.toml`, which generates `backend/.env` and `frontend/.env.local`:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | Frontend URL for CORS |
| `NEXT_PUBLIC_API_URL` | API URL for the frontend |

## 🔧 API

```
GET    /api/v1/dreamshots                 # list images
POST   /api/v1/dreamshots                 # create
GET    /api/v1/dreamshots/:id             # detail
PUT    /api/v1/dreamshots/:id             # update
DELETE /api/v1/dreamshots/:id             # delete
POST   /api/v1/dreamshots/:id/annotations # annotate
PUT    /api/v1/dreamshots/:id/ranking     # update ELO
GET    /api/health                        # health check
```

Each image document carries its annotations (with x/y coordinates), its ranking (score, votes, average) and free-form tags. See the domain models in `backend/src/domain/`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Open a Pull Request

## 📝 License

MIT - see [LICENSE](LICENSE).

---

<div align="center">

Made with ❤️ by [javierjrueda](https://github.com/javierjrueda) at [Dreamshot.io](https://dreamshot.io)

[🌟 Star this repo](https://github.com/javierjrueda/dart-app) | [🐛 Report bug](https://github.com/javierjrueda/dart-app/issues) | [🤝 Contribute](https://github.com/javierjrueda/dart-app/pulls)

</div>
