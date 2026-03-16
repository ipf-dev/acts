# Backend

This app is the default API surface for `acts`.

## Suggested Package Shape

- `com.acts.<feature>` for feature slices
- controllers remain thin
- services coordinate use cases
- repositories isolate persistence

## Next Steps

1. Add the first feature package.
2. Add request and response DTOs near the feature.
3. Add feature tests before the service grows wide.

