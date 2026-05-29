# API Documentation

## Authentication

### POST /api/auth/login
Request body:
- `idToken` (string)

Response:
- `uid`
- `email`

### POST /api/auth/register
Request body:
- `email`
- `name`
- `phone`

Response:
- Placeholder registration response.

## Users

### GET /api/users/me
Authentication required.

Response:
- `user` profile object

### PUT /api/users/me
Authentication required.

Request body:
- profile updates

Response:
- updated profile placeholder

## Rewards

### GET /api/rewards
Lists available rewards.

### POST /api/rewards/:rewardId/redeem
Authentication required.

Response:
- redemption placeholder message

## QR

### POST /api/qr/scan
Authentication required.

Request body:
- `qrCode`

Response:
- QR scan payload placeholder

### GET /api/qr/validate/:code
Authentication required.

Response:
- QR validation placeholder

## Redemptions

### GET /api/redemptions
Authentication required.

### POST /api/redemptions
Authentication required.

Request body:
- `rewardId`

Response:
- redemption placeholder
