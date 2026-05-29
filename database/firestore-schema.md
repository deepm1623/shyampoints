# Firestore Schema for ShyamPoints

## Collections

### users
Document ID: `uid`

Fields:
- `name`: string
- `email`: string
- `phone`: string
- `points`: number
- `membership`: string
- `rewardsRedeemed`: number
- `productsScanned`: number
- `createdAt`: timestamp

### rewards
Document ID: `rewardId`

Fields:
- `title`: string
- `description`: string
- `pointsCost`: number
- `category`: string
- `available`: boolean
- `createdAt`: timestamp

### redemptions
Document ID: `redemptionId`

Fields:
- `userId`: string
- `rewardId`: string
- `status`: string
- `redeemedAt`: timestamp
- `pointsUsed`: number

### qrCodes
Document ID: `code`

Fields:
- `productId`: string
- `verified`: boolean
- `issuedAt`: timestamp
- `scannedBy`: string
- `scanCount`: number
