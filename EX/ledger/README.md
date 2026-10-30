# EX // LEDGER

Публичный реестр встреч. Три файла:

| Файл | Что | Формат |
|---|---|---|
| `schema.json` | схема одной записи | JSON Schema 2020-12 |
| `encounters.ndjson` | сами записи, одна строка = одна встреча (пока пусто) | NDJSON |
| `counter.json` | текущие счётчики уровней, обновляется автоматически | JSON |

Правила:

1. Записи **только добавляются**; изменение задним числом — новой записью с `rev`.
2. Нет прямых идентификаторов: ни имён, ни телефонов, ни адресов. Только номер.
3. `encounter_id` сквозной и никогда не переиспользуется.
4. Отзыв согласия не удаляет строку, а ставит `consent.withdrawn_at` и
   обнуляет `published.episode` — агрегат остаётся, персональное уходит.
5. Файл версионируется git-ом; хеш коммита = доказательство, что данные не переписаны.

Валидация (поставить `pip install jsonschema`):

```bash
python3 - <<'PY'
import json, jsonschema, pathlib
schema = json.load(open('EX/ledger/schema.json'))
for i, line in enumerate(pathlib.Path('EX/ledger/encounters.ndjson').read_text().splitlines(), 1):
    if line.strip():
        jsonschema.validate(json.loads(line), schema)
        print(f'ok {i}')
PY
```
