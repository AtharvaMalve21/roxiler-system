import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Star, 
  Store, 
  TrendingUp,
  Clock,
  ThumbsUp,
  Eye,
  Search,
  MapPin,
  Users
} from 'lucide-react';

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/user');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { userStats, recentRatings, ratingDistribution, recommendedStores, unratedStores } = dashboardData;

  const statCards = [
    {
      title: 'Ratings Given',
      value: userStats.totalRatingsGiven,
      icon: Star,
      color: 'bg-yellow-500',
      description: 'Total ratings submitted'
    },
    {
      title: 'Average Rating',
      value: userStats.averageRatingGiven?.toFixed(1) || '0.0',
      icon: TrendingUp,
      color: 'bg-green-500',
      description: 'Your average rating'
    },
    {
      title: 'Recent Activity',
      value: recentRatings.length,
      icon: Clock,
      color: 'bg-blue-500',
      description: 'Recent ratings'
    },
    {
      title: 'Recommended',
      value: recommendedStores.length,
      icon: ThumbsUp,
      color: 'bg-purple-500',
      description: 'Stores for you'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600">Your rating activity and recommendations</p>
        </div>
        <Link
          to="/stores"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Search size={16} />
          <span>Browse Stores</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                </div>
                <div className={`${card.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Ratings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Ratings</h2>
            <Link
              to="/stores"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Rate More Stores
            </Link>
          </div>
          
          {recentRatings.length > 0 ? (
            <div className="space-y-3">
              {recentRatings.map((rating, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Link 
                      to={`/stores/${rating.store_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {rating.store_name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {new Date(rating.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-500">
                      {'★'.repeat(rating.rating)}
                    </span>
                    <span className="text-gray-300">
                      {'★'.repeat(5 - rating.rating)}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {rating.rating}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven't rated any stores yet</p>
              <Link
                to="/stores"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Start Rating Stores
              </Link>
            </div>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Rating Distribution</h2>
          
          {ratingDistribution.length > 0 ? (
            <div className="space-y-3">
              {ratingDistribution.map((item) => {
                const percentage = userStats.totalRatingsGiven > 0 
                  ? ((item.count / userStats.totalRatingsGiven) * 100).toFixed(1)
                  : 0;
                
                return (
                  <div key={item.rating} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-yellow-500">
                        {'★'.repeat(item.rating)}
                      </span>
                      <span className="text-gray-300">
                        {'★'.repeat(5 - item.rating)}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        ({item.rating} star{item.rating !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No rating data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Stores and Unrated Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Stores */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
            <Link
              to="/stores?filter=recommended"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          {recommendedStores.length > 0 ? (
            <div className="space-y-3">
              {recommendedStores.slice(0, 5).map((store, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-500 p-2 rounded-full">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <Link 
                        to={`/stores/${store.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {store.name}
                      </Link>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <MapPin size={12} />
                        <span>{store.location}</span>
                        {store.category && (
                          <>
                            <span>•</span>
                            <span>{store.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <span className="text-yellow-500 text-sm">★</span>
                      <span className="text-sm font-medium text-gray-700 ml-1">
                        {store.average_rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      ({store.rating_count || 0})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ThumbsUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No recommendations available yet</p>
              <p className="text-xs text-gray-400">Rate more stores to get personalized recommendations</p>
            </div>
          )}
        </div>

        {/* Unrated Stores */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Stores to Rate</h2>
            <Link
              to="/stores?filter=unrated"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          {unratedStores.length > 0 ? (
            <div className="space-y-3">
              {unratedStores.slice(0, 5).map((store, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-400 p-2 rounded-full">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <Link 
                        to={`/stores/${store.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {store.name}
                      </Link>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <MapPin size={12} />
                        <span>{store.location}</span>
                        {store.category && (
                          <>
                            <span>•</span>
                            <span>{store.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/stores/${store.id}?rate=true`}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Rate Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You've rated all available stores!</p>
              <p className="text-xs text-gray-400">Check back later for new stores to rate</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/stores"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Search className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-600">Browse Stores</span>
          </Link>
          
          <Link
            to="/stores?filter=unrated"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Star className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-600">Rate Stores</span>
          </Link>
          
          <Link
            to="/stores?filter=recommended"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ThumbsUp className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-600">Recommendations</span>
          </Link>
          
          <Link
            to="/profile"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Users className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-600">My Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;