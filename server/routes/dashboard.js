const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Admin Dashboard Stats
router.get('/admin', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get total counts
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM stores) as total_stores,
        (SELECT COUNT(*) FROM ratings) as total_ratings,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_normal_users,
        (SELECT COUNT(*) FROM users WHERE role = 'store_owner') as total_store_owners
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    // Get recent activities
    const recentUsersQuery = `
      SELECT name, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const recentUsers = await pool.query(recentUsersQuery);

    const recentStoresQuery = `
      SELECT name, email, created_at 
      FROM stores 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const recentStores = await pool.query(recentStoresQuery);

    const recentRatingsQuery = `
      SELECT r.rating, r.created_at, u.name as user_name, s.name as store_name
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      JOIN stores s ON r.store_id = s.id
      ORDER BY r.created_at DESC 
      LIMIT 5
    `;
    const recentRatings = await pool.query(recentRatingsQuery);

    // Get rating distribution
    const ratingDistributionQuery = `
      SELECT 
        rating,
        COUNT(*) as count
      FROM ratings
      GROUP BY rating
      ORDER BY rating DESC
    `;
    const ratingDistribution = await pool.query(ratingDistributionQuery);

    // Get top rated stores
    const topStoresQuery = `
      SELECT s.name, s.email, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.rating) as total_ratings
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      GROUP BY s.id, s.name, s.email
      HAVING COUNT(r.rating) > 0
      ORDER BY average_rating DESC, total_ratings DESC
      LIMIT 5
    `;
    const topStores = await pool.query(topStoresQuery);

    res.json({
      stats: {
        totalUsers: parseInt(stats.total_users),
        totalStores: parseInt(stats.total_stores),
        totalRatings: parseInt(stats.total_ratings),
        totalAdmins: parseInt(stats.total_admins),
        totalNormalUsers: parseInt(stats.total_normal_users),
        totalStoreOwners: parseInt(stats.total_store_owners)
      },
      recentActivity: {
        users: recentUsers.rows,
        stores: recentStores.rows,
        ratings: recentRatings.rows
      },
      ratingDistribution: ratingDistribution.rows.map(row => ({
        rating: row.rating,
        count: parseInt(row.count)
      })),
      topStores: topStores.rows.map(store => ({
        ...store,
        average_rating: parseFloat(store.average_rating).toFixed(2),
        total_ratings: parseInt(store.total_ratings)
      }))
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Store Owner Dashboard
router.get('/store-owner', authenticateToken, authorizeRoles('store_owner'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get store owner's stores with ratings
    const storesQuery = `
      SELECT s.id, s.name, s.email, s.address, s.created_at,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.rating) as total_ratings
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE s.owner_id = $1
      GROUP BY s.id, s.name, s.email, s.address, s.created_at
      ORDER BY s.name
    `;
    const storesResult = await pool.query(storesQuery, [userId]);

    // Get overall statistics for all owner's stores
    const overallStatsQuery = `
      SELECT 
        COUNT(DISTINCT s.id) as total_stores,
        COALESCE(AVG(r.rating), 0) as overall_average_rating,
        COUNT(r.rating) as total_ratings_received
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE s.owner_id = $1
    `;
    const overallStatsResult = await pool.query(overallStatsQuery, [userId]);
    const overallStats = overallStatsResult.rows[0];

    // Get recent ratings for owner's stores
    const recentRatingsQuery = `
      SELECT r.rating, r.created_at, u.name as user_name, s.name as store_name, s.id as store_id
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      JOIN stores s ON r.store_id = s.id
      WHERE s.owner_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `;
    const recentRatingsResult = await pool.query(recentRatingsQuery, [userId]);

    // Get rating distribution for all owner's stores
    const ratingDistributionQuery = `
      SELECT 
        r.rating,
        COUNT(*) as count
      FROM ratings r
      JOIN stores s ON r.store_id = s.id
      WHERE s.owner_id = $1
      GROUP BY r.rating
      ORDER BY r.rating DESC
    `;
    const ratingDistributionResult = await pool.query(ratingDistributionQuery, [userId]);

    // Get users who rated each store
    const ratingUsersQuery = `
      SELECT DISTINCT s.id as store_id, s.name as store_name,
             COUNT(DISTINCT r.user_id) as unique_raters,
             STRING_AGG(DISTINCT u.name, ', ') as rater_names
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE s.owner_id = $1
      GROUP BY s.id, s.name
      ORDER BY unique_raters DESC
    `;
    const ratingUsersResult = await pool.query(ratingUsersQuery, [userId]);

    res.json({
      stores: storesResult.rows.map(store => ({
        ...store,
        average_rating: parseFloat(store.average_rating).toFixed(2),
        total_ratings: parseInt(store.total_ratings)
      })),
      overallStats: {
        totalStores: parseInt(overallStats.total_stores),
        overallAverageRating: parseFloat(overallStats.overall_average_rating).toFixed(2),
        totalRatingsReceived: parseInt(overallStats.total_ratings_received)
      },
      recentRatings: recentRatingsResult.rows,
      ratingDistribution: ratingDistributionResult.rows.map(row => ({
        rating: row.rating,
        count: parseInt(row.count)
      })),
      storeRatingUsers: ratingUsersResult.rows.map(row => ({
        ...row,
        unique_raters: parseInt(row.unique_raters)
      }))
    });
  } catch (error) {
    console.error('Store owner dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Normal User Dashboard
router.get('/user', authenticateToken, authorizeRoles('user'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's rating statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_ratings_given,
        COALESCE(AVG(rating), 0) as average_rating_given
      FROM ratings
      WHERE user_id = $1
    `;
    const userStatsResult = await pool.query(userStatsQuery, [userId]);
    const userStats = userStatsResult.rows[0];

    // Get user's recent ratings
    const recentRatingsQuery = `
      SELECT r.rating, r.created_at, r.updated_at, s.name as store_name, s.id as store_id
      FROM ratings r
      JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = $1
      ORDER BY r.updated_at DESC
      LIMIT 10
    `;
    const recentRatingsResult = await pool.query(recentRatingsQuery, [userId]);

    // Get user's rating distribution
    const ratingDistributionQuery = `
      SELECT 
        rating,
        COUNT(*) as count
      FROM ratings
      WHERE user_id = $1
      GROUP BY rating
      ORDER BY rating DESC
    `;
    const ratingDistributionResult = await pool.query(ratingDistributionQuery, [userId]);

    // Get recommended stores (stores with high ratings that user hasn't rated)
    const recommendedStoresQuery = `
      SELECT s.id, s.name, s.address, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.rating) as total_ratings
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings ur ON s.id = ur.store_id AND ur.user_id = $1
      WHERE ur.id IS NULL
      GROUP BY s.id, s.name, s.address
      HAVING COUNT(r.rating) >= 3 AND AVG(r.rating) >= 4.0
      ORDER BY average_rating DESC, total_ratings DESC
      LIMIT 5
    `;
    const recommendedStoresResult = await pool.query(recommendedStoresQuery, [userId]);

    // Get stores user needs to rate (popular stores without user's rating)
    const unratedStoresQuery = `
      SELECT s.id, s.name, s.address, COUNT(r.rating) as total_ratings
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings ur ON s.id = ur.store_id AND ur.user_id = $1
      WHERE ur.id IS NULL
      GROUP BY s.id, s.name, s.address
      HAVING COUNT(r.rating) >= 5
      ORDER BY total_ratings DESC
      LIMIT 5
    `;
    const unratedStoresResult = await pool.query(unratedStoresQuery, [userId]);

    res.json({
      userStats: {
        totalRatingsGiven: parseInt(userStats.total_ratings_given),
        averageRatingGiven: parseFloat(userStats.average_rating_given).toFixed(2)
      },
      recentRatings: recentRatingsResult.rows,
      ratingDistribution: ratingDistributionResult.rows.map(row => ({
        rating: row.rating,
        count: parseInt(row.count)
      })),
      recommendedStores: recommendedStoresResult.rows.map(store => ({
        ...store,
        average_rating: parseFloat(store.average_rating).toFixed(2),
        total_ratings: parseInt(store.total_ratings)
      })),
      unratedStores: unratedStoresResult.rows.map(store => ({
        ...store,
        total_ratings: parseInt(store.total_ratings)
      }))
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;