import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // baseline
        { duration: '5m', target: 500 }, // mid
        { duration: '5m', target: 1000 }, // peak
        { duration: '3m', target: 1000 }, // hold
        { duration: '2m', target: 0 }, // recovery
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Stress'te thresholds tolerant — kırılma noktasını ölç, fail etme
    http_req_failed: ['rate<0.10'], // <%10 hata kabul edilir
    http_req_duration: ['p(95)<3000'], // P95 3s'ye kadar
  },
};

export default function () {
  // Karma trafik — listing + search + detail
  const r = Math.random();
  if (r < 0.5) {
    http.get(`${BASE_URL}/v1/products?limit=20`);
  } else if (r < 0.8) {
    const q = ['peynir', 'zeytinyagi', 'bal', 'kayisi', 'kuruyemis'][
      Math.floor(Math.random() * 5)
    ];
    http.get(`${BASE_URL}/v1/search?q=${q}`);
  } else {
    http.get(`${BASE_URL}/v1/categories`);
  }
  sleep(Math.random() * 2);
}
