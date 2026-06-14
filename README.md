# PayrollPro — Staff Payroll Management System

Enterprise-grade payroll management built with Django REST Framework + React + Vite + Material UI.

## Project Structure

```
payroll/
├── backend/           # Django REST API (deploy to Render)
│   ├── accounts/      # Authentication & users
│   ├── departments/   # Department management
│   ├── employees/     # Employee management
│   ├── attendance/    # QR & manual attendance
│   ├── leave_management/  # Leave workflow
│   ├── salary_rules/  # Salary group engine
│   ├── payroll/       # Payroll calculation engine
│   ├── payslips/      # PDF payslip generation
│   ├── notifications/ # Email service
│   ├── dashboard/     # Analytics APIs
│   ├── reports/       # PDF/Excel reports
│   ├── audit_logs/    # Security audit trail
│   └── settings_app/  # System configuration
│
└── frontend/          # React + Vite (deploy to Netlify)
    └── src/
        ├── pages/admin/    # All admin pages
        ├── pages/employee/ # All employee pages
        ├── components/     # Shared components
        ├── contexts/       # React contexts
        └── services/       # API service (Axios)
```

---

## Local Development Setup

### 1. Backend Setup

```bash
cd backend

# Create .env from example
cp .env.example .env
# Edit .env with your local values

# Install dependencies
pip install -r requirements.txt

# Run migrations (uses SQLite locally)
python manage.py migrate

# Create admin superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Deployment Guide

### Backend → Render

1. **Push backend to GitHub** (separate repo or monorepo)
2. **Go to Render** → New → Web Service
3. **Connect your GitHub repo**
4. Configure:
   - Build Command: `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   - Start Command: `gunicorn payroll_backend.wsgi:application`
5. **Add Environment Variables** (from `.env.example`):
   - `SECRET_KEY` — generate a strong random key
   - `JWT_SECRET_KEY` — generate a strong random key
   - `DATABASE_URL` — your MySQL connection string (PlanetScale/Railway)
   - `ALLOWED_HOSTS` — your Render domain (e.g., `payroll.onrender.com`)
   - `CORS_ALLOWED_ORIGINS` — your Netlify URL
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
   - `COMPANY_NAME`, `COMPANY_ADDRESS`
   - `DEBUG=False`

### Database → PlanetScale (Free MySQL)

1. Create account at [planetscale.com](https://planetscale.com)
2. Create database `payroll_db`
3. Get connection string → use as `DATABASE_URL` in Render

### Frontend → Netlify

1. **Go to Netlify** → Add new site → Import from GitHub
2. **Build settings:**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
3. **Environment variables:**
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
4. Deploy!

---

## Default Admin Setup

After first deployment, create the admin superuser:
```bash
python manage.py createsuperuser
```
Then set role to `admin` in the database.

---

## Security Features

- ✅ JWT authentication (HS256, no `none` algorithm)
- ✅ In-memory token storage (no localStorage XSS risk)
- ✅ Token blacklisting on logout
- ✅ RBAC: Admin / Employee role enforcement
- ✅ Rate limiting on login (10/hour per IP)
- ✅ CORS: Only whitelisted Netlify origin
- ✅ Django ORM (no raw SQL — SQL injection proof)
- ✅ Payslip PDF served with `Content-Disposition: attachment`
- ✅ All secrets from environment variables (never hardcoded)
- ✅ Audit log on all critical actions
- ✅ HTTPS enforced on both Netlify and Render

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Material UI v5 |
| Routing | React Router v6 |
| HTTP | Axios |
| Charts | Recharts |
| Backend | Django 5 + Django REST Framework |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | MySQL (PlanetScale) |
| PDF | ReportLab |
| Excel | openpyxl |
| Email | Django SMTP |
| Frontend Host | Netlify |
| Backend Host | Render |
