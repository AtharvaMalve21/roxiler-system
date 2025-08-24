const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { ratingValidationRules, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Submit or update rating (Normal users only)
router.post('/', authenticateToken, authorizeRoles('user'), ratingValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { storeId, rating } = req.body;
    const userId = req.user.id;

    // Check if store exists
    const storeCheck = await pool.query('SELECT id FROM stores WHERE id = $1', [storeId]);
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check if user has already rated this store
    const existingRating = await pool.query('SELECT id FROM ratings WHERE user_id = $1 AND store_id = $2', [userId, storeId]);

    if (existingRating.rows.length > 0) {
      // Update existing rating
      const updateQuery = 'UPDATE ratings SET rating = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND store_id = $3 RETURNING *';
      const result = await pool.query(updateQuery, [rating, userId, storeId]);
      
      res.json({
        message: 'Rating updated successfully',
        rating: result.rows[0]
      });
    } else {
      // Insert new rating
      const insertQuery = 'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3) RETURNING *';
      const result = await pool.query(insertQuery, [userId, storeId, rating]);
      
      res.status(201).json({
        message: 'Rating submitted successfully',
        rating: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rating for a specific store
router.get('/store/:storeId/user-rating', authenticateToken, async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    const query = 'SELECT * FROM ratings WHERE user_id = $1 AND store_id = $2';
    const result = await pool.query(query, [userId, storeId]);

    if (result.rows.length === 0) {
      return res.json({ rating: null });
    }

    res.json({ rating: result.rows[0] });
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all ratings for a store (Store owners can see ratings for their stores)
router.get('/store/:storeId', authenticateToken, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if store exists
    const storeCheck = await pool.query('SELECT id, owner_id FROM stores WHERE id = $1', [storeId]);
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check permissions - only store owners can see ratings for their stores, or admins
    if (req.user.role === 'store_owner' && storeCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only view ratings for your own stores' });
    } else if (req.user.role === 'user') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      SELECT r.id, r.rating, r.created_at, r.updated_at,
             u.name as user_name, u.email as user_email
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.store_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await pool.query(query, [storeId, parseInt(limit), offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM ratings WHERE store_id = $1';
    const countResult = await pool.query(countQuery, [storeId]);
    const totalRatings = parseInt(countResult.rows[0].count);

    res.json({
      ratings: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRatings / parseInt(limit)),
        totalRatings,
        hasNext: parseInt(page) < Math.ceil(totalRatings / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get store ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all ratings (Admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const query = `
      SELECT r.id, r.rating, r.created_at, r.updated_at,
             u.name as user_name, u.email as user_email,
             s.name as store_name, s.email as store_email
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      JOIN stores s ON r.store_id = s.id
      ORDER BY r.${sortBy === 'rating' ? 'rating' : 'created_at'} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await pool.query(query, [parseInt(limit), offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM ratings';
    const countResult = await pool.query(countQuery);
    const totalRatings = parseInt(countResult.rows[0].count);

    res.json({
      ratings: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRatings / parseInt(limit)),
        totalRatings,
        hasNext: parseInt(page) < Math.ceil(totalRatings / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get all ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete rating (Users can delete their own ratings, Admin can delete any)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get rating details
    const ratingQuery = 'SELECT user_id FROM ratings WHERE id = $1';
    const ratingResult = await pool.query(ratingQuery, [id]);

    if (ratingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const rating = ratingResult.rows[0];

    // Check permissions
    if (req.user.role !== 'admin' && rating.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own ratings' });
    }

    // Delete rating
    await pool.query('DELETE FROM ratings WHERE id = $1', [id]);

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ratings statistics for store owner dashboard
router.get('/store/:storeId/stats', authenticateToken, authorizeRoles('store_owner'), async (req, res) => {
  try {
    const { storeId } = req.params;

    // Check if user owns this store
    const storeCheck = await pool.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (storeCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only view statistics for your own stores' });
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM ratings 
      WHERE store_id = $1
    `;

    const result = await pool.query(statsQuery, [storeId]);
    const stats = result.rows[0];

    res.json({
      totalRatings: parseInt(stats.total_ratings),
      averageRating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(2) : '0.00',
      distribution: {
        5: parseInt(stats.five_star),
        4: parseInt(stats.four_star),
        3: parseInt(stats.three_star),
        2: parseInt(stats.two_star),
        1: parseInt(stats.one_star)
      }
    });
  } catch (error) {
    console.error('Get rating stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;