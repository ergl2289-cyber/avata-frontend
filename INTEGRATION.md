# AVATA — интеграция фронтенда с бэкендом

## Архитектура (кто куда ходит)

```
avata-frontend (Vue 3 / Vite / TypeScript)
  │
  ├── d.avata.site (Directus CMS) — публичное чтение, без авторизации
  │     Справочники: бренды, модели, регионы, города, категории, типы кузова
  │     Формат ответа: Directus REST { data: [...], meta: {...} }
  │
  └── api.avata.site (FastAPI) — авторизация + запись + бизнес-логика
        Авторизация: POST /api/auth/telegram (принимает initData, возвращает JWT)
        Все запросы требуют заголовок: Authorization: Bearer <jwt>
        Формат ответа: плоский JSON (не Directus-обёртка)
```

## Маршрутизация запросов (все эндпоинты)

### Directus (публичное чтение — код ОСТАЁТСЯ в `api/directus.ts`)

| Функция | Эндпоинт Directus |
|---------|------------------|
| `getBrands()` | `GET /items/car_brands?sort=name` |
| `getModels(brandId)` | `GET /items/car_models?filter[brand][_eq]=X` |
| `getRegions()` | `GET /items/regions?filter[status]=published` |
| `getCities()` | `GET /items/cities?filter[status]=published` |
| `getCategories()` | `GET /items/vehicle_categories` |
| `getBodyTypes()` | `GET /items/car_body_types` |

### FastAPI (авторизация + запись + бизнес-логика — код в `api/backend.ts`)

| Функция | Эндпоинт FastAPI | Метод | Auth |
|---------|-----------------|-------|------|
| `telegramAuth(initData)` | `/api/auth/telegram` | POST | Нет |
| `loginWidget(widgetUser)` | `/api/auth/widget` | POST | Нет |
| `getUserProfile()` | `/api/users/me` | GET | Да |
| `updateUserProfile(...)` | `/api/users/me` | PATCH | Да |
| `setUserCity(cityId)` | `/api/users/me/city` | PATCH | Да |
| `getCarsFeed(filters)` | `/api/cars?brand_id=&year_min=&sort_by=&cursor=` | GET | Да |
| `getCarDetail(id)` | `/api/cars/{id}` | GET | Да |
| `getMyCars()` | `/api/cars/my` | GET | Да |
| `getLikedCars()` | `/api/cars/liked` | GET | Да |
| `toggleLike(carId)` | `/api/cars/{id}/like` | POST | Да |
| `recordView(carId)` | `/api/cars/{id}/view` | POST | Да |
| `createCar(data)` | `/api/cars` | POST | Да |
| `uploadCarPhotos(carId, files)` | `/api/cars/{id}/photos` | POST (multipart) | Да |
| `createReview(data)` | `/api/reviews` | POST | Да |
| `uploadReviewPhotos(reviewId, files)` | `/api/reviews/{id}/photos` | POST (multipart) | Да |
| `getSellerReviews(id)` | `/api/reviews/seller/{id}` | GET | Нет |
| `getSellerRating(id)` | `/api/reviews/seller/{id}/rating` | GET | Нет |

## Авторизация (как работает)

### В Telegram (продакшен)
1. Telegram WebApp отдаёт `WebApp.initData` (подписанная HMAC строка)
2. Фронт отправляет её на `POST /api/auth/telegram` → `{ init_data: "..." }`
3. Бэкенд (FastAPI) проверяет подпись через `BOT_TOKEN`, создаёт/находит юзера
4. Возвращает JWT-токен: `{ token: "eyJ...", user_id: 1, is_new_user: false }`
5. Фронт сохраняет JWT в `localStorage` (ключ: `avata:jwt`)
6. Все последующие запросы к FastAPI идут с заголовком `Authorization: Bearer <jwt>`

### В браузере (авторизация через Telegram OAuth / Widget)

