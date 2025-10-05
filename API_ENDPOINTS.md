# User Authentication API Endpoints

## Base URL
```
http://localhost:3000/api/user
```

## Authentication Flow

### 1. Send OTP
**POST** `/send-otp`

Request Body:
```json
{
  "phone": "01712345678"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "01712345678",
    "expiresIn": "10 minutes"
  }
}
```

### 2. Verify OTP
**POST** `/verify-otp`

Request Body:
```json
{
  "phone": "01712345678",
  "otp": "123456"
}
```

**Response for Existing User (Login):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "phone": "01712345678",
      "role": "patient",
      "isVerified": true
    },
    "token": "jwt_token_here",
    "isNewUser": false
  }
}
```

**Response for New User (Registration Required):**
```json
{
  "success": true,
  "message": "OTP verified. Please provide your name to complete registration.",
  "data": {
    "isNewUser": true,
    "phone": "01712345678",
    "requiresName": true
  }
}
```

### 3. Complete Registration (for new users)
**POST** `/complete-registration`

Request Body:
```json
{
  "phone": "01712345678",
  "name": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "phone": "01712345678",
      "role": "patient",
      "isVerified": true
    },
    "token": "jwt_token_here",
    "isNewUser": true
  }
}
```

## Protected Endpoints (Require Authentication)

### 4. Get User Profile
**GET** `/profile`
Headers: `Authorization: Bearer <token>`

### 5. Update User Profile
**PUT** `/profile`
Headers: `Authorization: Bearer <token>`

### 6. Logout
**POST** `/logout`
Headers: `Authorization: Bearer <token>`

## Frontend Integration

The frontend should handle the flow like this:

1. **Login Page**: User enters phone → Send OTP → Verify OTP
2. **If existing user**: Login directly with token
3. **If new user**: Show name input field → Complete registration → Login with token

The key is the `isNewUser` flag in the verify-otp response that tells the frontend whether to show the name input step or not.
