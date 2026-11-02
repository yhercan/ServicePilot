# ServisPilot

Teknik servis ve ekipman bakım yönetimi. Uygulama bağımsız çalışır; SAP entegrasyonu bu sürümde yoktur. `ServiceVisit.sapReferenceNumber` alanı ileride kullanılmak üzere boş bırakılabilir.

## Gereksinimler

- Node.js 22+
- PostgreSQL 14+

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içinde şunları doldurun:

- `DATABASE_URL` — `servispilot` veritabanına bağlanan uygulama rolü
- `SESSION_PASSWORD` — en az 32 karakterlik rastgele bir değer
- `STORAGE_DIR` — yüklenen PDF’lerin tutulacağı dizin. Varsayılan `storage/uploads`, `public` klasörünün dışında olmalıdır.

Örnek yerel rol:

```sql
CREATE ROLE servispilot_app LOGIN PASSWORD 'change-me';
CREATE DATABASE servispilot OWNER servispilot_app;
```

`prisma migrate dev` gölge veritabanı oluşturduğu için yerel geliştirme rolünün `CREATEDB` yetkisi olmalıdır. Canlıda şema `prisma migrate deploy` ile uygulanır; bu komut gölge veritabanı istemez.

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Yerel deneme hesapları

`npm run db:seed` demo organizasyon yoksa örnek kayıtları ekler. Tekrar çalıştırıldığında mevcut demo organizasyonu bulursa kayıtları silmez.

Tüm hesapların şifresi: `ServisPilot123!`

| Rol | E-posta | Organizasyon |
| --- | --- | --- |
| Yönetici | admin@servispilot.local | Kuzey Teknik Servis |
| Operasyon sorumlusu | yonetici@servispilot.local | Kuzey Teknik Servis |
| Servis mühendisi | teknisyen@servispilot.local | Kuzey Teknik Servis |
| Servis mühendisi | teknisyen2@servispilot.local | Kuzey Teknik Servis |
| Yönetici | diger@servispilot.local | Güney Bakım Hizmetleri |

Uygulama rolleri: `ADMIN`, `OPERATIONS_MANAGER`, `TEAM_LEADER`, `SERVICE_ENGINEER`. Ekip üyeliği uygulama rolünden ayrıdır.

İkinci organizasyon, kayıtların şirket bazında ayrı kaldığını denemek içindir.

## Komutlar

```bash
npm run dev
npm run build
npm run lint
npx prisma migrate dev
npm run db:seed
npm run db:studio
```

## Klasör yapısı

```text
prisma/                 Şema ve migration
src/app/                Sayfalar ve dosya indirme rotası
src/components/         Arayüz bileşenleri
src/lib/                Oturum, yetki, Prisma ve ortak yardımcılar
src/modules/            Müşteri, ekipman, servis ve pano iş kuralları
src/server/storage/     Dosya depolama soyutlaması
storage/uploads/        Yerel PDF depolama (public dışında)
```

Veritabanı erişimi sunucuda kalır. Tarayıcıya bağlantı bilgisi veya parola özeti gönderilmez.

## Roller

- Yönetici: tam erişim; ekip ve duyuru yönetimi
- Operasyon sorumlusu: sorumlu olduğu müşteriler ve ilgili operasyonlar
- Ekip lideri: kendi ekibinin takvimini ve üyelerini görür/yönetir
- Servis mühendisi: atandığı ziyaretleri görür, izinli alanları günceller, yorum ve PDF ekler

Yetki kontrolleri sunucu eylemlerinde ve dosya rotasında tekrarlanır. Menüyü gizlemek tek başına yetki sayılmaz.

## Dosyalar

PDF servis formları PostgreSQL’de saklanmaz. Yalnızca dosya yolu ve üst verisi kaydedilir. İndirme `GET /api/dosyalar/:id` üzerinden, oturum ve organizasyon kontrolünden sonra yapılır. Depolama arayüzü (`FileStorage`) daha sonra S3 uyumlu bir sağlayıcıya bırakılabilir.
