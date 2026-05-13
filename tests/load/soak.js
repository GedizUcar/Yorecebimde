import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '24h',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
  },
};

/**
 * Soak test — 24 saat boyunca sabit yük. Memory leak + connection drift +
 * replication lag + queue depth growth tespit eder.
 *
 * Grafana dashboard ile birlikte çalıştırılmalı:
 *  - heap_used trend (sızıntı = lineer artış)
 *  - DB connection_pool active (drift = yüksek tutulur)
 *  - BullMQ depth (job draining)
 *  - Replica lag (>5dk = alarm)
 */
export default function () {
  http.get(`${BASE_URL}/v1/products?limit=20`);
  sleep(2);
  http.get(`${BASE_URL}/v1/search?q=peynir`);
  sleep(2);
  http.get(`${BASE_URL}/v1/categories`);
  sleep(3);
}
