const User = require('../models/User');
const Order = require('../models/Order');

exports.getDashboardMetrics = async (req, res) => {
  const totalUsers = await User.countDocuments();
  const paidUsers = await User.countDocuments({ isPaidUser: true });
  const activeContests = 15; // mock value
  const totalRevenue = await Order.aggregate([
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);

  res.json({
    totalUsers: {
      value: totalUsers,
      growth: 12,
      description: "Active platform users"
    },
    paidUsers: {
      value: paidUsers,
      percentage: 8,
      ratio: `${((paidUsers / totalUsers) * 100).toFixed(1)}% of total users`
    },
    activeContests: {
      value: activeContests,
      status: "Ongoing contests"
    },
    totalRevenue: {
      value: totalRevenue[0]?.total || 0,
      currency: "₹",
      growth: 18,
      period: "Last 30 days"
    }
  });
};

exports.getUserGrowth = async (req, res) => {
  const monthlyGrowth = await User.aggregate([
    {
      $group: {
        _id: { $month: "$createdAt" },
        users: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = months.map((month, index) => {
    const data = monthlyGrowth.find(d => d._id === index + 1);
    return { period: month, users: data ? data.users : 0 };
  });

  res.json(chartData);
};

exports.getOrderAnalytics = async (req, res) => {
  const monthlyOrders = await Order.aggregate([
    {
      $group: {
        _id: { $month: "$createdAt" },
        orders: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = months.map((month, index) => {
    const data = monthlyOrders.find(d => d._id === index + 1);
    return { month, orders: data ? data.orders : 0 };
  });

  res.json(chartData);
};
