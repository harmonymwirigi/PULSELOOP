PulseLoopCare Deployment Guide
This guide covers the complete process for deploying updates to both the frontend and backend of the PulseLoopCare application on your VPS.
Prerequisites
All your code changes have been tested locally.
All final changes have been committed and pushed to your main branch on GitHub.
Step 1: Connect to Your Server
First, establish a secure connection to your VPS.
code
Bash
# Connect to your server using SSH
ssh root@194.164.72.53
```**Purpose:** To gain command-line access to your live server.

---

### **Step 2: Stop the Live Application**

Before updating files, we must stop the running application to prevent errors and ensure a clean update.

```bash
# Stop the Gunicorn application server managed by systemd
sudo systemctl stop pulseloop
```**Purpose:** To safely take the backend offline so we can update its files and database structure. Nginx will temporarily show a "502 Bad Gateway" error to users, which is normal during a deployment.

---

### **Step 3: Update the Codebase**

Next, pull the latest version of your code from your GitHub repository.

```bash
# Navigate to the root project directory
cd /var/w ww/pulseloop

# This command discards any accidental changes made on the server and
# ensures your local server copy is identical to what's on GitHub.
git reset --hard origin/main

# This command downloads the latest code you pushed from your local machine.
git pull origin main```
**Purpose:** To synchronize the server's code with your final, tested version from your Git repository. The `reset --hard` command is a safety measure to prevent merge conflicts from accidental server-side edits.

---

### **Step 4: Update Backend Dependencies & Database**

Now that the code is updated, we need to install any new Python libraries and apply any database changes.

```bash
# Activate your project's Python virtual environment
source venv/bin/activate

# Navigate into the backend directory
cd backend

# Install any new Python packages listed in requirements.txt.
# It's safe to run this every time; it will only install what's new.
pip install -r requirements.txt

# This command checks your `models.py` for changes (like new tables or columns)
# and automatically creates a new migration script for them.
flask db migrate -m "Add new feature or bug fix description"

# This command applies the new migration script to your MySQL database,
# updating its structure to match your code.
flask db upgrade
Purpose: To ensure your backend environment and database schema are perfectly in sync with your latest code before the application starts.
Step 5: Rebuild the Frontend
With the backend ready, we now compile the latest frontend source code into the final static files that will be served to users.
code
Bash
# Navigate to the frontend directory

cd ../frontend
# Install any new JavaScript packages from package.json.
# Safe to run every time.
npm install

# This command compiles your React/TypeScript code into an optimized
# 'dist' folder, ready for production.
npm run build
Purpose: To create the final, optimized HTML, CSS, and JavaScript files from your source code. This step must be done after git pull to include your latest frontend changes.
Step 6: Restart All Services and Verify
The code, database, and frontend are all updated. The final step is to start the servers and verify they are running correctly.
code
Bash
# Start your backend application using the systemd service
sudo systemctl start pulseloop

# Restart the Nginx web server to ensure it serves the new frontend files
sudo systemctl restart nginx

# --- VERIFICATION ---

# Wait about 5 seconds, then check the status of your backend.
# You MUST see a green "active (running)" message.
sudo systemctl status pulseloop

# Check the status of your web server.
# You MUST also see a green "active (running)" message.
sudo systemctl status nginx
Purpose: To bring the entire application back online in a clean and controlled manner. Using systemctl ensures the applications are managed correctly by the operating system and will restart automatically if the server reboots.
Deployment Complete!
Your update is now live. Go to https://pulseloopcare.com and perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to see your changes.