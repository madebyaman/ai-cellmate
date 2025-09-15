# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Cellmate is a React Router 7 application that provides CSV data enrichment using AI agents with web search and scraping capabilities. The application allows users to upload CSV files and automatically enriches them with additional data found through web searches and content scraping.

## Common Commands

```bash
# Start development server (includes worker)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run worker process separately
npm run worker

# Type checking and code generation
npm run typecheck

# Generate Prisma client
npm run postinstall
```

## Architecture

### Core Components

- **Frontend**: React Router 7 with TypeScript, TailwindCSS, and Radix UI components
- **Backend**: Node.js with React Router server-side rendering
- **Database**: SQLite with Prisma ORM for user management and authentication
- **Authentication**: Better Auth with Google OAuth integration
- **Queue System**: BullMQ with Redis for background job processing
- **AI Integration**: OpenAI GPT-4o and Google Gemini with AI SDK tools
- **Web Services**: Serper API for search, ScrapingBee for web scraping

### Key Directories

- `app/routes/` - React Router route definitions and handlers
- `app/components/` - Reusable React components and UI elements
- `app/lib/` - Core libraries (auth, prisma, serper integration)
- `app/utils/` - Utility functions (auth, email, etc.)
- `app/agent/` - AI agent architecture and specialized tools
- `app/queues/` - BullMQ queue configuration and worker definitions
- `app/queues/workers/` - Background job processors
- `prisma/` - Database schema and migrations

### CSV Playground

The CSV Playground (`app/routes/csv-playground.tsx`) provides an interactive interface for CSV file exploration:

- **Streaming CSV Parsing**: Uses Papaparse for efficient parsing of large CSV files with chunked loading
- **Virtualized Table Rendering**: Implements @tanstack/react-virtual for optimal performance with large datasets
- **Progressive Loading**: Automatically loads more rows as users scroll, preventing memory issues
- **Interactive Features**:
  - Drag-and-drop file upload
  - Auto-scroll functionality for testing
  - Real-time row/column count display
  - URL and email link detection in cells

### Background Processing

The application uses BullMQ workers for processing CSV enrichment jobs:

- **CSV Enrichment Worker** (`app/queues/workers/csv-enrichment.worker.ts`): 
  - Processes uploaded CSV files using the agent loop architecture
  - Orchestrates multi-cycle enrichment process
  - Tracks enrichment progress with Langfuse telemetry
  - Implements smart retry logic and URL deduplication
  - Uses configurable concurrency for web scraping

- **Worker Process** (`worker.ts`): Standalone process that runs all workers

### AI Agent Architecture

The CSV enrichment uses a modular agent architecture with specialized components:

- **Agent Loop** (`app/agent/agent-loop.ts`): Orchestrates the entire enrichment process
- **Query Writer** (`app/agent/query-writer.ts`): Generates strategic search queries for missing data
- **Search Tool** (`app/agent/search-tool.ts`): Serper API integration for web search
- **Scraper Tool** (`app/agent/scraper-tool.ts`): Custom scraper with ScrapingBee fallback
- **Result Extracter** (`app/agent/result-extracter.ts`): Extracts structured data from crawled pages
- **System Context** (`app/agent/system-context.ts`): Tracks state across enrichment cycles

- **Processing Flow**: 
  1. Initialize system context with CSV row data
  2. Generate targeted search queries using failed query history
  3. Execute parallel web searches via Serper API
  4. Deduplicate and scrape URLs with custom scraper + ScrapingBee fallback
  5. Extract structured data for missing CSV columns
  6. Repeat cycle up to 2 times if columns remain unfilled

### Authentication & Security

- Uses Better Auth for session management
- Google OAuth integration
- CSRF protection with honeypot
- Session-based authentication with database persistence

### Environment Configuration

Required environment variables (see `.env.template`):
- Database: `DATABASE_URL`
- Redis: `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT`  
- Auth: `SESSION_SECRET`, `HONEYPOT_SECRET`
- OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- AI APIs: `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- Services: `SERPER_API_KEY`, `SCRAPINGBEE_API_KEY`, `SCRAPINGBEE_CONCURRENCY`
- Telemetry: `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASEURL`

## Development Notes

- The application runs both web server and worker process with `npm run dev`
- Workers handle background CSV processing with AI-powered data enrichment
- ScrapingBee integration includes retry logic and concurrency control
- AI agents use structured output with Zod schemas for type safety
- All web scraping converts HTML to markdown for better AI processing
- Scraped content is automatically summarized using Google Gemini AI based on user queries
- Scraped pages include extracted links for additional context and navigation

## TypeScript Coding Standards

- **NEVER use TypeScript `as` keyword for type assertions** (e.g., `input as any`, `data as SomeType`)
- Use proper TypeScript patterns instead:
  - Type guards and narrowing functions
  - Zod schemas for runtime validation and type inference
  - Proper generic types and constraints
  - Union types and discriminated unions
  - Optional chaining and nullish coalescing
- This prevents runtime type errors and maintains type safety throughout the application

## Code Style Preferences

- **Keep imports at the top of files** - Prefer importing modules and utilities at the top rather than using dynamic imports within functions when possible
- This improves code readability and makes dependencies clear at first glance
- **Avoid hanging constants and magic strings** - All constants, form field names, route values, and reusable strings should be organized in the `app/utils/constants.ts` file using logical groupings (e.g., `CHANGE_WORKSPACE_FORM`, `CREATE_WORKSPACE_FORM`)
- This ensures consistency, prevents typos, and makes refactoring easier