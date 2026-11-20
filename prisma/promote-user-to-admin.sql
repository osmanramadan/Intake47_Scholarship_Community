-- Replace this with the exact email address of the existing user.
UPDATE "User"
SET "role" = 'ADMIN',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'replace-with-user-email@example.com'
RETURNING "id", "fullName", "email", "role";
