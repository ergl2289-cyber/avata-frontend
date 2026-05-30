# AVATA Backend — Описание функционала и API

---

## 1. Авторизация (Telegram WebApp)

### Логика
Пользователь открывает Mini App в Telegram. WebApp передаёт строку `initData` на бэкенд.
Бэкенд валидирует её через HMAC-подпись с `bot_token`, извлекает данные юзера
(`tg_id`, `username`, `first_name`, `last_name`) и ищет запись в таблице `users`:

- **Пользователь есть** — обновляет имя/фамилию/юзернейм если изменились, возвращает JWT-токен
- **Пользователя нет** — создаёт новую запись, возвращает JWT + флаг `is_new_user: true`

JWT содержит `{"user_id": 123, "tg_id": 456789}`, подписан `HS256`, живёт 30 дней.

### POST /api/auth/telegram

**Запрос:**
```json
{
  "init_data": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": 1,
  "tg_id": 123456789,
  "username": "geronda94",
  "first_name": "Игорь",
  "last_name": null,
  "phone": null,
  "city_id": null,
  "is_new_user": true
}
```

`is_new_user: true` — фронт должен сразу отправить юзера на экран выбора города.

---

## 2. Профиль пользователя

### GET /api/users/me

Возвращает профиль текущего юзера с названием города и региона (если указан).

Требует заголовок: `Authorization: Bearer <token>`

**Ответ:**
```json
{
  "id": 1,
  "tg_id": 123456789,
  "username": "geronda94",
  "first_name": "Игорь",
  "last_name": null,
  "phone": "+79001234567",
  "city_id": 5,
  "city_name": "Москва",
  "region_name": "Москва",
  "rating": 4.5
}
```

`rating` — средний рейтинг продавца (0 если нет объявлений).

### PATCH /api/users/me

Редактирование профиля. Все поля опциональны.

**Запрос:**
```json
{
  "username": "new_username",
  "first_name": "Игорь",
  "last_name": "Игорев",
  "phone": "+79001234567",
  "city_id": 5
}
```

**Ответ:** возвращает обновлённый `GET /api/users/me`.

### PATCH /api/users/me/city

Быстрая смена города (например при первом входе).

**Запрос:**
```json
{
  "city_id": 5
}
```

**Ответ:** возвращает обновлённый `GET /api/users/me`.

---

## 3. Гео-справочник

### GET /api/geo/regions

Список активных регионов (status = published).

**Ответ:**
```json
[
  {"id": 1, "name": "Москва", "status": "published"},
  {"id": 2, "name": "Московская область", "status": "published"},
  {"id": 3, "name": "Санкт-Петербург", "status": "published"}
]
```

### GET /api/geo/cities?region_id=1

Города в регионе (или все если `region_id` не указан).

**Ответ:**
```json
[
  {"id": 10, "name": "Москва", "region": 1, "status": "published"},
  {"id": 11, "name": "Зеленоград", "region": 1, "status": "published"}
]
```

---

## 4. Справочники автомобилей

### GET /api/references/brands

Все марки авто.

**Ответ:**
```json
[
  {"id": 1, "name": "BMW"},
  {"id": 2, "name": "Mercedes-Benz"},
  {"id": 3, "name": "Toyota"}
]
```

### GET /api/references/models?brand_id=1

Модели по бренду (или все если `brand_id` не указан).

**Ответ:**
```json
[
  {"id": 10, "name": "X5", "brand": 1},
  {"id": 11, "name": "3 Series", "brand": 1}
]
```

### GET /api/references/vehicle-categories

Категории ТС (легковая, грузовая, мотоцикл и т.д.).

```json
[
  {"id": 1, "name": "Легковой"},
  {"id": 2, "name": "Грузовой"}
]
```

### GET /api/references/body-types

Типы кузова.

```json
[
  {"id": 1, "name": "Седан"},
  {"id": 2, "name": "Внедорожник"}
]
```

---

## 5. Лента объявлений

### GET /api/cars

Основной эндпоинт ленты. **Показывает только машины из региона пользователя.**
Если у пользователя не указан город — возвращает пустой список.

**Query-параметры (все опциональны):**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `brand_id` | int | Фильтр по марке |
| `model_id` | int | Фильтр по модели |
| `year_min` | int | Год от |
| `year_max` | int | Год до |
| `price_min` | int | Цена от |
| `price_max` | int | Цена до |
| `mileage_max` | int | Пробег до |
| `body_type_id` | int | Тип кузова |
| `vehicle_category_id` | int | Категория ТС |
| `transmission` | str | КПП: manual, automatic, robot, cvt |
| `fuel_type` | str | Топливо: petrol, diesel, electric, hybrid |
| `drive_type` | str | Привод: fwd, rwd, awd |
| `sort_by` | str | Сортировка: `date_desc` (по умол.), `price_asc`, `price_desc`, `mileage_asc`, `year_desc` |
| `cursor` | int | ID последней машины с предыдущей страницы (cursor-пагинация) |
| `limit` | int | Размер страницы (1–50, по умолчанию 20) |

