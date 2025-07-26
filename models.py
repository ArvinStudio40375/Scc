from app import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
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
    deskripsi = db.Column(db.String(255), default=None)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='saldo_records')


class Chat(db.Model):
    __tablename__ = 'chat'
    
    id = db.Column(db.Integer, primary_key=True)
    id_pesanan = db.Column(db.Integer, db.ForeignKey('pesanan.id'), nullable=False)
    id_pengirim = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    pesan = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    pesanan = db.relationship('Pesanan', backref='chat_messages')
    pengirim = db.relationship('User', backref='sent_messages')