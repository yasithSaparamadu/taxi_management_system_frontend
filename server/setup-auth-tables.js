import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

async function setupAuthTables() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true
  });

  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'server', 'migrations', '001_create_auth_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Dropping existing tables...');
    // Drop tables in reverse order to avoid foreign key constraints
    const tablesToDrop = ['user_sessions', 'admin_roles', 'driver_profiles', 'profiles', 'users'];
    for (const table of tablesToDrop) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped table ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }
    
    console.log('Splitting SQL statements...');
    // Split by semicolon and filter out empty statements
    const allStatements = sql.split(';').map(stmt => stmt.trim());
    console.log('All statements found:', allStatements.length);
    
    // Process each statement to remove inline comments
    const processedStatements = allStatements.map(stmt => {
      // Remove inline comments starting with --
      const lines = stmt.split('\n');
      const cleanedLines = lines.map(line => {
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      }).filter(line => line.length > 0);
      
      let cleaned = cleanedLines.join(' ');
      
      // Fix UUID syntax for MySQL
      cleaned = cleaned.replace(/UUID_TO_BIN\(UUID\(\)\)/g, 'UUID()');
      cleaned = cleaned.replace(/BINARY\(16\)/g, 'CHAR(36)');
      cleaned = cleaned.replace(/DEFAULT \(UUID\(\)\)/g, '');
      cleaned = cleaned.replace(/PRIMARY KEY DEFAULT/g, 'PRIMARY KEY');
      
      // Fix INSERT statements to include UUID values
      if (cleaned.startsWith('INSERT INTO') && cleaned.includes('admin_roles')) {
        cleaned = cleaned.replace(/INSERT INTO admin_roles \(([^)]+)\) VALUES \(([^)]+)\)/, 
          (match, columns, values) => {
            if (!columns.includes('id')) {
              columns = 'id, ' + columns;
              values = `UUID(), ${values}`;
            }
            return `INSERT INTO admin_roles (${columns}) VALUES (${values})`;
          });
      }
      
      if (cleaned.startsWith('INSERT INTO') && cleaned.includes('users')) {
        cleaned = cleaned.replace(/INSERT INTO users \(([^)]+)\) VALUES \(([^)]+)\)/, 
          (match, columns, values) => {
            if (!columns.includes('id')) {
              columns = 'id, ' + columns;
              values = `UUID(), ${values}`;
            }
            return `INSERT INTO users (${columns}) VALUES (${values})`;
          });
      }
      
      if (cleaned.startsWith('INSERT INTO') && cleaned.includes('user_sessions')) {
        cleaned = cleaned.replace(/INSERT INTO user_sessions \(([^)]+)\) VALUES \(([^)]+)\)/, 
          (match, columns, values) => {
            if (!columns.includes('id')) {
              columns = 'id, ' + columns;
              values = `UUID(), ${values}`;
            }
            return `INSERT INTO user_sessions (${columns}) VALUES (${values})`;
          });
      }
      
      return cleaned;
    }).filter(stmt => stmt.length > 10);
    
    console.log(`Executing ${processedStatements.length} statements...`);
    
    for (const statement of processedStatements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        try {
          await connection.execute(statement);
          console.log('✅ Success');
        } catch (error) {
          console.error('❌ Error:', error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Auth tables created successfully!');
    
    // Verify tables exist
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    if (tables.length > 0) {
      console.log('✅ Users table verified');
    }
    
    const [profiles] = await connection.execute("SHOW TABLES LIKE 'profiles'");
    if (profiles.length > 0) {
      console.log('✅ Profiles table verified');
    }
    
    const [driverProfiles] = await connection.execute("SHOW TABLES LIKE 'driver_profiles'");
    if (driverProfiles.length > 0) {
      console.log('✅ Driver profiles table verified');
    }
    
  } catch (error) {
    console.error('❌ Error setting up auth tables:', error);
  } finally {
    await connection.end();
  }
}

setupAuthTables();
