import React, { useEffect, useState, useCallback } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, ArcElement } from "chart.js";
import './VisualData.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ArcElement);

const VisualData = ({ orders, reservations }) => {
  const [dateFilter, setDateFilter] = useState("Today");
  const [filteredOrders, setFilteredOrders] = useState(orders);

  const filterOrdersByDate = useCallback(() => {
    const now = new Date();
    let filtered = orders;

    if (dateFilter === "Today") {
      filtered = orders.filter(
        (order) => new Date(order.createdAt).toDateString() === now.toDateString()
      );
    } else if (dateFilter === "Last 3 Days") {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(now.getDate() - 3);
      filtered = orders.filter((order) => new Date(order.createdAt) >= threeDaysAgo);
    } else if (dateFilter === "Last 15 Days") {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(now.getDate() - 15);
      filtered = orders.filter((order) => new Date(order.createdAt) >= fifteenDaysAgo);
    } else if (dateFilter === "Last Month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filtered = orders.filter((order) => new Date(order.createdAt) >= oneMonthAgo);
    }

    setFilteredOrders(filtered);
  }, [orders, dateFilter]);

  useEffect(() => {
    filterOrdersByDate();
  }, [filterOrdersByDate]);

  // Calculate Tap and Collect orders
  const tapAndCollectOrders = filteredOrders.filter(order => parseInt(order.tableNumber) === 0);

  // Example datasets
  const allOrders = filteredOrders;

  const barData = {
    labels: ["All Orders", "Reservations", "Tap and Collect"],
    datasets: [
      {
        label: "Count",
        data: [allOrders.length, reservations.length, tapAndCollectOrders.length],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCD56"],
        borderColor: ["#FF6384", "#36A2EB", "#FFCD56"],
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ["All Orders","Reservations",  "Tap and Collect"],
    datasets: [
      {
        label: "Orders Distribution",
        data: [allOrders.length, reservations.length,  tapAndCollectOrders.length],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCD56"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCD56"],
      },
    ],
  };

  return (
    <div className="visual-data modern-ui">
      <div className="header-section">
        <h2>Visual Data</h2>
        <div className="date-filters">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="Today">Today's Orders</option>
            <option value="Last 3 Days">Last 3 Days</option>
            <option value="Last 15 Days">Last 15 Days</option>
            <option value="Last Month">Last Month</option>
          </select>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-item">
          <Bar data={barData} />
        </div>
        <div className="chart-item">
          <Pie data={pieData} />
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-item">
          <span>Number of Orders: </span>
          <span>{filteredOrders.length}</span>
        </div>
        <div className="stat-item">
          <span>Number of Reservations: </span>
          <span>{reservations.length}</span>
        </div>
        <div className="stat-item">
          <span>Number of Tap and Collect Orders: </span>
          <span>{tapAndCollectOrders.length}</span>
        </div>
      </div>
    </div>
  );
};

export default VisualData;
