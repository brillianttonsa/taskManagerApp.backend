-- Task Management Database Schema

-- Create database (run this separately)
-- CREATE DATABASE taskmanager;

-- Connect to the database and run the following:

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Families table
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    invitation_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_id, user_id)
);

-- Personal tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)), -- 1=Low, 2=Medium, 3=High
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    assigned_to INTEGER REFERENCES users(id),
    week_start DATE NOT NULL,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family tasks table
CREATE TABLE IF NOT EXISTS family_tasks (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)), -- 1=Low, 2=Medium, 3=High
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_week_start ON tasks(week_start);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_tasks_family_id ON family_tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_family_tasks_assigned_to ON family_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_tasks_updated_at BEFORE UPDATE ON family_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically archive old tasks
CREATE OR REPLACE FUNCTION archive_old_tasks()
RETURNS void AS $$
BEGIN
    UPDATE tasks 
    SET archived = TRUE, archived_at = CURRENT_TIMESTAMP
    WHERE week_start < (CURRENT_DATE - INTERVAL '7 days')
    AND archived = FALSE;
END;
$$ LANGUAGE plpgsql;

-- View for task statistics
CREATE OR REPLACE VIEW task_stats AS
SELECT 
    u.id as user_id,
    u.username,
    t.week_start,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    ROUND(
        (COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0) / 
        NULLIF(COUNT(*), 0), 2
    ) as completion_percentage
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id
WHERE t.archived = FALSE OR t.archived IS NULL
GROUP BY u.id, u.username, t.week_start
ORDER BY u.username, t.week_start DESC;

-- View for family task statistics
CREATE OR REPLACE VIEW family_task_stats AS
SELECT 
    f.id as family_id,
    f.name as family_name,
    u.id as user_id,
    u.username,
    ft.week_start,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN ft.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN ft.status = 'pending' THEN 1 END) as pending_tasks,
    ROUND(
        (COUNT(CASE WHEN ft.status = 'completed' THEN 1 END) * 100.0) / 
        NULLIF(COUNT(*), 0), 2
    ) as completion_percentage
FROM families f
JOIN family_members fm ON f.id = fm.family_id
JOIN users u ON fm.user_id = u.id
LEFT JOIN family_tasks ft ON f.id = ft.family_id AND u.id = ft.assigned_to
GROUP BY f.id, f.name, u.id, u.username, ft.week_start
ORDER BY f.name, u.username, ft.week_start DESC;

-- Sample data (optional - remove in production)
-- INSERT INTO users (username, email, password_hash) VALUES 
-- ('demo_user', 'demo@example.com', '$2b$10$example_hash_here');

-- Clean up function for expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- You can set up a cron job to run this periodically:
-- SELECT cleanup_expired_tokens();
-- SELECT archive_old_tasks();
