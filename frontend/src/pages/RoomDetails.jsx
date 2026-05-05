import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomApi } from '../api/services';

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom]       = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    roomApi.get(id)
      .then(({ data }) => setRoom(data))
      .catch(e => setLoadError(e.response?.data?.error || 'Room not found'));
  }, [id]);

  if (loadError) return <div className="container"><div className="card" style={{color:'var(--danger)'}}>{loadError}</div></div>;
  if (!room) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="card">
        <h1>Room {room.overnight_room_number}</h1>
        <p style={{ color: '#666' }}>at {room.hotel_name}, {room.city}, {room.country}</p>
        <p style={{ color: '#666' }}>{room.address}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12, marginTop: 16 }}>
          <div><strong>Capacity:</strong> {room.capacity}</div>
          <div><strong>Status:</strong> {room.status}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 24 }}>
          <span className="price-amount">${room.price}<small>/night</small></span>
          <button className="btn btn-primary"
            onClick={() => navigate(`/reservation/${id}`)}
            disabled={room.status !== 'available'}>
            {room.status === 'available' ? 'Reserve now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}
