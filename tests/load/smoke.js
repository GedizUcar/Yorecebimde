import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  vus: 1,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const healthz = http.get(`${BASE_URL}/healthz`);
  check(healthz, { 'health 200': (r) => r.status === 200 });

  const readyz = http.get(`${BASE_URL}/readyz`);
  check(readyz, { 'ready 200': (r) => r.status === 200 });

  const products = http.get(`${BASE_URL}/v1/products?limit=20`);
  check(products, {
    'products 200': (r) => r.status === 200,
    'products array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).data);
      } catch {
        return false;
      }
    },
  });

  const metrics = http.get(`${BASE_URL}/metrics`);
  check(metrics, { 'metrics 200': (r) => r.status === 200 });

  sleep(1);
}
