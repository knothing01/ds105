import { useState } from 'react';

export default function FilterSidebar({ initial = {}, onApply }) {
  const [city,      setCity]      = useState(initial.city || '');
  const [minPrice,  setMinPrice]  = useState(initial.min_price || '');
  const [maxPrice,  setMaxPrice]  = useState(initial.max_price || '');
  const [minRating, setMinRating] = useState(initial.min_rating || '');

  const apply = (e) => {
    e.preventDefault();
    onApply({ city, min_price: minPrice, max_price: maxPrice, min_rating: minRating });
  };

  return (
    <form className="filter-sidebar" onSubmit={apply}>
      <h4>Filter results</h4>
      <div className="filter-group">
        <label>City</label>
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Min price ($)</label>
        <input type="number" value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Max price ($)</label>
        <input type="number" value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Min rating</label>
        <select value={minRating} onChange={(e) => setMinRating(e.target.value)}>
          <option value="">Any</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </div>
      <button className="btn btn-primary btn-block" type="submit">Apply filters</button>
    </form>
  );
}
