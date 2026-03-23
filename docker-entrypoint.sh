#!/bin/sh
set -e

# Replace build-time placeholders with runtime env vars in client JS
find /app/.next/static -name '*.js' -exec sed -i \
  -e "s|__NEXT_PUBLIC_SUPABASE_URL__|${NEXT_PUBLIC_SUPABASE_URL}|g" \
  -e "s|__NEXT_PUBLIC_SUPABASE_ANON_KEY__|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" \
  {} +

# Replace in server chunks
find /app/.next/server -name '*.js' -exec sed -i \
  -e "s|__NEXT_PUBLIC_SUPABASE_URL__|${NEXT_PUBLIC_SUPABASE_URL}|g" \
  -e "s|__NEXT_PUBLIC_SUPABASE_ANON_KEY__|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" \
  {} +

exec node server.js
