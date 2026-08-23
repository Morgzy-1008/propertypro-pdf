-- ====================================================================
-- Hudson Homes Queensland: Seed Database Lots & Packages
-- Run this in Supabase Dashboard > SQL Editor to populate the database
-- ====================================================================

-- 1. Ensure public read access for customers and flyer QR code scanners
DROP POLICY IF EXISTS packages_public_select ON public.packages;
CREATE POLICY packages_public_select ON public.packages
  FOR SELECT TO anon, authenticated
  USING (status != 'sold');

DROP POLICY IF EXISTS land_lots_public_select ON public.land_lots;
CREATE POLICY land_lots_public_select ON public.land_lots
  FOR SELECT TO anon, authenticated
  USING (true);

-- 2. Insert Land Lots
INSERT INTO public.land_lots (id, estate, suburb, lot_number, address, developer, land_size, frontage, land_price, titled, status)
VALUES
  ('a1111111-1111-4111-a111-111111111111', 'Flagstone Estate', 'Flagstone', '1422', '1422 Trailblazer Drive, Flagstone QLD 4280', 'Peet', 450, 14, 340000, true, 'available'),
  ('a2222222-2222-4222-a222-222222222222', 'Flagstone Estate', 'Flagstone', '1845', '1845 Homestead Circuit, Flagstone QLD 4280', 'Peet', 512, 16, 360000, true, 'available'),
  ('a3333333-3333-4333-a333-333333333333', 'Flagstone Estate', 'Flagstone', '2104', '2104 Crestview Way, Flagstone QLD 4280', 'Peet', 480, 15, 400000, true, 'available'),
  ('b1111111-1111-4111-b111-111111111111', 'Lilywood Landings', 'Lilywood', '308', '308 Riverside Boulevard, Lilywood QLD 4506', 'Stockland', 465, 15, 350000, true, 'available'),
  ('b2222222-2222-4222-b222-222222222222', 'Lilywood Landings', 'Lilywood', '412', '412 Rivergum Terrace, Lilywood QLD 4506', 'Stockland', 450, 14, 370000, true, 'available'),
  ('c1111111-1111-4111-c111-111111111111', 'Bahrs Scrub Estate', 'Bahrs Scrub', '516', '516 Ridgeview Place, Bahrs Scrub QLD 4207', 'Villa World', 540, 18, 420000, true, 'available'),
  ('c2222222-2222-4222-c222-222222222222', 'Bahrs Scrub Estate', 'Bahrs Scrub', '604', '604 Hillcrest Way, Bahrs Scrub QLD 4207', 'Villa World', 490, 16, 390000, true, 'available')
ON CONFLICT (id) DO UPDATE SET
  estate = EXCLUDED.estate,
  suburb = EXCLUDED.suburb,
  lot_number = EXCLUDED.lot_number,
  address = EXCLUDED.address,
  developer = EXCLUDED.developer,
  land_size = EXCLUDED.land_size,
  frontage = EXCLUDED.frontage,
  land_price = EXCLUDED.land_price,
  titled = EXCLUDED.titled,
  status = EXCLUDED.status;

