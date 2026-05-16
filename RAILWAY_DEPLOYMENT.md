# Railway Deployment Guide

This project is a monorepo with three deployable services:

- `Backend`: Express API
- `Frontend`: patient React/Vite app
- `Admin`: admin and doctor React/Vite app

Deploy them as three separate Railway services from the same GitHub repository.

## 1. Push The Project To GitHub

Railway works best when connected to a GitHub repo.

```bash
git add .
git commit -m "Prepare Railway deployment"
git push
```

## 2. Create The Railway Project

1. Go to https://railway.com/new
2. Choose `Empty Project`
3. Create three services: `Backend`, `Frontend`, and `Admin`
4. Connect each service to the same GitHub repository

## 3. Set Root Directory For Each Service

In each service, open `Settings` and set `Root Directory`:

| Railway service | Root Directory |
| --- | --- |
| Backend | `/Backend` |
| Frontend | `/Frontend` |
| Admin | `/Admin` |

Because this repo folder is named `Care Point`, make sure Railway is connected to the repository whose root contains `Backend`, `Frontend`, and `Admin`. If you push the parent folder instead, use `/Care Point/Backend`, `/Care Point/Frontend`, and `/Care Point/Admin`.

## 4. Backend Variables

Open the `Backend` service, go to `Variables`, and add:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
CLOUDINARY_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_SECRET_KEY=your-cloudinary-api-secret
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
CURRENCY=INR
```

Do not add `PORT`; Railway provides it automatically.

## 5. Generate The Backend URL

After the backend deploys:

1. Open the `Backend` service
2. Go to `Settings`
3. Find `Networking`
4. Click `Generate Domain`
5. Test the generated URL in your browser

The backend homepage should show:

```text
Hello I am working
```

## 6. Frontend And Admin Variables

Open both the `Frontend` and `Admin` Railway services and add this variable:

```env
VITE_BACKEND_URL=https://your-backend-service.up.railway.app
```

Use the real backend domain from step 5. Do not include a trailing slash.

Redeploy both services after setting this variable because Vite embeds `VITE_` variables during build.

## 7. Generate Public URLs

For `Frontend` and `Admin`:

1. Open the service
2. Go to `Settings`
3. Find `Networking`
4. Click `Generate Domain`

Your patient website URL comes from the `Frontend` service. Your admin/doctor panel URL comes from the `Admin` service.

## 8. If MongoDB Does Not Connect

If you use MongoDB Atlas, open Atlas Network Access and allow Railway to connect. For a student/demo deployment, the simplest option is:

```text
0.0.0.0/0
```

For production, use a more restricted network setup.

## 9. Useful Railway Settings

Backend:

- Build command: leave automatic
- Start command: `npm start`

Frontend and Admin:

- Build command: `npm run build`
- Publish/output directory: `dist`

Railway's current static hosting support can usually detect Vite automatically, but setting these values manually is fine if the dashboard asks for them.
