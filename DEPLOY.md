# Hướng dẫn Deploy - Hệ thống Huấn luyện ATVSLĐ

> **Backend:** Python FastAPI + MongoDB, quản lý bởi Supervisor
> **Frontend:** React 19 + Vite, phục vụ bởi Nginx

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt MongoDB](#2-cài-đặt-mongodb)
3. [Deploy Backend (Supervisor)](#3-deploy-backend-supervisor)
4. [Deploy Frontend (Nginx)](#4-deploy-frontend-nginx)
5. [Quản lý và giám sát](#5-quản-lý-và-giám-sát)
6. [Cập nhật ứng dụng](#6-cập-nhật-ứng-dụng)
7. [Xử lý sự cố](#7-xử-lý-sự-cố)


## Server Access

### SSH Connection

```bash
ssh ecotel-admin@118.70.151.69 -p 2222
```

**Password:** `Ecotel@2025`
---

## 1. Yêu cầu hệ thống

| Thành phần   | Phiên bản         |
| ------------ | ----------------- |
| OS           | Ubuntu 20.04+ / CentOS 7+ |
| Python       | 3.10+             |
| Node.js      | 18+ (chỉ cần để build FE) |
| MongoDB      | 6.0+              |
| Nginx        | 1.18+             |
| Supervisor   | 4.x               |

### Cài đặt các gói cơ bản (Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git nginx supervisor curl
```

### Cài đặt các gói cơ bản (CentOS/RHEL)

```bash
sudo yum update -y
sudo yum install -y python3 python3-pip git nginx supervisor curl
```

---

## 2. Cài đặt MongoDB

### Ubuntu/Debian

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Thêm repository (Ubuntu 22.04)
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# Khởi động và enable
sudo systemctl start mongod
sudo systemctl enable mongod

# Kiểm tra
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Tạo database và user (khuyên dùng)

```bash
mongosh
```

```javascript
use atvsld_training

db.createUser({
  user: "atvsld_user",
  pwd: "MẬT_KHẨU_MẠNH_Ở_ĐÂY",
  roles: [{ role: "readWrite", db: "atvsld_training" }]
})
```

---

## 3. Deploy Backend (Supervisor)

### 3.1. Clone source code

```bash
cd /home/ecotel-admin
mkdir -p atvsld
cd atvsld
git clone <URL_REPO> AnToanLaoDong
# Hoặc copy source code vào /home/ecotel-admin/atvsld/AnToanLaoDong/
```

### 3.2. Cài đặt dependencies Python

```bash
cd /home/ecotel-admin/atvsld/AnToanLaoDong/AnToanLaoDongBE
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3. Cấu hình environment

```bash
nano .env
```

Nội dung file `.env`:

```ini
# Ứng dụng
APP_NAME=ATVSLD Training System
DEBUG=false
HOST=0.0.0.0
PORT=1133

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=atvsld_training

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=4000

# Upload file
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
MAX_UPLOAD_SIZE_MB=50
```

### 3.4. Tạo thư mục uploads và exports

```bash
cd /home/ecotel-admin/atvsld/AnToanLaoDong/AnToanLaoDongBE
mkdir -p uploads exports
```

### 3.5. Chạy thử trước khi cấu hình Supervisor

```bash
cd /home/ecotel-admin/atvsld/AnToanLaoDong/AnToanLaoDongBE
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 1133
# Truy cập http://113.22.123.208:1133/docs để kiểm tra Swagger UI
# Ctrl+C để dừng
```

### 3.6. Cấu hình Supervisor

**Bước 1: Tạo thư mục log trước (BẮT BUỘC)**

> Supervisor yêu cầu thư mục log phải tồn tại trước khi đọc cấu hình. Nếu thiếu bước này sẽ bị lỗi `CANT_REREAD`.

```bash
sudo mkdir -p /var/log/atvsld-backend
sudo chown ecotel-admin:ecotel-admin /var/log/atvsld-backend
```

**Bước 2: Tạo file cấu hình Supervisor**

```bash
sudo nano /etc/supervisor/conf.d/atvsld-backend.conf
```

Nội dung:

```ini
[program:atvsld-backend]
directory=/home/ecotel-admin/atvsld/AnToanLaoDong/AnToanLaoDongBE
command=/usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 1133
user=ecotel-admin
autostart=true
autorestart=true
stderr_logfile=/var/log/atvsld-backend/err.log
stdout_logfile=/var/log/atvsld-backend/out.log
```

**Bước 3: Khởi động**

```bash
# Đọc lại cấu hình
sudo supervisorctl reread
sudo supervisorctl update

# Khởi động
sudo supervisorctl start atvsld-backend

# Kiểm tra trạng thái
sudo supervisorctl status atvsld-backend
```

Kết quả mong đợi:

```
atvsld-backend                   RUNNING   pid 12345, uptime 0:00:10
```

> **Nếu gặp lỗi `CANT_REREAD`:** Kiểm tra lại thư mục log đã được tạo chưa bằng `ls -la /var/log/atvsld-backend/`. Nếu chưa, chạy lại bước 1.

---

## 4. Deploy Frontend (Nginx)

### 4.1. Build Frontend

**Trên server:**

```bash
# Cài đặt Node.js (nếu chưa có)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

cd /home/ecotel-admin/atvsld/AnToanLaoDong/antoanlaodongfe
npm install
npm run build
```

**Hoặc build trên máy local rồi copy lên server:**

```bash
cd antoanlaodongfe
npm install
npm run build

# Copy lên server
scp -P 2222 -r dist/* ecotel-admin@113.22.123.208:/tmp/atvsld-frontend/
```

### 4.2. Copy file build vào thư mục Nginx

```bash
sudo mkdir -p /var/www/atvsld
sudo cp -r dist/* /var/www/atvsld/
# Hoặc nếu copy từ local: sudo cp -r /tmp/atvsld-frontend/* /var/www/atvsld/
sudo chown -R www-data:www-data /var/www/atvsld
```

### 4.3. Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/atvsld
```

Nội dung:

```nginx
server {
    listen 2200;
    server_name _;

    root /var/www/atvsld;
    index index.html;

    # React SPA - chuyển tất cả route về index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API sang backend
    location /api/ {
        proxy_pass http://127.0.0.1:1133/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }

    access_log /var/log/nginx/atvsld_access.log;
    error_log /var/log/nginx/atvsld_error.log;
}
```

### 4.4. Kích hoạt và khởi động

```bash
# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/atvsld /etc/nginx/sites-enabled/

# Kiểm tra cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

Truy cập: **http://113.22.123.208:2200**

---

## 5. Quản lý và giám sát

### Các lệnh Supervisor thường dùng

```bash
# Xem trạng thái
sudo supervisorctl status atvsld-backend

# Khởi động lại backend
sudo supervisorctl restart atvsld-backend

# Dừng backend
sudo supervisorctl stop atvsld-backend

# Xem log thời gian thực
sudo tail -f /var/log/atvsld-backend/out.log
sudo tail -f /var/log/atvsld-backend/err.log

# Reload cấu hình Supervisor (sau khi sửa file .conf)
sudo supervisorctl reread
sudo supervisorctl update
```

### Các lệnh Nginx thường dùng

```bash
# Kiểm tra cấu hình
sudo nginx -t

# Reload (không downtime)
sudo systemctl reload nginx

# Khởi động lại
sudo systemctl restart nginx

# Xem log
sudo tail -f /var/log/nginx/atvsld_access.log
sudo tail -f /var/log/nginx/atvsld_error.log
```

### Kiểm tra health

```bash
# Backend health check
curl http://localhost:1133/api/v1/health

# Frontend (qua Nginx)
curl -I http://localhost:2200
```

---

## 6. Cập nhật ứng dụng

### Cập nhật Backend

```bash
cd /home/ecotel-admin/atvsld/AnToanLaoDong/AnToanLaoDongBE

# Pull code mới
git pull origin main

# Cập nhật dependencies (nếu có thay đổi)
pip install -r requirements.txt

# Khởi động lại
sudo supervisorctl restart atvsld-backend
```

### Cập nhật Frontend

```bash
cd /home/ecotel-admin/atvsld/AnToanLaoDong/antoanlaodongfe

# Pull code mới
git pull origin main

# Build lại
npm install
npm run build

# Copy vào thư mục web
sudo rm -rf /var/www/atvsld/*
sudo cp -r dist/* /var/www/atvsld/
sudo chown -R www-data:www-data /var/www/atvsld

# Không cần restart Nginx (static files)
```

---

## 7. Xử lý sự cố

### Backend không khởi động

```bash
# Xem log chi tiết
sudo tail -100 /var/log/atvsld-backend/out.log
sudo tail -100 /var/log/atvsld-backend/err.log

# Kiểm tra port đã bị chiếm chưa
sudo lsof -i :1133

# Thử chạy thủ công để xem lỗi
cd /home/ecotel-admin/atvsld/AnToanLaoDong/AnToanLaoDongBE
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 1133
```

### Nginx trả về 502 Bad Gateway

```bash
# Kiểm tra backend đã chạy chưa
sudo supervisorctl status atvsld-backend

# Kiểm tra backend có lắng nghe đúng port không
curl http://127.0.0.1:1133/api/v1/health

# Kiểm tra log Nginx
sudo tail -20 /var/log/nginx/atvsld_error.log
```

### Frontend trắng trang / không load

```bash
# Kiểm tra file có tồn tại không
ls -la /var/www/atvsld/

# Kiểm tra quyền
sudo chown -R www-data:www-data /var/www/atvsld

# Kiểm tra cấu hình Nginx
sudo nginx -t
```

### MongoDB không kết nối

```bash
# Kiểm tra MongoDB đang chạy
sudo systemctl status mongod

# Kiểm tra kết nối
mongosh --eval "db.runCommand({ ping: 1 })"

# Xem log MongoDB
sudo tail -50 /var/log/mongodb/mongod.log
```

---

## Tổng kết kiến trúc Deploy

```
                    Internet
                       |
                    [ Nginx :2200 ]
                    /              \
                   /                \
    Static files (React)     Reverse Proxy
    /var/www/atvsld/          /api/* --> 127.0.0.1:1133
                                        |
                              [ Uvicorn (FastAPI) :1133 ]
                              quản lý bởi Supervisor
                                        |
                                  [ MongoDB :27017 ]
```

Truy cập: **http://113.22.123.208:2200**

### Các port cần mở Firewall

| Port  | Dịch vụ    | Ghi chú                      |
| ----- | ---------- | ---------------------------- |
| 2200  | HTTP       | Nginx - Frontend             |
| 2222  | SSH        | Truy cập server              |
| 27017 | MongoDB    | Chỉ cho localhost, KHÔNG mở ra ngoài |
| 1133  | Backend    | Chỉ cho localhost (Nginx proxy) |

```bash
# UFW (Ubuntu)
sudo ufw allow 2200/tcp
sudo ufw allow 2222/tcp
sudo ufw enable
```
