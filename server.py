from flask import Flask, send_from_directory, send_file, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "your-secret-key-here")

# Configure database - build proper PostgreSQL URL from Neon credentials
PGHOST = os.environ.get("PGHOST")
PGPORT = os.environ.get("PGPORT") 
PGUSER = os.environ.get("PGUSER")
PGPASSWORD = os.environ.get("PGPASSWORD")
PGDATABASE = os.environ.get("PGDATABASE")

if PGHOST and PGPORT and PGUSER and PGPASSWORD and PGDATABASE:
    database_url = f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}"
else:
    database_url = os.environ.get("DATABASE_URL")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize database
db.init_app(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    nama_lengkap = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    status_verifikasi = db.Column(db.String(50), default=None)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Pesanan(db.Model):
    __tablename__ = 'pesanan'
    
    id = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    id_mitra = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    jenis_layanan = db.Column(db.String(100), nullable=False)
    deskripsi = db.Column(db.Text, nullable=False)
    alamat = db.Column(db.Text, nullable=False)
    waktu_diinginkan = db.Column(db.DateTime, nullable=False)
    estimasi_budget = db.Column(db.Integer, default=None)
    status = db.Column(db.String(50), nullable=False, default='menunggu_konfirmasi')
    waktu_pesan = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[id_user], backref='pesanan_user')
    mitra = db.relationship('User', foreign_keys=[id_mitra], backref='pesanan_mitra')

class Saldo(db.Model):
    __tablename__ = 'saldo'
    
    id = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    jumlah = db.Column(db.Integer, nullable=False)
    jenis_transaksi = db.Column(db.String(50), nullable=False)
    keterangan = db.Column(db.Text, default=None)
    status = db.Column(db.String(50), nullable=False, default='pending')
    waktu = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='saldo_transaksi')

class Chat(db.Model):
    __tablename__ = 'chat'
    
    id = db.Column(db.Integer, primary_key=True)
    dari = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ke = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    pesan = db.Column(db.Text, nullable=False)
    waktu = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    
    # Relationships
    dari_user = db.relationship('User', foreign_keys=[dari], backref='chat_sent')
    ke_user = db.relationship('User', foreign_keys=[ke], backref='chat_received')

# Initialize database tables
with app.app_context():
    db.create_all()