**Ответ:**
```json
{
  "items": [
    {
      "id": 42,
      "model_name": "X5",
      "brand_name": "BMW",
      "year": 2020,
      "mileage": 45000,
      "price": 4500000,
      "city_name": "Москва",
      "region_id": 1,
      "first_photo_url": null,
      "views_global": 128,
      "likes_global": 12,
      "date_created": "2026-05-20T12:00:00Z"
    }
  ],
  "next_cursor": 41
}
```

`next_cursor` — передать в следующем запросе как `?cursor=41` для следующей страницы.
`next_cursor: null` — страниц больше нет.
`first_photo_url` — будет заполняться позже (через кеш или доп. запрос).

### GET /api/cars/my

Мои объявления (где я продавец). Пагинация через `?cursor=&limit=`.

**Ответ:** та же структура `CarFeedResponse`.

### GET /api/cars/liked

Избранное (лайкнутые мной машины). Пагинация через `?cursor=&limit=`.

**Ответ:** та же структура `CarFeedResponse`.

---

## 6. Детальная карточка объявления

### GET /api/cars/{id}

Возвращает **глубоко вложенный** JSON со всей информацией.

**Ответ:**
```json
{
  "id": 42,
  "model_name": "X5",
  "brand_name": "BMW",
  "year": 2020,
  "mileage": 45000,
  "price": 4500000,
  "city_name": "Москва",
  "region_id": 1,
  "views_global": 128,
  "likes_global": 12,
  "is_active": true,
  "moderation_status": "approved",
  "source": "selfposted",
  "date_created": "2026-05-20T12:00:00Z",
  "date_updated": "2026-05-21T10:00:00Z",

  "seller": {
    "id": 1,
    "first_name": "Игорь",
    "last_name": null,
    "username": "geronda94",
    "rating": 4.5
  },

  "technical": {
    "body_type_name": "Внедорожник",
    "vehicle_category_name": "Легковой",
    "engine_volume": 3.0,
    "engine_power": 340,
    "transmission": "automatic",
    "fuel_type": "diesel",
    "drive_type": "awd",
    "color": "Чёрный"
  },

  "legal": {
    "vin": "WBA1234567890ABCD",
    "license_plate": "А123БВ177",
    "chassis_number": null,
    "is_wanted": false,
    "accident_count": 0,
    "is_restricted": false,
    "last_check_date": "2026-05-19T15:30:00Z"
  },

  "photos": [
    {"id": "abc-def-123", "url": "https://storage.yandexcloud.net/avata/abc-def-123.webp"},
    {"id": "abc-def-456", "url": "https://storage.yandexcloud.net/avata/abc-def-456.webp"}
  ],

  "is_liked": true
}
```

`is_liked` — лайкнул ли текущий пользователь это объявление.
Фото запрашиваются через Directus API (получаем S3 URL).

---

## 7. Создание объявления

### POST /api/cars

Создаёт запись в `cars`, `car_technical_specs`, `car_legal_data`.
Статус: `moderation_status = pending`, `is_active = false`.

**Запрос:**
```json
{
  "model_id": 10,
  "year": 2020,
  "mileage": 45000,
  "price": 4500000,
  "city_id": 10,
  "source": "selfposted",
  "vehicle_category_id": 1,
  "body_type_id": 2,
  "engine_volume": 3.0,
  "engine_power": 340,
  "transmission": "automatic",
  "fuel_type": "diesel",
  "drive_type": "awd",
  "color": "Чёрный",
  "vin": "WBA1234567890ABCD",
  "license_plate": "А123БВ177",
  "chassis_number": null
}
```

Поля `vehicle_category_id` ... `chassis_number` — опциональны.

**Ответ:**
```json
{
  "car_id": 42
}
```

### POST /api/cars/{id}/photos

Загрузка фото через multipart/form-data. Каждый файл:
1. Сжимается (Pillow: resize до 1200px, конвертация WebP quality=85)
2. Отправляется в Directus (который кладёт в S3)
3. Возвращается список file_id

**Запрос:** `multipart/form-data` с полем `files` (multiple files)

**Ответ:**
```json
{
  "file_ids": ["abc-def-123", "abc-def-456"]
}
```

После загрузки фронт должен привязать файлы к объявлению через отдельный запрос
(пока не реализован — нужно PATCH `/items/cars/{id}` с обновлением поля `files` через Directus).

