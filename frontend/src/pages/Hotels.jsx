import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import HotelCard      from '../components/HotelCard';
import FilterSidebar  from '../components/FilterSidebar';
import { hotelApi }   from '../api/services';

export default function Hotels() {
  const [searchParams] = useSearchParams();
  const [hotels, setHotels]  = useState([]);
  const [loading, setLoading] = useState(true);

  const initial = {
    city:       searchParams.get('city')       || '',
    min_price:  searchParams.get('min_price')  || '',
    max_price:  searchParams.get('max_price')  || '',
    min_rating: searchParams.get('min_rating') || '',
  };

  const fetchHotels = (filters) => {
    setLoading(true);
    hotelApi.list(filters)
      .then(({ data }) => setHotels(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHotels(initial); /* eslint-disable-next-line */ }, []);

  return (
    <div className="container layout-with-sidebar">
      <FilterSidebar initial={initial} onApply={fetchHotels} />
      <main>
        <h2>{hotels.length} hotels found</h2>
        <div className="hotel-list">
          {loading
            ? <p>Loading...</p>
            : hotels.length > 0
              ? hotels.map(h => <HotelCard key={h.hotel_id} hotel={h} />)
              : <p>No hotels match your filters.</p>}
        </div>
      </main>
    </div>
  );
}
