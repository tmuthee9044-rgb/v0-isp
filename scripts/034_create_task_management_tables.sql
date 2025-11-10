-- Create task categories table
CREATE TABLE IF NOT EXISTS task_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100) NOT NULL,
    assigned_by VARCHAR(100) NOT NULL,
    assigned_to_id VARCHAR(50),
    assigned_by_id VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    category_id INTEGER REFERENCES task_categories(id),
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')) DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    due_date DATE NOT NULL,
    created_date DATE DEFAULT CURRENT_DATE,
    updated_date DATE,
    completed_date DATE,
    estimated_hours DECIMAL(5,2) DEFAULT 0,
    actual_hours DECIMAL(5,2) DEFAULT 0,
    tags TEXT[], -- Array of tags
    dependencies INTEGER[], -- Array of task IDs this task depends on
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    author VARCHAR(100) NOT NULL,
    author_id VARCHAR(50),
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_size VARCHAR(20),
    file_url TEXT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
    id SERIAL PRIMARY KEY,
    parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
    assigned_to VARCHAR(100),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task templates table
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    estimated_hours DECIMAL(5,2) DEFAULT 0,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task checklist items table
CREATE TABLE IF NOT EXISTS task_checklist_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES task_templates(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task performance metrics table
CREATE TABLE IF NOT EXISTS task_performance_metrics (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL, -- e.g., '2024-01', 'Q1-2024'
    tasks_assigned INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    avg_completion_time DECIMAL(5,2) DEFAULT 0,
    on_time_completion_rate DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(3,1) DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 10),
    productivity_score DECIMAL(3,1) DEFAULT 0 CHECK (productivity_score >= 0 AND productivity_score <= 10),
    improvement_trend VARCHAR(10) CHECK (improvement_trend IN ('up', 'down', 'stable')) DEFAULT 'stable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, period)
);

-- Create department performance table
CREATE TABLE IF NOT EXISTS department_performance (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL,
    total_employees INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    avg_productivity_score DECIMAL(3,1) DEFAULT 0,
    avg_quality_score DECIMAL(3,1) DEFAULT 0,
    on_time_completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department, period)
);

-- Create task workflows table
CREATE TABLE IF NOT EXISTS task_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES task_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_role VARCHAR(100),
    estimated_hours DECIMAL(5,2) DEFAULT 0,
    required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task notifications table
CREATE TABLE IF NOT EXISTS task_notifications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    recipient_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('assignment', 'due_soon', 'overdue', 'completed', 'comment', 'status_change')) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task reports table
CREATE TABLE IF NOT EXISTS task_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(20) CHECK (report_type IN ('individual', 'department', 'overall', 'custom')) NOT NULL,
    period VARCHAR(20) NOT NULL,
    filters JSONB,
    data JSONB,
    generated_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default task categories
INSERT INTO task_categories (name, description, color, icon) VALUES
('Infrastructure', 'Network and system infrastructure tasks', '#EF4444', 'server'),
('Training', 'Employee training and development', '#3B82F6', 'graduation-cap'),
('Reporting', 'Data analysis and reporting tasks', '#10B981', 'bar-chart'),
('Security', 'Security audits and compliance', '#F59E0B', 'shield'),
('Process Improvement', 'Workflow and process optimization', '#8B5CF6', 'trending-up'),
('Customer Service', 'Customer support and service tasks', '#06B6D4', 'headphones'),
('Maintenance', 'Equipment and system maintenance', '#84CC16', 'wrench'),
('Documentation', 'Documentation and knowledge base', '#6B7280', 'file-text')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_performance_employee_id ON task_performance_metrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_performance_period ON task_performance_metrics(period);
CREATE INDEX IF NOT EXISTS idx_department_performance_department ON department_performance(department);
CREATE INDEX IF NOT EXISTS idx_task_notifications_recipient_id ON task_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_read ON task_notifications(read);

-- Create function to update task status based on progress
CREATE OR REPLACE FUNCTION update_task_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status based on progress
    IF NEW.progress = 100 AND NEW.status != 'completed' THEN
        NEW.status = 'completed';
        NEW.completed_date = CURRENT_DATE;
    ELSIF NEW.progress > 0 AND NEW.progress < 100 AND NEW.status = 'pending' THEN
        NEW.status = 'in_progress';
    END IF;
    
    -- Check for overdue tasks
    IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'cancelled') THEN
        NEW.status = 'overdue';
    END IF;
    
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_date = CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task status updates
DROP TRIGGER IF EXISTS trigger_update_task_status ON tasks;
CREATE TRIGGER trigger_update_task_status
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_status();

-- Create function to calculate performance metrics
CREATE OR REPLACE FUNCTION calculate_performance_metrics(
    emp_id VARCHAR(50),
    calc_period VARCHAR(20)
)
RETURNS VOID AS $$
DECLARE
    assigned_count INTEGER;
    completed_count INTEGER;
    overdue_count INTEGER;
    avg_time DECIMAL(5,2);
    on_time_rate DECIMAL(5,2);
    quality_score DECIMAL(3,1);
    productivity_score DECIMAL(3,1);
BEGIN
    -- Calculate metrics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'overdue'),
        AVG(CASE WHEN completed_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (completed_date::timestamp - created_date::timestamp)) / 86400 
            ELSE NULL END),
        (COUNT(*) FILTER (WHERE status = 'completed' AND completed_date <= due_date)::DECIMAL / 
         NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)) * 100
    INTO assigned_count, completed_count, overdue_count, avg_time, on_time_rate
    FROM tasks 
    WHERE assigned_to_id = emp_id 
    AND TO_CHAR(created_date, 'YYYY-MM') = calc_period;
    
    -- Calculate quality and productivity scores (simplified)
    quality_score := LEAST(10, GREATEST(0, 10 - (overdue_count * 0.5)));
    productivity_score := LEAST(10, GREATEST(0, (completed_count::DECIMAL / NULLIF(assigned_count, 0)) * 10));
    
    -- Insert or update performance metrics
    INSERT INTO task_performance_metrics (
        employee_id, employee_name, period, tasks_assigned, tasks_completed, 
        tasks_overdue, avg_completion_time, on_time_completion_rate, 
        quality_score, productivity_score
    ) VALUES (
        emp_id, 
        (SELECT first_name || ' ' || last_name FROM employees WHERE employee_id = emp_id LIMIT 1),
        calc_period, assigned_count, completed_count, overdue_count, 
        COALESCE(avg_time, 0), COALESCE(on_time_rate, 0), 
        COALESCE(quality_score, 0), COALESCE(productivity_score, 0)
    )
    ON CONFLICT (employee_id, period) 
    DO UPDATE SET
        tasks_assigned = EXCLUDED.tasks_assigned,
        tasks_completed = EXCLUDED.tasks_completed,
        tasks_overdue = EXCLUDED.tasks_overdue,
        avg_completion_time = EXCLUDED.avg_completion_time,
        on_time_completion_rate = EXCLUDED.on_time_completion_rate,
        quality_score = EXCLUDED.quality_score,
        productivity_score = EXCLUDED.productivity_score,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
