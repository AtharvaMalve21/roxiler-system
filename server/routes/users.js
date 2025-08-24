const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { userValidationRules, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, address, role, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT u.id, u.name, u.email, u.address, u.role, u.created_at,
             CASE 
               WHEN u.role = 'store_owner' THEN (
                 SELECT COALESCE(AVG(r.rating), 0)
                 FROM stores s
                 LEFT JOIN ratings r ON s.id = r.store_id
                 WHERE s.owner_id = u.id
               )
               ELSE NULL
             END as average_rating
      FROM users u
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Apply filters
    if (name) {
      paramCount++;
      query += ` AND u.name ILIKE $${paramCount}`;
      queryParams.push(`%${name}%`);
    }
    
    if (email) {
      paramCount++;
      query += ` AND u.email ILIKE $${paramCount}`;
      queryParams.push(`%${email}%`);
    }
    
    if (address) {
      paramCount++;
      query += ` AND u.address ILIKE $${paramCount}`;
      queryParams.push(`%${address}%`);
    }
    
    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    // Add sorting
    const validSortColumns = ['name', 'email', 'address', 'role', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
      query += ` ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      query += ` ORDER BY u.name ASC`;
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users u WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (name) {
      countParamCount++;
      countQuery += ` AND u.name ILIKE $${countParamCount}`;
      countParams.push(`%${name}%`);
    }
    if (email) {
      countParamCount++;
      countQuery += ` AND u.email ILIKE $${countParamCount}`;
      countParams.push(`%${email}%`);
    }
    if (address) {
      countParamCount++;
      countQuery += ` AND u.address ILIKE $${countParamCount}`;
      countParams.push(`%${address}%`);
    }
    if (role) {
      countParamCount++;
      countQuery += ` AND u.role = $${countParamCount}`;
      countParams.push(role);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasNext: parseInt(page) < Math.ceil(totalUsers / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (Admin only)
router.get('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT u.id, u.name, u.email, u.address, u.role, u.created_at,
             CASE 
               WHEN u.role = 'store_owner' THEN (
                 SELECT COALESCE(AVG(r.rating), 0)
                 FROM stores s
                 LEFT JOIN ratings r ON s.id = r.store_id
                 WHERE s.owner_id = u.id
               )
               ELSE NULL
             END as average_rating
      FROM users u
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), userValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password, address, role = 'user' } = req.body;

    // Validate role
    const validRoles = ['admin', 'user', 'store_owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const insertQuery = `
      INSERT INTO users (name, email, password, address, role) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, name, email, address, role, created_at
    `;
    const result = await pool.query(insertQuery, [name, email, hashedPassword, address, role]);

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, address, role } = req.body;

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'user', 'store_owner'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = ${paramCount}`);
      values.push(name);
    }
    if (email) {
      paramCount++;
      updates.push(`email = ${paramCount}`);
      values.push(email);
    }
    if (address !== undefined) {
      paramCount++;
      updates.push(`address = ${paramCount}`);
      values.push(address);
    }
    if (role) {
      paramCount++;
      updates.push(`role = ${paramCount}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ${paramCount} RETURNING id, name, email, address, role, created_at, updated_at`;
    const result = await pool.query(updateQuery, values);

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;