from flask import render_template, send_from_directory, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from app import app, db
from models import User, Pesanan, Saldo, Chat
from datetime import datetime
import os


# Static file routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)


# API Routes
@app.route('/api/register', methods=['POST'])
def api_register():
    try:
        data = request.get_json()
        
        # Check if email exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email sudah terdaftar'}), 400
        
        # Hash password properly
        hashed_password = generate_password_hash(data['password'])
        
        # Create new user
        new_user = User(
            email=data['email'],
            password=hashed_password,
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
        if not user or not check_password_hash(user.password, data['password']):
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
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User tidak ditemukan'}), 404
            
        user.status_verifikasi = 'terverifikasi'
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'User berhasil diverifikasi'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal memverifikasi user'}), 500


@app.route('/api/pesanan', methods=['GET'])
def api_get_pesanan():
    try:
        pesanan = Pesanan.query.all()
        pesanan_data = []
        for p in pesanan:
            pesanan_data.append({
                'id': p.id,
                'id_user': p.id_user,
                'id_mitra': p.id_mitra,
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
                },
                'mitra': {
                    'nama_lengkap': p.mitra.nama_lengkap,
                    'email': p.mitra.email
                }
            })
        return jsonify({'data': pesanan_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data pesanan'}), 500


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
            waktu_diinginkan=datetime.fromisoformat(data['waktu_diinginkan'].replace('Z', '+00:00')),
            estimasi_budget=data.get('estimasi_budget')
        )
        
        db.session.add(new_pesanan)
        db.session.commit()
        
        return jsonify({'message': 'Pesanan berhasil dibuat', 'pesanan_id': new_pesanan.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal membuat pesanan'}), 500


@app.route('/api/pesanan/<int:pesanan_id>/status', methods=['PUT'])
def api_update_pesanan_status(pesanan_id):
    try:
        data = request.get_json()
        pesanan = Pesanan.query.get(pesanan_id)
        
        if not pesanan:
            return jsonify({'error': 'Pesanan tidak ditemukan'}), 404
            
        pesanan.status = data['status']
        db.session.commit()
        
        return jsonify({'message': 'Status pesanan berhasil diperbarui'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal memperbarui status pesanan'}), 500


@app.route('/api/saldo', methods=['GET'])
def api_get_saldo():
    try:
        user_id = request.args.get('user_id')
        if user_id:
            saldo_records = Saldo.query.filter_by(id_user=user_id).all()
        else:
            saldo_records = Saldo.query.all()
            
        saldo_data = []
        for s in saldo_records:
            saldo_data.append({
                'id': s.id,
                'id_user': s.id_user,
                'jumlah': s.jumlah,
                'jenis_transaksi': s.jenis_transaksi,
                'deskripsi': s.deskripsi,
                'created_at': s.created_at.isoformat(),
                'user': {
                    'nama_lengkap': s.user.nama_lengkap,
                    'email': s.user.email
                }
            })
        return jsonify({'data': saldo_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data saldo'}), 500


@app.route('/api/saldo', methods=['POST'])
def api_add_saldo():
    try:
        data = request.get_json()
        
        new_saldo = Saldo(
            id_user=data['id_user'],
            jumlah=data['jumlah'],
            jenis_transaksi=data['jenis_transaksi'],
            deskripsi=data.get('deskripsi')
        )
        
        db.session.add(new_saldo)
        db.session.commit()
        
        return jsonify({'message': 'Saldo berhasil ditambahkan', 'saldo_id': new_saldo.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal menambahkan saldo'}), 500


@app.route('/api/chat', methods=['GET'])
def api_get_chat():
    try:
        pesanan_id = request.args.get('pesanan_id')
        if pesanan_id:
            chat_messages = Chat.query.filter_by(id_pesanan=pesanan_id).order_by(Chat.created_at).all()
        else:
            chat_messages = Chat.query.order_by(Chat.created_at).all()
            
        chat_data = []
        for c in chat_messages:
            chat_data.append({
                'id': c.id,
                'id_pesanan': c.id_pesanan,
                'id_pengirim': c.id_pengirim,
                'pesan': c.pesan,
                'created_at': c.created_at.isoformat(),
                'pengirim': {
                    'nama_lengkap': c.pengirim.nama_lengkap,
                    'email': c.pengirim.email
                }
            })
        return jsonify({'data': chat_data}), 200
    except Exception as e:
        return jsonify({'error': 'Gagal mengambil data chat'}), 500


@app.route('/api/chat', methods=['POST'])
def api_send_chat():
    try:
        data = request.get_json()
        
        new_chat = Chat(
            id_pesanan=data['id_pesanan'],
            id_pengirim=data['id_pengirim'],
            pesan=data['pesan']
        )
        
        db.session.add(new_chat)
        db.session.commit()
        
        return jsonify({'message': 'Pesan berhasil dikirim', 'chat_id': new_chat.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Gagal mengirim pesan'}), 500


# Admin special login route
@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    try:
        data = request.get_json()
        
        # Special admin access code check
        if data.get('code') == '011090':
            admin_data = {
                'id': 'admin',
                'email': 'admin@smartcare.com',
                'nama_lengkap': 'Administrator',
                'role': 'admin',
                'status_verifikasi': 'terverifikasi'
            }
            return jsonify({'message': 'Admin login berhasil', 'user': admin_data}), 200
        else:
            return jsonify({'error': 'Kode admin salah'}), 401
            
    except Exception as e:
        return jsonify({'error': 'Gagal login admin'}), 500