-- 3. Insert Packages
INSERT INTO public.packages (
  id,
  lot_id,
  name,
  design,
  housing_type,
  range_id,
  facade_name,
  facade_url,
  house_price,
  land_price,
  total_price,
  beds,
  baths,
  cars,
  floorplan_size,
  status,
  flyer_data
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'a1111111-1111-4111-a111-111111111111',
    'Ruby 20 · Flagstone Estate',
    'Ruby 20',
    'Single Storey',
    'designer',
    'Aspen',
    'https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Aspen-Facade-Single-Storey.jpg',
    349000,
    340000,
    689000,
    '4',
    '2',
    '2',
    '192.4',
    'live',
    '{"id":"11111111-1111-4111-8111-111111111111","packageId":"11111111-1111-4111-8111-111111111111","lotId":"a1111111-1111-4111-a111-111111111111","estate":"Flagstone Estate","suburb":"Flagstone","address":"Lot 1422 Flagstone Estate","housingType":"Single Storey","designName":"Ruby 20","range":"designer","facadeName":"Aspen","facadeUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Aspen-Facade-Single-Storey.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Ruby-20-Standard-Hudson-Homes.jpg","housePrice":"$349,000","landPrice":"$340,000","price":"$689,000","beds":"4","baths":"2","cars":"2","floorplanSize":"192.4","landSize":"450","landFrontage":"14","headline":"House & Land Package","contactName":"Morgan Hales","contactPhone":"0417 571 864","contactEmail":"Morgan.hales@hudsonhomes.com.au","contactOffice":"Flagstone Display Home","consultantId":"morgan-hales"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'a2222222-2222-4222-a222-222222222222',
    'Sapphire 24 · Flagstone Estate',
    'Sapphire 24',
    'Single Storey',
    'designer',
    'Breeze',
    'https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Breeze-Facade-Single-Storey.jpg',
    385000,
    360000,
    745000,
    '4',
    '2',
    '2',
    '225.1',
    'live',
    '{"id":"22222222-2222-4222-8222-222222222222","packageId":"22222222-2222-4222-8222-222222222222","lotId":"a2222222-2222-4222-a222-222222222222","estate":"Flagstone Estate","suburb":"Flagstone","address":"Lot 1845 Flagstone Estate","housingType":"Single Storey","designName":"Sapphire 24","range":"designer","facadeName":"Breeze","facadeUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Breeze-Facade-Single-Storey.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Sapphire-24-Standard-Hudson-Homes.jpg","housePrice":"$385,000","landPrice":"$360,000","price":"$745,000","beds":"4","baths":"2","cars":"2","floorplanSize":"225.1","landSize":"512","landFrontage":"16","headline":"House & Land Package","contactName":"Morgan Hales","contactPhone":"0417 571 864","contactEmail":"Morgan.hales@hudsonhomes.com.au","contactOffice":"Flagstone Display Home","consultantId":"morgan-hales"}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'a3333333-3333-4333-a333-333333333333',
    'Onyx 29 · Flagstone Estate',
    'Onyx 29',
    'Double Storey',
    'designer',
    'Allure',
    '/facades/allure_widescreen.jpg',
    495000,
    400000,
    895000,
    '4',
    '2.5',
    '2',
    '268.3',
    'live',
    '{"id":"33333333-3333-4333-8333-333333333333","packageId":"33333333-3333-4333-8333-333333333333","lotId":"a3333333-3333-4333-a333-333333333333","estate":"Flagstone Estate","suburb":"Flagstone","address":"Lot 2104 Flagstone Estate","housingType":"Double Storey","designName":"Onyx 29","range":"designer","facadeName":"Allure","facadeUrl":"/facades/allure_widescreen.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Onyx-29-Standard-Hudson-Homes.jpg","housePrice":"$495,000","landPrice":"$400,000","price":"$895,000","beds":"4","baths":"2.5","cars":"2","floorplanSize":"268.3","landSize":"480","landFrontage":"15","headline":"House & Land Package","contactName":"Morgan Hales","contactPhone":"0417 571 864","contactEmail":"Morgan.hales@hudsonhomes.com.au","contactOffice":"Flagstone Display Home","consultantId":"morgan-hales"}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'b1111111-1111-4111-b111-111111111111',
    'Emerald 26 · Lilywood Landings',
    'Emerald 26',
    'Single Storey',
    'designer',
    'Banksia',
    'https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Banksia-Facade-Single-Storey.jpg',
    415000,
    350000,
    765000,
    '4',
    '2',
    '2',
    '241.0',
    'live',
    '{"id":"44444444-4444-4444-8444-444444444444","packageId":"44444444-4444-4444-8444-444444444444","lotId":"b1111111-1111-4111-b111-111111111111","estate":"Lilywood Landings","suburb":"Lilywood","address":"Lot 308 Lilywood Landings","housingType":"Single Storey","designName":"Emerald 26","range":"designer","facadeName":"Banksia","facadeUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Banksia-Facade-Single-Storey.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Emerald-26-Standard-Hudson-Homes.jpg","housePrice":"$415,000","landPrice":"$350,000","price":"$765,000","beds":"4","baths":"2","cars":"2","floorplanSize":"241.0","landSize":"465","landFrontage":"15","headline":"House & Land Package","contactName":"Jesse Jenkins","contactPhone":"0431 292 123","contactEmail":"Jesse.jenkins@hudsonhomes.com.au","contactOffice":"Lilywood Landings Display Home","consultantId":"jesse-jenkins"}'::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'b2222222-2222-4222-b222-222222222222',
    'Jasper 26 · Lilywood Landings',
    'Jasper 26',
    'Double Storey',
    'designer',
    'Ashton',
    '/facades/ashton_widescreen.jpg',
    479000,
    370000,
    849000,
    '4',
    '2.5',
    '2',
    '245.8',
    'live',
    '{"id":"55555555-5555-4555-8555-555555555555","packageId":"55555555-5555-4555-8555-555555555555","lotId":"b2222222-2222-4222-b222-222222222222","estate":"Lilywood Landings","suburb":"Lilywood","address":"Lot 412 Lilywood Landings","housingType":"Double Storey","designName":"Jasper 26","range":"designer","facadeName":"Ashton","facadeUrl":"/facades/ashton_widescreen.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Jasper-26-Standard-Hudson-Homes.jpg","housePrice":"$479,000","landPrice":"$370,000","price":"$849,000","beds":"4","baths":"2.5","cars":"2","floorplanSize":"245.8","landSize":"450","landFrontage":"14","headline":"House & Land Package","contactName":"Jesse Jenkins","contactPhone":"0431 292 123","contactEmail":"Jesse.jenkins@hudsonhomes.com.au","contactOffice":"Lilywood Landings Display Home","consultantId":"jesse-jenkins"}'::jsonb
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'c1111111-1111-4111-c111-111111111111',
    'Diamond 32 · Bahrs Scrub',
    'Diamond 32',
    'Double Storey',
    'luxury',
    'Ascot',
    '/facades/ascot_widescreen.jpg',
    565000,
    420000,
    985000,
    '5',
    '3',
    '2',
    '298.2',
    'live',
    '{"id":"66666666-6666-4666-8666-666666666666","packageId":"66666666-6666-4666-8666-666666666666","lotId":"c1111111-1111-4111-c111-111111111111","estate":"Bahrs Scrub Estate","suburb":"Bahrs Scrub","address":"Lot 516 Bahrs Scrub Estate","housingType":"Double Storey","designName":"Diamond 32","range":"luxury","facadeName":"Ascot","facadeUrl":"/facades/ascot_widescreen.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Diamond-32-Standard-Hudson-Homes.jpg","housePrice":"$565,000","landPrice":"$420,000","price":"$985,000","beds":"5","baths":"3","cars":"2","floorplanSize":"298.2","landSize":"540","landFrontage":"18","headline":"House & Land Package","contactName":"Adrian Baxter","contactPhone":"0419 232 955","contactEmail":"Adrian.baxter@hudsonhomes.com.au","contactOffice":"Bahrs Scrub Display Home","consultantId":"adrian-baxter"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'c2222222-2222-4222-c222-222222222222',
    'Amethyst 28 · Bahrs Scrub',
    'Amethyst 28',
    'Double Storey',
    'designer',
    'Centro',
    '/facades/centro_widescreen.jpg',
    485000,
    390000,
    875000,
    '4',
    '2.5',
    '2',
    '260.4',
    'live',
    '{"id":"77777777-7777-4777-8777-777777777777","packageId":"77777777-7777-4777-8777-777777777777","lotId":"c2222222-2222-4222-c222-222222222222","estate":"Bahrs Scrub Estate","suburb":"Bahrs Scrub","address":"Lot 604 Bahrs Scrub Estate","housingType":"Double Storey","designName":"Amethyst 28","range":"designer","facadeName":"Centro","facadeUrl":"/facades/centro_widescreen.jpg","floorplanUrl":"https://www.hudsonhomes.com.au/wp-content/uploads/2021/04/Amethyst-28-Standard-Hudson-Homes.jpg","housePrice":"$485,000","landPrice":"$390,000","price":"$875,000","beds":"4","baths":"2.5","cars":"2","floorplanSize":"260.4","landSize":"490","landFrontage":"16","headline":"House & Land Package","contactName":"Adrian Baxter","contactPhone":"0419 232 955","contactEmail":"Adrian.baxter@hudsonhomes.com.au","contactOffice":"Bahrs Scrub Display Home","consultantId":"adrian-baxter"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  lot_id = EXCLUDED.lot_id,
  name = EXCLUDED.name,
  design = EXCLUDED.design,
  housing_type = EXCLUDED.housing_type,
  range_id = EXCLUDED.range_id,
  facade_name = EXCLUDED.facade_name,
  facade_url = EXCLUDED.facade_url,
  house_price = EXCLUDED.house_price,
  land_price = EXCLUDED.land_price,
  total_price = EXCLUDED.total_price,
  beds = EXCLUDED.beds,
  baths = EXCLUDED.baths,
  cars = EXCLUDED.cars,
  floorplan_size = EXCLUDED.floorplan_size,
  status = EXCLUDED.status,
  flyer_data = EXCLUDED.flyer_data;
