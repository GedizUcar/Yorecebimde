import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

const errorRate = new Rate('errors');
const productListLatency = new Trend('product_list_ms');

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // warm up
        { duration: '5m', target: 100 }, // ramp
        { duration: '20m', target: 100 }, // sustain
        { duration: '3m', target: 0 }, // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.001'], // <0.1% error
    http_req_duration: ['p(95)<500'], // P95 < 500ms
    errors: ['rate<0.01'],
  },
};

export default function () {
  // 1) Anasayfa listing
  const list = http.get(`${BASE_URL}/v1/products?limit=20`, {
    tags: { endpoint: 'list_products' },
  });
  productListLatency.add(list.timings.duration);
  const listOk = check(list, { 'list 200': (r) => r.status === 200 });
  errorRate.add(!listOk);

  let firstProductSlug = null;
  let firstSellerSlug = null;
  try {
    const items = JSON.parse(list.body).data;
    if (items?.[0]) {
      firstProductSlug = items[0].slug;
      firstSellerSlug = items[0].seller?.slug;
    }
  } catch {
    // bozuk response
  }

  sleep(Math.random() * 2 + 1);

  // 2) Kategori filtreli listeleme
  http.get(`${BASE_URL}/v1/products?category=zeytinyagi&limit=20`, {
    tags: { endpoint: 'list_category' },
  });
  sleep(Math.random() * 2 + 1);

  // 3) Arama
  http.get(`${BASE_URL}/v1/search?q=peynir&limit=10`, {
    tags: { endpoint: 'search' },
  });
  sleep(Math.random() * 2 + 1);

  // 4) Ürün detay
  if (firstProductSlug && firstSellerSlug) {
    const detail = http.get(
      `${BASE_URL}/v1/products/${firstSellerSlug}/${firstProductSlug}`,
      { tags: { endpoint: 'product_detail' } },
    );
    check(detail, { 'detail 200': (r) => r.status === 200 });
  }

  // 5) Kategori ağacı
  http.get(`${BASE_URL}/v1/categories`, { tags: { endpoint: 'categories' } });

  sleep(Math.random() * 3 + 2);
}
