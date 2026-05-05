import { useEffect, useState } from 'react';
import ReviewCard from '../components/ReviewCard';
import { reviewApi } from '../api/services';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [hotelId, setHotelId] = useState('');
  const [rating,  setRating]  = useState(5);
  const [comment, setComment] = useState('');

  const customerId =
    JSON.parse(localStorage.getItem('user') || 'null')?.customer_id;

  const load = () => reviewApi.list(customerId ? { customer_id: customerId } : {})
    .then(({ data }) => setReviews(data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await reviewApi.create({
        customer_id: customerId,
        hotel_id: Number(hotelId),
        rating: Number(rating),
        comment,
      });
      setComment(''); setHotelId(''); load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not submit');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1>Guest reviews</h1>
      <form className="card" onSubmit={submit}>
        <h3>Add a review</h3>
        <div className="form-group">
          <label>Hotel ID</label>
          <input type="number" value={hotelId} required
            onChange={(e) => setHotelId(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Rating (1-5)</label>
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            {[5,4,3,2,1].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Comment</label>
          <textarea rows="3" value={comment}
            onChange={(e) => setComment(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">Submit review</button>
      </form>

      <h2 style={{ marginTop: 24 }}>Recent reviews</h2>
      {reviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
    </div>
  );
}
