# API Endpoints Documentation

This document describes the API endpoints available in the application.

## Base URL
All endpoints are prefixed with `/api` unless otherwise noted (e.g. `/ping`).

Default local running at: http://localhost:3001

## General Response Structure
All JSON responses follow this structure:
```json
{
  "error": string | null,
  "data": any | null
}
```

---

## Health Check

### Get Status
- **Method:** `GET`
- **Endpoint:** `/ping`
- **Description:** Check if the API is running.
- **Response:**
  ```json
  {
    "pong": true
  }
  ```

---

## Authentication

All protected routes require the `Authorization` header:
`Authorization: Bearer <token>`

### Login
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com", // required
    "password": "secretpassword" // required
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "token": "generated_token",
      "avatar": "url_or_null",
      "isAdmin": false,
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```

### Logout
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Headers:**
  - `Authorization`: `Bearer <token>`
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```

### Get Current User
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Headers:**
  - `Authorization`: `Bearer <token>`
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "avatar": "url_or_null",
      "isAdmin": false,
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```

---

## Users

### List Users
- **Method:** `GET`
- **Endpoint:** `/api/users`
- **Query Parameters:**
  - `limit` (optional): Number of records to return (default: 10, max: 100).
  - `offset` (optional): Number of records to skip (default: 0).
- **Response:**
  ```json
  {
    "error": null,
    "data": [
      {
        "id": "uuid",
        "name": "User Name",
        "email": "user@example.com",
        "isAdmin": boolean,
        "avatar": "filename.jpg",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```

### Get User
- **Method:** `GET`
- **Endpoint:** `/api/users/:id`
- **Path Parameters:**
  - `id`: User UUID
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "isAdmin": boolean,
      "avatar": "filename.jpg",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```

### Create User
- **Method:** `POST`
- **Endpoint:** `/api/users`
- **Body:**
  ```json
  {
    "name": "User Name", // required
    "email": "user@example.com", // required
    "password": "secretpassword", // required, min 6 chars
    "isAdmin": false // optional, default false
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": { ...userObject }
  }
  ```

### Update User
- **Method:** `PUT`
- **Endpoint:** `/api/users/:id`
- **Path Parameters:**
  - `id`: User UUID
- **Body:** (Multipart/form-data for avatar upload, or JSON if no file)
  - `name`: string (optional)
  - `email`: string (optional)
  - `password`: string (optional, min 6 chars)
  - `isAdmin`: boolean (optional)
  - `avatar`: file (optional)
- **Response:**
  ```json
  {
    "error": null,
    "data": { ...updatedUserObject }
  }
  ```

### Delete User
- **Method:** `DELETE`
- **Endpoint:** `/api/users/:id`
- **Path Parameters:**
  - `id`: User UUID
- **Response:** `204 No Content`

---

## Categories

### List Categories
- **Method:** `GET`
- **Endpoint:** `/api/categories`
- **Query Parameters:**
  - `includeProductCount` (optional): "true" or "false" (default: false).
- **Response:**
  ```json
  {
    "error": null,
    "data": [
      {
        "id": "uuid",
        "name": "Category Name",
        "productCount": 0, // if included
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```

### Get Category
- **Method:** `GET`
- **Endpoint:** `/api/categories/:id`
- **Path Parameters:**
  - `id`: Category UUID
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "id": "uuid",
      "name": "Category Name",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```

### Create Category
- **Method:** `POST`
- **Endpoint:** `/api/categories`
- **Body:**
  ```json
  {
    "name": "Category Name" // required
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": { ...categoryObject }
  }
  ```

### Update Category
- **Method:** `PUT`
- **Endpoint:** `/api/categories/:id`
- **Path Parameters:**
  - `id`: Category UUID
- **Body:**
  ```json
  {
    "name": "New Name" // optional
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": { ...updatedCategoryObject }
  }
  ```

### Delete Category
- **Method:** `DELETE`
- **Endpoint:** `/api/categories/:id`
- **Path Parameters:**
  - `id`: Category UUID
- **Response:** `204 No Content`

---

## Products

### List Products
- **Method:** `GET`
- **Endpoint:** `/api/products`
- **Query Parameters:**
  - `name` (optional): string. Filter products by name (case-insensitive partial match).
  - `limit` (optional): default 10, max 100.
  - `offset` (optional): default 0.
- **Response:**
  ```json
  {
    "error": null,
    "data": [
      {
        "id": "uuid",
        "name": "Product Name",
        "categoryId": "uuid",
        "categoryName": "Category Name",
        "unitPrice": 100, // in cents
        "unitType": "kg", // kg, g, l, ml, un
        "quantity": "10",
        "minimumQuantity": "5",
        "maximumQuantity": "100",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```

### Get Product
- **Method:** `GET`
- **Endpoint:** `/api/products/:id`
- **Path Parameters:**
  - `id`: Product UUID
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "id": "uuid",
      "name": "Product Name",
      "categoryId": "uuid",
      "categoryName": "Category Name",
      "unitPrice": 100,
      "unitType": "kg",
      "quantity": "10",
      "minimumQuantity": "5",
      "maximumQuantity": "100",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```

### Create Product
- **Method:** `POST`
- **Endpoint:** `/api/products`
- **Body:**
  ```json
  {
    "name": "Product Name", // required
    "categoryId": "uuid", // required
    "unitPrice": 100, // required, integer (cents)
    "unitType": "kg", // required: 'kg', 'g', 'l', 'ml', 'un'
    "quantity": 10, // optional, default 0
    "minimumQuantity": 5, // optional, default 0
    "maximumQuantity": 100 // optional, default 0
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": { ...productObject }
  }
  ```

### Update Product
- **Method:** `PUT`
- **Endpoint:** `/api/products/:id`
- **Path Parameters:**
  - `id`: Product UUID
- **Body:**
  ```json
  {
    "name": "New Name", // optional
    "categoryId": "uuid", // optional
    "unitPrice": 150, // optional
    "unitType": "un", // optional
    "quantity": 20, // optional
    "minimumQuantity": 10, // optional
    "maximumQuantity": 200 // optional
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": { ...updatedProductObject }
  }
  ```

### Delete Product
- **Method:** `DELETE`
- **Endpoint:** `/api/products/:id`
- **Path Parameters:**
  - `id`: Product UUID
- **Response:** `204 No Content`

---

## Moves (Stock)

### List Stock Movements
- **Method:** `GET`
- **Endpoint:** `/api/moves`
- **Query Parameters:**
  - `productId` (optional): Filter by Product UUID.
  - `limit` (optional): default 10.
  - `offset` (optional): default 0.
- **Response:**
  ```json
  {
    "error": null,
    "data": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Product Name",
        "userId": "uuid",
        "type": "in", // or 'out'
        "quantity": "5",
        "unitPrice": 100,
        "createdAt": "date"
      }
    ]
  }
  ```

### Add Stock Movement
- **Method:** `POST`
- **Endpoint:** `/api/moves`
- **Body:**
  ```json
  {
    "productId": "uuid", // required
    "type": "in", // required: 'in' or 'out'
    "quantity": 5 // required, positive number
  }
  ```
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "id": "uuid",
      "productId": "uuid",
      "userId": "uuid", // Inferred from token
      "type": "in",
      "quantity": "5",
      "unitPrice": 100,
      "date": "date"
    }
  }
  ```

---

## Dashboard

### Get Inventory Value
- **Method:** `GET`
- **Endpoint:** `/api/dashboard/inventory-value`
- **Description:** Get total monetary value of current inventory (active products only).
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "totalValue": 123456 // integer (cents)
    }
  }
  ```

### Get Moves Summary
- **Method:** `GET`
- **Endpoint:** `/api/dashboard/moves-summary`
- **Query Parameters:**
  - `startDate` (optional): ISO date string.
  - `endDate` (optional): ISO date string.
- **Description:** Get total value and count of IN and OUT moves for a period.
- **Response:**
  ```json
  {
    "error": null,
    "data": {
      "in": { "value": 5000, "count": 10 },
      "out": { "value": 2000, "count": 5 }
    }
  }
  ```

### Get Moves Graph (Daily Out)
- **Method:** `GET`
- **Endpoint:** `/api/dashboard/moves-graph`
- **Query Parameters:**
  - `startDate` (optional): ISO date string.
  - `endDate` (optional): ISO date string.
- **Description:** Get daily total value of OUT moves for a period.
- **Response:**
  ```json
  {
    "error": null,
    "data": [
      { "date": "2023-10-01", "total": 1500 },
      { "date": "2023-10-02", "total": 200 }
    ]
  }
  ```

### Get Low Stock Products
- **Method:** `GET`
- **Endpoint:** `/api/dashboard/low-stock`
- **Description:** List products where quantity <= minimumQuantity * 1.1.
- **Response:**
  ```json
  {
    "error": null,
    "data": [ { ...productObject } ]
  }
  ```

### Get Stagnant Products
- **Method:** `GET`
- **Endpoint:** `/api/dashboard/stagnant-products`
- **Query Parameters:**
  - `startDate` (optional): ISO date string.
  - `endDate` (optional): ISO date string.
- **Description:** List products that have not had any OUT moves in the given period.
- **Response:**
  ```json
  {
    "error": null,
    "data": [ { ...productObject } ]
  }
  ```
