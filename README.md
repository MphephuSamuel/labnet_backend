# LabNet Guardian Backend

This is the backend API for the LabNet Guardian system. It is built with Node.js, Express, TypeScript, and uses Firebase (Authentication and Firestore) for user management and data storage.

## Project Structure

```
labnet_backend/
├── package.json           # Project metadata and dependencies
├── tsconfig.json          # TypeScript configuration
├── .env                   # Environment variables (not committed)
├── src/
│   ├── app.ts             # Express app setup
│   ├── server.ts          # App entrypoint
│   ├── controllers/       # Route controllers (business logic)
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic/services (e.g., user creation)
│   ├── middleware/        # Express middleware (e.g., auth)
│   ├── utils/             # Utility modules (e.g., Firebase admin init)
│   └── types/             # Custom TypeScript types
└── README.md              # Project documentation
```

## Setup & Installation

1. **Clone the repository**
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your Firebase Admin credentials:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
     - `BREVO_API_KEY`
   - Set `PORT` if you want a custom port (default is 3000).
4. **Build the project:**
   ```sh
   npm run build
   ```
5. **Start the server (development):**
   ```sh
   npm run dev
   ```
   Or for production:
   ```sh
   npm start
   ```

## API Endpoints

### Health Check

- `GET /test` — Returns a JSON message to confirm the backend is running.

### User Signup

- `POST /users/signup`
  - **Body (JSON):**
    ```json
    {
      "firstName": "John",
      "secondName": "Michael",
      "lastName": "Doe",
      "role": "admin",
      "email": "john.doe@example.com"
    }
    ```
  - **Description:** Creates a new user in Firebase Auth, stores profile info in Firestore, generates a password automatically, and emails the login credentials through Brevo. No authentication required.

### Users List

- `GET /users`
  - **Headers:** `Authorization: Bearer <firebase_id_token>`
  - **Description:** Returns all users stored in Firestore.

### Device Endpoints

- `POST /devices` — (Requires Firebase Auth token in `Authorization: Bearer <token>`) Add a device (example, extend as needed).

## Environment Variables

- `PORT` — Port to run the server (default: 3000)
- `FIREBASE_PROJECT_ID` — Your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` — Firebase Admin service account email
- `FIREBASE_PRIVATE_KEY` — Firebase Admin private key (use `\n` for newlines)
- `BREVO_API_KEY` — Brevo transactional email API key

## Folder Explanations

- **controllers/**: Handle request logic for each route.
- **routes/**: Define API endpoints and attach controllers/middleware.
- **services/**: Business logic, e.g., user creation in Firebase.
- **middleware/**: Express middleware (e.g., authentication checks).
- **utils/**: Utility modules, such as Firebase Admin initialization, password generation, and mail sending.
- **templates/emails/**: EJS email templates.
- **types/**: Custom TypeScript type definitions.

## Notes

- All user data is managed via Firebase Auth and Firestore.
- The project is ready for extension with more endpoints and features.
- For production, secure your `.env` and never commit secrets.

---

For more details, see your project design document or contact the development team.
