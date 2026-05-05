import { Link } from 'react-router-dom';

export default function HotelCard({ hotel }) {
  const stars = Number(hotel.avg_rating).toFixed(1);
  return (
    <article className="hotel-card">
      <div className="hotel-card-img">🏨</div>
      <div className="hotel-card-body">
        <h3><Link to={`/hotels/${hotel.hotel_id}`}>{hotel.hotel_name}</Link></h3>
        <div className="city">📍 {hotel.city} · {hotel.address}</div>
        <p style={{ fontSize: 13, color: '#444', marginTop: 6 }}>
          {hotel.room_count || 0} room types available
        </p>
        <div className="hotel-card-meta">
          <span>✓ Free cancellation</span>
          <span>✓ Wi-Fi</span>
          <span>✓ Breakfast options</span>
        </div>
      </div>
      <div className="hotel-card-side">
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            {stars >= 4 ? 'Excellent' : stars >= 3 ? 'Good' : 'Fair'}
          </div>
          <span className="rating-pill">{stars}</span>
        </div>
        <div>
          <div className="price-from">From</div>
          <div className="price-amount">${Math.round(hotel.min_price || 0)}</div>
          <Link to={`/hotels/${hotel.hotel_id}`}
            className="btn btn-primary"
            style={{ marginTop: 8 }}>View deal</Link>
        </div>
      </div>
    </article>
  );
}
