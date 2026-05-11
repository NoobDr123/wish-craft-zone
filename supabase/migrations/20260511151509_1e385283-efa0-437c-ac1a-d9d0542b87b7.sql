UPDATE public.orders
SET dog_gender = quiz_payload->>'dog_gender'
WHERE dog_gender IS NULL
  AND quiz_payload->>'dog_gender' IN ('he', 'she');