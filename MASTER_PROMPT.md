
# Build Avi CMS — Full-Stack Content Management System

Build a modern, lightweight, and fully functional **Content Management System (CMS)** powered by **Avi.js** for the backend and **React + TypeScript** for the frontend.

The goal is to create a real-world application that demonstrates the capabilities of Avi.js while providing a practical CMS for managing website content.

## 1. Project Overview

**Project Name:** Avi CMS

**Tech Stack:**

- Backend: Avi.js (latest version available in the project)
- Frontend: React + TypeScript + Vite
- Routing: React Router
- Styling: Tailwind CSS
- UI Components: shadcn/ui
- Icons: Lucide React
- Database: PostgreSQL
- ORM: Drizzle ORM
- Authentication: JWT
- Forms: React Hook Form + Zod
- Rich Text Editor: Tiptap
- State Management: TanStack Query for server state

Before implementation, inspect the existing project and read the Avi.js documentation at:

https://github.com/chrischase011/avi-js

Follow the actual Avi.js APIs, conventions, dependency injection, module structure, and available features. Do not assume NestJS APIs are interchangeable with Avi.js.

## 2. Project Structure

Keep the Avi.js backend at the project root and the React application inside `web/`.

```text
avi-cms/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── posts/
│   │   ├── pages/
│   │   ├── categories/
│   │   ├── tags/
│   │   ├── media/
│   │   ├── settings/
│   │   └── dashboard/
│   ├── database/
│   ├── common/
│   ├── app.module.ts
│   └── main.ts
│
├── web/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── drizzle/
├── uploads/
├── package.json
├── .env.example
└── README.md
```

Use a clean modular architecture and avoid unnecessary abstractions.

## 3. Authentication and Authorization

Implement a complete authentication system.

Features:

- Administrator login
- Logout
- Current authenticated user
- JWT-based authentication
- Secure password hashing
- Protected API endpoints
- Role-based access control
- User account management

Roles:

- **Admin:** Full system access
- **Editor:** Manage and publish content
- **Author:** Create and manage their own content

Use secure authentication practices. Prefer HTTP-only cookies when appropriate, with CSRF protection, secure cookie configuration, and proper token expiration.

## 4. Dashboard

Create a modern admin dashboard displaying:

- Total posts
- Published posts
- Draft posts
- Total pages
- Total users
- Recent content
- Recently updated posts
- Quick actions for creating posts and pages

Use responsive dashboard cards, tables, and clean visualizations where useful.

## 5. Posts Management

Implement complete CRUD functionality for blog posts.

Post fields:

- Title
- Slug
- Excerpt
- Content
- Featured image
- Category
- Tags
- Author
- Status (draft, published, archived)
- Created date
- Updated date
- Published date

Features:

- Create, edit, delete, and view posts
- Rich text editor using Tiptap
- Save as draft
- Publish and unpublish
- Search posts
- Filter by status and category
- Pagination
- Automatic slug generation with manual editing
- Preview post content
- Confirmation before deletion

## 6. Pages Management

Implement CRUD functionality for static pages such as About, Contact, and Privacy Policy.

Fields:

- Title
- Slug
- Content
- Status
- SEO title
- SEO description

Use the same rich text editor as posts.

## 7. Categories and Tags

Implement category and tag management.

Features:

- Create, edit, and delete categories
- Create, edit, and delete tags
- Assign categories and tags to posts
- Prevent duplicate slugs
- Display the number of posts per category

## 8. Media Library

Build a media management system using Avi.js multipart upload capabilities where supported.

Features:

- Upload images
- View uploaded files
- Delete files
- Image previews
- File size and type validation
- Select images for posts
- Featured image selection

Store file metadata in PostgreSQL.

Use local file storage initially, but design the storage service so it can support S3-compatible storage later.

Ensure uploaded files are validated and served securely.

## 9. User Management

Allow administrators to manage CMS users.

Features:

- List users
- Create users
- Edit user details
- Assign roles
- Activate or deactivate accounts
- Change passwords
- View basic account information

Only administrators should access user management endpoints.

## 10. CMS Settings

Create a settings module containing:

- Site name
- Site description
- Site URL
- Site logo
- Favicon
- Default SEO title
- Default SEO description
- Posts per page

Persist settings in the database.

## 11. Public Content API

Expose public read-only API endpoints for published content.

Examples:

```text
GET /api/public/posts
GET /api/public/posts/:slug
GET /api/public/pages/:slug
GET /api/public/categories
GET /api/public/tags
```

Do not expose draft content, private user information, or admin-only data.

The CMS should be **headless-first**, allowing other React, Vue, or external applications to consume its public API.

The React application inside `web/` will initially serve as the CMS administration interface, not the public website.

## 12. React Frontend

Build a polished, responsive CMS admin interface.

Use React Router with a centralized route configuration.

Pages:

```text
/login
/
/posts
/posts/create
/posts/:id/edit
/pages
/pages/create
/pages/:id/edit
/categories
/tags
/media
/users
/settings
```

