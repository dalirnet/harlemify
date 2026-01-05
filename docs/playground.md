# Playground

A fully functional Nuxt 3 application demonstrating harlemify features.

## Running

```bash
# Clone the repository
git clone https://github.com/diphyx/harlemify.git
cd harlemify

# Install dependencies
npm install

# Start the playground
npm run dev
```

The playground will be available at `http://localhost:3000`.

## Stores

```
playground/stores/
├── user.ts     # Collection store (*_UNITS endpoints)
├── post.ts     # Collection store (*_UNITS endpoints)
└── config.ts   # Singleton store (*_UNIT endpoints)
```

## Features Demonstrated

- **Collection stores**: `user.ts`, `post.ts` - list operations with `*Units` actions
- **Singleton store**: `config.ts` - single data with `*Unit` actions
- **Temporary state**: Using `memorizedUnit` + mutations for modal selection
- **Loading states**: Using `endpointsStatus` for pending/success/failed states
- **CRUD operations**: Create, read, update, delete with type-safe URLs
