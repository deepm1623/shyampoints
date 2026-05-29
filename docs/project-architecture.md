# Project Architecture

## Overview
ShyamPoints is organized into a frontend delivery layer and an Express-based backend scaffolding.

## Frontend
- `frontend/pages/` contains the public HTML pages.
- `frontend/css/` contains stylesheet assets.
- `frontend/js/` contains page scripts and client logic.
- `frontend/firebase/` contains Firebase client initialization and reusable auth helpers.
- `frontend/assets/` stores images, icons, and logo files.
- `frontend/components/` contains reusable HTML fragments for future composition.

## Backend
- `backend/server.js` starts the Express API and registers routes.
- `backend/config/` contains Firebase Admin configuration.
- `backend/controllers/` contains route handler logic.
- `backend/routes/` defines API endpoints.
- `backend/middleware/` handles auth, admin checks, and errors.
- `backend/services/` contains API helpers and business logic placeholders.
- `backend/utils/` contains reusable utility helpers.

## Separation of Concerns
- Client-side Firebase auth remains in `frontend/firebase/firebase.js`.
- Server-side admin operations and token verification are isolated in `backend/config` and `backend/services`.
- The structure supports future growth into a full API-driven application.
