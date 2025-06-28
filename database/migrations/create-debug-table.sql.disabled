-- Create system_debug table for comprehensive debugging
CREATE TABLE IF NOT EXISTS system_debug (
  id SERIAL PRIMARY KEY,
  component VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'INFO',
  details TEXT,
  error_message TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(32),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_debug_component ON system_debug(component);
CREATE INDEX IF NOT EXISTS idx_system_debug_status ON system_debug(status);
CREATE INDEX IF NOT EXISTS idx_system_debug_timestamp ON system_debug(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_debug_component_action ON system_debug(component, action);