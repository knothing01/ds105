import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reservationApi, paymentApi, invoiceApi } from '../api/services';

function nightsBetween(checkIn, checkOut) {
  return Math.max(0, (new Date(checkOut) - new Date(checkIn)) / 86400000);
}

export default function Payment() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loadError, setLoadError]     = useState('');
  const [paymentType, setPaymentType] = useState('credit');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    reservationApi.get(reservationId)
      .then(({ data }) => setReservation(data))
      .catch(e => setLoadError(e.response?.data?.error || 'Failed to load reservation'));
  }, [reservationId]);

  const overnightTotal = reservation?.overnight_rooms?.reduce((sum, r) =>
    sum + Number(r.price) * nightsBetween(r.check_in, r.check_out), 0) ?? 0;

  const meetingTotal = reservation?.meeting_rooms?.reduce((sum, r) => {
    const hours = Math.ceil((new Date(r.end_time) - new Date(r.start_time)) / 3600000);
    return sum + Number(r.hourly_rate) * hours;
  }, 0) ?? 0;

  const roomTotal = overnightTotal + meetingTotal;

  const pay = async () => {
    setProcessing(true);
    try {
      await paymentApi.create({
        reservation_id: Number(reservationId),
        payment_type: paymentType,
      });
      const { data: inv } = await invoiceApi.create({
        reservation_id: Number(reservationId),
      });
      navigate(`/invoice/${inv.invoice_id}`);
    } catch (e) {
      alert(e.response?.data?.error || 'Payment failed');
    } finally { setProcessing(false); }
  };

  if (loadError) return <div className="container"><div className="card" style={{color:'var(--danger)'}}>{loadError}</div></div>;
  if (!reservation) return <div className="container">Loading...</div>;

  const overnightRooms = reservation.overnight_rooms ?? [];
  const meetingRooms   = reservation.meeting_rooms   ?? [];

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h1>Payment</h1>
      <div className="card">
        {overnightRooms.map((r, i) => (
          <div key={`o${i}`} className="invoice-row">
            <span>{r.hotel_name} — Room {r.overnight_room_number}
              &nbsp;({r.check_in?.slice(0,10)} → {r.check_out?.slice(0,10)})</span>
            <span>${(Number(r.price) * nightsBetween(r.check_in, r.check_out)).toFixed(2)}</span>
          </div>
        ))}
        {meetingRooms.map((r, i) => {
          const hours = Math.ceil((new Date(r.end_time) - new Date(r.start_time)) / 3600000);
          return (
            <div key={`m${i}`} className="invoice-row">
              <span>{r.hotel_name} — Meeting room {r.meeting_room_number}
                &nbsp;({hours}h)</span>
              <span>${(Number(r.hourly_rate) * hours).toFixed(2)}</span>
            </div>
          );
        })}
        <div className="invoice-row total">
          <span>Total</span><span>${roomTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="card">
        <div className="form-group">
          <label>Payment method</label>
          <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            <option value="credit">Credit card</option>
            <option value="cash">Cash at hotel</option>
          </select>
        </div>
        <button className="btn btn-primary btn-block" onClick={pay}
          disabled={processing}>
          {processing ? 'Processing...' : `Pay $${roomTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
