# 📝 Quiz-APK - AI-Powered Quiz Platform

A modern, full-stack quiz platform with AI-generated questions, adaptive difficulty, proctoring capabilities, and comprehensive analytics. Built with **FastAPI** backend and **React** frontend.

**🔗 Live Demo:** https://quiz-apk-frontend.vercel.app

---

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)
- [Security & Proctoring](#security--proctoring)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### 🎯 Core Quiz Management
- **Create & Manage Quizzes** - Admin dashboard for quiz creation with custom configurations
- **Question Management** - Add questions manually or generate via AI
- **Adaptive Difficulty** - Questions adjust difficulty based on student performance
- **Multiple Question Types**:
  - Multiple Choice (MCQ)
  - Coding Problems
  - Composite Questions
  - Custom Question Types

### 🤖 AI Question Generation
- **Multi-Model Support**:
  - Google Gemini 1.5 Flash & 2.5 (Recommended)
  - Qwen 2.5 7B Instruct
  - Llama 3 8B Instruct
  - Mistral 7B Instruct
- **Intelligent Deduplication** - Prevents duplicate questions within 12-hour sessions
- **Customizable Parameters** - Control temperature, token limits, and response quality
- **Fallback Mechanisms** - Automatic degradation to local models if APIs unavailable

### 👮 Proctoring & Security
- **Real-Time Monitoring**:
  - Tab-switch detection
  - Window focus loss tracking
  - Right-click prevention
  - Copy/Paste detection
  - Face detection (optional)
  - Screen share monitoring
  
- **Trust Score System** - Dynamic trust scoring based on behavioral violations
- **User Flagging** - Flag suspicious users for admin review
- **Violation Logging** - Detailed logs of all proctoring events
- **Auto-Submit** - Automatic submission on high-severity violations

### 📊 Analytics & Reporting
- **Admin Dashboard**:
  - Real-time attempt monitoring
  - Score distribution analysis
  - Topic-wise performance metrics
  - Violation breakdown reports
  - Student performance rankings
  
- **Student Reports** - View attempt history and submission status
- **Detailed Attempt Logs** - Full answer history with timestamps

### 👥 User Management
- **Role-Based Access** (Student/Admin)
- **User Registration & Authentication**
- **JWT Token-Based Authorization**
- **User Blocking & Flagging System**

---

## 🛠 Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (async with Motor)
- **Authentication**: JWT (HS256)
- **AI Integration**: 
  - Google Gemini API
  - HuggingFace Inference API
  - Local Transformers (fallback)
- **HTTP Client**: httpx (async)
- **Server**: Uvicorn

### Frontend
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **HTTP Client**: Axios
- **Form Management**: React Hook Form
- **Routing**: React Router v7
- **State**: Context API
- **Date Handling**: date-fns
- **Charts**: Recharts

### Deployment
- **Backend**: Render.com
- **Frontend**: Vercel
- **Database**: MongoDB Atlas

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│              Vercel Deployment                           │
│        https://quiz-apk-frontend.vercel.app              │
└────────────────────┬────────────────────────────────────┘
                     │ Axios HTTP Requests
                     │ JWT Authentication
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (FastAPI)                           │
│           Render.com Deployment                          │
│    https://quiz-apk-backend.onrender.com                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │        FastAPI Routes                            │  │
│  │  ├─ /api/auth (register, login, me)             │  │
│  │  ├─ /api/quizzes (CRUD + assign)                │  │
│  │  ├─ /api/questions (CRUD + AI generation)       │  │
│  │  ├─ /api/attempts (start, answer, submit)       │  │
│  │  ├─ /api/admin (analytics, monitoring)          │  │
│  │  └─ /api/violations (proctoring events)         │  │
│  └──────────────────────────────────────────────────┘  │
│                      │                                   │
│  ┌───────────────────┼───────────────────┐             │
│  ▼                   ▼                    ▼              │
│ MongoDB          AI Engines          Proctoring         │
│ (Motor)          (Gemini/HF)         Validators         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Quiz-APK/
├── app/
│   ├── backend/                    # FastAPI backend
│   │   ├── server.py              # Main FastAPI app
│   │   ├── models.py              # Pydantic models
│   │   ├── auth.py                # JWT & password utilities
│   │   ├── ai_engine.py           # AI generation engine
│   │   ├── seed.py                # Database seeding
│   │   ├── requirements.txt        # Python dependencies
│   │   ├── .env.example            # Environment template
│   │   └── AI_GENERATION_SETUP.md  # AI setup guide
│   │
│   ├── frontend/                   # React frontend
│   │   ├── src/
│   │   │   ├── components/        # Reusable components
│   │   │   ├── pages/             # Page components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── utils/             # Utility functions
│   │   │   ├── api/               # API client
│   │   │   ├── App.jsx            # Main app component
│   │   │   └── index.css          # Global styles
│   │   ├── public/                # Static assets
│   │   ├── package.json           # Dependencies
│   │   ├── tailwind.config.js     # Tailwind config
│   │   └── vercel.json            # Vercel deployment
│   │
│   ├── design_guidelines.json     # UI/UX specifications
│   └── memory/                    # Documentation & notes
│
├── render.yaml                    # Render deployment config
├── start-app.ps1                  # Windows startup script
├── start-app.bat                  # Windows batch startup
├── .gitignore                     # Git ignore rules
├── IMPLEMENTATION_SUMMARY.md      # Recent changes
└── README.md                      # This file
```

---

## 📋 Prerequisites

- **Node.js** 16+ (for frontend)
- **Python** 3.9+ (for backend)
- **MongoDB** (local or Atlas cloud)
- **API Keys** (optional but recommended):
  - Google Gemini API key
  - HuggingFace API token

---

## 🚀 Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/PanduPatil/Quiz-APK.git
cd Quiz-APK
```

### 2️⃣ Backend Setup (FastAPI)

#### Create Virtual Environment
```bash
cd app/backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Environment
```bash
# Copy example to actual .env
cp .env.example .env

# Edit .env with your values
nano .env  # or use your editor
```

#### Environment Variables
```env
# MongoDB
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=quiz_db

# JWT
JWT_SECRET=your-super-secret-key-change-this

# AI - Choose one or both
GEMINI_API_KEY=your-google-gemini-api-key
HF_API_KEY=your-huggingface-api-token

# AI Settings (Optional)
HF_MODEL=meta-llama/Meta-Llama-3-8B-Instruct
HF_TEMPERATURE=0.7
HF_MAX_NEW_TOKENS=2400

# CORS
CORS_ORIGINS=http://localhost:3000,https://quiz-apk-frontend.vercel.app
```

#### Seed Database (Optional)
```bash
python seed.py
```

#### Run Backend
```bash
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

---

### 3️⃣ Frontend Setup (React)

#### Install Dependencies
```bash
cd app/frontend
npm install
# or
yarn install
```

#### Configure Environment
```bash
# .env file (already configured)
REACT_APP_BACKEND_URL=http://localhost:8000
```

For production:
```env
REACT_APP_BACKEND_URL=https://quiz-apk-backend.onrender.com
```

#### Run Frontend
```bash
npm start
# or
yarn start
```

Frontend will open at: `http://localhost:3000`

---

### 4️⃣ Using Startup Scripts (Windows)

Or simply run the provided PowerShell script:

```powershell
# Windows PowerShell
.\start-app.ps1
```

This will automatically:
- Create virtual environments
- Install dependencies
- Start both backend and frontend

---

## ⚙️ Configuration

### AI Model Selection

Edit `app/backend/.env`:

```env
# For Gemini (Fastest & Best Quality)
GEMINI_API_KEY=your_key_here
HF_MODEL=gemini/gemini-1.5-flash

# For HuggingFace Serverless
HF_API_KEY=your_token_here
HF_MODEL=Qwen/Qwen2.5-7B-Instruct

# Or Local Models (requires GPU)
ENABLE_LOCAL_AI_FALLBACK=true
HF_LOCAL_MODEL=Qwen/Qwen3-4B-Instruct
HF_DEVICE_MAP=cuda
```

### Database Connection

```env
# MongoDB Atlas
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=quiz_db

# Local MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=quiz_db
```

### JWT Configuration

```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

Then add to `.env`:
```env
JWT_SECRET=your_generated_secret_here
```

---

## 📚 API Documentation

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://quiz-apk-backend.onrender.com`

### Authentication
All endpoints except `/auth/register` and `/auth/login` require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Key Endpoints

#### 🔐 Authentication
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # Login user
GET    /api/auth/me             # Get current user
```

#### 📝 Quizzes
```
POST   /api/quizzes             # Create quiz (admin)
GET    /api/quizzes             # List quizzes
GET    /api/quizzes/{quiz_id}   # Get quiz details
PUT    /api/quizzes/{quiz_id}   # Update quiz (admin)
DELETE /api/quizzes/{quiz_id}   # Delete quiz (admin)
POST   /api/quizzes/{quiz_id}/assign  # Assign quiz
```

#### ❓ Questions
```
POST   /api/quizzes/{quiz_id}/questions              # Add question
GET    /api/quizzes/{quiz_id}/questions              # List questions
POST   /api/quizzes/{quiz_id}/questions/bulk         # Bulk add
DELETE /api/questions/{qid}                          # Delete question
POST   /api/questions/{qid}/approve                  # Approve AI question
POST   /api/questions/ai-generate                    # Generate via AI
GET    /api/questions/ai-models                      # Available AI models
```

#### 🎯 Attempts
```
POST   /api/attempts/start                           # Start attempt
GET    /api/attempts/{attempt_id}/next               # Get next question
POST   /api/attempts/answer                          # Submit answer
POST   /api/attempts/violation                       # Log violation
POST   /api/attempts/{attempt_id}/submit             # Submit attempt
GET    /api/attempts/my                              # Get my attempts
```

#### 📊 Admin Analytics
```
GET    /api/admin/stats                              # Overall statistics
GET    /api/admin/live                               # Live attempts
GET    /api/admin/results                            # Completed results
GET    /api/admin/users                              # All students
POST   /api/admin/users/{user_id}/flag               # Flag user
POST   /api/admin/users/{user_id}/block              # Block user
GET    /api/admin/attempts/{attempt_id}              # Attempt details
```

### Interactive API Documentation
Access Swagger UI at: `http://localhost:8000/docs`

---

## 💡 Usage Guide

### For Students

1. **Register/Login**
   - Visit frontend at `https://quiz-apk-frontend.vercel.app`
   - Create account or login
   - Receive assigned quizzes from admin

2. **Take Quiz**
   - Click on assigned quiz
   - Click "Start Attempt"
   - Answer questions (difficulty adapts)
   - Submit when done

3. **View Results**
   - Check attempt status
   - View score (after admin review)

### For Admins

1. **Create Quiz**
   - Go to Admin Dashboard
   - Click "Create Quiz"
   - Set title, description, topics, total questions
   - Configure proctoring settings

2. **Add Questions**
   - **Option A**: Manually add questions one by one
   - **Option B**: Bulk upload questions
   - **Option C**: Generate via AI
     - Select AI model
     - Set topic, difficulty, count
     - Review & approve generated questions

3. **Assign to Students**
   - Select quiz
   - Choose students
   - Click "Assign"

4. **Monitor Attempts**
   - View "Live Attempts" for real-time monitoring
   - Check violations and trust scores
   - Auto-review suspicious attempts

5. **Analyze Results**
   - View score distribution
   - Check topic-wise performance
   - Identify flagged students
   - Generate reports

---

## 🔒 Security & Proctoring

### Proctoring Capabilities

The platform monitors:
- ✅ Tab switching (student leaves window)
- ✅ Copy/Paste attempts
- ✅ Right-click usage
- ✅ DevTools opening
- ✅ Fullscreen exit
- ✅ Focus loss duration
- ✅ Rapid answer patterns (< 2 seconds)

### Trust Score System

```
Starting Score: 100
Penalties:
- Tab switch: -8 points
- Copy attempt: -6 points
- Paste attempt: -10 points
- Focus loss: -5 points
- Right-click: -2 points
- DevTools: -12 points
- Rapid answers (>30%): -10 points

Flagged if: Trust Score < 50
Auto-submitted if: Violations >= 3
```

### Best Practices

1. **Backend Security**
   - Always use HTTPS in production
   - Rotate JWT_SECRET regularly
   - Never commit `.env` files
   - Use MongoDB IP whitelist

2. **Frontend Security**
   - Validate all inputs
   - Don't store tokens in localStorage (use httpOnly cookies)
   - CORS properly configured
   - CSP headers enabled

3. **Deployment Security**
   - Enable authentication
   - Use environment secrets
   - Keep dependencies updated
   - Regular security audits

---

## 🚀 Deployment

### Backend (Render.com)

1. **Connect Repository**
   - Go to render.com
   - Create new Web Service
   - Connect GitHub repo

2. **Configure**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port 8000`
   - Add environment variables from `.env.example`

3. **Database**
   - Use MongoDB Atlas free tier
   - Whitelist Render IP

4. **Deploy**
   - Push to GitHub
   - Render auto-deploys

See `render.yaml` for configuration.

### Frontend (Vercel)

1. **Connect Repository**
   - Go to vercel.com
   - Create new project
   - Connect GitHub repo
   - Select `app/frontend` as root directory

2. **Environment Variables**
   ```
   REACT_APP_BACKEND_URL=https://quiz-apk-backend.onrender.com
   ```

3. **Deploy**
   - Vercel auto-deploys on push
   - Auto-generated URL available

---

## 📸 Screenshots

### Student Dashboard
- Quiz list with status
- Attempt history
- Real-time quiz interface

### Admin Dashboard
- Quiz management
- Question creation & AI generation
- Real-time attempt monitoring
- Student analytics & performance reports
- Violation tracking

### AI Generation Interface
- Model selection
- Parameter customization
- Question preview & approval

### Proctoring Alerts
- Violation notifications
- Trust score updates
- Real-time monitoring

---

## ⚠️ Security Considerations

### ✅ What's Been Done
- JWT authentication with secure token handling
- Password hashing (bcrypt)
- MongoDB connection via Atlas
- CORS properly configured
- Violation logging for audit trails

### ⚠️ Important Notes
- **Keep `.env` secret** - Never commit to repository
- **Rotate JWT_SECRET** after deployment
- **Use HTTPS only** in production
- **Update dependencies** regularly: `pip list --outdated`
- **Monitor API usage** for abuse
- **Database backups** - Enable MongoDB Atlas automatic backups

### 🔑 Current Status
- ✅ No hardcoded API keys in source code
- ✅ No credentials in `.env` file (only template exists)
- ✅ Frontend `.env` contains only public URLs
- ✅ All secrets managed via environment variables

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 Documentation

- **[AI Generation Setup](app/backend/AI_GENERATION_SETUP.md)** - Detailed AI configuration
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Recent changes & improvements
- **[Backend Server Code](app/backend/server.py)** - API implementation
- **[AI Engine Code](app/backend/ai_engine.py)** - Question generation logic

---

## 🐛 Troubleshooting

### Backend Issues

**Port Already in Use**
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

**MongoDB Connection Failed**
- Check MONGO_URL in `.env`
- Verify IP whitelist in MongoDB Atlas
- Ensure credentials are correct

**AI Generation Returns Empty**
- Check API keys are valid
- Verify model names are correct
- Check HuggingFace model availability

### Frontend Issues

**CORS Errors**
- Verify REACT_APP_BACKEND_URL in `.env`
- Ensure backend CORS_ORIGINS includes frontend URL

**Build Fails**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm start
```

**Hot Reload Not Working**
- Clear browser cache
- Restart React dev server

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙋 Support

For issues and questions:
1. Check existing [GitHub Issues](https://github.com/PanduPatil/Quiz-APK/issues)
2. Create a new issue with detailed information
3. Include error messages and screenshots

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Real-time collaborative quizzes
- [ ] Advanced proctoring (face recognition, gaze tracking)
- [ ] Question bank & library management
- [ ] Certificate generation
- [ ] Payment integration for premium features
- [ ] API rate limiting & throttling
- [ ] Advanced analytics & ML-based insights

---

## 👨‍💻 Author

**Pandu Patil** - [GitHub](https://github.com/PanduPatil)

---

**Last Updated**: June 2026  
**Status**: Active Development ✨

---

## 🌟 Show Your Support

If this project helped you, please consider giving it a ⭐ on GitHub!
