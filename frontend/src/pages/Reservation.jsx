import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomApi, reservationApi } from '../api/services';

export default function Reservation() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError]       = useState('');
  const [loadError, setLoadError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [hotel_id, room_number] = roomId.split('-').map(Number);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    roomApi.get(roomId)
      .then(({ data }) => setRoom(data))
      .catch(e => setLoadError(e.response?.data?.error || 'Failed to load room'));
  }, [roomId]);

  if (!user) return null;

  if (user.type !== 'customer') {
    return (
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="card">
          <h2>Customers only</h2>
          <p>Only registered customers can make reservations. Please log in with a customer account.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Go to login</button>
        </div>
      </div>
    );
  }

  const totalNights = (checkIn && checkOut)
    ? Math.max(0, (new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;
  const totalPrice = room ? (totalNights * Number(room.price)).toFixed(2) : 0;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await reservationApi.create({
        type: 'overnight',
        hotel_id,
        room_number,
        check_in:  checkIn,
        check_out: checkOut,
      });
      navigate(`/payment/${data.reservation_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create reservation');
    }
  };

  if (loadError) return <div className="container"><div className="card" style={{color:'var(--danger)'}}>{loadError}</div></div>;
  if (!room) return <div className="container">Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1>Confirm your reservation</h1>
      <div className="card">
        <h3>{room.hotel_name}</h3>
        <p>{room.city} · Room {room.overnight_room_number}</p>
        <p>${room.price}/night</p>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="form-group">
          <label>Check-in date</label>
          <input type="date" required value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Check-out date</label>
          <input type="date" required value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div className="invoice-row total">
          <span>Total ({totalNights} night{totalNights !== 1 ? 's' : ''})</span>
          <span>${totalPrice}</span>
        </div>
        {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
        <button className="btn btn-primary btn-block" type="submit"
          style={{ marginTop: 16 }}>Confirm reservation</button>
      </form>
    </div>
  );
}
