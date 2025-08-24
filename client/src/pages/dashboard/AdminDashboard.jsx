import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Users, 
  Store, 
  Star, 
  Shield,
  User,
  Building2,
  TrendingUp,
  Activity,
  Plus,
  Eye
} from 'lucide-react';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/admin');
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

  const { stats, recentActivity, ratingDistribution, topStores } = dashboardData;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      description: `${stats.totalAdmins} admins, ${stats.totalStoreOwners} store owners, ${stats.totalNormalUsers} users`
    },
    {
      title: 'Total Stores',
      value: stats.totalStores,
      icon: Store,
      color: 'bg-green-500',
      description: 'Registered stores on platform'
    },
    {
      title: 'Total Ratings',
      value: stats.totalRatings,
      icon: Star,
      color: 'bg-yellow-500',
      description: 'Ratings submitted by users'
    },
    {
      title: 'Admin Users',
      value: stats.totalAdmins,
      icon: Shield,
      color: 'bg-red-500',
      description: 'System administrators'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and management</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/admin/users/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add User</span>
          </Link>
          <Link
            to="/admin/stores/create"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Store</span>
          </Link>
        </div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/users"
          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3"
        >
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-600">View and edit users</p>
          </div>
        </Link>

        <Link
          to="/admin/stores"
          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3"
        >
          <Building2 className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-medium text-gray-900">Manage Stores</h3>
            <p className="text-sm text-gray-600">View and edit stores</p>
          </div>
        </Link>

        <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-3">
          <Activity className="h-8 w-8 text-purple-600" />
          <div>
            <h3 className="font-medium text-gray-900">Platform Health</h3>
            <p className="text-sm text-gray-600">All systems operational</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-orange-600" />
          <div>
            <h3 className="font-medium text-gray-900">Growth Rate</h3>
            <p className="text-sm text-gray-600">+12% this month</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          
          <div className="space-y-4">
            {/* Recent Users */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                <User size={16} className="mr-2" />
                New Users
              </h3>
              <div className="space-y-2">
                {recentActivity.users.slice(0, 3).map((user, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'store_owner' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Stores */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                <Building2 size={16} className="mr-2" />
                New Stores
              </h3>
              <div className="space-y-2">
                {recentActivity.stores.slice(0, 3).map((store, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{store.name}</p>
                      <p className="text-xs text-gray-600">{store.email}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(store.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Ratings */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                <Star size={16} className="mr-2" />
                Recent Ratings
              </h3>
              <div className="space-y-2">
                {recentActivity.ratings.slice(0, 3).map((rating, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{rating.user_name}</p>
                      <p className="text-xs text-gray-600">rated {rating.store_name}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-500">
                        {'★'.repeat(rating.rating)}
                      </span>
                      <span className="text-gray-300">
                        {'★'.repeat(5 - rating.rating)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution & Top Stores */}
        <div className="space-y-6">
          {/* Rating Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rating Distribution</h2>
            <div className="space-y-3">
              {ratingDistribution.map((item) => (
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
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Rated Stores */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Rated Stores</h2>
            <div className="space-y-3">
              {topStores.map((store, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{store.name}</p>
                    <p className="text-xs text-gray-600">{store.total_ratings} ratings</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-medium">{store.average_rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;