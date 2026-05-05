import { Link, useNavigate } from 'react-router-dom';

export default function RoomCard({ room }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isCustomer = user?.type === 'customer';

  const handleSelect = (e) => {
    if (!user) { e.preventDefault(); navigate('/login'); }
  };

  return (
    <div className="room-card">
      <div>
        <h4>Room {room.room_number}</h4>
        <div className="room-meta">
          👥 Up to {room.capacity} guests · {room.hotel_name}, {room.city}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="price-amount">${room.price}<span style={{ fontSize: 12, color: '#777' }}>/night</span></div>
        {isCustomer ? (
          <Link to={`/rooms/${room.hotel_id}-${room.room_number}`} className="btn btn-primary"
            style={{ marginTop: 6 }}>Select</Link>
        ) : (
          <button className="btn btn-primary" style={{ marginTop: 6 }}
            onClick={handleSelect}>
            {user ? 'Customers only' : 'Log in to book'}
          </button>
        )}
      </div>
    </div>
  );
}