1. Пользователь открывает сайт в браузере → `WebApp.initData` пустая (нет Telegram-окружения)
2. `App.vue` показывает `LoginView.vue` — экран входа с кнопкой «Войти через Telegram»
3. При клике — редирект на `https://oauth.telegram.org/auth?bot_id=...&return_to=<текущий URL>`
4. Telegram показывает страницу подтверждения (на телефоне — приложение, на ПК — QR-код)
5. После подтверждения — редирект обратно на сайт с хэшем `#tgAuthResult=<base64 JSON>`
6. `main.ts` парсит хэш → `atob` → `JSON.parse` → вызывает `tgStore.widgetAuth(user)`
7. `widgetAuth()` отправляет `POST /api/auth/widget` с данными виджета (id, first_name, hash и т.д.)
8. Бэкенд проверяет хэш `HMAC-SHA256(SHA256(bot_token), data_check_string)` → апсерт юзера → JWT
9. JWT сохраняется в `localStorage` (ключ: `avata:jwt`)
10. `App.vue` показывает спиннер загрузки профиля, затем — основное приложение
11. Пользователь остаётся на той же странице (глубокие ссылки: `/car/42`, `/search?q=bmw` и т.д.)

> **Важно**: `POST /api/auth/widget` работает **всегда** и не зависит от `TEST_MODE`. Валидация хэша производится по стандарту Telegram Login Widget (HMAC-SHA256).

### ID тестового пользователя
В `main.ts` константа `DEV_USER_ID = 111111`. В сидере этот `tg_id` соответствует пользователю «Иван Петров» с городом «Зеленоград» (регион Москва). У него есть несколько машин и отзывы. Чтобы тестировать без авторизации, можно использовать заголовок `X-Test-User-Id: 1` (работает при TEST_MODE=true на бэке).

## Структура файлов (интеграционный слой)

```
src/api/
├── directus.ts       # Публичные справочники (чтение без авторизации)
├── backend.ts        # ★ FastAPI-клиент — все эндпоинты нашей апишки
├── auth.ts           # ★ JWT: login/logout/loginWidget/loginTest/getToken (localStorage)
├── cars.service.ts   # ★ Слой адаптации: backend → Directus-формат
├── catalog.service.ts # Остаётся через directus.ts
├── geo.service.ts     # Остаётся через directus.ts
└── mocks/             # Остаётся для офлайн-разработки

src/views/
├── LoginView.vue      # ★ Экран входа через Telegram OAuth (браузерный режим)
├── ...
```

## Как адаптированы ответы бэкенда

Бэкенд FastAPI возвращает **плоские** объекты:
```json
{
  "id": 42,
  "model_name": "X5",
  "brand_name": "BMW",
  "city_name": "Москва",
  "seller": { "id": 1, "first_name": "Иван", "rating": 4.5 },
  "technical": { "engine_volume": 3.0, "transmission": "automatic" },
  "photos": [{ "id": "abc", "url": "https://..." }],
  "is_liked": false
}
```

Фронтенд ожидает **вложенные** объекты (Directus-формат):
```json
{
  "id": 42,
  "model": { "id": 10, "name": "X5", "brand": { "id": 1, "name": "BMW" } },
  "city": { "id": 5, "name": "Москва" },
  "seller": { "id": "1", "first_name": "Иван" },
  "files": [{ "directus_files_id": { "id": "abc" } }],
  "technical_specs": { "engine_volume": 3.0, "transmission": "automatic" }
}
```

**Адаптация происходит в `cars.service.ts`**:
- `feedItemToList()` — плоский `CarListFeedItem` → вложенный `CarListItem`
- `detailToCarDetail()` — плоский `CarDetailResponse` → вложенный `CarDetail`

### Как НЕ надо писать новые компоненты

**Плохо** (идти напрямую к Directus за данными, которые есть в бэкенде):
```typescript
// Не делай так для cars, likes, reviews:
import { directusRequest } from '@/api/directus'
const data = await directusRequest('/items/cars', { filters: { ... } })
```

**Хорошо** (идти через сервисный слой — он сам решит моки или реальный бэкенд):
```typescript
import { getCars, getCarById } from '@/api/cars.service'
const feed = await getCars({ limit: 8, offset: 0, brandId: 1 })
const detail = await getCarById(42)
```

**Хорошо** (для лайков/вьюсов/отзывов — вызывать backend напрямую):
```typescript
import { backend } from '@/api/cars.service'
await backend.toggleLike(carId)
await backend.recordView(carId)
await backend.createReview({ seller_id: 1, rating: 5, text: 'Отлично!' })
```

## Режимы работы (VITE_USE_MOCKS)