Create two primary layouts:

**AdminLayout**

- Collapsible sidebar
- Top navigation bar
- User dropdown
- Breadcrumbs
- Main content area
- Responsive mobile navigation

**AuthLayout**

- Centered login form
- Clean authentication UI
- No admin sidebar

Implement protected routes and redirect unauthenticated users to `/login`.

Use TanStack Query for API requests, caching, mutations, and invalidation.

Create reusable components for:

- Data tables
- Pagination
- Search and filters
- Forms
- Confirmation dialogs
- Empty states
- Loading skeletons
- Error states
- Toast notifications

## 13. UI/UX Design

Create a modern SaaS-style administration dashboard.

Design requirements:

- Minimal, clean interface
- Professional typography
- Consistent spacing
- Neutral color palette with a restrained accent color
- Light and dark mode
- Responsive layouts
- Accessible components
- Smooth but subtle transitions

Use shadcn/ui and Tailwind CSS.

Avoid unnecessary animations, excessive gradients, and cluttered layouts.

The interface should feel like a production-ready CMS rather than a generic demo dashboard.

## 14. Backend Architecture

Use Avi.js conventions throughout the backend.

Each feature should have its own module with controllers, services, DTOs or validation schemas, and relevant database operations.

Requirements:

- Explicit dependency injection following Avi.js conventions
- Request validation
- Consistent API responses
- Centralized error handling
- Appropriate HTTP status codes
- Authentication and authorization
- Pagination and filtering
- Environment-based configuration
- Structured logging where supported

Do not introduce `reflect-metadata` or TypeScript decorator metadata unless the actual Avi.js documentation explicitly requires it.

Use built-in Avi.js capabilities whenever possible instead of duplicating framework functionality.

## 15. Database

Use PostgreSQL with Drizzle ORM.

Design relational schemas for:

- Users
- Posts
- Pages
- Categories
- Tags
- Post-tag relationships
- Media
- Settings

Include:

- Primary and foreign keys
- Unique constraints
- Indexes
- Timestamps
- Database migrations
- Seed data for initial development

Provide a safe way to create the first administrator account using environment configuration or a dedicated setup command.

Never hardcode administrator credentials.

## 16. Development Experience

Configure development scripts so both applications are easy to run.

Suggested commands:

```bash
npm run dev
npm run dev:api
npm run dev:web
npm run build
npm run typecheck
npm run db:migrate
npm run db:seed
```

Use a root-level script to run the Avi.js backend and React frontend concurrently during development.

Configure Vite to proxy API requests to Avi.js where appropriate.

Ensure React Router works correctly when refreshing nested routes.

Include an `.env.example` with all required configuration variables.

## 17. Security and Reliability

Implement:

- Password hashing
- Input validation
- Role-based authorization
- Secure file upload validation
- Rate limiting for authentication endpoints
- Safe error responses
- Protection against unauthorized content modification
- Safe rich-text rendering and HTML sanitization
- Database constraints
- Proper handling of expired authentication sessions

Do not expose secrets or sensitive information in frontend bundles or API responses.

## 18. Testing

Add meaningful automated tests for critical functionality.

Prioritize:

- Authentication
- Authorization
- Post CRUD
- Publishing workflow
- Public content visibility
- Validation
- Media upload restrictions

Ensure the backend and frontend build successfully.

## 19. Implementation Strategy

Build the application incrementally in the following order:

**Phase 1 — Foundation**

- Inspect the existing codebase
- Configure the database
- Set up React Router
- Create layouts and shared UI components
- Configure API communication

**Phase 2 — Authentication**

- Implement login and logout
- Create user roles
- Protect admin routes and endpoints

**Phase 3 — Core CMS**

- Dashboard
- Posts CRUD
- Rich text editor
- Categories and tags
- Pages CRUD

**Phase 4 — Additional Features**

- Media library
- User management
- Site settings
- Public content API

**Phase 5 — Production Readiness**

- Security improvements
- Tests
- Error handling
- Documentation
- Build verification

## 20. Important Instructions

- This project is intended to demonstrate Avi.js in a real-world application.
- Do not replace Avi.js with Express, Fastify, NestJS, or another backend framework.
- Read the actual Avi.js documentation before implementing backend features.
- Reuse existing code and configuration where possible.
- Do not overwrite working implementations unnecessarily.
- Keep the backend and frontend clearly separated.
- Use strict TypeScript typing.
- Avoid `any` unless absolutely necessary.
- Do not add unnecessary dependencies.
- Prefer simple, readable, maintainable code.
- Implement working functionality rather than static UI mockups.
- Do not create fake API responses for features that should be backed by the database.
- If a required Avi.js capability is missing, identify and document the limitation instead of inventing unsupported APIs.
- Complete and verify each implementation phase before moving to the next.

**Final Goal:** Deliver a fully functional, modern, headless-first CMS built with Avi.js and React that can serve as both a practical content management application and a real-world showcase of the Avi.js framework.
