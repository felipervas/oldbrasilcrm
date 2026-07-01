-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('produtos', 'produtos', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'produtos');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'produtos');

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos');

-- Produtos RLS for INSERT/UPDATE/DELETE
CREATE POLICY "Authenticated users can insert products"
ON public.produtos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.produtos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete products"
ON public.produtos FOR DELETE TO authenticated USING (true);