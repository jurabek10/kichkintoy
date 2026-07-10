-- Seed districts and regional cities for every Uzbekistan region.
-- Tashkent City (…0001) was seeded in 20260527192023; Chust (Namangan) in 20260527210000.
-- Region capitals / regional-subordination cities come first, then districts alphabetically.

-- Tashkent Region (…0002)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Nurafshon shahri',  'nurafshon',       1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Angren shahri',     'angren',          2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Bekobod shahri',    'bekobod-shahri',  3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Chirchiq shahri',   'chirchiq',        4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Ohangaron shahri',  'ohangaron-shahri',5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Olmaliq shahri',    'olmaliq',         6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Yangiyo''l shahri', 'yangiyol-shahri', 7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Bekobod tumani',    'bekobod',         8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Bo''ka',            'boka',            9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Bo''stonliq',       'bostonliq',      10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Chinoz',            'chinoz',         11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Ohangaron tumani',  'ohangaron',      12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Oqqo''rg''on',      'oqqorgon',       13),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'O''rtachirchiq',    'ortachirchiq',   14),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Parkent',           'parkent',        15),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Piskent',           'piskent',        16),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Qibray',            'qibray',         17),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Quyichirchiq',      'quyichirchiq',   18),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Toshkent tumani',   'toshkent',       19),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Yangiyo''l tumani', 'yangiyol',       20),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Yuqorichirchiq',    'yuqorichirchiq', 21),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000002', 'Zangiota',          'zangiota',       22)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Andijan (…0003)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Andijon shahri',   'andijon-shahri',  1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Xonobod shahri',   'xonobod',         2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Andijon tumani',   'andijon',         3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Asaka',            'asaka',           4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Baliqchi',         'baliqchi',        5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Bo''z',            'boz',             6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Buloqboshi',       'buloqboshi',      7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Izboskan',         'izboskan',        8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Jalaquduq',        'jalaquduq',       9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Marhamat',         'marhamat',       10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Oltinko''l',       'oltinkol',       11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Paxtaobod',        'paxtaobod',      12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Qo''rg''ontepa',   'qorgontepa',     13),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Shahrixon',        'shahrixon',      14),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Ulug''nor',        'ulugnor',        15),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000003', 'Xo''jaobod',       'xojaobod',       16)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Bukhara (…0004)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Buxoro shahri',    'buxoro-shahri',   1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Kogon shahri',     'kogon-shahri',    2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Buxoro tumani',    'buxoro',          3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'G''ijduvon',       'gijduvon',        4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Jondor',           'jondor',          5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Kogon tumani',     'kogon',           6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Olot',             'olot',            7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Peshku',           'peshku',          8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Qorako''l',        'qorakol',         9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Qorovulbozor',     'qorovulbozor',   10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Romitan',          'romitan',        11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Shofirkon',        'shofirkon',      12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000004', 'Vobkent',          'vobkent',        13)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Fergana (…0005)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Farg''ona shahri', 'fargona-shahri',  1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Marg''ilon shahri','margilon',        2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Qo''qon shahri',   'qoqon',           3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Quvasoy shahri',   'quvasoy',         4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Beshariq',         'beshariq',        5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Bog''dod',         'bogdod',          6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Buvayda',          'buvayda',         7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Dang''ara',        'dangara',         8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Farg''ona tumani', 'fargona',         9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Furqat',           'furqat',         10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Oltiariq',         'oltiariq',       11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'O''zbekiston',     'ozbekiston',     12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Qo''shtepa',       'qoshtepa',       13),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Quva',             'quva',           14),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Rishton',          'rishton',        15),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'So''x',            'sox',            16),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Toshloq',          'toshloq',        17),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Uchko''prik',      'uchkoprik',      18),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000005', 'Yozyovon',         'yozyovon',       19)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Jizzakh (…0006)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Jizzax shahri',    'jizzax',          1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Arnasoy',          'arnasoy',         2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Baxmal',           'baxmal',          3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Do''stlik',        'dostlik',         4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Forish',           'forish',          5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'G''allaorol',      'gallaorol',       6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Mirzacho''l',      'mirzachol',       7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Paxtakor',         'paxtakor',        8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Sharof Rashidov',  'sharof-rashidov', 9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Yangiobod',        'yangiobod',      10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Zafarobod',        'zafarobod',      11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Zarbdor',          'zarbdor',        12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000006', 'Zomin',            'zomin',          13)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Karakalpakstan (…0007)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Nukus shahri',     'nukus-shahri',    1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Amudaryo',         'amudaryo',        2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Beruniy',          'beruniy',         3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Bo''zatov',        'bozatov',         4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Chimboy',          'chimboy',         5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Ellikqal''a',      'ellikqala',       6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Kegeyli',          'kegeyli',         7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Mo''ynoq',         'moynoq',          8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Nukus tumani',     'nukus',           9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Qanliko''l',       'qanlikol',       10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Qorao''zak',       'qoraozak',       11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Qo''ng''irot',     'qongirot',       12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Shumanay',         'shumanay',       13),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Taxiatosh',        'taxiatosh',      14),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Taxtako''pir',     'taxtakopir',     15),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'To''rtko''l',      'tortkol',        16),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000007', 'Xo''jayli',        'xojayli',        17)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Kashkadarya (…0008)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Qarshi shahri',      'qarshi-shahri',     1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Shahrisabz shahri',  'shahrisabz-shahri', 2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Chiroqchi',          'chiroqchi',         3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Dehqonobod',         'dehqonobod',        4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'G''uzor',            'guzor',             5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Kasbi',              'kasbi',             6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Kitob',              'kitob',             7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Koson',              'koson',             8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Ko''kdala',          'kokdala',           9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Mirishkor',          'mirishkor',        10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Muborak',            'muborak',          11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Nishon',             'nishon',           12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Qamashi',            'qamashi',          13),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Qarshi tumani',      'qarshi',           14),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Shahrisabz tumani',  'shahrisabz',       15),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000008', 'Yakkabog''',         'yakkabog',         16)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Khorezm (…0009)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Urganch shahri',   'urganch-shahri',  1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Xiva shahri',      'xiva-shahri',     2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Bog''ot',          'bogot',           3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Gurlan',           'gurlan',          4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Hazorasp',         'hazorasp',        5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Qo''shko''pir',    'qoshkopir',       6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Shovot',           'shovot',          7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Tuproqqal''a',     'tuproqqala',      8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Urganch tumani',   'urganch',         9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Xiva tumani',      'xiva',           10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Xonqa',            'xonqa',          11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Yangiariq',        'yangiariq',      12),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000009', 'Yangibozor',       'yangibozor',     13)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Namangan (…000a) — Chust already seeded; renumber it into the alphabetical slot.
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Namangan shahri',  'namangan-shahri', 1),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Chortoq',          'chortoq',         2),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Chust',            'chust',           3),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Kosonsoy',         'kosonsoy',        4),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Mingbuloq',        'mingbuloq',       5),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Namangan tumani',  'namangan',        6),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Norin',            'norin',           7),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Pop',              'pop',             8),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'To''raqo''rg''on', 'toraqorgon',      9),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Uchqo''rg''on',    'uchqorgon',      10),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Uychi',            'uychi',          11),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000a', 'Yangiqo''rg''on',  'yangiqorgon',    12)
ON CONFLICT ("region_id", "slug") DO NOTHING;

UPDATE "districts"
SET "display_order" = 3
WHERE "region_id" = '00000000-0000-4001-8000-00000000000a' AND "slug" = 'chust';

-- Navoiy (…000b)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Navoiy shahri',    'navoiy',          1),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Zarafshon shahri', 'zarafshon',       2),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'G''ozg''on shahri','gozgon',          3),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Karmana',          'karmana',         4),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Konimex',          'konimex',         5),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Navbahor',         'navbahor',        6),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Nurota',           'nurota',          7),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Qiziltepa',        'qiziltepa',       8),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Tomdi',            'tomdi',           9),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Uchquduq',         'uchquduq',       10),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000b', 'Xatirchi',         'xatirchi',       11)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Samarkand (…000c)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Samarqand shahri',     'samarqand-shahri',   1),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Kattaqo''rg''on shahri','kattaqorgon-shahri', 2),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Bulung''ur',           'bulungur',           3),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Ishtixon',             'ishtixon',           4),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Jomboy',               'jomboy',             5),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Kattaqo''rg''on tumani','kattaqorgon',       6),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Narpay',               'narpay',             7),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Nurobod',              'nurobod',            8),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Oqdaryo',              'oqdaryo',            9),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Pastdarg''om',         'pastdargom',        10),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Paxtachi',             'paxtachi',          11),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Payariq',              'payariq',           12),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Qo''shrabot',          'qoshrabot',         13),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Samarqand tumani',     'samarqand',         14),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Toyloq',               'toyloq',            15),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000c', 'Urgut',                'urgut',             16)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Sirdaryo (…000d)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Guliston shahri',  'guliston-shahri', 1),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Shirin shahri',    'shirin',          2),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Yangiyer shahri',  'yangiyer',        3),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Boyovut',          'boyovut',         4),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Guliston tumani',  'guliston',        5),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Mirzaobod',        'mirzaobod',       6),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Oqoltin',          'oqoltin',         7),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Sardoba',          'sardoba',         8),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Sayxunobod',       'sayxunobod',      9),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Sirdaryo tumani',  'sirdaryo',       10),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000d', 'Xovos',            'xovos',          11)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Surkhandarya (…000e)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Termiz shahri',    'termiz-shahri',   1),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Angor',            'angor',           2),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Bandixon',         'bandixon',        3),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Boysun',           'boysun',          4),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Denov',            'denov',           5),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Jarqo''rg''on',    'jarqorgon',       6),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Muzrabot',         'muzrabot',        7),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Oltinsoy',         'oltinsoy',        8),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Qiziriq',          'qiziriq',         9),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Qumqo''rg''on',    'qumqorgon',      10),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Sariosiyo',        'sariosiyo',      11),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Sherobod',         'sherobod',       12),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Sho''rchi',        'shorchi',        13),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Termiz tumani',    'termiz',         14),
    (gen_random_uuid(), '00000000-0000-4001-8000-00000000000e', 'Uzun',             'uzun',           15)
ON CONFLICT ("region_id", "slug") DO NOTHING;
