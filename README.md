# Тестовое задание: Google Apps Script webhook (Google Sheets -> Telegram)

## Что реализовано
1. Вебхук `doPost(e)` принимает `POST application/json`.
2. Извлекает событие из `goals[0].goal`.
3. Фиксирует `Receipt Time` в момент получения запроса.
4. Пишет каждое событие в Google Sheet в новую строку.
5. Разносит `pixel_data` по отдельным колонкам (динамические заголовки).
6. Отправляет Telegram-уведомление только для `POLICY_PURCHASE`.
7. Возвращает JSON-ответ:
   - `ok`
   - `sheet_ok`
   - `telegram_ok`
   - `goal`
   - `receipt_time`
   - `error_message`

## Файлы в проекте
- `Code.gs` - код Google Apps Script.
- `appsscript.json` - манифест Apps Script.
- `policy_purchase_examples.json` - исходные примеры из ТЗ.
- `data.json` - набор из 10 событий для массового прогона в Postman Runner.

## Какие шаги предприняли для решения задачи
1. Реализовали `doPost(e)` для приема `POST application/json` в Google Apps Script.
2. Добавили парсинг `goals[0].goal` и `pixel_data` из входящего JSON.
3. Настроили запись в Google Sheets: каждое событие в новую строку, `pixel_data` по отдельным колонкам.
4. Добавили динамическое создание колонок при появлении новых ключей в `pixel_data`.
5. Реализовали фиксацию `Receipt Time` как `new Date()` в момент входа запроса в `doPost(e)` (время сервера Apps Script, а не `FIRED_EVENT_TIMESTAMP` из payload).
6. Настроили отправку Telegram только для события `POLICY_PURCHASE`.
7. Протестировали webhook одиночными и пакетными запросами (10 событий) через Postman.
