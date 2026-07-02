# 🚢 Ship2Aruba MVP — Full-Stack Cargo Logistics & Client Portal

Ship2Aruba is a premium, modern, full-stack logistics SaaS platform designed to streamline order creation, package tracking, invoicing, and payments for both internal operators and end clients.

Built with a **vibrant SaaS aesthetic** (Outfit/Inter font, glassmorphism elements, sleek violet styling) and a robust architecture ready for future scaling.

---

## 🌟 Key Features

### 🧑‍💼 Staff Operations Portal
- **Interactive Order Wizard**: Multi-step flow for operators to create customer accounts and place orders in AWG (Aruba Florin) with instant conversion from USD rates.
- **Orders Viewer Dashboard**: Central hub to monitor order metrics (Total Value, Pending Payments, Active Orders), filter by customer/date/search, add payments, and edit records.
- **Order Items Management (`/orders/:orderId/items`)**:
  - Full itemized inventory CRUD (description, quantities, images, prices).
  - **Dynamic Auto-Recalculation**: Edits, additions, or deletions of items automatically update parent order totals, taxes, and balances in real-time.
  - **Auto-Save Inputs**: Inline editing of tracking numbers, EST delivery dates, warehouse locations, and notes with instant blur-saving.
  - **PDF Invoice Import**: Upload order invoices to automatically extract descriptions, prices, and quantities (handles Amazon shopping carts, invoices, and screenshot imports).
  - **Item-Level Status Toggles**: Manage tracking checkboxes (`In MyUS` ➔ `Ready for Pickup` ➔ `Delivered`) which trigger automatic client emails.

### 👥 Customer Client Portal
- **Isolated Authentication**: Secure OTP (One-Time Password) based logins via email/phone, ensuring complete separation from staff session states.
- **Timeline-Based Tracking**: "Amazon-style" 9-step tracking progress bar mapping the package journey.
- **Payment History Ledger**: Comprehensive logs of payment transactions, sequences, payment methods, and outstanding balances.
- **Dynamic PDF Invoices**: Real-time invoice generators with layout rendering for print or download.

---

## ⚙️ Tech Stack

- **Backend**: Django (Python 3.12+) + Django REST Framework + PostgreSQL + SimpleJWT.
- **Frontend**: React + Vite + TailwindCSS (Vanilla theme configs) + TanStack Query (v5) + Lucide Icons.
- **Notifications**: Dynamic notification manager sending automated transactional emails via SMTP with fully structured HTML templates (`xhtml2pdf` support for attachments).

---

## 🚀 Quick Start Guide

### Prerequisites
- Python `3.12+`
- Node.js `22+`
- PostgreSQL `16+` (or Docker running local instance)

### 1. Database Initialization
Spin up PostgreSQL locally or via docker-compose:
```bash
docker compose up -d db
```

### 2. Backend Setup
```bash
# Navigate to backend folder
cd backend

# Create & activate Python virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
source venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment keys
copy .env.example .env

# Run migrations and seed test database
python manage.py migrate
python manage.py seed_data

# Start local server (Runs at http://127.0.0.1:8000)
python manage.py runserver
```
* **Default Staff Account**: `staff@ship2aruba.com` / `staff1234`
* **Default Customer Account**: Registered customer email with OTP verification.

### 3. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install Node modules
npm install

# Run Vite dev server (Runs at http://localhost:5173)
npm run dev
```

---

## 📡 Isolated API Routes

### Staff API Endpoint Surface
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Operator token login |
| POST | `/api/orders/` | Place new order (atomic transaction) |
| GET | `/api/orders/` | Paginated orders list with query filters |
| PATCH | `/api/orders/{id}/status/` | Toggle global order flags |
| POST | `/api/orders/{id}/upload-pdf/` | Upload and parse invoice items |
| GET/POST | `/api/orders/{orderId}/items/` | List/Add items for a specific order |
| PATCH/DELETE | `/api/orders/items/{itemId}/` | Update or remove specific inventory items |
| GET/POST | `/api/orders/{orderId}/payments/` | Log payment histories and track due balances |

### Client Portal Isolated API Surface
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/client/auth/otp/request/` | Request 6-digit verification code |
| POST | `/api/client/auth/otp/verify/` | Log in using OTP code |
| POST | `/api/client/auth/set-password/` | Set initial portal password |
| GET | `/api/client/orders/` | View current logged-in customer's orders |
| GET | `/api/client/orders/{id}/` | Full timeline and item list of specific order |


