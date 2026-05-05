export default function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{review.customer_name || 'Guest'}</strong>
        <span className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
      </div>
      <p style={{ marginTop: 6, color: '#444' }}>{review.comment}</p>
      <small style={{ color: '#999' }}>
        {new Date(review.review_date).toLocaleDateString()}
      </small>
    </div>
  );
}
