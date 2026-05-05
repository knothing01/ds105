import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import RoomCard      from '../components/RoomCard';
import ReviewCard    from '../components/ReviewCard';
import { hotelApi, roomApi, reviewApi } from '../api/services';

export default function HotelDetails() {
  const { id } = useParams();
  const [hotel, setHotel]     = useState(null);
  const [rooms, setRooms]     = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    hotelApi.get(id).then(({ data }) => setHotel(data));
    roomApi.list({ hotel_id: id }).then(({ data }) => setRooms(data));
    reviewApi.list({ hotel_id: id }).then(({ data }) => setReviews(data.slice(0, 10)));
  }, [id]);

  if (!hotel) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="card">
        <h1>{hotel.hotel_name}</h1>
        <p>📍 {hotel.address}, {hotel.city}</p>
        <p>📞 {hotel.phone} · ✉️ {hotel.email}</p>
        <div style={{ marginTop: 12 }}>
          <span className="rating-pill">{Number(hotel.avg_rating).toFixed(1)}</span>
          <small style={{ marginLeft: 10 }}>{hotel.review_count} reviews</small>
        </div>
      </div>

      <h2 style={{ margin: '24px 0 12px' }}>Available rooms</h2>
      {rooms.length > 0
        ? rooms.map(r => <RoomCard key={`${r.hotel_id}_${r.room_number}`} room={r} />)
        : <p>No rooms listed.</p>}

      {hotel.services?.length > 0 && (
        <>
          <h2 style={{ margin: '24px 0 12px' }}>Hotel services</h2>
          <div className="card">
            {hotel.services.map(s =>
              <div key={s.service_name} className="invoice-row">
                <span>{s.service_name}</span><span>${s.charge}</span>
              </div>)}
          </div>
        </>
      )}

      <h2 style={{ margin: '24px 0 12px' }}>Guest reviews</h2>
      {reviews.length > 0
        ? reviews.map(r => <ReviewCard key={r.review_id} review={r} />)
        : <p>No reviews yet.</p>}
    </div>
  );
}
