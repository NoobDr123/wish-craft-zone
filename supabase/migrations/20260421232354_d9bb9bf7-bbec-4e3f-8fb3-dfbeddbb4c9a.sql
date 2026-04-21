-- Orders table linking quiz submissions to authenticated users
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  recipient_name TEXT NOT NULL,
  relationship TEXT,
  genre TEXT,
  tempo TEXT,
  voice TEXT,
  song_title_idea TEXT,
  is_gift BOOLEAN NOT NULL DEFAULT false,
  recipient_email TEXT,
  delivery_date TEXT,
  personal_note TEXT,
  has_3rd_verse BOOLEAN NOT NULL DEFAULT false,
  is_rush BOOLEAN NOT NULL DEFAULT false,
  has_unlimited_edits BOOLEAN NOT NULL DEFAULT false,
  amount_cents INTEGER NOT NULL DEFAULT 9900,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid',
  quiz_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_buyer_email ON public.orders(buyer_email);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can read their own orders by auth user, OR by matching email if not yet linked
CREATE POLICY "Users view own orders by user_id"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own orders by email"
  ON public.orders FOR SELECT
  USING (
    user_id IS NULL
    AND auth.jwt() ->> 'email' IS NOT NULL
    AND lower(buyer_email) = lower(auth.jwt() ->> 'email')
  );

-- Anyone (including anonymous checkout) can create an order
CREATE POLICY "Anyone can create an order"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Users can update (claim/link) their own orders
CREATE POLICY "Users can claim/update their orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND auth.jwt() ->> 'email' IS NOT NULL
      AND lower(buyer_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- When a user signs in, automatically claim any orders matching their email
CREATE OR REPLACE FUNCTION public.claim_orders_for_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.orders
       SET user_id = NEW.id
     WHERE user_id IS NULL
       AND lower(buyer_email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_claim_orders
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_orders_for_user();