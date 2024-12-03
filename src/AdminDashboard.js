const React = require('react');
const { useState, useEffect } = require('react');
const { db } = require('./firebase');
const { collection, onSnapshot, query, orderBy, where } = require('firebase/firestore');
const dayjs = require('dayjs');

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [orderCounts, setOrderCounts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedTable, setSelectedTable] = useState(1);
  const [orderDelivered, setOrderDelivered] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [timeRange, setTimeRange] = useState('1day');
  const [tapCollectTokenMap, setTapCollectTokenMap] = useState({});
  const [undeliveredCounts, setUndeliveredCounts] = useState({
    all: 0,
    pending: 0,
    tapAndCollect: 0,
  });

  // To track new orders
  const [previousOrdersLength, setPreviousOrdersLength] = useState(0);

  useEffect(() => {
    const getOrdersQuery = () => {
      const ordersRef = collection(db, 'orders');
      let date = new Date();
      switch (timeRange) {
        case '1day':
          date = dayjs().subtract(1, 'day').toDate();
          break;
        case '3days':
          date = dayjs().subtract(3, 'day').toDate();
          break;
        case '1week':
          date = dayjs().subtract(1, 'week').toDate();
          break;
        case '15days':
          date = dayjs().subtract(15, 'day').toDate();
          break;
        case '1month':
          date = dayjs().subtract(1, 'month').toDate();
          break;
        default:
          date = dayjs().subtract(1, 'day').toDate();
      }
      return query(ordersRef, where('createdAt', '>=', date), orderBy('createdAt', 'desc'));
    };

    const unsubscribe = onSnapshot(getOrdersQuery(), (snapshot) => {
      const ordersList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: data.createdAt.toDate() };
      });
      ordersList.sort((a, b) => b.createdAt - a.createdAt);

      setOrders(ordersList);

      // Play notification sound if new orders arrive
      if (ordersList.length > previousOrdersLength) {
        playNotificationSound();
        setPreviousOrdersLength(ordersList.length);
      }

      const newTapCollectTokens = {};
      ordersList.forEach((order) => {
        if (!tapCollectTokenMap[order.id] && order.tableNumber === 0) {
          const tokenId = order.tokenId; // Use tokenId from the order
          newTapCollectTokens[order.id] = tokenId;
        }
      });

      setTapCollectTokenMap((prev) => ({ ...prev, ...newTapCollectTokens }));

      const deliveredStatus = {};
      ordersList.forEach((order) => {
        deliveredStatus[order.id] = order.isDelivered;
      });
      setOrderDelivered(deliveredStatus);

      // Calculate undelivered orders for badges
      const allUndelivered = ordersList.filter((order) => !order.isDelivered).length;
      const pendingUndelivered = ordersList.filter(
        (order) => !order.isDelivered && order.tableNumber !== 0
      ).length;
      const tapAndCollectUndelivered = ordersList.filter(
        (order) => !order.isDelivered && order.tableNumber === 0
      ).length;

      setUndeliveredCounts({
        all: allUndelivered,
        pending: pendingUndelivered,
        tapAndCollect: tapAndCollectUndelivered,
      });
    });

    return () => unsubscribe();
  }, [timeRange, tapCollectTokenMap, previousOrdersLength]);

  const playNotificationSound = () => {
    const audio = new Audio('/iphone.mp3'); // Path to the audio file in public folder
    audio
      .play()
      .catch((error) => console.error('Error playing notification sound:', error));
  };

  useEffect(() => {
    const orderCountMap = {};
    orders.forEach((order) => {
      const date = order.createdAt.toLocaleDateString();
      orderCountMap[date] = (orderCountMap[date] || 0) + 1;
    });
    const counts = Object.entries(orderCountMap).map(([date, count]) => ({
      date,
      count,
    }));
    setOrderCounts(counts);
  }, [orders]);

  useEffect(() => {
    if (activeTab === 'reservations') {
      const reservationsRef = collection(db, 'reservations');
      const unsubscribe = onSnapshot(query(reservationsRef, orderBy('date', 'desc')), (snapshot) => {
        const reservationsList = snapshot.docs.map((doc) => doc.data());
        setReservations(reservationsList);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  const handleBoxClick = (tableNumber) => {
    setSelectedTable(tableNumber);
  };

  const handleOrderDelivered = async (orderId) => {
    try {
      await fetch('https://server-kashmir.gofastapi.com/markAsDelivered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      setOrderDelivered((prev) => ({
        ...prev,
        [orderId]: true,
      }));
    } catch (error) {
      console.error('Error marking order as delivered:', error);
    }
  };

  const getOrderDetails = (tableNumber) => {
    return orders.filter(
      (order) =>
        order.tableNumber === tableNumber &&
        (activeTab === 'all' || (activeTab === 'pending' && !order.isDelivered))
    );
  };

  const getOrderColor = (orderId) => {
    return orderDelivered[orderId] ? '#90EE90' : '#FF6347';
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSelectedTable(1);
  };

  const isTableAllDelivered = (tableNumber) => {
    const ordersForTable = orders.filter((order) => order.tableNumber === tableNumber);
    return ordersForTable.every((order) => order.isDelivered);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const getTapAndCollectOrders = () => {
    return orders.filter((order) => order.tableNumber === 0);
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h1 style={styles.header}>Menu</h1>
        <ul style={styles.menuList}>
          <li
            style={{
              ...styles.menuItem,
              backgroundColor: activeTab === 'all' ? 'white' : '#444',
              color: activeTab === 'all' ? 'black' : 'white',
            }}
            onClick={() => handleTabClick('all')}
          >
            All Orders{' '}
            {undeliveredCounts.all > 0 && (
              <span style={styles.badge}>{undeliveredCounts.all}</span>
            )}
          </li>
          <li
            style={{
              ...styles.menuItem,
              backgroundColor: activeTab === 'pending' ? 'white' : '#444',
              color: activeTab === 'pending' ? 'black' : 'white',
            }}
            onClick={() => handleTabClick('pending')}
          >
            Pending Orders{' '}
            {undeliveredCounts.pending > 0 && (
              <span style={styles.badge}>{undeliveredCounts.pending}</span>
            )}
          </li>
          <li
            style={{
              ...styles.menuItem,
              backgroundColor: activeTab === 'tapAndCollect' ? 'white' : '#444',
              color: activeTab === 'tapAndCollect' ? 'black' : 'white',
            }}
            onClick={() => handleTabClick('tapAndCollect')}
          >
            Tap and Collect{' '}
            {undeliveredCounts.tapAndCollect > 0 && (
              <span style={styles.badge}>{undeliveredCounts.tapAndCollect}</span>
            )}
          </li>
          <li
            style={{
              ...styles.menuItem,
              backgroundColor: activeTab === 'reservations' ? 'white' : '#444',
              color: activeTab === 'reservations' ? 'black' : 'white',
            }}
            onClick={() => handleTabClick('reservations')}
          >
            Reservations
          </li>
        </ul>
      </div>


      
      
 <div style={styles.tablesSection}>
 {activeTab !== 'tapAndCollect' && (
 <>
 <h1 style={styles.header}>Tables</h1>
 <div style={styles.grid}>
 {Array.from({ length: 10 }, (_, i) => i + 1).map(tableNumber => (
 <div
 key={tableNumber}
 onClick={() => handleBoxClick(tableNumber)}
 style={{
 ...styles.tableBox,
 backgroundColor: getOrderDetails(tableNumber).length && !isTableAllDelivered(tableNumber) ? '#FF6347' : '#90EE90'
 }}
 >
 Table {tableNumber}
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 <div style={styles.ordersSection}>
 <div style={styles.ordersContainer}>

 <div style={styles.headerContainer}>
 <h1 style={styles.header}>
 {activeTab === 'charts' ? 'Order Counts' : activeTab === 'tapAndCollect' ? 'Tap and Collect Orders' : `Order Details for Table ${selectedTable}`}
 </h1>
 <select style={styles.dropdown} value={timeRange} onChange={handleTimeRangeChange}>
 <option value="1day">Last 1 day</option>
 <option value="3days">Last 3 days</option>
 <option value="1week">Last 1 week</option>
 <option value="15days">Last 15 days</option>
 <option value="1month">Last 1 month</option>
 </select>
 </div>

 {activeTab !== 'reservations' && activeTab !== 'charts' && activeTab !== 'tapAndCollect' && selectedTable && (
 <div style={styles.ordersTableContainer}>
 <table style={styles.table}>
 <thead>
 <tr>
 <th style={styles.tableHeader}>Dish</th>
 <th style={styles.tableHeader}>Quantity</th>
 <th style={styles.tableHeader}>Date</th>
 <th style={styles.tableHeader}>Time</th>
 <th style={styles.tableHeader}>Status</th>
 <th style={styles.tableHeader}></th>
 </tr>
 </thead>
 <tbody>
 {getOrderDetails(selectedTable).length ? (
 getOrderDetails(selectedTable).map((order) => (
 <tr key={order.id} style={{ backgroundColor: getOrderColor(order.id) }}>
 <td style={styles.tableCell}>
 <div style={styles.dishContainer}>
 {order.dishes.map((dish, index) => (
 <div key={index} style={styles.dishBox}>
 {dish.name}
 </div>
 ))}
 </div>
 </td>
 <td style={styles.tableCell}>
 <div style={styles.dishContainer}>
 {order.dishes.map((dish, index) => (
 <div key={index} style={styles.dishBox}>
 {dish.quantity}
 </div>
 ))}
 </div>
 </td>
 <td style={styles.tableCell}>
 {order.createdAt.toLocaleDateString()}
 </td>
 <td style={styles.tableCell}>
 {order.createdAt.toLocaleTimeString()}
 </td>
 <td style={styles.tableCell}>
 {orderDelivered[order.id] ? 'Delivered' : 'Pending'}
 </td>
 <td style={styles.tableCell}>
 {!orderDelivered[order.id] && (
 <button
 onClick={() => handleOrderDelivered(order.id)}
 style={styles.deliverButton}
 >
 Mark as Delivered
 </button>
 )}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="6" style={styles.noOrdersCell}>
 No orders available for this table
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}




 {activeTab === 'reservations' && (
 <div style={styles.ordersTableContainer}>
 <table style={styles.table}>
 <thead>
 <tr>
 <th style={styles.tableHeader}>Name</th>
 <th style={styles.tableHeader}>Phone</th>
 <th style={styles.tableHeader}>Date</th>
 <th style={styles.tableHeader}>Time</th>
 <th style={styles.tableHeader}>Persons</th>
 </tr>
 </thead>
 <tbody>
 {reservations.length ? (
 reservations.map((reservation, index) => (
 <tr key={index}>
 <td style={styles.tableCell}>{reservation.name}</td>
 <td style={styles.tableCell}>{reservation.phone}</td>
 <td style={styles.tableCell}>{reservation.date}</td>
 <td style={styles.tableCell}>{reservation.time}</td>
 <td style={styles.tableCell}>{reservation.persons}</td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="5" style={styles.noOrdersCell}>
 No reservations available
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}








 {activeTab === 'tapAndCollect' && (
 <div style={styles.ordersTableContainer}>
 <table style={styles.table}>
 <thead>
 <tr>
 <th style={styles.tableHeader}>Token ID</th>
 <th style={styles.tableHeader}>Dish</th>
 <th style={styles.tableHeader}>Quantity</th>
 <th style={styles.tableHeader}>Date</th>
 <th style={styles.tableHeader}>Time</th>
 <th style={styles.tableHeader}>Status</th>
 <th style={styles.tableHeader}></th>
 </tr>
 </thead>
 <tbody>
 {getTapAndCollectOrders().length ? (
 getTapAndCollectOrders().map((order) => (
 <tr key={order.id} style={{ ...styles.tableRow, backgroundColor: getOrderColor(order.id) }}>
 <td style={styles.tableCell}>
 {tapCollectTokenMap[order.id]}
 </td>
 <td style={styles.tableCell}>
 <div style={styles.dishContainer}>
 {order.dishes.map((dish, index) => (
 <div key={index} style={styles.dishBox}>
 {dish.name}
 </div>
 ))}
 </div>
 </td>
 <td style={styles.tableCell}>
 <div style={styles.dishContainer}>
 {order.dishes.map((dish, index) => (
 <div key={index} style={styles.dishBox}>
 {dish.quantity}
 </div>
 ))}
 </div>
 </td>
 <td style={styles.tableCell}>
 {order.createdAt.toLocaleDateString()}
 </td>
 <td style={styles.tableCell}>
 {order.createdAt.toLocaleTimeString()}
 </td>
 <td style={styles.tableCell}>
 {orderDelivered[order.id] ? 'Delivered' : 'Pending'}
 </td>
 <td style={styles.tableCell}>
 {!orderDelivered[order.id] && (
 <button
 onClick={() => handleOrderDelivered(order.id)}
 style={styles.deliverButton}
 >
 Mark as Delivered
 </button>
 )}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="6" style={styles.noOrdersCell}>
 No Tap and Collect orders available
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}

 {activeTab === 'charts' && (
 <div style={styles.ordersTableContainer}>
 <table style={styles.table}>
 <thead>
 <tr>
 <th style={styles.tableHeader}>Date</th>
 <th style={styles.tableHeader}>Number of Orders</th>
 </tr>
 </thead>
 <tbody>
 {orderCounts.length ? (
 orderCounts.map((count, index) => (
 <tr key={index}>
 <td style={styles.tableCell}>
 {count.date}
 </td>
 <td style={styles.tableCell}>
 {count.count}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="2" style={styles.noOrdersCell}>
 No order counts available
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

// Styles
const styles = {
 container: { display: 'flex', height: '100vh' },
  sidebar: { width: '20%', backgroundColor: '#333', color: 'white', padding: '20px' },
  header: { fontSize: '24px', marginBottom: '20px' },
  menuList: { listStyleType: 'none', padding: '0' },
  menuItem: {
    padding: '10px',
    margin: '5px 0',
    cursor: 'pointer',
    textAlign: 'center',
    borderRadius: '4px',
    position: 'relative',
  },
  badge: {
    backgroundColor: 'red',
    color: 'white',
    borderRadius: '50%',
    padding: '5px 10px',
    fontSize: '12px',
    position: 'absolute',
    top: '10px',
    right: '20px',
  },
 tablesSection: { width: '20%', padding: '20px' },
 grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
 tableBox: { padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#ddd', borderRadius: '4px' },
 ordersSection: { width: '60%', padding: '20px' },
 ordersContainer: { width: '100%', padding: '20px' },
 headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
 dropdown: { padding: '10px', fontSize: '16px' },
 ordersTableContainer: { marginTop: '20px' },
 table: { width: '100%', borderCollapse: 'collapse' },
 tableHeader: { padding: '10px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9', textAlign: 'left' },
 tableCell: { padding: '10px', borderBottom: '1px solid #ddd' },
 noOrdersCell: { padding: '20px', textAlign: 'center', color: '#999' },
 dishContainer: { display: 'flex', flexDirection: 'column' },
 dishBox: { padding: '5px 0' },
 deliverButton: { padding: '5px 10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
export default AdminDashboard;