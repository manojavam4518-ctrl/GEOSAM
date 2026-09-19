# GEOSAM EW - Web Application

A full-stack Next.js application for GEOSAM packaging, quotations, and logistics management.

---

## 🚀 How to Run This Project on Your Laptop

Follow these simple steps to download and run the project locally on your machine:

### 1. Prerequisites
Make sure you have installed:
- **Node.js** (v18.17+ or v20+ recommended): [Download Node.js](https://nodejs.org/)
- **Git**: [Download Git](https://git-scm.com/)

---

### 2. Clone the Repository
Open your terminal (or Command Prompt / PowerShell) and run:
```bash
git clone https://github.com/manojavam4518-ctrl/GEOSAM.git
cd GEOSAM
```

---

### 3. Install Dependencies
Install all required npm packages:
```bash
npm install
```

---

### 4. Configure Environment Variables
1. Copy the sample environment file to create your own `.env`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows Command Prompt, run: `copy .env.example .env`)*

2. Open `.env` in your text editor and fill in your values:
   - `DATABASE_URL`: Your MongoDB connection string (e.g. MongoDB Atlas cluster URL).
   - `SESSION_SECRET`: A secure random string for user session encryption.
   - `NEXT_PUBLIC_APP_URL`: Set to `http://localhost:3000` for local development.
   - SMTP details (optional, for email notifications).

---

### 5. Initialize Prisma Database Client
Generate the Prisma client:
```bash
npx prisma generate
```

*(Optional: If you need to sync the schema to your MongoDB database, run `npx prisma db push`)*

---

### 6. Start the Development Server
Start the local Next.js server:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Database ORM**: Prisma with MongoDB
- **UI / Styling**: React, Tailwind CSS, Lucide Icons
- **PDF Generation**: jsPDF, html2canvas-pro
- **Authentication**: Custom session management with bcryptjs