# API Routes
@app.route('/api/register', methods=['POST'])
def api_register():
    try:
        data = request.get_json()
        
        # Check if email exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email sudah terdaftar'}), 400
        
        # Create new user
        new_user = User(
            email=data['email'],
            password=data['password'],  # In production, hash this
            nama_lengkap=data['nama_lengkap'],
            role=data['role'],
            status_verifikasi='menunggu_verifikasi' if data['role'] == 'mitra' else None
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'message': 'Pendaftaran berhasil', 'user_id': new_user.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal mendaftar'}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        
        user = User.query.filter_by(email=data['email']).first()
        if not user or user.password != data['password']:
            return jsonify({'error': 'Email atau password salah'}), 401
            
        if user.role == 'mitra' and user.status_verifikasi != 'terverifikasi':
            return jsonify({'error': 'Akun Anda belum diverifikasi oleh Admin'}), 403
            
        user_data = {
            'id': user.id,
            'email': user.email,
            'nama_lengkap': user.nama_lengkap,
            'role': user.role,
            'status_verifikasi': user.status_verifikasi
        }
        
        return jsonify({'message': 'Login berhasil', 'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': 'Gagal login'}), 500

@app.route('/api/users', methods=['GET'])
def api_get_users():
    try:
        users = User.query.all()
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'email': user.email,
                'nama_lengkap': user.nama_lengkap,
                'role': user.role,
                'status_verifikasi': user.status_verifikasi,
                'created_at': user.created_at.isoformat()
            })
        return jsonify({'data': users_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data users'}), 500

@app.route('/api/users/<int:user_id>/verify', methods=['PUT'])
def api_verify_user(user_id):
    try:
        data = request.get_json()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User tidak ditemukan'}), 404
            
        user.status_verifikasi = data['status']
        db.session.commit()
        
        return jsonify({'message': 'Status verifikasi berhasil diupdate'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal update verifikasi'}), 500

@app.route('/api/mitra/unverified', methods=['GET'])
def api_get_unverified_mitra():
    try:
        mitra = User.query.filter_by(role='mitra', status_verifikasi='menunggu_verifikasi').all()
        mitra_data = []
        for m in mitra:
            mitra_data.append({
                'id': m.id,
                'email': m.email,
                'nama_lengkap': m.nama_lengkap,
                'created_at': m.created_at.isoformat()
            })
        return jsonify({'data': mitra_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data mitra'}), 500

@app.route('/api/mitra/verified', methods=['GET'])
def api_get_verified_mitra():
    try:
        mitra = User.query.filter_by(role='mitra', status_verifikasi='terverifikasi').all()
        mitra_data = []
        for m in mitra:
            mitra_data.append({
                'id': m.id,
                'email': m.email,
                'nama_lengkap': m.nama_lengkap
            })
        return jsonify({'data': mitra_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data mitra'}), 500

# Pesanan API endpoints
@app.route('/api/pesanan', methods=['POST'])
def api_create_pesanan():
    try:
        data = request.get_json()
        
        new_pesanan = Pesanan(
            id_user=data['id_user'],
            id_mitra=data['id_mitra'],
            jenis_layanan=data['jenis_layanan'],
            deskripsi=data['deskripsi'],
            alamat=data['alamat'],
            waktu_diinginkan=datetime.fromisoformat(data['waktu_diinginkan'].replace('Z', '')),
            estimasi_budget=data.get('estimasi_budget'),
            status='menunggu_konfirmasi'
        )
        
        db.session.add(new_pesanan)
        db.session.commit()
        
        return jsonify({'message': 'Pesanan berhasil dibuat', 'pesanan_id': new_pesanan.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal membuat pesanan'}), 500

@app.route('/api/pesanan/user/<int:user_id>', methods=['GET'])
def api_get_pesanan_by_user(user_id):
    try:
        pesanan = Pesanan.query.filter_by(id_user=user_id).order_by(Pesanan.waktu_pesan.desc()).all()
        pesanan_data = []
        for p in pesanan:
            pesanan_data.append({
                'id': p.id,
                'jenis_layanan': p.jenis_layanan,
                'deskripsi': p.deskripsi,
                'alamat': p.alamat,
                'waktu_diinginkan': p.waktu_diinginkan.isoformat(),
                'estimasi_budget': p.estimasi_budget,
                'status': p.status,
                'waktu_pesan': p.waktu_pesan.isoformat(),
                'mitra': {
                    'nama_lengkap': p.mitra.nama_lengkap,
                    'email': p.mitra.email
                }
            })
        return jsonify({'data': pesanan_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data pesanan'}), 500

@app.route('/api/pesanan/mitra/<int:mitra_id>', methods=['GET'])
def api_get_pesanan_by_mitra(mitra_id):
    try:
        pesanan = Pesanan.query.filter_by(id_mitra=mitra_id).order_by(Pesanan.waktu_pesan.desc()).all()
        pesanan_data = []
        for p in pesanan:
            pesanan_data.append({
                'id': p.id,
                'jenis_layanan': p.jenis_layanan,
                'deskripsi': p.deskripsi,
                'alamat': p.alamat,
                'waktu_diinginkan': p.waktu_diinginkan.isoformat(),
                'estimasi_budget': p.estimasi_budget,
                'status': p.status,
                'waktu_pesan': p.waktu_pesan.isoformat(),
                'user': {
                    'nama_lengkap': p.user.nama_lengkap,
                    'email': p.user.email
                }
            })
        return jsonify({'data': pesanan_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data pesanan'}), 500

@app.route('/api/pesanan/<int:pesanan_id>/status', methods=['PUT'])
def api_update_pesanan_status(pesanan_id):
    try:
        data = request.get_json()
        pesanan = Pesanan.query.get(pesanan_id)
        if not pesanan:
            return jsonify({'error': 'Pesanan tidak ditemukan'}), 404
            
        pesanan.status = data['status']
        db.session.commit()
        
        return jsonify({'message': 'Status pesanan berhasil diupdate'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal update status pesanan'}), 500

# Serve static files
@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # Check if file exists in current directory
    if os.path.exists(filename):
        return send_file(filename)
    else:
        return "File not found", 404

# Health check endpoint
@app.route('/health')
def health():
    return {'status': 'healthy', 'message': 'SmartCare server is running'}

if __name__ == '__main__':
    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)
