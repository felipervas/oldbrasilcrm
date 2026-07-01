DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Authenticated can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete products"
  ON public.products FOR DELETE TO authenticated
  USING (true);