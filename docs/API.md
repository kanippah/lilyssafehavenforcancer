# Lily's Safe Haven — REST API v1

JSON API for the Expo mobile app. All endpoints live under:

```
{BASE_URL}/api/v1
```

`BASE_URL` is the deployed store origin (e.g. `https://lilyssafehavenforcancer.com`) or `http://localhost:3000` in development.

## Conventions

- **Envelope.** Every success response is `{ "data": ... }`. Every error is `{ "error": { "message": "..." } }` with an appropriate HTTP status (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict/stock). Error messages are user-presentable — show them directly.
- **Auth.** `POST /auth/register` and `POST /auth/login` return a `token`: a 30-day JWT. Send it on authenticated requests as `Authorization: Bearer <token>`. Store it in **Expo SecureStore** (`expo-secure-store`), never AsyncStorage. There is no refresh endpoint — when a request returns 401, clear the stored token and send the user to sign-in.
- **Guest carts.** Cart endpoints work signed out. The first cart mutation returns a `cartToken` in the cart payload; persist it (SecureStore or AsyncStorage is fine — it only identifies an anonymous cart) and send it on every cart/order request as the `X-Cart-Token` header. When a request carries a valid bearer token, the user's own cart is used and `cartToken` is `null`. Register/login automatically merge the `X-Cart-Token` guest cart into the account — discard the stored cart token after signing in.
- **Money.** All amounts are integer cents. `currency` (ISO code, lowercase, e.g. `"usd"`) is included wherever amounts appear and in `/meta`.
- **Methods.** Only the documented methods exist per route; anything else gets an automatic 405.

---

## Auth

### POST /auth/register

Body: `{ "name": string, "email": string, "password": string (min 8) }`

Optional header: `X-Cart-Token` (guest cart to carry into the account).

`201`:
```json
{ "data": { "token": "eyJ...", "user": { "id": "...", "name": "Lily", "email": "lily@example.com", "role": "CUSTOMER" } } }
```

`409` when the email already has an account.

### POST /auth/login

Body: `{ "email": string, "password": string }` — same response shape as register (`200`). `401` on a bad email/password pair. Also honors `X-Cart-Token` merging.

---

## Account

### GET /me  (bearer required)

```json
{ "data": {
  "user": { "id": "...", "name": "Lily", "email": "...", "phone": null, "role": "CUSTOMER", "createdAt": "..." },
  "defaultAddress": { "id": "...", "label": "Home", "fullName": "...", "line1": "...", "line2": null, "city": "...", "state": "...", "postalCode": "...", "country": "United States", "phone": null, "isDefault": true }
} }
```

`defaultAddress` is `null` when the user has no saved addresses.

### PATCH /me  (bearer required)

Body: `{ "name"?: string, "phone"?: string | null }` (send `null` phone to clear it). Returns `{ "data": { "user": ... } }`.

---

## Catalog

### GET /products

Query params (all optional):

| Param | Meaning |
| --- | --- |
| `q` | Search title/description (and exact tag match) |
| `collection` | Collection slug filter |
| `sort` | `new` (default), `price-asc`, `price-desc` |
| `page` | 1-based page, default 1 |
| `perPage` | Default 20, max 50 |

```json
{ "data": { "items": [ {
    "id": "...", "title": "Pressed-leaf mug", "slug": "pressed-leaf-mug",
    "featured": true, "tags": ["comfort"],
    "image": { "url": "/seed/mug.svg", "alt": "Pressed-leaf mug" },
    "priceCents": 2400, "compareAtCents": null,
    "variants": [ { "id": "...", "title": "Default", "priceCents": 2400, "compareAtCents": null, "stock": 12, "trackStock": true } ],
    "ratingAvg": 4.7, "ratingCount": 12, "createdAt": "..."
  } ], "page": 1, "perPage": 20, "total": 34 } }
```

`priceCents` is the cheapest variant's price. `ratingAvg` (1 decimal) is computed from approved reviews only; `null` when unreviewed. Image URLs are site-relative — prefix with `BASE_URL`.

### GET /products/{slug}

`404` when missing or not active. `200`:

```json
{ "data": {
  "id": "...", "title": "...", "slug": "...", "description": "...", "story": "...",
  "featured": false, "tags": [],
  "images": [ { "url": "...", "alt": "..." } ],
  "variants": [ { "id": "...", "title": "Small", "sku": "MUG-S", "priceCents": 2400, "compareAtCents": 2900, "stock": 3, "trackStock": true } ],
  "reviews": [ { "id": "...", "name": "A friend", "rating": 5, "title": null, "body": "...", "createdAt": "..." } ],
  "ratingAvg": 4.7, "ratingCount": 12,
  "priceCents": 2400, "currency": "usd",
  "impactLine": "funds 96% of a care kit for a patient in treatment"
} }
```

`reviews` is the latest 20 approved reviews; `ratingAvg`/`ratingCount` cover all approved reviews. Show `impactLine` next to the price — it is the store's "care ledger" line, already phrased.

### GET /collections

```json
{ "data": { "collections": [ { "id": "...", "slug": "comfort", "title": "Comfort goods", "description": "...", "imageUrl": null, "productCount": 8 } ] } }
```

`productCount` counts active products only.

---

## Cart

All cart verbs return the same cart shape:

