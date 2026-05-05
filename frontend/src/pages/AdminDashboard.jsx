import { useEffect, useState } from 'react';
import ReportCard from '../components/ReportCard';
import { reportApi, hotelApi, reservationApi } from '../api/services';

export default function AdminDashboard() {
  const [section, setSection]   = useState('overview');
  const [reports, setReports]   = useState({});
  const [overview, setOverview] = useState(null);
  const [hotels, setHotels]     = useState([]);
  const [reservations, setRes]  = useState([]);

  useEffect(() => {
    reportApi.overviewStats().then(({ data }) => setOverview(data)).catch(() => {});
    Promise.allSettled([
      reportApi.monthlyRevenue(),
      reportApi.topHotels(),
      reportApi.mostReservedRooms(),
      reportApi.customerActivity(),
      reportApi.serviceRevenue(),
      reportApi.employeePerformance(),
    ]).then(([rev, top, rooms, cust, svc, emp]) => {
      setReports({
        revenue: rev.value?.data   ?? [],
        top:     top.value?.data   ?? [],
        rooms:   rooms.value?.data ?? [],
        cust:    cust.value?.data  ?? [],
        svc:     svc.value?.data   ?? [],
        emp:     emp.value?.data   ?? [],
      });
    });
    hotelApi.list().then(({ data }) => setHotels(data));
    reservationApi.list().then(({ data }) => setRes(data));
  }, []);

  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <h3>Admin</h3>
        <a onClick={() => setSection('overview')}>📊 Overview</a>
        <a onClick={() => setSection('hotels')}>🏨 Hotels</a>
        <a onClick={() => setSection('reservations')}>📅 Reservations</a>
        <a onClick={() => setSection('reports')}>📈 Reports</a>
      </aside>
      <main>
        {section === 'overview' && (
          <>
            <h1>Overview</h1>
            <div className="report-grid">
              <ReportCard title="Total revenue"
                value={overview ? `$${Number(overview.total_revenue).toFixed(0)}` : '...'} />
              <ReportCard title="Hotels"       value={overview?.hotels       ?? hotels.length} />
              <ReportCard title="Reservations" value={overview?.reservations ?? reservations.length} />
              <ReportCard title="Customers"    value={overview?.customers    ?? '...'} />
              <ReportCard title="Top-rated hotel"
                value={reports.top?.[0]?.hotel_name?.slice(0, 20) || 'N/A'}
                sub={reports.top?.[0]?.avg_rating + ' ★'} />
            </div>
          </>
        )}
        {section === 'hotels' && (
          <>
            <h1>Hotels</h1>
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>City</th>
                <th>Rooms</th><th>Avg rating</th></tr></thead>
              <tbody>
                {hotels.slice(0, 30).map(h => (
                  <tr key={h.hotel_id}>
                    <td>{h.hotel_id}</td><td>{h.hotel_name}</td>
                    <td>{h.city}</td><td>{h.room_count}</td>
                    <td>{h.avg_rating}</td>
                  </tr>))}
              </tbody>
            </table>
          </>
        )}
        {section === 'reservations' && (
          <>
            <h1>Recent reservations</h1>
            <table>
              <thead><tr><th>ID</th><th>Customer</th><th>Hotel</th>
                <th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead>
              <tbody>
                {reservations.slice(0, 30).map(r => (
                  <tr key={r.reservation_id}>
                    <td>{r.reservation_id}</td><td>{r.customer_name}</td>
                    <td>{r.hotel_name || '—'}</td>
                    <td>{r.check_in?.slice(0,10) || '—'}</td>
                    <td>{r.check_out?.slice(0,10) || '—'}</td>
                    <td>{r.reservation_status}</td>
                  </tr>))}
              </tbody>
            </table>
          </>
        )}
        {section === 'reports' && (
          <>
            <h1>Reports</h1>
            <div className="report-grid">
              <div className="report-card">
                <h4>Monthly revenue</h4>
                {(reports.revenue || []).slice(0, 6).map(r => (
                  <div key={r.month} className="invoice-row">
                    <span>{r.month?.slice(0,7)}</span>
                    <span>${Number(r.total_revenue).toFixed(0)}</span>
                  </div>))}
              </div>
              <div className="report-card">
                <h4>Top hotels</h4>
                {(reports.top || []).slice(0, 6).map(h => (
                  <div key={h.hotel_id} className="invoice-row">
                    <span>{h.hotel_name?.slice(0,18)}</span>
                    <span>{h.avg_rating} ★</span>
                  </div>))}
              </div>
              <div className="report-card">
                <h4>Most reserved rooms</h4>
                {(reports.rooms || []).map(r => (
                  <div key={`${r.hotel_id}_${r.room_number}`} className="invoice-row">
                    <span>{r.hotel_name?.slice(0,16)} #{r.room_number}</span>
                    <span>{r.reservations}×</span>
                  </div>))}
              </div>
              <div className="report-card">
                <h4>Top customers</h4>
                {(reports.cust || []).slice(0, 6).map(c => (
                  <div key={c.customer_id} className="invoice-row">
                    <span>{c.name}</span>
                    <span>{c.total_reservations} stays</span>
                  </div>))}
              </div>
              <div className="report-card">
                <h4>Service revenue</h4>
                {(reports.svc || []).slice(0, 6).map(s => (
                  <div key={`${s.hotel_id}_${s.service_name}`} className="invoice-row">
                    <span>{s.service_name}</span>
                    <span>${Number(s.total_revenue).toFixed(0)}</span>
                  </div>))}
              </div>
              <div className="report-card">
                <h4>Top employees</h4>
                {(reports.emp || []).slice(0, 6).map(e => (
                  <div key={e.employee_id} className="invoice-row">
                    <span>{e.name}</span>
                    <span>{e.services_assigned} services</span>
                  </div>))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
