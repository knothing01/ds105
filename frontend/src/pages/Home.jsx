import { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import { hotelApi } from '../api/services';

export default function Home() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    hotelApi.list({ min_rating: 4 })
      .then(({ data }) => setFeatured(data.slice(0, 6)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>Find your next stay</h1>
          <p>Search low prices on hotels, homes and much more...</p>
          <SearchBar />
        </div>
      </section>
      <section className="container">
        <h2 style={{ marginBottom: 16 }}>Featured top-rated hotels</h2>
        <div className="hotel-list">
          {featured.length > 0
            ? featured.map(h => <HotelCard key={h.hotel_id} hotel={h} />)
            : <p>Loading featured hotels...</p>}
        </div>
      </section>
    </>
  );
}
