# Venue Booking System Backend

A production-ready, full-featured venue and table booking system backend built with NestJS, TypeORM, and PostgreSQL. It allows users to search establishments, find nearby venues using Google Maps geolocation, reserve tables, manage business operating hours, custom features/amenities, leave reviews, and assign moderators to assist owners.

## Key Features

- **User Profile & Authentication**: Secure JWT-based authentication (with Access/Refresh token rotation), custom avatar uploads, or automated avatar generation via DiceBear API.
- **Role-Based Access Control (RBAC)**: Support for four distinct user roles (`USER`, `MODERATOR`, `OWNER`, `SUPER_ADMIN`) with custom guards.
- **Venue & Establishment Management**: Full support for creating and updating establishments, uploading cover photos and multi-image galleries (multipart/form-data).
- **Geolocation & Nearby Venues**: Retrieve venues within a specified distance (radius in kilometers) of lat/lng coordinates using the integrated Google Maps Geocoding API.
- **Moderator Assignment**: Venue owners can add and remove moderators to help manage customer feedback and reviews.
- **Working Hours & Schedules**: Flexible operating schedules and business hours management per establishment.
- **Custom Features & Amenities**: Dynamic categorization and venue tagging (e.g., WiFi, Parking, Kids Area) with custom icons support.
- **Review & Comments System**: User-generated comments, ratings, and reviews on establishments.
- **Interactive Swagger Documentation**: Full API spec exposed interactively, making integration straightforward.
- **Containerization**: Fully containerized environment with Docker and Docker Compose configured for development and production.

---

## Prerequisites

- **Node.js**: `v20` or higher
- **PostgreSQL**: `v16` or higher (if running locally without Docker)
- **Google Maps API Key**: Required for geocoding addresses and coordinates

---

## Environment Variables Reference

Copy `.env.example` to `.env` and fill in your local settings:

```bash
cp .env.example .env
```

| Variable                      | Description                                 | Example / Default                    | Required / Validation     |
| :---------------------------- | :------------------------------------------ | :----------------------------------- | :------------------------ |
| `DB_TYPE`                     | Type of DBMS                                | `postgres`                           | Yes (in `data-source.ts`) |
| `DB_HOST`                     | Database host                               | `localhost` (use `db` inside Docker) | Yes                       |
| `DB_PORT`                     | Database port                               | `5432`                               | Yes                       |
| `DB_USERNAME`                 | Database username                           | `postgres`                           | Yes                       |
| `DB_PASSWORD`                 | Database password                           | `postgres`                           | Yes                       |
| `DB_DATABASE`                 | Database name                               | `venue_booking_system`               | Yes                       |
| `GOOGLE_MAPS_API_KEY`         | Google Maps Platform API key                | `AIzaSy...`                          | Yes                       |
| `JWT_ACCESS_SECRET`           | Secret key for access token signing         | `your_access_secret_here`            | Yes                       |
| `JWT_REFRESH_SECRET`          | Secret key for refresh token signing        | `your_refresh_secret_here`           | Yes                       |
| `JWT_ACCESS_EXPIRES_IN`       | Access token lifespan (in **seconds**)      | `900` (15 mins)                      | Yes (Must be a number)    |
| `JWT_REFRESH_EXPIRES_IN`      | Refresh token lifespan (in **seconds**)     | `604800` (7 days)                    | Yes (Must be a number)    |
| `UPLOADS_PATH`                | Base path for media uploads                 | `uploads`                            | Default is `uploads`      |
| `UPLOADS_ESTABLISHMENTS_PATH` | Path prefix for establishment photos        | `uploads/establishments`             | Yes                       |
| `MINIMUM_COMMENTS`            | Threshold for rating metric computations    | `3`                                  | Yes                       |
| `GLOBAL_AVERAGE_RATING`       | Fallback rating if reviews are insufficient | `1`                                  | Yes                       |
| `FRONTEND_URL`                | Allowed CORS origin URL                     | `http://localhost:5173`              | Optional                  |

---

## Getting Started

### Method 1: Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Initialize & Seed Database**:

   > **Warning**: Seeding will drop the existing database, synchronize schemas, and populate sample users, types, establishments, comments, and working schedules.

   ```bash
   npm run seed
   ```

3. **Start the application**:
   - **Development (watch mode)**:
     ```bash
     npm run start:dev
     ```
   - **Production Mode (build and run)**:
     ```bash
     npm run build
     npm run start:prod
     ```
   - **Debug Mode**:
     ```bash
     npm run start:debug
     ```

---

### Method 2: Docker Compose (Quickstart)

This compiles the NestJS app (running in watch mode by default) and mounts a PostgreSQL database container.

1. **Build and run the stack**:
   ```bash
   docker-compose up --build
   ```
2. **Access paths**:
   - The application will be reachable at `http://localhost:8000`
   - An independent Swagger UI interface will boot up at `http://localhost:8081`

---

## API Documentation (Swagger)

When running, the interactive Swagger UI and schemas are served at:

- **Swagger Interactive UI**: `http://localhost:3000/api` (or `http://localhost:8000/api` under Docker Compose)
- **Swagger JSON Spec**: `http://localhost:3000/api-json` (or `http://localhost:8000/api-json` under Docker Compose)

