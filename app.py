from flask import Flask, request, jsonify, send_from_directory
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import sqlite3
import os
import base64

app = Flask(__name__)

# Database setup
conn = sqlite3.connect('users.db')
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS users
             (email TEXT PRIMARY KEY, full_name TEXT, parent_phone TEXT, face_descriptor BLOB)''')
conn.commit()
conn.close()

# Create a directory to store face images
if not os.path.exists('face_images'):
    os.makedirs('face_images')

def get_db_connection():
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

@app.route('/app.js')
def serve_js():
    return send_from_directory('.', 'app.js')

@app.route('/models/<path:path>')
def serve_models(path):
    return send_from_directory('models', path)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data['email']
    full_name = data['fullName']
    parent_phone = data['parentPhone']
    face_descriptor = np.array(data['faceDescriptor'])
    captured_image = data['capturedImage']

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (email, full_name, parent_phone, face_descriptor) VALUES (?, ?, ?, ?)',
                     (email, full_name, parent_phone, face_descriptor.tobytes()))
        conn.commit()

        # Save the captured image
        image_data = base64.b64decode(captured_image.split(',')[1])
        with open(f'face_images/{email}.jpg', 'wb') as f:
            f.write(image_data)

        return jsonify({'success': True, 'message': 'Registration successful!'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists.'})
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    face_descriptor = np.array(data['faceDescriptor'])

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if user:
        stored_descriptor = np.frombuffer(user['face_descriptor'])
        similarity = cosine_similarity([face_descriptor], [stored_descriptor])[0][0]
        if similarity > 0.6:  # Adjust this threshold as needed
            return jsonify({'success': True, 'message': 'Login successful!'})
        else:
            return jsonify({'success': False, 'message': 'Face does not match.'})
    else:
        return jsonify({'success': False, 'message': 'User not found.'})

@app.route('/dashboard')
def dashboard():
    return "Welcome to your dashboard!"

if __name__ == '__main__':
    app.run(debug=True)