### `VITE_USE_MOCKS=true` (по умолчанию)
- Локальная разработка без сервера
- Все данные из `src/api/mocks/`
- 16 фейковых машин, 8 брендов, 24 модели, 34 города
- Имитация задержки 320ms
- **Лайки/избранное** — localStorage (ключ `avata:favorites`)
- **Черновики** — localStorage (ключ `avata:drafts`)

### `VITE_USE_MOCKS=false`
- Реальные запросы к серверам
- **Справочники** → `d.avata.site` (Directus, публичное чтение)
- **Всё остальное** → `api.avata.site` (FastAPI, JWT-авторизация)
- **Лайки/избранное** → `POST /api/cars/{id}/like` (серверное хранение)
- **Черновики** — пока localStorage (нужен отдельный эндпоинт на бэке)

## ENV-переменные

| Переменная | Назначение |
|-----------|-----------|
| `VITE_USE_MOCKS` | `true` = моки, `false` = реальные API |
| `VITE_DIRECTUS_URL` | Directus CMS: `https://d.avata.site` |
| `VITE_API_URL` | FastAPI бэкенд: `https://api.avata.site` |

## Фильтры в ленте (маппинг)

Фронтенд использует camelCase (`brandId`, `yearFrom`, `priceTo`), бэкенд — snake_case (`brand_id`, `year_min`, `price_max`). Маппинг в `cars.service.ts` → `getCarsBackend()`:

```typescript
// Frontend filter → backend params
filters.brandId     → brand_id
filters.modelId     → model_id
filters.yearFrom    → year_min
filters.yearTo      → year_max
filters.priceFrom   → price_min
filters.priceTo     → price_max
filters.cityId      → city_id
```

Пагинация на бэкенде — **cursor-based** (параметр `cursor` = ID последней машины с предыдущей страницы). Фронтенд использует offset-based логику (локальный счётчик). Пока это работает через `limit` + фильтрацию на фронте без серверного курсора. При переходе на большие объёмы данных нужно будет переделать на полноценный cursor.

## Загрузка фото

```
Фронт → FormData (multipart) → POST /api/cars/{id}/photos
  │  файлы сжимаются на бэке: Pillow → WebP (1200px, quality=85)
  │  загружаются в Directus → S3 (Yandex Object Storage)
  ▼
Ответ: { file_ids: ["uuid-1", "uuid-2"] }
```

## Где что лежит (быстрый поиск по задаче)

| Задача | Где править |
|--------|-----------|
| Добавить новый эндпоинт | `api/backend.ts` — новая функция |
| Изменить маппинг ответа | `api/cars.service.ts` — `feedItemToList()` / `detailToCarDetail()` |
| Поменять логику авторизации | `api/auth.ts` + `stores/telegram.ts` |
| Добавить фильтр в ленте | `stores/filters.ts` (состояние) + `api/cars.service.ts` (передача в запрос) |
| Новый компонент ленты | `components/car/` + используй `useCarsStore()` |
| Стили/дизайн | Tailwind config: `tailwind.config.ts` (цвета, радиусы, анимации) |
| Моки (офлайн-данные) | `api/mocks/` — `cars.mock.ts`, `brands.mock.ts`, `geo.mock.ts` |
| Типы данных | `types/car.ts` — интерфейсы ответов |

## Чего пока нет (что доделать)

- **Страница деталки машины** (`ListingView.vue`) ✅ **ГОТОВО**
- **Браузерная авторизация** ✅ **ГОТОВО** — Telegram OAuth Widget
- **Профиль продавца** (`SellerView.vue`) ✅ **ГОТОВО** — объявления, отзывы, рейтинг, фото-отзывы
- **Фото в отзывах** ✅ **ГОТОВО** — multipart-загрузка через `POST /api/reviews/{id}/photos`
- **Глубокие ссылки** ✅ **ГОТОВО** — авторизация сохраняет URL (`/car/42` и т.д.)
- **Счётчики лайков/просмотров на карточках** ✅ **ГОТОВО** — реальные данные из БД, обновляются после лайка
- **Сохранение черновиков на сервер** — пока localStorage
- **Поиск** — текстовый поиск на бэкенде не реализован
- **Счётчик «Показано X из Y»** — бэкенд не отдаёт total_count
- **Offline-режим** — не реализован
