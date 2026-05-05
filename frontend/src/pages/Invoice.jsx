import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoiceApi } from '../api/services';

export default function Invoice() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);

  useEffect(() => {
    invoiceApi.get(id).then(({ data }) => setInv(data));
  }, [id]);

  if (!inv) return <div className="container">Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1>Invoice #{inv.invoice_id}</h1>
      <div className="card">
        <p><strong>Hotel:</strong> {inv.hotel_name}</p>
        <p><strong>Room number:</strong> {inv.room_number}</p>
        <p><strong>Issued on:</strong> {new Date(inv.date).toLocaleDateString()}</p>
        <hr style={{ margin: '14px 0' }} />
        <div className="invoice-row"><span>Room price</span><span>${inv.room_price}</span></div>
        <div className="invoice-row"><span>Service fee</span><span>${inv.service_fee}</span></div>
        <div className="invoice-row"><span>Tax (20%)</span><span>${inv.tax}</span></div>
        <div className="invoice-row"><span>Discount</span><span>-${inv.discount}</span></div>
        <div className="invoice-row total"><span>Total</span><span>${inv.total}</span></div>
      </div>
      <button className="btn btn-secondary" onClick={() => window.print()}>
        🖨 Print invoice
      </button>
    </div>
  );
}
