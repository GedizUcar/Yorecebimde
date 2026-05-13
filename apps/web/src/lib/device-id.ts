/**
 * Misafir kullanıcı için sürekli device_id — localStorage'da saklanır.
 * KVKK uyumlu: parmak izi/IP tracking yok, sadece bu cihazda kalan UUID.
 */
const KEY = 'yorecebimde_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
