# Take for

Take for is a separate product family from Omoi. The GitHub Pages version contains three independent entry points that share one small static UI layer:

- `/couples/`
- `/family/`
- `/friends/`

Couples currently uses provisional questions. Replace `shared/questions/couples.json` with the normalized export from the Swift Loves repository when it is available. Keep the shared fields: `id`, `audience`, `level`, `text`, and optional `category`.

The Family and Friends JSON files are intentionally empty until their question sets are designed.
