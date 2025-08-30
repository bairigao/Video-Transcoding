-- Initialize Video Transcoding Database
USE video_transcoding;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(50) PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    size BIGINT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mimetype VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_upload_date (upload_date)
);

-- Create transcode_jobs table
CREATE TABLE IF NOT EXISTS transcode_jobs (
    id VARCHAR(50) PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    input_path VARCHAR(500) NOT NULL,
    output_path VARCHAR(500) NOT NULL,
    output_filename VARCHAR(255) NOT NULL,
    format VARCHAR(10) NOT NULL,
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Insert default users (passwords should be hashed in production)
INSERT IGNORE INTO users (id, username, password) VALUES 
(1, 'admin', 'password123'),
(2, 'user1', 'userpass1'),
(3, 'user2', 'userpass2');