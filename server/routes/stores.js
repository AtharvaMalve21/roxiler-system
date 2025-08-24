const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { storeValidationRules, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all stores (accessible to all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { name, address, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT s.id, s.name, s.email, s.address, s.created_at,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.rating) as total_ratings,
             CASE 
               WHEN ur.rating IS NOT NULL THEN ur.rating
               ELSE NULL
             END as user_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings ur ON s.id = ur.store_id AND ur.user_id = $1
      WHERE 1=1
    `;
    
    const queryParams = [req.user.id];
    let paramCount = 1;

    // Apply filters
    if (name) {
      paramCount++;
      query += ` AND s.name ILIKE $${paramCount}`;
      queryParams.push(`%${name}%`);
    }
    
    if (address) {
      paramCount++;
      query += ` AND s.address ILIKE $${paramCount}`;
      queryParams.push(`%${address}%`);
    }

    query += ' GROUP BY s.id, s.name, s.email, s.address, s.created_at, ur.rating';

    // Add sorting
    const validSortColumns = ['name', 'address', 'average_rating', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
      if (sortBy === 'average_rating') {
        query += ` ORDER BY average_rating ${sortOrder.toUpperCase()}`;
      } else {
        query += ` ORDER BY s.${sortBy} ${sortOrder.toUpperCase()}`;
      }
    } else {
      query += ` ORDER BY s.name ASC`;
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
    let countQuery = 'SELECT COUNT(*) FROM stores s WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (name) {
      countParamCount++;
      countQuery += ` AND s.name ILIKE $${countParamCount}`;
      countParams.push(`%${name}%`);
    }
    if (address) {
      countParamCount++;
      countQuery += ` AND s.address ILIKE $${countParamCount}`;
      countParams.push(`%${address}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalStores = parseInt(countResult.rows[0].count);

    res.json({
      stores: result.rows.map(store => ({
        ...store,
        average_rating: parseFloat(store.average_rating).toFixed(2)
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalStores / parseInt(limit)),
        totalStores,
        hasNext: parseInt(page) < Math.ceil(totalStores / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get store by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT s.id, s.name, s.email, s.address, s.created_at,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.rating) as total_ratings,
             CASE 
               WHEN ur.rating IS NOT NULL THEN ur.rating
               ELSE NULL
             END as user_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings ur ON s.id = ur.store_id AND ur.user_id = $1
      WHERE s.id = $2
      GROUP BY s.id, s.name, s.email, s.address, s.created_at, ur.rating
    `;
    
    const result = await pool.query(query, [req.user.id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const store = result.rows[0];
    store.average_rating = parseFloat(store.average_rating).toFixed(2);

    res.json({ store });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new store (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), storeValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { name, email, address, ownerEmail } = req.body;

    // Check if store email already exists
    const existingStore = await pool.query('SELECT id FROM stores WHERE email = $1', [email]);
    if (existingStore.rows.length > 0) {
      return res.status(400).json({ error: 'Store with this email already exists' });
    }

    let ownerId = null;
    if (ownerEmail) {
      // Find owner by email
      const ownerQuery = 'SELECT id, role FROM users WHERE email = $1';
      const ownerResult = await pool.query(ownerQuery, [ownerEmail]);
      
      if (ownerResult.rows.length === 0) {
        return res.status(400).json({ error: 'Owner not found with provided email' });
      }
      
      if (ownerResult.rows[0].role !== 'store_owner') {
        return res.status(400).json({ error: 'User must have store_owner role to own a store' });
      }
      
      ownerId = ownerResult.rows[0].id;
    }

    // Insert store into database
    const insertQuery = `
      INSERT INTO stores (name, email, address, owner_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, address, owner_id, created_at
    `;
    const result = await pool.query(insertQuery, [name, email, address, ownerId]);

    res.status(201).json({
      message: 'Store created successfully',
      store: result.rows[0]
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update store (Admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, address, ownerEmail } = req.body;

    // Check if store exists
    const existingStore = await pool.query('SELECT id FROM stores WHERE id = $1', [id]);
    if (existingStore.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check if email is already taken by another store
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM stores WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken by another store' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }
    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }
    if (address !== undefined) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      values.push(address);
    }

    if (ownerEmail !== undefined) {
      let ownerId = null;
      if (ownerEmail) {
        const ownerQuery = 'SELECT id, role FROM users WHERE email = $1';
        const ownerResult = await pool.query(ownerQuery, [ownerEmail]);
        
        if (ownerResult.rows.length === 0) {
          return res.status(400).json({ error: 'Owner not found with provided email' });
        }
        
        if (ownerResult.rows[0].role !== 'store_owner') {
          return res.status(400).json({ error: 'User must have store_owner role to own a store' });
        }
        
        ownerId = ownerResult.rows[0].id;
      }
      
      paramCount++;
      updates.push(`owner_id = $${paramCount}`);
      values.push(ownerId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `UPDATE stores SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, address, owner_id, created_at, updated_at`;
    const result = await pool.query(updateQuery, values);

    res.json({
      message: 'Store updated successfully',
      store: result.rows[0]
    });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete store (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if store exists
    const existingStore = await pool.query('SELECT id FROM stores WHERE id = $1', [id]);
    if (existingStore.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Delete store
    await pool.query('DELETE FROM stores WHERE id = $1', [id]);

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stores for store owner
router.get('/owner/my-stores', authenticateToken, authorizeRoles('store_owner'), async (req, res) => {
  try {
    const query = `
      SELECT s.id, s.name, s.email, s.address, s.created_at,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.rating) as total_ratings
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE s.owner_id = $1
      GROUP BY s.id, s.name, s.email, s.address, s.created_at
      ORDER BY s.name
    `;
    
    const result = await pool.query(query, [req.user.id]);

    res.json({
      stores: result.rows.map(store => ({
        ...store,
        average_rating: parseFloat(store.average_rating).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Get owner stores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;