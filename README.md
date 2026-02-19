# Тестовое задание: Google Apps Script webhook (Google Sheets -> Telegram)

## Что в проекте
- `Code.gs` - основной скрипт Google Apps Script.
- `appsscript.json` - манифест проекта Apps Script.
- `policy_purchase_examples.json` - 10 примеров входящих событий для тестирования.

## Что реализовано
1. Обработчик `doPost(e)` для `POST application/json`.
2. Извлечение события из `goals[0].goal`.
3. Фиксация `Receipt Time` в момент получения запроса скриптом.
4. Запись в Google Sheet в новую строку.
5. Динамические колонки по ключам `pixel_data`.
6. Отправка Telegram только для `POLICY_PURCHASE`.
7. JSON-ответ с полями:
   - `ok`
   - `sheet_ok`
   - `telegram_ok`
   - `goal`
   - `receipt_time`
   - `error_message`

## Предварительные требования
- Google аккаунт.
- Созданный Telegram бот (через `@BotFather`) и известный `chat_id`.
- Установленный `clasp` (опционально, если будете загружать код через CLI):
  - `npm i -g @google/clasp`

## Шаги запуска

### 1. Создайте Google Sheet
1. Создайте новую таблицу Google Sheets.
2. Создайте лист, например `events_log`.
3. Скопируйте `SPREADSHEET_ID` из URL таблицы.

### 2. Создайте Apps Script проект
Вариант A (через UI):
1. Откройте `Extensions -> Apps Script` из таблицы.
2. Вставьте код из `Code.gs`.
3. В `Project Settings` убедитесь, что используется runtime V8.

Вариант B (через `clasp`):
1. Выполните `clasp login`.
2. В этой папке выполните `clasp create --type standalone --title "CDP Webhook"`.
3. Выполните `clasp push`.

### 3. Настройте Script Properties
В Apps Script: `Project Settings -> Script Properties`, добавьте:
- `SPREADSHEET_ID=<ваш id таблицы>`
- `SHEET_NAME=events_log`
- `TELEGRAM_BOT_TOKEN=<token>`
- `TELEGRAM_CHAT_ID=<chat_id>`

### 4. Деплой как Web App
1. Нажмите `Deploy -> New deployment`.
2. Type: `Web app`.
3. `Execute as`: `Me`.
4. `Who has access`: `Anyone` (или `Anyone with the link`, зависит от интерфейса).
5. Нажмите `Deploy` и сохраните URL вебхука.

## Тестирование

### Пример запроса из Postman
- Method: `POST`
- URL: `<WEB_APP_URL>`
- Header: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "db_id": 1,
  "goals": [{"goal": "POLICY_PURCHASE"}],
  "pixel_data": {
    "POLICY_NO": "L0123/456/789101/1",
    "SUM": "50000",
    "CURRENCY": "RUB"
  }
}
```

### Ожидаемый успешный ответ
```json
{
  "ok": true,
  "sheet_ok": true,
  "telegram_ok": true,
  "goal": "POLICY_PURCHASE",
  "receipt_time": "2026-02-19T10:00:00.000Z",
  "error_message": null
}
```

### Тест всех 10 событий
1. Откройте `policy_purchase_examples.json`.
2. Отправьте каждый объект отдельно в Postman.
3. Проверьте:
   - Для всех событий создана строка в таблице.
   - Telegram уходит только для `POLICY_PURCHASE` (в текущем наборе 3 события).

## Логика по требованиям ТЗ
- `Event Name` = `goals[0].goal`.
- `Receipt Time` = текущее время скрипта на момент получения запроса.
- Данные `pixel_data` не хранятся одной строкой, а пишутся в отдельные колонки.
- Для событий не равных `POLICY_PURCHASE` выполняется только запись в таблицу.

## Обработка ошибок
- Невалидный JSON: `ok=false`, описание в `error_message`.
- Ошибка записи в Sheet: `sheet_ok=false`.
- Ошибка Telegram: `telegram_ok=false`.
- Ошибки логируются через `Logger.log`/`console.error`.

## Что приложить в ответ по тестовому
1. Ссылка на таблицу (read-only).
2. Ссылка на код (или текст `Code.gs`).
3. Скриншот Postman со статусом `200`.
4. Скриншот Telegram-уведомления.
5. Краткое описание шагов реализации.

## Шаблон блока "Как сделал"
1. Создал Google Sheet и лист `events_log`.
2. Развернул Google Apps Script как Web App.
3. Реализовал прием JSON, парсинг `goals[0].goal` и `pixel_data`.
4. Сделал динамические заголовки под ключи `pixel_data`.
5. Добавил отправку в Telegram только для `POLICY_PURCHASE`.
6. Протестировал запросы из `policy_purchase_examples.json` через Postman.
