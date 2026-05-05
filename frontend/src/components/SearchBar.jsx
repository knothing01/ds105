import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ defaults = {} }) {
  const navigate = useNavigate();
  const [city, setCity]         = useState(defaults.city || '');
  const [checkIn, setCheckIn]   = useState(defaults.check_in || '');
  const [checkOut, setCheckOut] = useState(defaults.check_out || '');
  const [guests, setGuests]     = useState(defaults.guests || 2);

  const onSearch = (e) => {
    e.preventDefault();
    const q = new URLSearchParams({ city, check_in: checkIn,
      check_out: checkOut, guests }).toString();
    navigate(`/hotels?${q}`);
  };

  return (
    <form className="search-bar" onSubmit={onSearch}>
      <input placeholder="🔍 Where are you going?" value={city}
        onChange={(e) => setCity(e.target.value)} required />
      <input type="date" value={checkIn}
        onChange={(e) => setCheckIn(e.target.value)} required />
      <input type="date" value={checkOut}
        onChange={(e) => setCheckOut(e.target.value)} required />
      <select value={guests} onChange={(e) => setGuests(e.target.value)}>
        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} guest{n>1?'s':''}</option>)}
      </select>
      <button className="btn btn-primary" type="submit">Search</button>
    </form>
  );
}
