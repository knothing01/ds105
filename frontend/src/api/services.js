import api from './client';

export const authApi = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const hotelApi = {
  list:   (params) => api.get('/hotels',  { params }),
  get:    (id)     => api.get(`/hotels/${id}`),
  create: (data)   => api.post('/hotels', data),
  update: (id, d)  => api.put(`/hotels/${id}`, d),
  remove: (id)     => api.delete(`/hotels/${id}`),
};

export const roomApi = {
  list:             (params) => api.get('/rooms/overnight', { params }),
  get:              (id)     => {
    const [hotel_id, room_number] = String(id).split('-');
    return api.get(`/rooms/overnight/${hotel_id}/${room_number}`);
  },
  available:        (params) => api.get('/rooms/available', { params }),
  availableMeeting: (params) => api.get('/rooms/meeting/available', { params }),
  listMeeting:      (params) => api.get('/rooms/meeting', { params }),
  create:           (data)   => api.post('/rooms/overnight', data),
  update:           (id, d)  => {
    const [hotel_id, room_number] = String(id).split('-');
    return api.put(`/rooms/overnight/${hotel_id}/${room_number}`, d);
  },
};

export const reservationApi = {
  list:         (params) => api.get('/reservations', { params }),
  get:          (id)     => api.get(`/reservations/${id}`),
  create:       (data)   => api.post('/reservations', data),
  updateStatus: (id, status) => api.put(`/reservations/${id}/status`, { status }),
  remove:       (id)     => api.delete(`/reservations/${id}`),
};

export const paymentApi = {
  list:   ()     => api.get('/payments'),
  create: (data) => api.post('/payments', data),
};

export const invoiceApi = {
  list:             ()     => api.get('/invoices'),
  get:              (id)   => api.get(`/invoices/${id}`),
  getByReservation: (id)   => api.get(`/invoices/by-reservation/${id}`),
  create:           (data) => api.post('/invoices', data),
};

export const reviewApi = {
  list:   (params) => api.get('/reviews', { params }),
  create: (data)   => api.post('/reviews', data),
};

export const employeeApi = {
  list:   (params) => api.get('/employees', { params }),
  create: (data)   => api.post('/employees', data),
  update: (id, d)  => api.put(`/employees/${id}`, d),
  remove: (id)     => api.delete(`/employees/${id}`),
};

export const serviceApi = {
  list:   (params) => api.get('/services', { params }),
  create: (data)   => api.post('/services', data),
};

export const reportApi = {
  overviewStats:       () => api.get('/reports/overview-stats'),
  monthlyRevenue:      () => api.get('/reports/monthly-revenue'),
  topHotels:           () => api.get('/reports/top-hotels'),
  mostReservedRooms:   () => api.get('/reports/most-reserved-rooms'),
  customerActivity:    () => api.get('/reports/customer-activity'),
  serviceRevenue:      () => api.get('/reports/service-revenue'),
  employeePerformance: () => api.get('/reports/employee-performance'),
};
