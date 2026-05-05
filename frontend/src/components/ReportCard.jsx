export default function ReportCard({ title, value, sub }) {
  return (
    <div className="report-card">
      <h4>{title}</h4>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#003580' }}>{value}</div>
      {sub && <small style={{ color: '#666' }}>{sub}</small>}
    </div>
  );
}
