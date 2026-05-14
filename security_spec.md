# Security Specification - EVlog

## 1. Data Invariants
- A `Vehicle` must have a valid `userId` matching the authenticated user.
- A `Log` must reference a `vehicleId` that exists and belongs to the same `userId`.
- Users can only read/write their own vehicles and logs.
- `odometer` values must be non-negative.
- `batteryPercent` values must be between 0 and 100.
- `timestamp` must be the server time.

## 2. The Dirty Dozen Payloads
1. **Identity Spoofing**: User A tries to create a vehicle with `userId` of User B.
2. **Resource Poisoning**: User tries to set a 1MB string as a vehicle name.
3. **Out-of-Range Battery**: User sets `batteryPercent` to 150.
4. **Negative Mileage**: User sets `odometer` to -100.
5. **Orphaned Log**: User adds a log to a `vehicleId` they don't own.
6. **Self-Promotion**: User tries to update their own profile to set an `isAdmin` flag (not used here but good to guard).
7. **Timestamp Fraud**: User provides a client-side timestamp in the past for a new log.
8. **Shadow Field**: User adds a `isPremium: true` field to a vehicle document.
9. **Bulk Export**: User tries to list all logs across the entire database without a userId filter.
10. **ID Injection**: User uses an extremely long junk ID for a vehicle.
11. **State Shortcut**: User tries to update an immutable field properly like `createdAt`.
12. **PII Leak**: User tries to query another user's vehicles by email.

## 3. Test Runner
I will verify these in the rules themselves using the hardened helper patterns.
