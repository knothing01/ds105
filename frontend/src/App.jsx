import { Routes, Route } from 'react-router-dom';
import Navbar         from './components/Navbar';
import Home           from './pages/Home';
import Hotels         from './pages/Hotels';
import HotelDetails   from './pages/HotelDetails';
import RoomDetails    from './pages/RoomDetails';
import Reservation    from './pages/Reservation';
import Payment        from './pages/Payment';
import Invoice        from './pages/Invoice';
import Reviews        from './pages/Reviews';
import Login          from './pages/Login';
import Register       from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"                    element={<Home />} />
        <Route path="/hotels"              element={<Hotels />} />
        <Route path="/hotels/:id"          element={<HotelDetails />} />
        <Route path="/rooms/:id"           element={<RoomDetails />} />
        <Route path="/reservation/:roomId" element={<Reservation />} />
        <Route path="/payment/:reservationId" element={<Payment />} />
        <Route path="/invoice/:id"         element={<Invoice />} />
        <Route path="/reviews"             element={<Reviews />} />
        <Route path="/login"               element={<Login />} />
        <Route path="/register"            element={<Register />} />
        <Route path="/admin"               element={<AdminDashboard />} />
      </Routes>
    </>
  );
}
