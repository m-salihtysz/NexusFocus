import sqlite3
import os

db_path = "/Users/msalih/Downloads/mst/nexusfocus.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name, email FROM users")
    rows = cursor.fetchall()
    for row in rows:
        print(f"Name: {row[0]}, Email: {row[1]}")
    
    cursor.execute("SELECT name FROM tenants")
    rows = cursor.fetchall()
    for row in rows:
        print(f"Tenant Name: {row[0]}")
    conn.close()
else:
    print("DB not found")