```json
{ "data": {
  "cartToken": "clx...",
  "items": [ {
    "id": "item-id", "quantity": 2, "lineCents": 4800,
    "variant": { "id": "...", "title": "Default", "priceCents": 2400, "compareAtCents": null, "stock": 12, "trackStock": true },
    "product": { "id": "...", "title": "Pressed-leaf mug", "slug": "pressed-leaf-mug", "image": { "url": "...", "alt": "..." } }
  } ],
  "subtotalCents": 4800,
  "currency": "usd"
} }
```

`cartToken` is non-null only for guest carts — store it and send `X-Cart-Token` afterwards.

### GET /cart

Bearer user's cart, else the `X-Cart-Token` cart, else the empty shape (`items: []`, `subtotalCents: 0`, `cartToken: null`).

### POST /cart

Body: `{ "variantId": string, "quantity"?: number (1–99, default 1) }`. Creates a cart when none exists (returns its `cartToken` for guests). `404` unknown/inactive item, `409` not enough stock.

### PATCH /cart

Body: `{ "itemId": string, "quantity": number (0–99) }`. Quantity `0` removes the line. `404` when the item isn't in the caller's cart, `409` stock.

### DELETE /cart

Body `{ "itemId": string }` (or `?itemId=` for clients that can't send DELETE bodies). Removes the line.

---

## Orders

### GET /orders  (bearer required)

The user's orders, newest first:

```json
{ "data": { "orders": [ {
  "number": "LSH-1042", "status": "SHIPPED", "statusLabel": "Shipped", "createdAt": "...",
  "subtotalCents": 4800, "discountCents": 0, "shippingCents": 0, "taxCents": 0,
  "donationCents": 500, "totalCents": 5300, "currency": "usd",
  "items": [ { "id": "...", "title": "...", "variantTitle": "", "imageUrl": "...", "unitCents": 2400, "quantity": 2 } ]
} ] } }
```

### POST /orders  — place an order

Works signed in (bearer) or as a guest (`X-Cart-Token`). v1 supports **test payments only** (`"paymentMethod": "test"` is required); the Stripe mobile flow is future work.

Body:
```json
{
  "email": "lily@example.com",
  "phone": "555-0100",
  "shippingAddress": {
    "fullName": "Lily Haven", "line1": "1 Garden Way", "line2": "",
    "city": "Portland", "state": "OR", "postalCode": "97201",
    "country": "United States", "phone": ""
  },
  "discountCode": "WELCOME10",
  "donationCents": 500,
  "paymentMethod": "test"
}
```

- `email` is optional for signed-in users (defaults to the account email), required for guests.
- `discountCode` is validated; an unusable code fails the whole request with a `400` and a reason.
- `donationCents` is ignored when donations are disabled in store settings (check `/meta`).

Responses: `201` with `{ "data": { "order": { ...full detail, see below } } }`; `400` empty cart / validation / bad discount; `409` when an item sold out between carting and checkout (message names the item — send the user back to the cart).

The order is created as `PAID`, stock is decremented, and the cart is emptied — refetch `/cart` after success.

### GET /orders/{number}

- Signed in: must be the user's own order (or match their account email).
- Guest: append `?email=` with the email used at checkout.

`401` no credentials, `403` mismatch, `404` unknown number. `200`:

```json
{ "data": { "order": {
  "number": "LSH-1042", "status": "PAID", "statusLabel": "Paid", "createdAt": "...",
  "email": "...", "phone": null, "shippingName": "...",
  "shippingAddress": { "fullName": "...", "line1": "...", "city": "...", "postalCode": "...", "country": "..." },
  "subtotalCents": 4800, "discountCents": 0, "shippingCents": 0, "taxCents": 0, "donationCents": 500,
  "totalCents": 5300, "currency": "usd",
  "paymentMethod": "test", "discountCode": null,
  "trackingCarrier": null, "trackingNumber": null,
  "impactLine": "funds 2 care kits for a patient in treatment",
  "items": [ ... ], "events": [ { "message": "Order placed and paid via test.", "createdAt": "..." } ]
} } }
```

---

## Wishlist  (bearer required)

### GET /wishlist

```json
{ "data": { "items": [ { "id": "...", "addedAt": "...", "product": { "id": "...", "title": "...", "slug": "...", "featured": false, "tags": [], "image": { "url": "...", "alt": "..." }, "priceCents": 2400, "compareAtCents": null, "ratingAvg": 4.7, "ratingCount": 12 } } ] } }
```

Only active products are returned.

### POST /wishlist

Body: `{ "productId": string }`. Toggles: `{ "data": { "saved": true } }` when added, `{ "saved": false }` when removed. `404` for unknown/inactive products (adding only — removing always works).

---

## Store config

### GET /meta

Fetch once at app launch (and on foreground refresh) for branding, shipping rules, and the care-ledger config:

```json
{ "data": {
  "storeName": "Lily's Safe Haven",
  "tagline": "A shop where every purchase shelters someone facing cancer.",
  "logoUrl": null,
  "currency": "usd",
  "announcement": null,
  "freeShippingThresholdCents": 7500,
  "shippingFlatCents": 599,
  "impactUnitCents": 2500,
  "impactUnitLabel": "care kit for a patient in treatment",
  "donationEnabled": true,
  "collections": [ { "slug": "comfort", "title": "Comfort goods" } ],
  "totalRaisedCents": 1234500
} }
```

Use `impactUnitCents`/`impactUnitLabel` to render client-side impact lines for cart subtotals ("funds N care kits…"); product and order responses already include a phrased `impactLine`.