---

## 8. Лайки

### POST /api/cars/{id}/like

Toggle-логика. Если лайк уже стоит — снимает, если нет — ставит.
Одновременно инкрементит/декрементит `cars.likes_global`.

**Ответ:**
```json
{
  "is_liked": true,
  "likes_count": 13
}
```

`is_liked` — состояние после операции.
`likes_count` — актуальное количество лайков объявления.

---

## 9. Просмотры

### POST /api/cars/{id}/view

Регистрирует просмотр объявления пользователем:
- Если пользователь **впервые** смотрит эту машину — создаётся запись `car_views` (view_count=1) и инкрементится `cars.views_global`
- Если **повторно** — только `view_count += 1` в `car_views`, глобальный счётчик **не** меняется

Таким образом `cars.views_global` — это количество **уникальных** просмотров (user+car пар).

**Ответ:**
```json
{
  "status": "ok"
}
```

---

## 10. Отзывы

### POST /api/reviews

Создаёт отзыв. Статус: `pending` (отправляется на модерацию).

**Запрос:**
```json
{
  "seller_id": 1,
  "car_id": 42,
  "rating": 5,
  "text": "Отличный продавец, машина в идеале!"
}
```

`seller_id` и `car_id` — опциональны (можно оставить отзыв только продавцу или только машине).

**Ответ:**
```json
{
  "review_id": 7,
  "status": "pending"
}
```

### GET /api/reviews/seller/{id}

Одобренные отзывы о продавце. Пагинация: `?limit=&offset=`.

**Ответ:**
```json
[
  {
    "id": 7,
    "author_id": 2,
    "author_name": "Анна",
    "seller_id": 1,
    "car_id": 42,
    "rating": 5,
    "text": "Отличный продавец!",
    "status": "approved",
    "date_created": "2026-05-22T08:00:00Z"
  }
]
```

### GET /api/reviews/car/{id}

Одобренные отзывы об автомобиле. Пагинация: `?limit=&offset=`.

**Ответ:** та же структура что и у продавца.

### GET /api/reviews/seller/{id}/rating

Агрегированный рейтинг продавца.

**Ответ:**
```json
{
  "seller_id": 1,
  "avg_rating": 4.5,
  "review_count": 12
}
```

`avg_rating` — средний балл по одобренным отзывам.
`review_count` — количество одобренных отзывов.

---

## 11. Фото-пайплайн (детали)

```
Клиент (WebApp)
  │  multipart/form-data (несколько файлов)
  ▼
POST /api/cars/{id}/photos
  │
  ├── Для каждого файла:
  │   1. Чтение байтов из UploadFile
  │   2. PIL.Image.open() → конвертация RGBA→RGB
  │   3. resize: max сторона 1200px (LANCZOS)
  │   4. save в BytesIO как WebP (quality=85)
  │   5. httpx POST → Directus /files (multipart)
  │   6. Directus сохраняет в S3 (Yandex Object Storage)
  │
  └── Ответ: {"file_ids": ["uuid-1", "uuid-2"]}
```

---

## 12. Механика просмотров (детали)

```
Пользователь открывает карточку машины
  │
  ▼
POST /api/cars/{id}/view
  │
  ├── SELECT FROM car_views WHERE user=X AND car=Y
  │
  ├── Запись НЕ найдена (первый просмотр):
  │   ├── INSERT car_views (user=X, car=Y, view_count=1)
  │   └── UPDATE cars SET views_global = views_global + 1  ← уникальный просмотр
  │
  └── Запись НАЙДЕНА (повторный просмотр):
      └── UPDATE car_views SET view_count = view_count + 1  ← только счётчик
         (cars.views_global НЕ меняется)
```

---

## 13. Фильтрация по региону (детали)

Каждый запрос `GET /api/cars` проверяет:
1. `user.city` → если `null` → пустой ответ
2. `SELECT region FROM cities WHERE id = user.city` → получаем `region_id` пользователя
3. В SQL-запросе: `WHERE cities.region = <region_id пользователя>`

Таким образом пользователь видит только машины из **своего региона**
(регион Москва → видит Москву, Зеленоград, но не Санкт-Петербург).

---

## 14. Модерация (процесс)

```
Пользователь создаёт объявление / отзыв
  │
  ▼
Запись в БД: moderation_status = "pending", is_active = false
  │
  ▼
Админ в панели Directus видит pending-записи
  │
  ├── Одобряет → status = "approved", is_active = true
  │   └── Запись появляется в ленте
  │
  └── Отклоняет → status = "rejected"
      └── Запись скрыта, требуется webhook-нотификация продавцу
```
