# SmartCare - Platform Layanan Cerdas

## Overview

SmartCare is a web-based service platform that connects users with service providers (mitra) through a three-tier role system. The application features a modern frontend built with Bootstrap and vanilla JavaScript, integrated with Supabase as the backend database and authentication service.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: HTML5, CSS3, vanilla JavaScript, Bootstrap 5.3.0
- **Design Pattern**: Multi-page application with role-based dashboards
- **UI Framework**: Bootstrap with custom CSS styling and Feather Icons
- **Language**: Indonesian (Bahasa Indonesia) for UI text

### Backend Architecture
- **Database**: Supabase (PostgreSQL-based)
- **Authentication**: Custom authentication with Supabase integration
- **Server**: Flask development server for static file serving
- **API**: Direct Supabase client-side integration

### Role-Based Access Control
The application implements three distinct user roles:
1. **Admin**: Special access through hidden authentication mechanism
2. **Mitra** (Partners): Service providers requiring verification
3. **User**: End customers using the services

## Key Components

### Authentication System
- **Login Flow**: Single login page for Mitra and User roles
- **Registration**: Separate registration with role selection
- **Admin Access**: Hidden authentication via footer easter egg (code: 011090)
- **User Verification**: Mitra accounts require admin approval before access

### Dashboard System
Each role has a dedicated dashboard:
- `dashboard-admin.html`: Admin management interface
- `dashboard-mitra.html`: Partner service management
- `dashboard-user.html`: Customer service interface

### Core Features
- **User Management**: Registration, login, profile management
- **Order Management**: Service booking and tracking system
- **Balance System**: Digital wallet with top-up functionality
- **Chat System**: Real-time communication between users and partners
- **Verification System**: Admin approval process for new partners

## Data Flow

### User Registration
1. User selects role (Mitra/User) on registration page
2. Data stored in Supabase `users` table
3. Mitra accounts get `status_verifikasi: "menunggu_verifikasi"`
4. User accounts are immediately active

### Authentication Flow
1. Login credentials validated against Supabase
2. Role-based redirect to appropriate dashboard
3. Mitra accounts checked for verification status
4. Session management handled client-side

### Service Order Flow
1. Users create service orders through dashboard
2. Orders assigned to verified Mitra partners
3. Real-time status updates and chat communication
4. Payment processing through balance system

## External Dependencies

### CDN Resources
- Bootstrap 5.3.0 (CSS framework)
- Feather Icons 4.29.0 (iconography)

### Backend Services
- **Supabase**: Primary database and real-time subscriptions
- **Flask**: Development server for local file serving

### Database Schema
Expected Supabase tables:
- `users`: User accounts with role and verification status
- `orders`: Service orders and tracking
- `chat_messages`: Real-time messaging system
- `transactions`: Balance and payment records

## Deployment Strategy

### Development Environment
- Flask development server serves static files
- Direct Supabase client integration
- Environment variables for configuration

### Production Considerations
- Static file hosting (CDN recommended)
- Supabase project configuration
- Environment-specific API keys
- HTTPS enforcement for security

### Security Features
- Password-based authentication (recommend migration to Supabase Auth)
- Role-based access control
- Admin access protection through hidden authentication
- Client-side session management

## Technical Notes

### Current Limitations
- Authentication uses custom implementation instead of Supabase Auth
- Client-side session management (consider server-side sessions)
- Direct database access from frontend (security consideration)

### Recent Updates (July 26, 2025)
- **Database Migration**: Successfully migrated from Supabase mock to full PostgreSQL backend with Neon
- **API Implementation**: Created complete Flask REST API with endpoints for users, pesanan, saldo, and chat
- **Data Models**: Implemented User, Pesanan, Saldo, and Chat models with proper relationships
- **Authentication**: Fixed login/registration system to work with real database
- **Admin Access**: Ensured hidden admin access via footer (code: 011090) works properly
- **Test Data**: Created comprehensive test data including admin, verified mitra, users, and sample orders
- **Frontend Integration**: Updated DatabaseService to connect with Flask API endpoints

### Recommended Enhancements
- Add server-side session management for improved security
- Implement input validation and sanitization
- Add comprehensive error handling and logging mechanisms
- Implement real-time chat functionality
- Add file upload capabilities for mitra verification