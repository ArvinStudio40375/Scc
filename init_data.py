from app import app, db
from models import User, Pesanan, Saldo, Chat
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

def create_test_data():
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        
        # Create test users
        users_data = [
            {
                'email': 'admin@smartcare.com',
                'password': generate_password_hash('admin123'),
                'nama_lengkap': 'Administrator',
                'role': 'admin',
                'status_verifikasi': 'terverifikasi'
            },
            {
                'email': 'user1@gmail.com',
                'password': generate_password_hash('user123'),
                'nama_lengkap': 'Budi Santoso',
                'role': 'user',
                'status_verifikasi': None
            },
            {
                'email': 'mitra1@gmail.com',
                'password': generate_password_hash('mitra123'),
                'nama_lengkap': 'Sari Cleaning Service',
                'role': 'mitra',
                'status_verifikasi': 'terverifikasi'
            },
            {
                'email': 'mitra2@gmail.com',
                'password': generate_password_hash('mitra123'),
                'nama_lengkap': 'Andi Repair Shop',
                'role': 'mitra',
                'status_verifikasi': 'menunggu_verifikasi'
            }
        ]
        
        for user_data in users_data:
            user = User(**user_data)
            db.session.add(user)
        
        db.session.commit()
        
        # Get user IDs for relationships
        admin = User.query.filter_by(role='admin').first()
        user1 = User.query.filter_by(email='user1@gmail.com').first()
        mitra1 = User.query.filter_by(email='mitra1@gmail.com').first()
        mitra2 = User.query.filter_by(email='mitra2@gmail.com').first()
        
        # Create test orders
        pesanan_data = [
            {
                'id_user': user1.id,
                'id_mitra': mitra1.id,
                'jenis_layanan': 'Cleaning',
                'deskripsi': 'Pembersihan rumah 2 lantai',
                'alamat': 'Jl. Merdeka No. 123, Jakarta',
                'waktu_diinginkan': datetime.now() + timedelta(days=1),
                'estimasi_budget': 500000,
                'status': 'dikonfirmasi'
            },
            {
                'id_user': user1.id,
                'id_mitra': mitra1.id,
                'jenis_layanan': 'Laundry',
                'deskripsi': 'Cuci pakaian 5kg',
                'alamat': 'Jl. Sudirman No. 456, Jakarta',
                'waktu_diinginkan': datetime.now() + timedelta(hours=6),
                'estimasi_budget': 50000,
                'status': 'selesai'
            }
        ]
        
        for pesanan_data_item in pesanan_data:
            pesanan = Pesanan(**pesanan_data_item)
            db.session.add(pesanan)
        
        db.session.commit()
        
        # Create test balance records
        saldo_data = [
            {
                'id_user': user1.id,
                'jumlah': 1000000,
                'jenis_transaksi': 'topup',
                'deskripsi': 'Top up saldo awal'
            },
            {
                'id_user': user1.id,
                'jumlah': -50000,
                'jenis_transaksi': 'pembayaran',
                'deskripsi': 'Pembayaran layanan laundry'
            }
        ]
        
        for saldo_data_item in saldo_data:
            saldo = Saldo(**saldo_data_item)
            db.session.add(saldo)
        
        db.session.commit()
        
        # Create test chat messages
        pesanan1 = Pesanan.query.first()
        chat_data = [
            {
                'id_pesanan': pesanan1.id,
                'id_pengirim': user1.id,
                'pesan': 'Halo, apakah bisa datang besok pagi?'
            },
            {
                'id_pesanan': pesanan1.id,
                'id_pengirim': mitra1.id,
                'pesan': 'Bisa pak, kami akan datang jam 9 pagi'
            }
        ]
        
        for chat_data_item in chat_data:
            chat = Chat(**chat_data_item)
            db.session.add(chat)
        
        db.session.commit()
        
        print("Test data created successfully!")
        print("Login credentials:")
        print("Admin: admin@smartcare.com / admin123")
        print("User: user1@gmail.com / user123")
        print("Mitra (verified): mitra1@gmail.com / mitra123")
        print("Mitra (pending): mitra2@gmail.com / mitra123")

if __name__ == '__main__':
    create_test_data()