---

## Role Permissions Matrix

The backend enforces role guards for endpoints based on user roles:

| Action / Resource                  | Guest (No JWT) | USER |      MODERATOR       |       OWNER       | SUPER_ADMIN |
| :--------------------------------- | :------------: | :--: | :------------------: | :---------------: | :---------: |
| Browse venues / check schedules    |      Yes       | Yes  |         Yes          |        Yes        |     Yes     |
| Book a table / Favorite a venue    |                | Yes  |         Yes          |        Yes        |     Yes     |
| Manage working schedules for venue |                |      |                      |  Owner of venue   |     Yes     |
| Assign / Remove venue moderators   |                |      |                      |  Owner of venue   |     Yes     |
| Add new Custom Features/Amenities  |                |      |                      |                   |     Yes     |
| Delete comments                    |                |      | If assigned to venue | If owner of venue |     Yes     |
| Update user profiles & roles       |                |      |                      |                   |     Yes     |

---

## API Endpoints Reference

### Authentication (`/auth`)

- `POST /auth/register` - Register a new user profile
- `POST /auth/login` - Login user (returns access and refresh tokens)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### User Profiles (`/users`)

- `GET /users/me` - Get current authenticated user profile
- `PATCH /users/me` - Update current user profile (supports avatar upload)
- `GET /users/:id` - Get public user details by ID
- `GET /users` - Get list of all users with pagination (SUPER_ADMIN only)
- `PATCH /users/:id` - Update any user profile/role (SUPER_ADMIN only)
- `DELETE /users/:id` - Delete user by ID (SUPER_ADMIN only)

### Establishments (`/establishment`)

- `GET /establishment` - Get all establishments (paginated)
- `GET /establishment/nearby` - Get establishments within a certain radius of coordinates using Google Maps
- `GET /establishment/favorites` - Get favorite establishments for the logged-in user
- `GET /establishment/me` - Get establishments owned by the current OWNER
- `GET /establishment/:id` - Get establishment by ID
- `GET /establishment/:id/comments` - Retrieve comments for an establishment
- `POST /establishment` - Create an establishment (OWNER/SUPER_ADMIN, multipart upload)
- `PATCH /establishment/:id` - Update establishment information (Establishment Owner only)
- `DELETE /establishment/:id` - Delete establishment (Establishment Owner only)
- `POST /establishment/:id/features/:featureId` - Add feature/amenity tag to establishment
- `DELETE /establishment/:id/features/:featureId` - Remove feature/amenity tag from establishment
- `POST /establishment/:id/favorite` - Add establishment to favorites
- `DELETE /establishment/:id/favorite` - Remove establishment from favorites
- `GET /establishment/:id/moderators` - List moderators assigned to this establishment
- `POST /establishment/:id/moderators/:userId` - Add a moderator to the establishment (Owner only)
- `DELETE /establishment/:id/moderators/:userId` - Remove moderator from the establishment (Owner only)

### Bookings & Reservations (`/booking`)

- `POST /booking` - Create a reservation (Rate-limited, JWT required)
- `GET /booking` - Retrieve all bookings in the system
- `GET /booking/my-bookings` - Get bookings created by the current user
- `GET /booking/establishment/:establishmentId` - Get all bookings for a specific establishment
- `GET /booking/:id` - Get details of a booking by ID

### Reviews & Comments (`/comment`)

- `POST /comment` - Add a new comment and rating to an establishment
- `GET /comment/comments` - Get all comments (paginated)
- `GET /comment/establishment/:id` - Get comments for an establishment (paginated)
- `PATCH /comment/:id` - Update an existing comment
- `DELETE /comment/:id` - Delete comment (Requires role SUPER_ADMIN, MODERATOR assigned to the venue, or OWNER of the venue)

### Establishment Types (`/establishment-type`)

- `GET /establishment-type` - Get all establishment categories
- `GET /establishment-type/:id` - Get specific type details by ID
- `POST /establishment-type` - Create a category (SUPER_ADMIN only)
- `PATCH /establishment-type/:id` - Update category (SUPER_ADMIN only)
- `DELETE /establishment-type/:id` - Delete category (SUPER_ADMIN only)

### Venue Features & Amenities (`/features`)

- `GET /features` - Get all features (e.g. WiFi, Parking)
- `GET /features/:id` - Get feature details by ID
- `POST /features` - Create feature (supports icon image upload)
- `PATCH /features/:id` - Update feature metadata and icon
- `DELETE /features/:id` - Delete feature

### Operating Schedules (`/schedule`)

- `GET /schedule/:establishmentId` - Get daily schedules for a venue
- `POST /schedule` - Add schedule items (Establishment Owner only)
- `PATCH /schedule/:id` - Update a specific schedule item (Establishment Owner only)
- `DELETE /schedule/:id` - Delete a schedule item (Establishment Owner only)

---

## Testing

```bash
# Unit tests
npm run test

# End-to-end (E2E) tests
npm run test:e2e

# Test coverage report
npm run test:cov
```
